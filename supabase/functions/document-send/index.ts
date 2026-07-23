// ─── Envoi d'un devis / facture au client par email ───────────────────
//
//  POST (JWT utilisateur) { document_id, origin }
//   • devis   → email avec bouton « Voir et signer le devis » (lien /devis/<token>)
//   • facture → email avec récap + bouton « Payer en ligne » (lien Stripe,
//               créé automatiquement s'il n'existe pas encore)
//  Envoi depuis le Gmail connecté de l'utilisateur (contact@wyngo.fr).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { buildRawMultipartEmail, transactionalEmail } from "../_shared/email-html.ts";

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
    // Montant recalculé depuis les lignes (source de vérité)
    const franchise = s?.vat_regime !== "normal";
    const docLines0 = Array.isArray(doc.lines) ? doc.lines as { quantity: number; unit_price_ht: number; vat_rate: number }[] : [];
    let total = 0;
    for (const l of docLines0) {
      const ht = (Number(l.quantity) || 0) * (Number(l.unit_price_ht) || 0);
      total += franchise ? ht : ht * (1 + (Number(l.vat_rate) || 0) / 100);
    }
    if (!Number.isFinite(total) || total <= 0) total = Number(doc.total_ttc || 0);

    // Facture : s'assure d'un lien de paiement (créé via Stripe si absent)
    let payUrl: string | null = doc.payment_url || null;
    if (isFacture && !payUrl && STRIPE_KEY) {
      const cents = Math.round(total * 100);
      if (Number.isFinite(cents) && cents >= 50) {
        try {
          const stripe = new Stripe(STRIPE_KEY, { httpClient: Stripe.createFetchHttpClient(), apiVersion: "2023-10-16" });
          const price = await stripe.prices.create({ unit_amount: cents, currency: "eur", product_data: { name: `${doc.number || "Facture"}${doc.client_name ? " · " + doc.client_name : ""}`.slice(0, 250) } });
          const link = await stripe.paymentLinks.create({ line_items: [{ price: price.id, quantity: 1 }], metadata: { document_id: doc.id } });
          payUrl = link.url;
          await admin.from("documents").update({ payment_url: link.url, payment_provider_id: link.id, payment_enabled: true }).eq("id", doc.id);
        } catch (e) { console.error("[document-send] stripe", e); }
      }
    }

    // Sécurité : pour une facture, on n'envoie JAMAIS un bouton « Payer » qui
    // pointe ailleurs que Stripe. Si pas de lien → on refuse l'envoi (message clair).
    if (isFacture && !payUrl) {
      return json({ error: "no_pay_link", message: "Impossible de créer le lien de paiement (montant ≥ 0,50 € + Stripe connecté requis). Crée le lien depuis la carte « Paiement en ligne », puis renvoie." });
    }

    const ctaUrl = isFacture ? (payUrl as string) : `${baseUrl}/devis/${doc.share_token}`;
    const ctaLabel = isFacture ? "Payer en ligne" : "Voir et signer le devis";
    const docWord = isFacture ? "facture" : "devis";

    // ── Corps HTML (gabarit premium partagé) ──
    const lines = Array.isArray(doc.lines) ? doc.lines as { description: string; quantity: number; unit_price_ht: number }[] : [];
    const lineRows = lines.map((l) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f2f4;font-size:13.5px;color:#374151;">${esc(l.description) || "—"}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f2f4;font-size:13.5px;color:#374151;text-align:right;white-space:nowrap;">${eur((Number(l.quantity)||0)*(Number(l.unit_price_ht)||0))}</td>
    </tr>`).join("");
    const contentHtml = lineRows
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 2px;">${lineRows}
          <tr><td style="padding:12px 0 0;font-size:14.5px;font-weight:700;color:#0f172a;">Total</td>
              <td style="padding:12px 0 0;font-size:14.5px;font-weight:700;color:#0f172a;text-align:right;">${eur(total)}</td></tr></table>`
      : "";

    const intro = isFacture
      ? `Voici votre facture <b>${esc(doc.number || "")}</b> d'un montant de <b>${eur(total)}</b>${doc.due_date ? `, à régler avant le <b>${dateFr(doc.due_date)}</b>` : ""}.`
      : `Voici votre devis <b>${esc(doc.number || "")}</b> d'un montant de <b>${eur(total)}</b>. Vous pouvez le consulter et le valider en ligne en un clic.`;

    const htmlBody = transactionalEmail({
      brand: sellerName,
      greetingName: doc.client_name,
      intro,
      contentHtml,
      ctaUrl,
      ctaLabel,
      footerLines: [
        `${esc(sellerName)}${s?.email ? ` · ${esc(s.email)}` : ""}${s?.phone ? ` · ${esc(s.phone)}` : ""}`,
        s?.vat_regime !== "normal" ? "TVA non applicable, art. 293 B du CGI." : "",
      ],
    });

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
