// ─── Modifie un rendez-vous (Wyngo + Google Agenda) ───────────────────
//  POST (JWT utilisateur)
//   { appointment_id, title, start_iso, end_iso, is_video, location, notes, client_email }
//  Met à jour l'événement Google (sendUpdates=all → le client est prévenu)
//  puis le RDV + le rappel cockpit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function refreshAccessToken(refresh_token: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!, client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!, refresh_token, grant_type: "refresh_token" }),
  });
  if (!res.ok) throw new Error(`refresh_failed: ${await res.text()}`);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { appointment_id, title, start_iso, end_iso, is_video, location, notes, client_email } = await req.json();
    if (!appointment_id || !title || !start_iso || !end_iso) return json({ error: "missing", message: "Champs manquants." });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauth", message: "Non autorisé" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "unauth", message: "Non authentifié" }, 401);
    const userId = u.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: appt } = await admin.from("appointments").select("*").eq("id", appointment_id).eq("owner_id", userId).maybeSingle();
    if (!appt) return json({ error: "not_found", message: "Rendez-vous introuvable." });

    const durationMin = Math.max(5, Math.round((new Date(end_iso).getTime() - new Date(start_iso).getTime()) / 60000));
    let meet_link = appt.meet_link as string | null;

    // Met à jour l'événement Google (best-effort)
    if (appt.google_event_id) {
      try {
        const { data: account } = await admin.from("gmail_accounts").select("*").eq("user_id", userId).eq("is_active", true).maybeSingle();
        if (account) {
          let access_token = account.access_token;
          if (new Date(account.expires_at).getTime() - Date.now() < 60_000) {
            const r = await refreshAccessToken(account.refresh_token);
            access_token = r.access_token;
            await admin.from("gmail_accounts").update({ access_token, expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", account.id);
          }
          const patch: Record<string, unknown> = {
            summary: title,
            description: notes || undefined,
            start: { dateTime: start_iso, timeZone: "Europe/Paris" },
            end: { dateTime: end_iso, timeZone: "Europe/Paris" },
            location: (!is_video && location) ? location : undefined,
          };
          // Active la visio si demandée et absente
          if (is_video && !meet_link) {
            patch.conferenceData = { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } };
          }
          const gRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${appt.google_event_id}?sendUpdates=all&conferenceDataVersion=1`, {
            method: "PATCH", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(patch),
          });
          if (gRes.ok) {
            const ev = await gRes.json();
            meet_link = ev.hangoutLink || ev.conferenceData?.entryPoints?.find((e: { entryPointType?: string; uri?: string }) => e.entryPointType === "video")?.uri || meet_link;
          } else {
            console.error("[calendar-update] google", gRes.status, await gRes.text());
          }
        }
      } catch (e) { console.error("[calendar-update] google", e); }
    }

    await admin.from("appointments").update({
      title, scheduled_at: start_iso, duration_min: durationMin, is_video: !!is_video,
      location: (!is_video ? (location || null) : null), meet_link, notes: notes || null,
      client_email: client_email || appt.client_email,
    }).eq("id", appt.id);

    // Rappel cockpit (best-effort)
    if (appt.prospect_id) {
      await admin.from("follow_ups").update({ scheduled_at: start_iso, reason: `Rendez-vous : ${title}` })
        .eq("owner_id", userId).eq("prospect_id", appt.prospect_id).eq("scheduled_at", appt.scheduled_at)
        .ilike("reason", "Rendez-vous%").then(() => {}, () => {});
    }

    return json({ ok: true, meet_link });
  } catch (e) {
    console.error("[calendar-update-event] uncaught", e);
    return json({ error: "server_error", message: String(e) });
  }
});
