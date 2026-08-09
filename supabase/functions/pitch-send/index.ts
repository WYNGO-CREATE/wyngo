// ─── Envoi de la présentation de vente au prospect par email ──────────
//
//  POST (JWT utilisateur) { prospect_id, deck_id, html, origin }
//  Dépose le deck HTML (rendu côté client) dans le bucket public `previews`
//  (servi par le worker en /p/<slug>), puis envoie au prospect un email
//  depuis le Gmail connecté avec un bouton « Voir la présentation ».

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildRawMultipartEmail } from "../_shared/email-html.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

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
    const { prospect_id, deck_id, html, origin } = await req.json();
    if (!prospect_id || !html) return json({ error: "missing", message: "Paramètres manquants." });

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user?.id) return json({ error: "unauth", message: "Non authentifié" }, 401);
    const userId = u.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: p } = await admin.from("prospects").select("company, first_name, last_name, email").eq("id", prospect_id).eq("owner_id", userId).maybeSingle();
    if (!p) return json({ error: "not_found", message: "Prospect introuvable." });
    if (!p.email) return json({ error: "no_email", message: "Renseigne l'email du prospect sur sa fiche." });

    const clientName = p.company || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "vous";
    const baseUrl = (typeof origin === "string" && origin.startsWith("http")) ? origin.replace(/\/$/, "") : "https://wyngoworkspace.bold-unit-739e.workers.dev";

    // 1. Dépose le deck dans le bucket public `previews` (servi en /p/<slug>)
    const slug = `pitch-${crypto.randomUUID()}`;
    const up = await admin.storage.from("previews").upload(`${slug}.html`, new Blob([html], { type: "text/html" }), { contentType: "text/html", upsert: true });
    if (up.error) { console.error("[pitch-send] upload", up.error); return json({ error: "upload", message: "Dépôt de la présentation impossible." }); }
    const deckUrl = `${baseUrl}/p/${slug}`;

    // 2. Identité expéditeur
    const [{ data: profile }, { data: agency }] = await Promise.all([
      admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      admin.from("agency_settings").select("name").eq("id", true).maybeSingle(),
    ]);
    const senderName = agency?.name || profile?.full_name || "Group Arsène";

    // 3. Email
    const htmlBody = `<!doctype html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:14px;border:1px solid #eceef1;overflow:hidden">
    <tr><td style="padding:22px 28px;border-bottom:1px solid #f0f1f3;font-size:18px;font-weight:800">${esc(senderName)}</td></tr>
    <tr><td style="padding:24px 28px">
      <p style="margin:0 0 14px;font-size:15px">Bonjour ${esc(p.first_name) || ""},</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6">Comme convenu, voici la présentation que j'ai préparée pour <b>${esc(clientName)}</b> — avec des chiffres concrets de votre marché et un aperçu de votre futur site.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td style="border-radius:10px;background:#6d28d9">
        <a href="${esc(deckUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px">Voir la présentation →</a>
      </td></tr></table>
      <p style="margin:0;font-size:12px;color:#8a8a8a">Ou copiez ce lien : ${esc(deckUrl)}</p>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #f0f1f3;font-size:12px;color:#8a8a8a">${esc(senderName)} · envoyé avec Group Arsène</td></tr>
  </table>
</td></tr></table></body></html>`;
    const textBody = `Bonjour ${p.first_name || ""},\n\nVoici la présentation préparée pour ${clientName} :\n${deckUrl}\n\n${senderName}`;

    // 4. Envoi via Gmail connecté
    const { data: account } = await admin.from("gmail_accounts").select("*").eq("user_id", userId).eq("is_active", true).maybeSingle();
    if (!account) return json({ error: "no_gmail", message: "Connecte ton compte Gmail (Inbox) pour envoyer." });
    let access_token = account.access_token;
    if (new Date(account.expires_at).getTime() - Date.now() < 60_000) {
      const r = await refreshAccessToken(account.refresh_token);
      access_token = r.access_token;
      await admin.from("gmail_accounts").update({ access_token, expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", account.id);
    }
    const fromName = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(senderName)))}?=`;
    const raw = buildRawMultipartEmail({ from: `${fromName} <${account.email}>`, to: p.email, subject: `Votre présentation — ${senderName}`, textBody, htmlBody });
    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw }),
    });
    if (!sendRes.ok) { console.error("[pitch-send] gmail", sendRes.status, await sendRes.text()); return json({ error: "send_failed", message: "Envoi de l'email impossible (vérifie Gmail)." }); }

    if (deck_id) await admin.from("pitch_decks").update({ public_slug: slug, sent_at: new Date().toISOString() }).eq("id", deck_id).eq("owner_id", userId);

    return json({ ok: true, to: p.email, url: deckUrl });
  } catch (e) {
    console.error("[pitch-send] uncaught", e);
    return json({ error: "server_error", message: String(e) });
  }
});
