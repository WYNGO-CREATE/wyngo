// ─── Crée un événement Google Agenda + invite le client ───────────────
//
//  Body (POST, JWT utilisateur) :
//    { prospect_id?, title, client_email, start_iso, end_iso,
//      notes?, is_video?, location? }
//
//  Utilise le compte Google connecté (table gmail_accounts) — refresh du
//  token si expiré (même pattern que gmail-send). Crée l'event sur le
//  calendrier "primary", invite le client (sendUpdates=all → Google envoie
//  l'invitation par email), ajoute un Google Meet si visio.
//  Stocke le RDV + un rappel cockpit (follow_ups) + un event de timeline.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const CAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";

async function refreshAccessToken(refresh_token: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
      refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`refresh_failed: ${await res.text()}`);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Non authentifié" }, 401);
    const userId = userData.user.id;

    const { prospect_id, title, client_email, start_iso, end_iso, notes, is_video, location, reminders_minutes } = await req.json();
    if (!title || !start_iso || !end_iso) return json({ error: "missing", message: "Champs manquants (titre, dates)." });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Compte Google connecté
    const { data: account } = await admin
      .from("gmail_accounts").select("*").eq("user_id", userId).eq("is_active", true).maybeSingle();
    if (!account) return json({ error: "no_google", message: "Aucun compte Google connecté." });

    // Scope Agenda présent ?
    if (!String(account.scope || "").includes(CAL_SCOPE)) {
      return json({ error: "no_calendar_scope", message: "Reconnecte Google pour autoriser l'Agenda." });
    }

    // Refresh token si expiré
    let access_token = account.access_token;
    if (new Date(account.expires_at).getTime() - Date.now() < 60_000) {
      const r = await refreshAccessToken(account.refresh_token);
      access_token = r.access_token;
      await admin.from("gmail_accounts").update({
        access_token,
        expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", account.id);
    }

    // Construit l'événement
    const event: Record<string, unknown> = {
      summary: title,
      description: notes || undefined,
      start: { dateTime: start_iso, timeZone: "Europe/Paris" },
      end: { dateTime: end_iso, timeZone: "Europe/Paris" },
      reminders: Array.isArray(reminders_minutes) && reminders_minutes.length > 0
        ? { useDefault: false, overrides: reminders_minutes.slice(0, 5).map((m: number) => ({ method: "popup", minutes: Math.max(0, Math.round(m)) })) }
        : { useDefault: true },
    };
    if (location && !is_video) event.location = location;
    if (client_email) event.attendees = [{ email: client_email }];
    if (is_video) {
      event.conferenceData = { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } };
    }

    const gRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
      },
    );

    if (!gRes.ok) {
      const errTxt = await gRes.text();
      console.error("[calendar] Google API error", gRes.status, errTxt);
      // Calendar API non activée dans le projet Google Cloud
      if (gRes.status === 403 && /Calendar API has not been used|accessNotConfigured/i.test(errTxt)) {
        return json({ error: "api_disabled", message: "Active l'API Google Calendar dans ton projet Google Cloud (Wyngo CRM)." });
      }
      if (gRes.status === 401 || gRes.status === 403) {
        return json({ error: "no_calendar_scope", message: "Reconnecte Google pour autoriser l'Agenda." });
      }
      return json({ error: "google_error", message: `Google a refusé : ${errTxt.slice(0, 300)}` });
    }

    const ev = await gRes.json();
    const meet_link = ev.hangoutLink || ev.conferenceData?.entryPoints?.find((e: { entryPointType?: string; uri?: string }) => e.entryPointType === "video")?.uri || null;
    // Relit l'événement pour confirmer les rappels réellement enregistrés côté Google.
    let savedReminders: unknown = ev.reminders ?? null;
    try {
      const readBack = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.id}?fields=reminders`,
        { headers: { Authorization: `Bearer ${access_token}` } },
      );
      if (readBack.ok) savedReminders = (await readBack.json()).reminders ?? savedReminders;
    } catch (_e) { /* best-effort */ }
    console.log("[calendar] reminders sent", JSON.stringify(event.reminders), "saved", JSON.stringify(savedReminders));

    // Enregistre le RDV
    const durationMin = Math.max(5, Math.round((new Date(end_iso).getTime() - new Date(start_iso).getTime()) / 60000));
    const { data: appt } = await admin.from("appointments").insert({
      owner_id: userId, prospect_id: prospect_id || null, title, client_email: client_email || null,
      scheduled_at: start_iso, duration_min: durationMin, location: location || null,
      is_video: !!is_video, meet_link, notes: notes || null,
      google_event_id: ev.id, google_event_link: ev.htmlLink, status: "planifie",
    }).select("id").single();

    // Rappel cockpit + timeline (best-effort, on n'échoue pas le RDV si ça casse)
    if (prospect_id) {
      await admin.from("follow_ups").insert({
        owner_id: userId, prospect_id, scheduled_at: start_iso, completed: false,
        reason: `Rendez-vous : ${title}`,
      });
      await admin.from("prospect_events").insert({
        owner_id: userId, prospect_id, event_type: "rdv_planifie",
        payload: { appointment_id: appt?.id, title, scheduled_at: start_iso, client_email: client_email || null },
      }).then(() => {}, () => {});
    }

    return json({ ok: true, event_link: ev.htmlLink, meet_link, reminders: savedReminders });
  } catch (e) {
    console.error("[calendar-create-event] uncaught", e);
    return json({ error: "server_error", message: String(e) });
  }
});
