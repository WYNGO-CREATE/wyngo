// ─── Calendly Sync — importe les réservations dans Wyngo ──────────────
//
//  POST (JWT utilisateur). Lit les événements Calendly réservés via l'API
//  v2 (jeton CALENDLY_TOKEN), et pour chacun :
//    • crée/relie une fiche prospect (par email de l'invité)
//    • crée un RDV dans l'Agenda (source 'calendly', dédoublonné par URI)
//  Renvoie { imported, leads, total }.
//
//  body { action: "status" } → { configured: bool }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CALENDLY_TOKEN = Deno.env.get("CALENDLY_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const cal = (path: string) =>
  fetch(`https://api.calendly.com${path}`, { headers: { Authorization: `Bearer ${CALENDLY_TOKEN}`, "Content-Type": "application/json" } });

function splitName(full: string): { first: string; last: string } {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Client", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "status") return json({ configured: !!CALENDLY_TOKEN });
    if (!CALENDLY_TOKEN) return json({ error: "calendly_not_configured", message: "Jeton Calendly absent." });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauth", message: "Non autorisé" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "unauth", message: "Non authentifié" }, 401);
    const userId = u.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Identité Calendly (URI utilisateur)
    const meRes = await cal("/users/me");
    if (!meRes.ok) {
      const t = await meRes.text();
      console.error("[calendly] /users/me", meRes.status, t);
      return json({ error: "calendly_auth", message: "Jeton Calendly invalide ou expiré." });
    }
    const me = await meRes.json();
    const userUri: string = me.resource.uri;

    // 2. Événements réservés (de -1j à +120j)
    const minT = new Date(Date.now() - 86400_000).toISOString();
    const maxT = new Date(Date.now() + 120 * 86400_000).toISOString();
    const evRes = await cal(`/scheduled_events?user=${encodeURIComponent(userUri)}&status=active&min_start_time=${encodeURIComponent(minT)}&max_start_time=${encodeURIComponent(maxT)}&count=100&sort=start_time:asc`);
    if (!evRes.ok) {
      const t = await evRes.text();
      console.error("[calendly] scheduled_events", evRes.status, t);
      return json({ error: "calendly_error", message: "Lecture des réservations impossible." });
    }
    const events = (await evRes.json()).collection || [];

    let imported = 0, leads = 0;
    for (const ev of events) {
      const evUri: string = ev.uri;
      // déjà importé ?
      const { data: existing } = await admin.from("appointments").select("id").eq("external_ref", evUri).maybeSingle();
      if (existing) continue;

      // Invité (nom + email)
      let inviteeName = "", inviteeEmail = "";
      try {
        const invRes = await cal(`/scheduled_events/${evUri.split("/").pop()}/invitees?count=1`);
        if (invRes.ok) {
          const inv = (await invRes.json()).collection?.[0];
          inviteeName = inv?.name || "";
          inviteeEmail = inv?.email || "";
        }
      } catch (_) { /* ignore */ }

      // Prospect : match par email, sinon création
      let prospectId: string | null = null;
      if (inviteeEmail) {
        const { data: existingProsp } = await admin.from("prospects").select("id").eq("owner_id", userId).ilike("email", inviteeEmail).maybeSingle();
        if (existingProsp) {
          prospectId = existingProsp.id;
        } else {
          const { first, last } = splitName(inviteeName);
          const { data: newProsp } = await admin.from("prospects").insert({
            owner_id: userId, first_name: first, last_name: last, email: inviteeEmail,
            source: "calendly", status: "interesse", notes: "Lead issu d'une réservation Calendly.",
          }).select("id").single();
          if (newProsp) { prospectId = newProsp.id; leads++; }
        }
      }

      // Visio / lieu
      const loc = ev.location || {};
      const isVideo = /google_conference|zoom|microsoft_teams|gotomeeting|webex|google_meet/i.test(loc.type || "") || !!loc.join_url;
      const meetLink = loc.join_url || null;
      const locationText = !isVideo ? (loc.location || (loc.type === "physical" ? "Présentiel" : null)) : null;
      const durMin = Math.max(5, Math.round((new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 60000));

      await admin.from("appointments").insert({
        owner_id: userId, prospect_id: prospectId,
        title: ev.name || "Rendez-vous Calendly",
        client_email: inviteeEmail || null, scheduled_at: ev.start_time, duration_min: durMin,
        location: locationText, is_video: isVideo, meet_link: meetLink,
        status: "planifie", source: "calendly", external_ref: evUri,
        notes: inviteeName ? `Réservé via Calendly par ${inviteeName}.` : "Réservé via Calendly.",
      });
      imported++;
    }

    return json({ ok: true, imported, leads, total: events.length });
  } catch (e) {
    console.error("[calendly-sync] uncaught", e);
    return json({ error: "server_error", message: String(e) });
  }
});
