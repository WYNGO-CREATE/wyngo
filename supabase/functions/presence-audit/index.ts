// ─── Presence Audit — Diagnostic de présence en ligne ─────────────────
//
//  POST { prospect_id }  (authentifié via supabase.functions.invoke)
//    → score /100 + points rouges/orange/verts sur la présence digitale
//      du prospect, comparée à ses concurrents locaux. Crée le BESOIN ;
//      l'Aperçu Instantané apporte la réponse.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const PLACES_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

type PlaceInfo = {
  rating?: number; reviewCount?: number; photos: number;
  hasHours: boolean; phone?: string | null; website?: string | null; found: boolean;
  businessStatus?: string | null;     // OPERATIONAL / CLOSED_TEMPORARILY / CLOSED_PERMANENTLY
  lastReviewDays?: number | null;     // ancienneté du dernier avis (jours)
};

async function placeLookup(query: string): Promise<PlaceInfo> {
  const empty: PlaceInfo = { photos: 0, hasHours: false, found: false };
  if (!PLACES_KEY) return empty;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_KEY,
        "X-Goog-FieldMask": "places.rating,places.userRatingCount,places.regularOpeningHours,places.nationalPhoneNumber,places.photos,places.websiteUri,places.businessStatus,places.reviews",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "fr", maxResultCount: 1 }),
    });
    if (!res.ok) return empty;
    const data = await res.json();
    const p = data.places?.[0];
    if (!p) return empty;
    // Dernier avis : ancienneté en jours (signal d'activité récente)
    let lastReviewDays: number | null = null;
    const times = (p.reviews || []).map((r: any) => r.publishTime).filter(Boolean).map((t: string) => new Date(t).getTime());
    if (times.length) lastReviewDays = Math.floor((Date.now() - Math.max(...times)) / 86_400_000);
    return {
      rating: p.rating, reviewCount: p.userRatingCount, photos: (p.photos || []).length,
      hasHours: !!p.regularOpeningHours, phone: p.nationalPhoneNumber || null,
      website: p.websiteUri || null, found: true,
      businessStatus: p.businessStatus || null, lastReviewDays,
    };
  } catch { return empty; }
}

// Moyenne note + avis des concurrents locaux (même activité, même ville)
async function competitorBenchmark(term: string, city: string, excludeRatingCount?: number): Promise<{ avgRating: number; avgReviews: number; n: number }> {
  if (!PLACES_KEY || !city) return { avgRating: 0, avgReviews: 0, n: 0 };
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_KEY,
        "X-Goog-FieldMask": "places.rating,places.userRatingCount",
      },
      body: JSON.stringify({ textQuery: `${term} ${city}`, languageCode: "fr", maxResultCount: 12 }),
    });
    if (!res.ok) return { avgRating: 0, avgReviews: 0, n: 0 };
    const data = await res.json();
    const list = (data.places || []).filter((p: any) => typeof p.rating === "number");
    if (list.length === 0) return { avgRating: 0, avgReviews: 0, n: 0 };
    const avgRating = list.reduce((s: number, p: any) => s + (p.rating || 0), 0) / list.length;
    const avgReviews = list.reduce((s: number, p: any) => s + (p.userRatingCount || 0), 0) / list.length;
    return { avgRating: Math.round(avgRating * 10) / 10, avgReviews: Math.round(avgReviews), n: list.length };
  } catch { return { avgRating: 0, avgReviews: 0, n: 0 }; }
}

// Analyse rapide du site existant
type SiteCheck = {
  exists: boolean; https: boolean; mobile: boolean; fast: boolean; ms: number;
  seo: boolean;          // titre + meta description (visibilité Google)
  conversion: boolean;   // formulaire / réservation / clic-pour-appeler
  social: boolean;       // liens réseaux sociaux
  staleYear: number | null; // année de copyright si ancienne (site vieux)
};
async function siteCheck(website?: string | null): Promise<SiteCheck> {
  const blank: SiteCheck = { exists: false, https: false, mobile: false, fast: false, ms: 0, seo: false, conversion: false, social: false, staleYear: null };
  if (!website) return blank;
  let url = website.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const https = url.toLowerCase().startsWith("https://");
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; ArseneBot/1.0)" }, signal: AbortSignal.timeout(8000) });
    const ms = Date.now() - t0;
    if (!res.ok) return { ...blank, https, ms };
    const html = (await res.text()).slice(0, 120000);
    const low = html.toLowerCase();
    const mobile = /<meta[^>]+name=["']viewport["']/i.test(html);
    const hasTitle = /<title[^>]*>[^<]{3,}<\/title>/i.test(html);
    const hasDesc = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(html);
    const seo = hasTitle && hasDesc;
    const conversion = /<form[\s>]/i.test(low) || /tel:\+?\d/.test(low)
      || /(calendly|doctolib|planity|fresha|reservation|réserver|reserver|prendre[\s-]?rendez|rendez-vous|booking)/i.test(low);
    const social = /(facebook\.com|instagram\.com|linkedin\.com|tiktok\.com)\//i.test(low);
    // Fraîcheur : année de copyright la plus récente trouvée
    const years = Array.from(low.matchAll(/(?:©|&copy;|copyright)[^0-9]{0,20}(20\d{2})/g)).map((m) => parseInt(m[1], 10));
    const maxYear = years.length ? Math.max(...years) : null;
    const staleYear = maxYear && maxYear <= new Date().getFullYear() - 2 ? maxYear : null;
    return { exists: true, https, mobile, fast: ms < 2500, ms, seo, conversion, social, staleYear };
  } catch {
    return { ...blank, https, ms: Date.now() - t0 };
  }
}

type Item = { category: string; label: string; status: "red" | "orange" | "green"; detail: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  try {
    const { prospect_id } = await req.json().catch(() => ({}));
    if (!prospect_id) return json({ error: "prospect_id requis" }, 400);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: p, error: pErr } = await db.from("prospects")
      .select("company, first_name, last_name, location, website, phone, industry, brief_activity")
      .eq("id", prospect_id).maybeSingle();
    if (pErr) return json({ error: "Lecture prospect: " + pErr.message }, 500);
    if (!p) return json({ error: "Prospect introuvable" }, 404);

    const company = p.company || `${p.first_name || ""} ${p.last_name || ""}`.trim();
    const city = (p.location || "").split(/[,]/)[0]?.trim() || p.location || "";
    const term = p.brief_activity || p.industry || "entreprise";

    const [place, site] = await Promise.all([
      placeLookup(`${company} ${p.location || ""}`.trim()),
      siteCheck(p.website),
    ]);
    const bench = await competitorBenchmark(term, city);

    const website = p.website || place.website;
    const hasWebsite = site.exists || !!website;
    const rating = place.rating;
    const reviews = place.reviewCount || 0;

    const items: Item[] = [];
    // Barème dynamique : on cumule points obtenus / points possibles, puis on normalise /100.
    let got = 0, max = 0;
    const add = (weight: number, earnedRatio: number, item?: Item) => {
      max += weight; got += weight * Math.max(0, Math.min(1, earnedRatio));
      if (item) items.push(item);
    };

    // ── 1. SITE WEB ──────────────────────────────────────────────────
    if (!hasWebsite) {
      add(12, 0, { category: "Site web", label: "Aucun site web", status: "red", detail: "Vos clients ne vous trouvent pas en ligne — c'est le premier réflexe d'achat aujourd'hui." });
      add(8, 0); add(4, 0); add(6, 0); add(6, 0); add(4, 0); // mobile/vitesse/seo/conversion/fraîcheur : tout manque
    } else if (!site.exists) {
      add(12, 1, { category: "Site web", label: "Site injoignable", status: "orange", detail: "Le site déclaré ne répond pas — peut-être obsolète, en panne ou abandonné." });
      add(8, 0); add(4, 0); add(6, 0); add(6, 0); add(4, 0);
    } else {
      add(12, 1);
      add(8, site.mobile ? 1 : 0, site.mobile ? undefined : { category: "Site web", label: "Pas adapté au mobile", status: "red", detail: "80% des recherches locales se font sur téléphone — un site non responsive fait fuir." });
      add(3, site.https ? 1 : 0, site.https ? undefined : { category: "Site web", label: "Pas de HTTPS (non sécurisé)", status: "orange", detail: "Les navigateurs affichent « non sécurisé » — ça inquiète le visiteur." });
      add(4, site.fast ? 1 : 0, site.fast ? undefined : { category: "Site web", label: `Site lent (${(site.ms / 1000).toFixed(1)}s)`, status: "orange", detail: "Au-delà de 3s de chargement, la moitié des visiteurs abandonnent." });
      add(6, site.seo ? 1 : 0, site.seo ? undefined : { category: "Référencement", label: "Mal référencé (titre/description manquants)", status: "orange", detail: "Sans balises SEO, le site est quasi invisible sur Google." });
      add(6, site.conversion ? 1 : 0, site.conversion ? { category: "Conversion", label: "Le site permet d'agir (contact/réservation)", status: "green", detail: "Formulaire, réservation ou clic-pour-appeler détecté." } : { category: "Conversion", label: "Aucun moyen de convertir le visiteur", status: "red", detail: "Pas de formulaire ni de réservation : le visiteur repart sans laisser de trace." });
      if (site.staleYear) add(4, 0, { category: "Site web", label: `Site daté (© ${site.staleYear})`, status: "orange", detail: "Un site qui paraît vieux fait douter de l'activité de l'entreprise." });
      else add(4, 1);
      if (site.mobile && site.https && site.fast && site.seo) items.push({ category: "Site web", label: "Bases techniques saines", status: "green", detail: "Mobile, sécurisé, rapide et référençable." });
    }

    // ── 2. AVIS GOOGLE ───────────────────────────────────────────────
    if (rating) {
      add(18, rating / 5);
      const diff = bench.avgRating ? rating - bench.avgRating : 0;
      if (bench.avgRating && rating + 0.2 < bench.avgRating) {
        items.push({ category: "Avis", label: `Note ${rating.toFixed(1)}★ sous la concurrence (${bench.avgRating.toFixed(1)}★)`, status: "orange", detail: "Vos concurrents inspirent plus confiance au premier coup d'œil." });
      } else {
        items.push({ category: "Avis", label: `Note Google ${rating.toFixed(1)}★`, status: rating >= 4 ? "green" : "orange", detail: bench.avgRating ? `Moyenne des concurrents : ${bench.avgRating.toFixed(1)}★ (${diff >= 0 ? "+" : ""}${diff.toFixed(1)})` : "Note Google actuelle." });
      }
    } else {
      add(18, 0, { category: "Avis", label: "Aucun avis Google", status: "red", detail: "Sans avis, les clients passent au concurrent d'à côté qui en a." });
    }
    // Volume d'avis vs concurrents
    if (bench.avgReviews > 0) {
      const ratio = reviews / Math.max(bench.avgReviews, 1);
      add(12, Math.min(ratio, 1), ratio < 0.6 ? { category: "Avis", label: `Seulement ${reviews} avis (concurrents : ~${bench.avgReviews})`, status: "orange", detail: "Moins d'avis = moins de visibilité et de confiance." } : undefined);
    } else add(12, reviews > 0 ? 0.6 : 0);
    // Fraîcheur des avis (activité récente)
    if (place.lastReviewDays != null) {
      const fresh = place.lastReviewDays <= 90 ? 1 : place.lastReviewDays <= 365 ? 0.5 : 0;
      add(6, fresh, place.lastReviewDays > 180 ? { category: "Avis", label: `Dernier avis il y a ${Math.round(place.lastReviewDays / 30)} mois`, status: "orange", detail: "Peu d'avis récents : le commerce paraît moins actif qu'il ne l'est." } : undefined);
    } else add(6, 0);

    // ── 3. FICHE GOOGLE ──────────────────────────────────────────────
    if (place.photos >= 5) add(8, 1, { category: "Fiche Google", label: `${place.photos} photos`, status: "green", detail: "Bonne couverture visuelle." });
    else if (place.photos > 0) add(8, 0.5, { category: "Fiche Google", label: `Seulement ${place.photos} photo(s)`, status: "orange", detail: "Les fiches avec 5+ photos reçoivent bien plus de visites." });
    else add(8, 0, { category: "Fiche Google", label: "Aucune photo sur Google", status: "red", detail: "Une fiche sans photo paraît fermée ou abandonnée." });
    add(6, place.hasHours ? 1 : 0, place.hasHours ? undefined : { category: "Fiche Google", label: "Horaires absents sur Google", status: "orange", detail: "Sans horaires, le client ne sait pas si vous êtes ouvert — il appelle ailleurs." });
    add(6, (place.phone || p.phone) ? 1 : 0, (place.phone || p.phone) ? undefined : { category: "Fiche Google", label: "Téléphone non visible", status: "orange", detail: "Le clic-pour-appeler est le 1er geste d'un client pressé." });
    // Statut établissement
    if (place.businessStatus === "CLOSED_PERMANENTLY") items.push({ category: "Fiche Google", label: "Marqué « définitivement fermé » sur Google", status: "red", detail: "Google indique l'établissement comme fermé — à corriger d'urgence, vous êtes invisible." });
    else if (place.businessStatus === "CLOSED_TEMPORARILY") items.push({ category: "Fiche Google", label: "Marqué « temporairement fermé »", status: "orange", detail: "Ce statut décourage les visites — à mettre à jour." });

    // ── 4. RÉSEAUX SOCIAUX ───────────────────────────────────────────
    if (site.exists) add(6, site.social ? 1 : 0, site.social ? { category: "Réseaux", label: "Réseaux sociaux reliés au site", status: "green", detail: "Bon point pour la visibilité et la preuve sociale." } : { category: "Réseaux", label: "Aucun réseau social relié", status: "orange", detail: "Instagram/Facebook lié au site renforce la confiance et le référencement." });

    // ── 5. VISIBILITÉ vs concurrents ─────────────────────────────────
    if (bench.n > 0) {
      const ok = reviews >= bench.avgReviews && !!rating && rating >= bench.avgRating;
      add(12, ok ? 1 : Math.min(reviews / Math.max(bench.avgReviews, 1), 1),
        ok ? { category: "Visibilité", label: "Vous tenez tête à la concurrence locale", status: "green", detail: `Comparé à ${bench.n} concurrents de ${city}.` }
           : { category: "Visibilité", label: "Distancé par la concurrence locale", status: "orange", detail: `${bench.n} concurrents à ${city} ont en moyenne ${bench.avgRating.toFixed(1)}★ et ~${bench.avgReviews} avis.` });
    }

    let score = max > 0 ? Math.round((got / max) * 100) : 0;
    score = Math.max(0, Math.min(100, score));
    const grade = score >= 80 ? "Excellente" : score >= 60 ? "Correcte" : score >= 40 ? "Fragile" : "Critique";
    const summary = !hasWebsite
      ? `Sans site web, ${company} laisse filer des clients chaque jour vers des concurrents mieux équipés.`
      : score < 60
        ? `La présence en ligne de ${company} est ${grade.toLowerCase()} : plusieurs failles font perdre des clients.`
        : `${company} a une base correcte, mais des points concrets peuvent encore lui faire gagner des clients.`;

    // Ordre : rouge d'abord, puis orange, puis vert
    const rank = { red: 0, orange: 1, green: 2 };
    items.sort((a, b) => rank[a.status] - rank[b.status]);

    return json({
      ok: true, score, grade, summary, items,
      business: { company, city, rating: rating || null, reviews, hasWebsite, photos: place.photos },
      benchmark: bench,
    });
  } catch (e) {
    console.error("presence-audit error", e);
    return json({ error: String(e) }, 500);
  }
});
