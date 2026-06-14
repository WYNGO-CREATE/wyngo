// ─── Stripe — génère un lien de paiement pour une facture ──────────────
//
//  body { action: "status" }      → { configured: bool }  (Stripe branché ?)
//  body { document_id }           → crée un Payment Link Stripe pour le
//                                   montant TTC, le stocke sur la facture,
//                                   renvoie { url }. Le client paie en 1 clic ;
//                                   le webhook marque ensuite « payé ».
//
//  Auth : JWT utilisateur (RLS owner-only sur documents).
//  Requiert le secret STRIPE_SECRET_KEY (sinon "stripe_not_configured").

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));

    // Sonde de configuration (pour l'UI)
    if (body.action === "status") return json({ configured: !!STRIPE_KEY });
    if (!STRIPE_KEY) return json({ error: "stripe_not_configured" });

    // Auth utilisateur
    const authHeader = req.headers.get("Authorization") || "";
    const supa = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const docId = body.document_id;
    if (!docId) return json({ error: "document_id requis" });

    const { data: doc } = await supa.from("documents").select("*").eq("id", docId).maybeSingle();
    if (!doc) return json({ error: "Facture introuvable" });
    if (doc.type !== "facture") return json({ error: "Le paiement en ligne concerne les factures." });
    if (doc.status === "brouillon") return json({ error: "Émets la facture avant d'activer le paiement." });
    if (doc.payment_url) return json({ ok: true, url: doc.payment_url }); // déjà généré

    // Montant recalculé depuis les lignes (source de vérité, jamais périmé)
    const { data: bs } = await supa.from("billing_settings").select("vat_regime").eq("id", true).maybeSingle();
    const franchise = bs?.vat_regime !== "normal";
    const docLines = Array.isArray(doc.lines) ? doc.lines : [];
    let total = 0;
    for (const l of docLines) {
      const ht = (Number(l.quantity) || 0) * (Number(l.unit_price_ht) || 0);
      total += franchise ? ht : ht * (1 + (Number(l.vat_rate) || 0) / 100);
    }
    if (!Number.isFinite(total) || total <= 0) total = Number(doc.total_ttc || 0);
    const cents = Math.round(total * 100);
    if (!Number.isFinite(cents) || cents < 50) return json({ error: "Montant trop faible : ajoute une ligne avec un prix (minimum 0,50 €)." });

    const stripe = new Stripe(STRIPE_KEY, { httpClient: Stripe.createFetchHttpClient(), apiVersion: "2023-10-16" });
    const label = `${doc.number || "Facture"}${doc.client_name ? " · " + doc.client_name : ""}`.slice(0, 250);

    const price = await stripe.prices.create({
      unit_amount: cents, currency: "eur", product_data: { name: label },
    });
    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { document_id: doc.id },
    });

    await supa.from("documents")
      .update({ payment_url: link.url, payment_provider_id: link.id, payment_enabled: true })
      .eq("id", doc.id);

    return json({ ok: true, url: link.url });
  } catch (e) {
    console.error("stripe-payment-link", e);
    return json({ error: (e as Error).message || "Erreur Stripe" }, 500);
  }
});
