/**
 * ─── Candidature Send (public) ───
 *
 * Reçoit le formulaire "Soumettre une candidature" du site vitrine wyngo.fr
 * (endpoint public, aucune auth) et envoie un email récap à contact@wyngo.fr
 * via le compte Gmail connecté de l'agence (table gmail_accounts).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const DEST = Deno.env.get("CABINET_EMAIL") || "contact@wyngo.fr";
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

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
  if (!res.ok) throw new Error(`refresh failed: ${await res.text()}`);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const company = String(body.company || "").trim();
    const phone = String(body.phone || "").trim();
    const project = String(body.project || "").trim();
    if (!name || !email) return json({ error: "Champs manquants" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: account } = await admin
      .from("gmail_accounts")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!account) return json({ error: "Aucun compte Gmail connecté", soft: true }, 200);

    let access_token = account.access_token;
    if (new Date(account.expires_at).getTime() - Date.now() < 60_000) {
      const r = await refreshAccessToken(account.refresh_token);
      access_token = r.access_token;
      await admin.from("gmail_accounts")
        .update({ access_token, expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString() })
        .eq("id", account.id);
    }

    const subject = `Nouvelle candidature — ${name}${company ? ` · ${company}` : ""}`;
    const text = [
      `Nouvelle candidature reçue depuis wyngo.fr`,
      ``,
      `Nom               : ${name}`,
      `Entreprise / act. : ${company || "—"}`,
      `Email             : ${email}`,
      `Téléphone         : ${phone || "—"}`,
      ``,
      `Projet :`,
      project || "—",
      ``,
      `— Répondre directement à cet email contacte le candidat (${email}).`,
    ].join("\n");

    const rfc822 = [
      `From: ${account.email}`,
      `To: ${DEST}`,
      `Reply-To: ${name} <${email}>`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      text,
    ].join("\r\n");

    const raw = b64(rfc822).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const send = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      },
    );
    if (!send.ok) return json({ error: "Envoi échoué", detail: await send.text() }, 200);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 200);
  }
});
