// ─── Envoi d'un devis / facture au client par email ───────────────────
//
//  POST (JWT utilisateur) { document_id, origin }
//   • devis   → email avec bouton « Voir et signer le devis » (lien /devis/<token>)
//   • facture → email avec récap + bouton « Payer en ligne » (lien Stripe,
//               créé automatiquement s'il n'existe pas encore)
//  Envoi depuis le Gmail connecté de l'utilisateur (contact@wyngo.fr).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { buildRawMultipartEmail } from "../_shared/email-html.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const eur = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const dateFr = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

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
    const { document_id, origin } = await req.json();
    if (!document_id) return json({ error: "missing", message: "document_id requis" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauth", message: "Non autorisé" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "unauth", message: "Non authentifié" }, 401);
    const userId = u.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: doc } = await admin.from("documents").select("*").eq("id", document_id).eq("owner_id", userId).maybeSingle();
    if (!doc) return json({ error: "not_found", message: "Document introuvable." });
    if (!doc.client_email) return json({ error: "no_email", message: "Renseigne l'email du client sur le document." });
    if (doc.status === "brouillon") return json({ error: "draft", message: "Émets le document avant de l'envoyer." });

    const { data: s } = await admin.from("billing_settings").select("*").eq("id", true).maybeSingle();
    const sellerName = s?.trade_name || s?.legal_name || "Wyngo";
    const baseUrl = (typeof origin === "string" && origin.startsWith("http")) ? origin.replace(/\/$/, "") : "https://wyngoworkspace.bold-unit-739e.workers.dev";

    const isFacture = doc.type === "facture";
    const total = Number(doc.total_ttc || 0);

    // Facture : s'assure d'un lien de paiement (créé via Stripe si absent)
    let payUrl: string | null = doc.payment_url || null;
    if (isFacture && !payUrl && STRIPE_KEY) {
      const cents = Math.round(total * 100);
      if (cents >= 100) {
        try {
          const stripe = new Stripe(STRIPE_KEY, { httpClient: Stripe.createFetchHttpClient(), apiVersion: "2023-10-16" });
          const price = await stripe.prices.create({ unit_amount: cents, currency: "eur", product_data: { name: `${doc.number || "Facture"}${doc.client_name ? " · " + doc.client_name : ""}`.slice(0, 250) } });
          const link = await stripe.paymentLinks.create({ line_items: [{ price: price.id, quantity: 1 }], metadata: { document_id: doc.id } });
          payUrl = link.url;
          await admin.from("documents").update({ payment_url: link.url, payment_provider_id: link.id, payment_enabled: true }).eq("id", doc.id);
        } catch (e) { console.error("[document-send] stripe", e); }
      }
    }

    const ctaUrl = isFacture ? (payUrl || `${baseUrl}/facturation`) : `${baseUrl}/devis/${doc.share_token}`;
    const ctaLabel = isFacture ? "Payer en ligne" : "Voir et signer le devis";
    const docWord = isFacture ? "facture" : "devis";

    // ── Corps HTML (email-safe, inline styles, bouton en table) ──
    const lines = Array.isArray(doc.lines) ? doc.lines as { description: string; quantity: number; unit_price_ht: number }[] : [];
    const lineRows = lines.map((l) => `<tr>
      <td style="padding:6px 0;border-bottom:1px solid #eee;font-size:13px;">${esc(l.description) || "—"}</td>
      <td style="padding:6px 0;border-bottom:1px solid #eee;font-size:13px;text-align:right;white-space:nowrap;">${eur((Number(l.quantity)||0)*(Number(l.unit_price_ht)||0))}</td>
    </tr>`).join("");

    const intro = isFacture
      ? `Voici votre facture <b>${esc(doc.number || "")}</b> d'un montant de <b>${eur(total)}</b>${doc.due_date ? `, à régler avant le <b>${dateFr(doc.due_date)}</b>` : ""}.`
      : `Voici votre devis <b>${esc(doc.number || "")}</b> d'un montant de <b>${eur(total)}</b>. Vous pouvez le consulter et le valider en ligne en un clic.`;

    const htmlBody = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eceef1;">
    <tr><td style="padding:22px 28px;border-bottom:1px solid #f0f1f3;">
      <div style="font-size:18px;font-weight:800;">${esc(sellerName)}</div>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 14px;font-size:15px;">Bonjour ${esc(doc.client_name) || ""},</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">${intro}</p>
      ${lineRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;">
        ${lineRows}
        <tr><td style="padding:10px 0 0;font-size:14px;font-weight:800;">Total ${isFacture ? "" : ""}</td>
            <td style="padding:10px 0 0;font-size:14px;font-weight:800;text-align:right;">${eur(total)}</td></tr>
      </table>` : ""}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
        <td style="border-radius:10px;background:#4f46e5;">
          <a href="${esc(ctaUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">${ctaLabel} →</a>
        </td>
      </tr></table>
      <p style="margin:0;font-size:12px;color:#8a8a8a;">Ou copiez ce lien : ${esc(ctaUrl)}</p>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #f0f1f3;font-size:12px;color:#8a8a8a;">
      ${esc(sellerName)}${s?.email ? ` · ${esc(s.email)}` : ""}${s?.phone ? ` · ${esc(s.phone)}` : ""}
      ${s?.vat_regime !== "normal" ? `<br>TVA non applicable, art. 293 B du CGI.` : ""}
    </td></tr>
  </table>
  <div style="font-size:11px;color:#b0b4ba;margin-top:14px;">Émis avec Wyngo</div>
</td></tr></table></body></html>`;

    const textBody = `Bonjour ${doc.client_name || ""},\n\n${isFacture ? `Voici votre facture ${doc.number || ""} d'un montant de ${eur(total)}.` : `Voici votre devis ${doc.number || ""} d'un montant de ${eur(total)}.`}\n\n${ctaLabel} : ${ctaUrl}\n\n${sellerName}`;

    // ── Compte Gmail + envoi ──
    const { data: account } = await admin.from("gmail_accounts").select("*").eq("user_id", userId).eq("is_active", true).maybeSingle();
    if (!account) return json({ error: "no_gmail", message: "Connecte ton compte Gmail (Inbox) pour envoyer des emails." });
    let access_token = account.access_token;
    if (new Date(account.expires_at).getTime() - Date.now() < 60_000) {
      const r = await refreshAccessToken(account.refresh_token);
      access_token = r.access_token;
      await admin.from("gmail_accounts").update({ access_token, expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", account.id);
    }

    const fromName = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(sellerName)))}?=`;
    const subject = isFacture ? `Votre facture ${doc.number || ""} — ${sellerName}` : `Votre devis ${doc.number || ""} — ${sellerName}`;
    const raw = buildRawMultipartEmail({ from: `${fromName} <${account.email}>`, to: doc.client_email, subject, textBody, htmlBody });

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error("[document-send] gmail", sendRes.status, err);
      return json({ error: "send_failed", message: "Envoi de l'email impossible (vérifie la connexion Gmail)." });
    }

    // Statut envoyé + sent_at
    await admin.from("documents").update({ status: doc.status === "accepte" || doc.status === "paye" ? doc.status : "envoye", sent_at: new Date().toISOString() }).eq("id", doc.id);

    return json({ ok: true, to: doc.client_email, pay_url: payUrl, type: docWord });
  } catch (e) {
    console.error("[document-send] uncaught", e);
    return json({ error: "server_error", message: String(e) });
  }
});
