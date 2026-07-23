// ─── Envoi d'un contrat au client par email ───────────────────────────
//
//  POST (JWT utilisateur) { contract_id, origin }
//   → email avec bouton « Lire et signer le contrat » (lien /contrat/<token>).
//  Envoi depuis le Gmail connecté de l'utilisateur (contact@wyngo.fr).
//  Passe le contrat en statut « envoye ».

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildRawMultipartEmail, transactionalEmail } from "../_shared/email-html.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

async function refreshAccessToken(refresh_token: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!, client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
      refresh_token, grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`refresh_failed: ${await res.text()}`);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method", message: "Method not allowed" }, 405);
  try {
    const { contract_id, origin } = await req.json();
    if (!contract_id) return json({ error: "missing", message: "contract_id requis" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauth", message: "Non autorisé" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "unauth", message: "Non authentifié" }, 401);
    const userId = u.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: ct } = await admin.from("contracts").select("*").eq("id", contract_id).maybeSingle();
    if (!ct) return json({ error: "not_found", message: "Contrat introuvable." });
    if (!ct.client_email) return json({ error: "no_email", message: "Renseigne l'email du client sur le contrat." });

    const { data: s } = await admin.from("billing_settings").select("*").eq("id", true).maybeSingle();
    const sellerName = s?.trade_name || s?.legal_name || "Wyngo";
    const baseUrl = (typeof origin === "string" && origin.startsWith("http")) ? origin.replace(/\/$/, "") : "https://wyngoworkspace.bold-unit-739e.workers.dev";
    const ctaUrl = `${baseUrl}/contrat/${ct.share_token}`;
    const title = (ct.body && ct.body.title) || ct.title || "Contrat de prestation";

    const htmlBody = transactionalEmail({
      brand: sellerName,
      greetingName: ct.client_name,
      intro: `Veuillez trouver votre <b>${esc(title)}</b>. Vous pouvez le lire en entier et le signer en ligne en un clic — signature électronique horodatée, à valeur légale (eIDAS).`,
      ctaUrl,
      ctaLabel: "Lire et signer le contrat",
      footerLines: [
        `${esc(sellerName)}${s?.email ? ` · ${esc(s.email)}` : ""}${s?.phone ? ` · ${esc(s.phone)}` : ""}`,
        s?.siret ? `SIRET : ${esc(s.siret)}` : "",
      ],
    });

    const textBody = `Bonjour ${ct.client_name || ""},\n\nVeuillez trouver votre ${title}. Lisez-le et signez-le en ligne :\n${ctaUrl}\n\n${sellerName}`;

    const { data: account } = await admin.from("gmail_accounts").select("*").eq("user_id", userId).eq("is_active", true).maybeSingle();
    if (!account) return json({ error: "no_gmail", message: "Connecte ton compte Gmail (Inbox) pour envoyer des emails." });
    let access_token = account.access_token;
    if (new Date(account.expires_at).getTime() - Date.now() < 60_000) {
      const r = await refreshAccessToken(account.refresh_token);
      access_token = r.access_token;
      await admin.from("gmail_accounts").update({ access_token, expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", account.id);
    }

    const fromName = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(sellerName)))}?=`;
    const subject = `Votre contrat — ${sellerName}`;
    const raw = buildRawMultipartEmail({ from: `${fromName} <${account.email}>`, to: ct.client_email, subject, textBody, htmlBody });

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error("[contract-send] gmail", sendRes.status, err);
      return json({ error: "send_failed", message: "Envoi de l'email impossible (vérifie la connexion Gmail)." });
    }

    await admin.from("contracts").update({ status: ct.status === "signe" ? ct.status : "envoye", sent_at: new Date().toISOString() }).eq("id", ct.id);
    return json({ ok: true, to: ct.client_email });
  } catch (e) {
    console.error("[contract-send] uncaught", e);
    return json({ error: "server_error", message: String(e) });
  }
});
