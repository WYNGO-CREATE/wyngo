// ─── Rapport mensuel (#3) ──────────────────────────────────────────────
//
//  POST { action:"send", site_id, period, to, base }  (authentifié)
//        → enregistre/complète les métriques, génère un lien public et
//          envoie le rapport par email au client via le Gmail de l'agence.
//  GET  ?token=<report_token>  → page publique du rapport mensuel.
//
//  Servie en clair via le Worker Cloudflare (/rapport/<token>).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const nf = (n: number | null) => (n == null ? "—" : Number(n).toLocaleString("fr-FR"));
const monthLabel = (period: string) =>
  new Date(period + "T00:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

async function refreshAccessToken(refresh_token: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
      refresh_token, grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`refresh failed: ${await res.text()}`);
  return await res.json();
}

// Flèche de tendance vs mois précédent
function trend(cur: number | null, prev: number | null): string {
  if (cur == null || prev == null || prev === 0) return "";
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return `<span class="tr flat">→ stable</span>`;
  const up = pct > 0;
  return `<span class="tr ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(pct)}%</span>`;
}

function renderReport(ctx: { m: any; prev: any; siteTitle: string; agencyName: string }): string {
  const { m, prev, siteTitle, agencyName } = ctx;
  const label = monthLabel(m.period);
  const card = (k: string, v: string, t: string, sub = "") => `
    <div class="metric">
      <div class="mv">${v} ${t}</div>
      <div class="mk">${esc(k)}</div>
      ${sub ? `<div class="msub">${sub}</div>` : ""}
    </div>`;

  return `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Rapport ${esc(label)} — ${esc(siteTitle)}</title>
<style>
  *{box-sizing:border-box} html,body{margin:0}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#0f172a;background:#f1f5f9;font-size:14px;line-height:1.55}
  .wrap{max-width:620px;margin:0 auto;padding:22px 16px 60px}
  .hero{background:linear-gradient(135deg,#1B4BE3,#3b5bdb);color:#fff;border-radius:18px;padding:28px;margin-bottom:18px}
  .hero .badge{display:inline-block;background:rgba(255,255,255,.18);padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;margin-bottom:10px;text-transform:capitalize}
  .hero h1{margin:0 0 4px;font-size:23px}
  .hero p{margin:0;opacity:.9;font-size:13px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  .metric{background:#fff;border-radius:14px;box-shadow:0 4px 18px rgba(15,23,42,.06);padding:18px 20px}
  .mv{font-size:26px;font-weight:800;line-height:1}
  .mk{font-size:12px;color:#64748b;margin-top:6px;text-transform:uppercase;letter-spacing:.4px;font-weight:600}
  .msub{margin-top:6px}
  .tr{font-size:12px;font-weight:700;padding:2px 7px;border-radius:7px}
  .tr.up{background:#ecfdf5;color:#047857}.tr.down{background:#fef2f2;color:#b91c1c}.tr.flat{background:#f1f5f9;color:#64748b}
  .note{background:#fff;border-radius:14px;box-shadow:0 4px 18px rgba(15,23,42,.06);padding:20px 22px;margin-bottom:16px}
  .note h3{margin:0 0 6px;font-size:15px}
  .note p{margin:0;color:#334155}
  .cta{background:#0f172a;color:#fff;border-radius:14px;padding:20px 22px;text-align:center}
  .cta p{margin:0 0 4px;font-size:13px;opacity:.85}
  .cta b{font-size:15px}
  .foot{text-align:center;color:#94a3b8;font-size:11px;margin-top:18px}
</style></head>
<body><div class="wrap">
  <div class="hero">
    <span class="badge">${esc(label)}</span>
    <h1>Votre rapport mensuel</h1>
    <p>${esc(siteTitle)} — voici ce que votre site a accompli ce mois-ci.</p>
  </div>

  <div class="grid">
    ${card("Visites", nf(m.visits), "", trend(m.visits, prev?.visits))}
    ${card("Visiteurs uniques", nf(m.unique_visitors), "", trend(m.unique_visitors, prev?.unique_visitors))}
    ${card("Demandes reçues", nf(m.leads), "", trend(m.leads, prev?.leads))}
    ${m.google_position != null ? card("Position Google", "#" + nf(m.google_position), "", "") : ""}
    ${m.google_rating != null ? card("Note Google", String(m.google_rating), "★", "") : ""}
  </div>

  ${m.notes ? `<div class="note"><h3>Le mot de votre équipe</h3><p>${esc(m.notes)}</p></div>` : ""}

  <div class="cta">
    <p>Une question, une idée d'amélioration ?</p>
    <b>${esc(agencyName)} reste à vos côtés.</b>
  </div>
  <div class="foot">Rapport généré automatiquement par Group Arsène</div>
</div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const db = admin();

  try {
    // ── GET : page publique du rapport ────────────────────────────────
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) return html("<h1>Lien invalide</h1>", 400);
      const { data: m } = await db.from("site_metrics").select("*").eq("report_token", token).maybeSingle();
      if (!m) return html(`<div style="font-family:sans-serif;text-align:center;padding:60px">
        <h1 style="font-size:22px">Rapport introuvable</h1></div>`, 404);
      const { data: site } = await db.from("client_sites").select("title, prospect_id").eq("id", m.site_id).maybeSingle();
      // mois précédent pour la tendance
      const prevPeriod = new Date(m.period + "T00:00:00");
      prevPeriod.setMonth(prevPeriod.getMonth() - 1);
      const { data: prev } = await db.from("site_metrics").select("*")
        .eq("site_id", m.site_id).eq("period", prevPeriod.toISOString().slice(0, 10)).maybeSingle();
      const { data: settings } = await db.from("billing_settings").select("trade_name, legal_name").eq("id", true).maybeSingle();
      return html(renderReport({
        m, prev, siteTitle: site?.title || "Votre site",
        agencyName: settings?.trade_name || settings?.legal_name || "Group Arsène",
      }));
    }

    // ── POST : générer + envoyer (authentifié) ────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non authentifié" }, 401);

    const body = await req.json().catch(() => ({}));
    const { site_id, period, to, base } = body;
    if (!site_id || !period) return json({ error: "Paramètres manquants" }, 400);

    const { data: site } = await db.from("client_sites").select("*").eq("id", site_id).maybeSingle();
    if (!site || site.owner_id !== user.id) return json({ error: "Site introuvable" }, 404);

    // Métriques du mois (déjà upsertées côté front) + jeton public
    const { data: m } = await db.from("site_metrics").select("*").eq("site_id", site_id).eq("period", period).maybeSingle();
    if (!m) return json({ error: "Renseignez d'abord les métriques." }, 400);

    let reportToken = m.report_token as string | null;
    if (!reportToken) {
      reportToken = crypto.randomUUID().replace(/-/g, "");
      await db.from("site_metrics").update({ report_token: reportToken }).eq("id", m.id);
    }

    const origin = (base || url.origin).replace(/\/$/, "");
    const reportUrl = `${origin}/rapport/${reportToken}`;
    const label = monthLabel(period);

    // Envoi email via Gmail de l'agence
    const dest = String(to || "").trim();
    if (!dest) return json({ error: "Email du client manquant", url: reportUrl }, 400);

    const { data: account } = await db.from("gmail_accounts").select("*").eq("is_active", true).limit(1).maybeSingle();
    if (!account) return json({ error: "Aucun compte Gmail connecté", url: reportUrl, soft: true }, 200);

    let access_token = account.access_token;
    if (new Date(account.expires_at).getTime() - Date.now() < 60_000) {
      const r = await refreshAccessToken(account.refresh_token);
      access_token = r.access_token;
      await db.from("gmail_accounts")
        .update({ access_token, expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString() })
        .eq("id", account.id);
    }

    const { data: settings } = await db.from("billing_settings").select("trade_name, legal_name").eq("id", true).maybeSingle();
    const agencyName = settings?.trade_name || settings?.legal_name || "Group Arsène";
    const subject = `Votre rapport ${label} — ${site.title || "votre site"}`;
    const textBody =
      `Bonjour,\n\nVoici votre rapport de performance pour ${label}.\n\n` +
      `👉 Consultez-le ici : ${reportUrl}\n\n` +
      `Bonne lecture,\nL'équipe ${agencyName}`;

    const rfc822 = [
      `From: ${agencyName} <${account.email}>`,
      `To: ${dest}`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``, textBody,
    ].join("\r\n");
    const raw = b64(rfc822).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const send = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!send.ok) return json({ error: "Envoi email échoué", detail: await send.text(), url: reportUrl }, 200);

    await db.from("site_metrics").update({ sent_at: new Date().toISOString() }).eq("id", m.id);
    return json({ ok: true, url: reportUrl });
  } catch (e) {
    console.error("monthly-report error", e);
    return json({ error: String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
function html(body: string, status = 200) {
  return new Response(body, { status, headers: { ...cors, "content-type": "text/html; charset=utf-8" } });
}
