// ─── Réservation publique d'un appel depuis wyngo.fr ──────────────────
//
//  Endpoint PUBLIC (déployé avec --no-verify-jwt) appelé par le site vitrine.
//
//  POST body :
//    { action: "slots", from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
//        → { taken: ["2026-07-02T09:30:00.000Z", ...] }  (créneaux déjà pris)
//    { action: "book", name, email, phone?, start_iso, notes? }
//        → { ok: true, start_iso }  (crée l'événement dans le Google Agenda admin)
//
//  Règles de dispo : Lundi→Samedi, 09:00→18:00, pas de 30 min (dernier 17:30).
//  Le RDV est créé sur le calendrier Google du compte admin (gmail_accounts
//  actif avec le scope Calendar), et le prospect reçoit l'invitation par email.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const CAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TZ = "Europe/Paris";

// Fenêtre d'ouverture (heure de Paris)
const OPEN_HOUR = 9;      // 09:00
const CLOSE_HOUR = 18;    // 18:00 (dernier créneau 17:30)
const SLOT_MIN = 30;      // durée d'un créneau
const MAX_DAYS_AHEAD = 60;

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

// Heure/jour de Paris pour un instant donné (validation des règles de dispo)
function parisParts(d: Date): { dow: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const wd = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dow: map[wd] ?? 0, hour, minute };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ── Liste des créneaux déjà réservés sur une plage ──
    if (action === "slots") {
      const from = new Date(`${body.from}T00:00:00.000Z`);
      const to = new Date(`${body.to}T23:59:59.999Z`);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) return json({ taken: [] });
      const { data } = await admin
        .from("appointments").select("scheduled_at, title")
        .neq("status", "annule")
        .gte("scheduled_at", from.toISOString())
        .lte("scheduled_at", to.toISOString());
      // On ignore les rappels internes (déclarations mensuelles) : ce ne sont pas des RDV clients.
      const taken = (data || [])
        .filter((a: { title: string | null }) => !String(a.title || "").startsWith("🔔 Déclaration"))
        .map((a: { scheduled_at: string }) => a.scheduled_at);
      return json({ taken });
    }

    // ── Réservation d'un créneau ──
    if (action === "book") {
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim();
      const phone = String(body.phone || "").trim();
      const notes = String(body.notes || "").trim();
      const start = new Date(body.start_iso);

      if (!name || name.length < 2) return json({ error: "name", message: "Indiquez votre nom." });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email", message: "Email invalide." });
      if (isNaN(start.getTime())) return json({ error: "slot", message: "Créneau invalide." });

      // Validation des règles de dispo (heure de Paris)
      const now = Date.now();
      if (start.getTime() < now + 60_000) return json({ error: "past", message: "Ce créneau est passé." });
      if (start.getTime() > now + MAX_DAYS_AHEAD * 864e5) return json({ error: "far", message: "Créneau trop lointain." });
      const { dow, hour, minute } = parisParts(start);
      if (dow === 0) return json({ error: "closed", message: "Fermé le dimanche." });
      if (minute % SLOT_MIN !== 0) return json({ error: "slot", message: "Créneau invalide." });
      if (hour < OPEN_HOUR || hour >= CLOSE_HOUR) return json({ error: "closed", message: "Hors des horaires (9h–18h)." });

      const end = new Date(start.getTime() + SLOT_MIN * 60_000);

      // Conflit ? (créneau déjà pris par un vrai RDV client — on ignore les rappels internes)
      const { data: clashes } = await admin
        .from("appointments").select("id, title")
        .neq("status", "annule")
        .eq("scheduled_at", start.toISOString());
      const realClash = (clashes || []).some((c: { title: string | null }) => !String(c.title || "").startsWith("🔔 Déclaration"));
      if (realClash) return json({ error: "taken", message: "Ce créneau vient d'être réservé. Choisissez-en un autre." });

      // Compte Google admin (actif + scope Calendar)
      const { data: accounts } = await admin
        .from("gmail_accounts").select("*").eq("is_active", true);
      const account = (accounts || []).find((a: { scope?: string }) => String(a.scope || "").includes(CAL_SCOPE));
      if (!account) return json({ error: "no_google", message: "Agenda indisponible pour le moment. Réessayez plus tard." });

      let access_token = account.access_token;
      if (new Date(account.expires_at).getTime() - Date.now() < 60_000) {
        const r = await refreshAccessToken(account.refresh_token);
        access_token = r.access_token;
        await admin.from("gmail_accounts").update({
          access_token, expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", account.id);
      }

      const title = `Appel découverte — ${name}`;
      const desc = [
        "Réservation via wyngo.fr",
        `Nom : ${name}`,
        `Email : ${email}`,
        phone ? `Téléphone : ${phone}` : null,
        notes ? `Message : ${notes}` : null,
      ].filter(Boolean).join("\n");

      const event = {
        summary: title,
        description: desc,
        start: { dateTime: start.toISOString(), timeZone: TZ },
        end: { dateTime: end.toISOString(), timeZone: TZ },
        attendees: [{ email }],
        reminders: { useDefault: true },
        // Lien Google Meet généré automatiquement et joint à l'invitation.
        conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
      };

      const gRes = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1",
        { method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(event) },
      );
      if (!gRes.ok) {
        const t = await gRes.text();
        console.error("[book-slot] google error", gRes.status, t);
        return json({ error: "google", message: "La réservation a échoué. Réessayez ou contactez-nous." });
      }
      const ev = await gRes.json();
      const meet_link = ev.hangoutLink || (ev.conferenceData?.entryPoints || []).find((e: { entryPointType?: string; uri?: string }) => e.entryPointType === "video")?.uri || null;

      await admin.from("appointments").insert({
        owner_id: account.user_id, prospect_id: null, title, client_email: email,
        scheduled_at: start.toISOString(), duration_min: SLOT_MIN, is_video: true, meet_link,
        notes: desc, google_event_id: ev.id, google_event_link: ev.htmlLink, status: "planifie",
      });

      return json({ ok: true, start_iso: start.toISOString(), meet_link });
    }

    return json({ error: "action", message: "Action inconnue." }, 400);
  } catch (e) {
    console.error("[book-slot] uncaught", e);
    return json({ error: "server", message: String(e) });
  }
});
