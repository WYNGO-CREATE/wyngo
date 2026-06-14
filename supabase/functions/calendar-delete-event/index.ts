// ─── Supprime un rendez-vous (Wyngo + Google Agenda) ──────────────────
//  POST (JWT utilisateur) { appointment_id }
//   • supprime l'événement Google Agenda (sendUpdates=all → le client est
//     prévenu de l'annulation), s'il existe
//   • supprime le rappel cockpit associé + le RDV

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
    const { appointment_id } = await req.json();
    if (!appointment_id) return json({ error: "missing", message: "appointment_id requis" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauth", message: "Non autorisé" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "unauth", message: "Non authentifié" }, 401);
    const userId = u.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: appt } = await admin.from("appointments").select("*").eq("id", appointment_id).eq("owner_id", userId).maybeSingle();
    if (!appt) return json({ error: "not_found", message: "Rendez-vous introuvable." });

    // Supprime l'événement Google (best-effort)
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
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${appt.google_event_id}?sendUpdates=all`, {
            method: "DELETE", headers: { Authorization: `Bearer ${access_token}` },
          });
        }
      } catch (e) { console.error("[calendar-delete] google", e); }
    }

    // Rappel cockpit associé (best-effort)
    if (appt.prospect_id) {
      await admin.from("follow_ups").delete()
        .eq("owner_id", userId).eq("prospect_id", appt.prospect_id).eq("scheduled_at", appt.scheduled_at)
        .ilike("reason", "Rendez-vous%").then(() => {}, () => {});
    }

    await admin.from("appointments").delete().eq("id", appt.id);
    return json({ ok: true });
  } catch (e) {
    console.error("[calendar-delete-event] uncaught", e);
    return json({ error: "server_error", message: String(e) });
  }
});
