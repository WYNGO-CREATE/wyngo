/**
 * ─── SiteIntegrationsPanel — Brancher des outils externes sur le site ──
 *
 * Catalogue d'intégrations "sans code" : le client branche SON propre
 * compte (Stripe, Calendly, Doctolib…) en collant un lien/identifiant, et
 * on injecte l'embed officiel au bon endroit du site. Aucune clé secrète
 * stockée côté Wyngo — que des embeds publics côté client.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plug, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";

type Field = { key: string; label: string; placeholder: string };
type Where = "body-end" | "head";
type Integration = {
  id: string; label: string; cat: string; emoji: string;
  fields: Field[];
  build: (v: Record<string, string>) => string;
  where?: Where;
  hint?: string;
};

// Bouton stylé générique (hérite de la police du site, look neutre premium)
const btn = (href: string, label: string, bg = "#111827") =>
  `\n<div style="text-align:center;padding:30px 16px">\n  <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;background:${bg};color:#fff;padding:15px 34px;border-radius:12px;font-weight:600;text-decoration:none;font-family:inherit;font-size:15px;box-shadow:0 10px 24px -10px rgba(0,0,0,.4)">${label}</a>\n</div>\n`;

const iframe = (src: string, h = 420) =>
  `\n<div style="max-width:1000px;margin:24px auto;padding:0 16px">\n  <iframe src="${src}" width="100%" height="${h}" style="border:0;border-radius:16px;width:100%" loading="lazy" allowfullscreen></iframe>\n</div>\n`;

const CATALOG: Integration[] = [
  // ── Rendez-vous / réservation ──
  { id: "calendly", cat: "Rendez-vous", emoji: "📅", label: "Calendly (RDV)", fields: [{ key: "url", label: "Lien Calendly", placeholder: "https://calendly.com/votre-compte/30min" }],
    build: (v) => `\n<div style="max-width:1000px;margin:24px auto;padding:0 16px">\n  <div class="calendly-inline-widget" data-url="${v.url}" style="min-width:320px;height:640px"></div>\n  <script src="https://assets.calendly.com/assets/external/widget.js" async></script>\n</div>\n` },
  { id: "planity", cat: "Rendez-vous", emoji: "💇", label: "Planity (coiffure/esthé)", fields: [{ key: "url", label: "Lien Planity", placeholder: "https://www.planity.com/votre-salon" }], build: (v) => btn(v.url, "Prendre rendez-vous", "#6d28d9") },
  { id: "doctolib", cat: "Rendez-vous", emoji: "🩺", label: "Doctolib (santé)", fields: [{ key: "url", label: "Lien Doctolib", placeholder: "https://www.doctolib.fr/..." }], build: (v) => btn(v.url, "Prendre rendez-vous sur Doctolib", "#0596de") },
  { id: "treatwell", cat: "Rendez-vous", emoji: "💆", label: "Treatwell (beauté/spa)", fields: [{ key: "url", label: "Lien Treatwell", placeholder: "https://www.treatwell.fr/..." }], build: (v) => btn(v.url, "Réserver un soin", "#00b3a4") },
  { id: "thefork", cat: "Rendez-vous", emoji: "🍽️", label: "TheFork (resto)", fields: [{ key: "url", label: "Lien TheFork", placeholder: "https://www.thefork.fr/restaurant/..." }], build: (v) => btn(v.url, "Réserver une table", "#00683f") },
  { id: "booking_generic", cat: "Rendez-vous", emoji: "🗓️", label: "Réservation (autre lien)", fields: [{ key: "url", label: "Lien de réservation", placeholder: "https://..." }, { key: "label", label: "Texte du bouton", placeholder: "Réserver maintenant" }], build: (v) => btn(v.url, v.label || "Réserver") },

  // ── Paiement ──
  { id: "stripe_link", cat: "Paiement", emoji: "💳", label: "Stripe — lien de paiement", hint: "Crée un « Payment Link » dans ton dashboard Stripe et colle l'URL.", fields: [{ key: "url", label: "Payment Link Stripe", placeholder: "https://buy.stripe.com/..." }, { key: "label", label: "Texte du bouton", placeholder: "Payer en ligne" }], build: (v) => btn(v.url, v.label || "Payer en ligne", "#635bff") },
  { id: "stripe_buybutton", cat: "Paiement", emoji: "🛒", label: "Stripe — bouton d'achat", hint: "Depuis Stripe → Buy Button : copie l'ID + ta clé publique.", fields: [{ key: "id", label: "buy-button-id", placeholder: "buy_btn_xxx" }, { key: "pk", label: "Clé publique (pk_live_...)", placeholder: "pk_live_xxx" }],
    build: (v) => `\n<div style="text-align:center;padding:28px 16px">\n  <script async src="https://js.stripe.com/v3/buy-button.js"></script>\n  <stripe-buy-button buy-button-id="${v.id}" publishable-key="${v.pk}"></stripe-buy-button>\n</div>\n` },
  { id: "paypal", cat: "Paiement", emoji: "🅿️", label: "PayPal.me", fields: [{ key: "url", label: "Lien PayPal.me", placeholder: "https://paypal.me/votrecompte" }], build: (v) => btn(v.url, "Payer avec PayPal", "#003087") },

  // ── Commande & menu ──
  { id: "ubereats", cat: "Commande & menu", emoji: "🛵", label: "Uber Eats", fields: [{ key: "url", label: "Lien Uber Eats", placeholder: "https://www.ubereats.com/..." }], build: (v) => btn(v.url, "Commander sur Uber Eats", "#06c167") },
  { id: "deliveroo", cat: "Commande & menu", emoji: "🚲", label: "Deliveroo", fields: [{ key: "url", label: "Lien Deliveroo", placeholder: "https://deliveroo.fr/..." }], build: (v) => btn(v.url, "Commander sur Deliveroo", "#00ccbc") },
  { id: "justeat", cat: "Commande & menu", emoji: "🍔", label: "Just Eat", fields: [{ key: "url", label: "Lien Just Eat", placeholder: "https://www.just-eat.fr/..." }], build: (v) => btn(v.url, "Commander en ligne", "#ff8000") },
  { id: "menu_pdf", cat: "Commande & menu", emoji: "📄", label: "Carte / menu (PDF ou lien)", fields: [{ key: "url", label: "Lien du menu", placeholder: "https://.../carte.pdf" }, { key: "label", label: "Texte du bouton", placeholder: "Voir la carte" }], build: (v) => btn(v.url, v.label || "Voir la carte") },
  { id: "shopify", cat: "Commande & menu", emoji: "🏬", label: "Shopify (boutique)", fields: [{ key: "url", label: "Lien boutique Shopify", placeholder: "https://votre-boutique.myshopify.com" }], build: (v) => btn(v.url, "Voir la boutique", "#95bf47") },

  // ── Contact ──
  { id: "whatsapp", cat: "Contact", emoji: "💬", label: "WhatsApp (bouton flottant)", fields: [{ key: "num", label: "Numéro (format intl, sans +)", placeholder: "33612345678" }],
    build: (v) => `\n<a href="https://wa.me/${(v.num || "").replace(/\\D/g, "")}" target="_blank" rel="noopener" aria-label="WhatsApp" style="position:fixed;bottom:22px;right:22px;width:58px;height:58px;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:9999"><svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.5-1.2-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.2.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.6-.1l.7-.9c.2-.3.4-.2.6-.1l1.9.9c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z"/></svg></a>\n` },
  { id: "call", cat: "Contact", emoji: "📞", label: "Bouton Appeler", fields: [{ key: "num", label: "Numéro de téléphone", placeholder: "0612345678" }], build: (v) => btn(`tel:${(v.num || "").replace(/\s/g, "")}`, "📞 Nous appeler", "#0f766e") },
  { id: "email", cat: "Contact", emoji: "✉️", label: "Bouton Email", fields: [{ key: "addr", label: "Adresse email", placeholder: "contact@exemple.fr" }], build: (v) => btn(`mailto:${v.addr}`, "Nous écrire") },
  { id: "form_contact", cat: "Contact", emoji: "📝", label: "Formulaire de contact (Formspree)", hint: "Crée un formulaire gratuit sur formspree.io et colle l'URL d'action.", fields: [{ key: "action", label: "URL Formspree", placeholder: "https://formspree.io/f/xxxx" }],
    build: (v) => `\n<div style="max-width:560px;margin:30px auto;padding:0 16px">\n  <form action="${v.action}" method="POST" style="display:flex;flex-direction:column;gap:12px">\n    <input name="nom" placeholder="Votre nom" required style="padding:13px 15px;border:1px solid #d4d4d8;border-radius:10px;font-family:inherit">\n    <input name="email" type="email" placeholder="Votre email" required style="padding:13px 15px;border:1px solid #d4d4d8;border-radius:10px;font-family:inherit">\n    <textarea name="message" rows="4" placeholder="Votre message" required style="padding:13px 15px;border:1px solid #d4d4d8;border-radius:10px;font-family:inherit"></textarea>\n    <button type="submit" style="background:#111827;color:#fff;padding:14px;border:0;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit">Envoyer</button>\n  </form>\n</div>\n` },

  // ── Carte & avis ──
  { id: "gmaps", cat: "Carte & avis", emoji: "🗺️", label: "Google Maps (carte)", fields: [{ key: "addr", label: "Adresse complète", placeholder: "12 rue des Lilas, 31000 Toulouse" }], build: (v) => iframe(`https://www.google.com/maps?q=${encodeURIComponent(v.addr || "")}&output=embed`, 380) },
  { id: "google_reviews", cat: "Carte & avis", emoji: "⭐", label: "Avis Google (lien)", fields: [{ key: "url", label: "Lien fiche / avis Google", placeholder: "https://g.page/r/..." }], build: (v) => btn(v.url, "⭐ Voir nos avis Google", "#4285f4") },
  { id: "trustpilot", cat: "Carte & avis", emoji: "🟢", label: "Trustpilot (lien)", fields: [{ key: "url", label: "Lien Trustpilot", placeholder: "https://fr.trustpilot.com/review/..." }], build: (v) => btn(v.url, "Nos avis Trustpilot", "#00b67a") },

  // ── Réseaux & contenu ──
  { id: "instagram", cat: "Réseaux", emoji: "📸", label: "Instagram (bouton)", fields: [{ key: "handle", label: "Identifiant (sans @)", placeholder: "votrecompte" }], build: (v) => btn(`https://instagram.com/${(v.handle || "").replace(/@/g, "")}`, "Suivez-nous sur Instagram", "#c13584") },
  { id: "facebook", cat: "Réseaux", emoji: "📘", label: "Facebook (bouton)", fields: [{ key: "url", label: "Lien page Facebook", placeholder: "https://facebook.com/votrepage" }], build: (v) => btn(v.url, "Notre page Facebook", "#1877f2") },
  { id: "tiktok", cat: "Réseaux", emoji: "🎵", label: "TikTok (bouton)", fields: [{ key: "url", label: "Lien TikTok", placeholder: "https://tiktok.com/@votrecompte" }], build: (v) => btn(v.url, "Nous suivre sur TikTok", "#000000") },
  { id: "youtube", cat: "Réseaux", emoji: "▶️", label: "Vidéo YouTube", fields: [{ key: "id", label: "ID de la vidéo", placeholder: "dQw4w9WgXcQ" }], build: (v) => iframe(`https://www.youtube.com/embed/${v.id}`, 400) },

  // ── Newsletter & chat ──
  { id: "mailchimp", cat: "Newsletter & chat", emoji: "📭", label: "Newsletter (Mailchimp)", hint: "Mailchimp → Signup forms → copie l'URL d'action du formulaire.", fields: [{ key: "action", label: "URL d'action Mailchimp", placeholder: "https://xxx.list-manage.com/subscribe/post?u=..." }],
    build: (v) => `\n<div style="max-width:520px;margin:30px auto;padding:0 16px;text-align:center">\n  <p style="font-weight:600;margin-bottom:12px">Recevez nos actualités</p>\n  <form action="${v.action}" method="post" target="_blank" style="display:flex;gap:8px">\n    <input type="email" name="EMAIL" placeholder="Votre email" required style="flex:1;padding:13px 15px;border:1px solid #d4d4d8;border-radius:10px;font-family:inherit">\n    <button type="submit" style="background:#111827;color:#fff;padding:13px 20px;border:0;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit">S'inscrire</button>\n  </form>\n</div>\n` },
  { id: "crisp", cat: "Newsletter & chat", emoji: "🟦", label: "Chat en direct (Crisp)", where: "head", hint: "Crée un compte Crisp (gratuit) et copie ton Website ID.", fields: [{ key: "id", label: "Crisp Website ID", placeholder: "xxxxxxxx-xxxx-..." }],
    build: (v) => `\n<script>window.$crisp=[];window.CRISP_WEBSITE_ID="${v.id}";(function(){var d=document,s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();</script>\n` },
  { id: "typeform", cat: "Newsletter & chat", emoji: "🧾", label: "Formulaire Typeform / Tally", fields: [{ key: "url", label: "Lien du formulaire", placeholder: "https://form.typeform.com/to/xxxx" }], build: (v) => iframe(v.url, 560) },

  // ── Rendez-vous (+) ──
  { id: "calcom", cat: "Rendez-vous", emoji: "🗓️", label: "Cal.com", fields: [{ key: "url", label: "Lien Cal.com", placeholder: "https://cal.com/votre-compte" }], build: (v) => btn(v.url, "Prendre rendez-vous", "#111827") },
  { id: "acuity", cat: "Rendez-vous", emoji: "📆", label: "Acuity Scheduling", fields: [{ key: "url", label: "Lien Acuity", placeholder: "https://app.acuityscheduling.com/..." }], build: (v) => btn(v.url, "Réserver un créneau", "#111827") },
  { id: "fresha", cat: "Rendez-vous", emoji: "💅", label: "Fresha (beauté)", fields: [{ key: "url", label: "Lien Fresha", placeholder: "https://www.fresha.com/..." }], build: (v) => btn(v.url, "Réserver sur Fresha", "#1f1147") },
  { id: "kiute", cat: "Rendez-vous", emoji: "✂️", label: "Kiute (coiffure/barbier)", fields: [{ key: "url", label: "Lien Kiute", placeholder: "https://www.kiute.fr/..." }], build: (v) => btn(v.url, "Prendre rendez-vous", "#e6356b") },
  { id: "guestonline", cat: "Rendez-vous", emoji: "🍷", label: "Guestonline (resto)", fields: [{ key: "url", label: "Lien Guestonline", placeholder: "https://module.guestonline.io/..." }], build: (v) => btn(v.url, "Réserver une table", "#1a1a1a") },
  { id: "booking_hotel", cat: "Rendez-vous", emoji: "🏨", label: "Booking.com (hôtel)", fields: [{ key: "url", label: "Lien fiche Booking", placeholder: "https://www.booking.com/hotel/..." }], build: (v) => btn(v.url, "Réserver sur Booking", "#003580") },
  { id: "airbnb", cat: "Rendez-vous", emoji: "🛏️", label: "Airbnb (logement)", fields: [{ key: "url", label: "Lien annonce Airbnb", placeholder: "https://www.airbnb.fr/rooms/..." }], build: (v) => btn(v.url, "Voir sur Airbnb", "#ff385c") },

  // ── Paiement (+) ──
  { id: "sumup", cat: "Paiement", emoji: "💶", label: "SumUp (lien de paiement)", fields: [{ key: "url", label: "Lien SumUp", placeholder: "https://pay.sumup.com/..." }, { key: "label", label: "Texte du bouton", placeholder: "Payer en ligne" }], build: (v) => btn(v.url, v.label || "Payer en ligne", "#1a1a1a") },
  { id: "lydia", cat: "Paiement", emoji: "📲", label: "Lydia", fields: [{ key: "url", label: "Lien Lydia.me", placeholder: "https://lydia.me/..." }], build: (v) => btn(v.url, "Payer avec Lydia", "#0a84ff") },
  { id: "helloasso", cat: "Paiement", emoji: "🤝", label: "HelloAsso (assos/dons)", fields: [{ key: "url", label: "Lien HelloAsso", placeholder: "https://www.helloasso.com/..." }], build: (v) => btn(v.url, "Faire un don / payer", "#1c5dcd") },
  { id: "gofundme", cat: "Paiement", emoji: "🎗️", label: "Cagnotte (GoFundMe/Leetchi)", fields: [{ key: "url", label: "Lien de la cagnotte", placeholder: "https://..." }], build: (v) => btn(v.url, "Participer à la cagnotte", "#02a95c") },

  // ── Commande & menu (+) ──
  { id: "toogoodtogo", cat: "Commande & menu", emoji: "🌱", label: "Too Good To Go (anti-gaspi)", fields: [{ key: "url", label: "Lien Too Good To Go", placeholder: "https://share.toogoodtogo.com/..." }], build: (v) => btn(v.url, "Sauver un panier", "#1d8d3e") },
  { id: "etsy", cat: "Commande & menu", emoji: "🧶", label: "Etsy (créateurs)", fields: [{ key: "url", label: "Lien boutique Etsy", placeholder: "https://www.etsy.com/shop/..." }], build: (v) => btn(v.url, "Voir la boutique Etsy", "#f1641e") },
  { id: "clickcollect", cat: "Commande & menu", emoji: "🛍️", label: "Click & Collect (lien)", fields: [{ key: "url", label: "Lien de commande", placeholder: "https://..." }, { key: "label", label: "Texte du bouton", placeholder: "Commander & retirer" }], build: (v) => btn(v.url, v.label || "Commander en ligne") },

  // ── Contact (+) ──
  { id: "messenger", cat: "Contact", emoji: "💬", label: "Messenger (bouton)", fields: [{ key: "user", label: "Nom d'utilisateur Page", placeholder: "votrepage" }], build: (v) => btn(`https://m.me/${(v.user || "").replace(/@/g, "")}`, "Discuter sur Messenger", "#0084ff") },
  { id: "telegram", cat: "Contact", emoji: "✈️", label: "Telegram (bouton)", fields: [{ key: "user", label: "Identifiant Telegram", placeholder: "votrecompte" }], build: (v) => btn(`https://t.me/${(v.user || "").replace(/@/g, "")}`, "Nous contacter sur Telegram", "#229ed9") },
  { id: "sms", cat: "Contact", emoji: "📩", label: "Bouton SMS", fields: [{ key: "num", label: "Numéro", placeholder: "0612345678" }], build: (v) => btn(`sms:${(v.num || "").replace(/\s/g, "")}`, "Envoyer un SMS", "#0f766e") },
  { id: "waze", cat: "Contact", emoji: "🚗", label: "Itinéraire Waze", fields: [{ key: "addr", label: "Adresse", placeholder: "12 rue des Lilas, Toulouse" }], build: (v) => btn(`https://waze.com/ul?q=${encodeURIComponent(v.addr || "")}`, "Y aller avec Waze", "#33ccff") },

  // ── Carte & avis (+) ──
  { id: "tripadvisor", cat: "Carte & avis", emoji: "🦉", label: "Tripadvisor", fields: [{ key: "url", label: "Lien Tripadvisor", placeholder: "https://www.tripadvisor.fr/..." }], build: (v) => btn(v.url, "Nos avis Tripadvisor", "#00aa6c") },
  { id: "yelp", cat: "Carte & avis", emoji: "📕", label: "Yelp", fields: [{ key: "url", label: "Lien Yelp", placeholder: "https://www.yelp.fr/biz/..." }], build: (v) => btn(v.url, "Nos avis Yelp", "#d32323") },
  { id: "pagesjaunes", cat: "Carte & avis", emoji: "📒", label: "PagesJaunes", fields: [{ key: "url", label: "Lien PagesJaunes", placeholder: "https://www.pagesjaunes.fr/..." }], build: (v) => btn(v.url, "Notre fiche PagesJaunes", "#111827") },
  { id: "gbp", cat: "Carte & avis", emoji: "📍", label: "Fiche Google Business", fields: [{ key: "url", label: "Lien fiche Google", placeholder: "https://g.page/..." }], build: (v) => btn(v.url, "Voir notre fiche Google", "#4285f4") },

  // ── Réseaux (+) ──
  { id: "linkedin", cat: "Réseaux", emoji: "💼", label: "LinkedIn", fields: [{ key: "url", label: "Lien LinkedIn", placeholder: "https://www.linkedin.com/company/..." }], build: (v) => btn(v.url, "Suivez-nous sur LinkedIn", "#0a66c2") },
  { id: "twitter", cat: "Réseaux", emoji: "🐦", label: "X (Twitter)", fields: [{ key: "url", label: "Lien X", placeholder: "https://x.com/votrecompte" }], build: (v) => btn(v.url, "Nous suivre sur X", "#000000") },
  { id: "pinterest", cat: "Réseaux", emoji: "📌", label: "Pinterest", fields: [{ key: "url", label: "Lien Pinterest", placeholder: "https://www.pinterest.fr/votrecompte" }], build: (v) => btn(v.url, "Nos inspirations Pinterest", "#e60023") },
  { id: "linktree", cat: "Réseaux", emoji: "🌳", label: "Linktree (tous les liens)", fields: [{ key: "url", label: "Lien Linktree", placeholder: "https://linktr.ee/votrecompte" }], build: (v) => btn(v.url, "Tous nos liens", "#111827") },

  // ── Médias ──
  { id: "spotify", cat: "Médias", emoji: "🎧", label: "Spotify (playlist/podcast)", fields: [{ key: "url", label: "Lien de partage Spotify", placeholder: "https://open.spotify.com/..." }], build: (v) => iframe((v.url || "").replace("open.spotify.com/", "open.spotify.com/embed/"), 352) },
  { id: "vimeo", cat: "Médias", emoji: "🎬", label: "Vidéo Vimeo", fields: [{ key: "id", label: "ID de la vidéo", placeholder: "76979871" }], build: (v) => iframe(`https://player.vimeo.com/video/${v.id}`, 400) },
  { id: "googledrive", cat: "Médias", emoji: "📁", label: "Document / catalogue (Drive)", fields: [{ key: "url", label: "Lien de partage Drive/PDF", placeholder: "https://drive.google.com/..." }, { key: "label", label: "Texte du bouton", placeholder: "Voir le catalogue" }], build: (v) => btn(v.url, v.label || "Voir le document") },

  // ── Newsletter & chat (+) ──
  { id: "brevo", cat: "Newsletter & chat", emoji: "📨", label: "Newsletter (Brevo)", hint: "Brevo → Formulaire → copie l'URL d'action.", fields: [{ key: "action", label: "URL d'action Brevo", placeholder: "https://xxx.sibforms.com/serve/..." }],
    build: (v) => `\n<div style="max-width:520px;margin:30px auto;padding:0 16px;text-align:center">\n  <p style="font-weight:600;margin-bottom:12px">Recevez nos actualités</p>\n  <form action="${v.action}" method="post" target="_blank" style="display:flex;gap:8px">\n    <input type="email" name="EMAIL" placeholder="Votre email" required style="flex:1;padding:13px 15px;border:1px solid #d4d4d8;border-radius:10px;font-family:inherit">\n    <button type="submit" style="background:#111827;color:#fff;padding:13px 20px;border:0;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit">S'inscrire</button>\n  </form>\n</div>\n` },
  { id: "tawkto", cat: "Newsletter & chat", emoji: "💭", label: "Chat en direct (Tawk.to)", where: "head", hint: "Tawk.to (gratuit) → copie l'ID après /chat/ dans le code widget.", fields: [{ key: "id", label: "Tawk.to property/widget", placeholder: "xxxxxxxx/1abc2de" }],
    build: (v) => `\n<script>var Tawk_API=Tawk_API||{};(function(){var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];s1.async=true;s1.src="https://embed.tawk.to/${v.id}";s1.charset="UTF-8";s1.setAttribute("crossorigin","*");s0.parentNode.insertBefore(s1,s0);})();</script>\n` },
  { id: "substack", cat: "Newsletter & chat", emoji: "📰", label: "Substack (newsletter)", fields: [{ key: "url", label: "Lien Substack", placeholder: "https://votrecompte.substack.com" }], build: (v) => btn(v.url, "S'abonner à la newsletter", "#ff6719") },
];

const CATS = ["Rendez-vous", "Paiement", "Commande & menu", "Contact", "Carte & avis", "Réseaux", "Médias", "Newsletter & chat"];

export function SiteIntegrationsPanel({ html, onChange }: { html: string; onChange: (h: string) => Promise<void> | void }) {
  const [active, setActive] = useState<Integration | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const open = (it: Integration) => { setActive(it); setVals({}); };

  const inject = async () => {
    if (!active) return;
    const missing = active.fields.find((f) => !(vals[f.key] || "").trim());
    if (missing) { toast.error(`Renseigne : ${missing.label}`); return; }
    setBusy(true);
    try {
      const code = active.build(vals);
      const where: Where = active.where || "body-end";
      let out = html;
      if (where === "head") {
        const i = out.toLowerCase().lastIndexOf("</head>");
        out = i !== -1 ? out.slice(0, i) + code + out.slice(i) : code + out;
      } else {
        const i = out.toLowerCase().lastIndexOf("</body>");
        out = i !== -1 ? out.slice(0, i) + code + out.slice(i) : out + code;
      }
      await onChange(out);
      toast.success(`${active.label} ajouté ✓`);
      setActive(null); setVals({});
    } catch (e) { toast.error("Échec : " + (e as Error).message); }
    setBusy(false);
  };

  if (active) {
    return (
      <div className="p-4 space-y-3 overflow-y-auto">
        <button onClick={() => setActive(null)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </button>
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5">{active.emoji} {active.label}</p>
          {active.hint && <p className="text-xs text-muted-foreground mt-1">{active.hint}</p>}
        </div>
        {active.fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            <Input value={vals[f.key] || ""} placeholder={f.placeholder}
              onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))} className="h-9 text-sm" />
          </div>
        ))}
        <Button className="w-full gap-1.5" onClick={inject} disabled={busy}>
          <Check className="h-4 w-4" /> Ajouter au site
        </Button>
        <p className="text-[11px] text-muted-foreground">Inséré en bas de page. Tu peux ensuite demander à l'IA de « déplacer ce bloc dans la section contact ».</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <div>
        <p className="text-sm font-semibold flex items-center gap-1.5"><Plug className="h-4 w-4 text-primary" /> Intégrations</p>
        <p className="text-xs text-muted-foreground mt-0.5">Branche les outils du client (RDV, paiement, réseaux…). Sans code.</p>
      </div>
      {CATS.map((cat) => (
        <div key={cat} className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{cat}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {CATALOG.filter((i) => i.cat === cat).map((it) => (
              <button key={it.id} onClick={() => open(it)}
                className="w-full text-left text-xs px-2.5 py-2 rounded-md border hover:bg-muted/50 hover:border-primary/40 transition flex items-center gap-2">
                <span className="text-base leading-none">{it.emoji}</span> {it.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
