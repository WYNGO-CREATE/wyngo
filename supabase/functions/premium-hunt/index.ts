// ─────────────────────────────────────────────────────────────────────────
// premium-hunt — Chasse PREMIUM (dissociée de la chasse classique).
//
// Cible : LA pépite = entreprise ÉTABLIE/qui tourne (donc a du budget) dont le
// SITE WEB est FAIBLE (grosse marge de progrès). On score et on classe par
// « opportunité ». Aucune invention : Google Places + le site réel + Pappers.
//
// Entrée : { sectors: string[] (mots-clés métier), location: string (ville/CP),
//            limit?: number (candidats analysés, défaut 14) }
//
// Pipeline :
//   1. DÉCOUVERTE via Google Places « {secteur} {ville} » → vrais établissements
//      locaux (nom, adresse, site, note, nb d'avis).
//   2. Par candidat (en parallèle) : audit du site web + enrichissement Pappers
//      (effectif, ancienneté) + calcul Établissement / Faiblesse / Opportunité.
//   3. Classement par Opportunité. Bons sites déjà au top = gardés, classés
//      derniers.
// ─────────────────────────────────────────────────────────────────────────

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const PAPPERS_BASE = "https://api.pappers.fr/v2";
const PLACES_BASE = "https://places.googleapis.com/v1";
const B2B_HINTS = ["conseil", "b2b", "industrie", "industriel", "informatique", "logiciel", "ingénierie", "ingenierie", "comptable", "expertise", "agence", "communication", "marketing", "avocat", "juridique", "notaire", "recrutement", "audit", "formation", "transport", "logistique", "grossiste", "fabricant", "architecte"];

const strip = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
function host(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
}
function extractCP(s: string): string | null { const m = (s || "").match(/\b(\d{5})\b/); return m ? m[1] : null; }
function cleanCity(loc: string): string {
  const s = (loc || "").trim();
  const m = s.match(/\b\d{4,5}\s+([a-zA-Zà-ÿ'’ .-]+?)(?:,|$)/);
  if (m && m[1].trim().length > 1) return m[1].trim();
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  const last = parts.length ? parts[parts.length - 1] : s;
  return last.replace(/\b\d{4,5}\b/g, "").trim() || s;
}
function effectifNum(t: string | null | undefined): number {
  const nums = String(t || "").match(/\d+/g);
  return nums ? Math.max(...nums.map(Number)) : 0;
}
function ageYears(dateStr: string | null | undefined): number | null {
  const m = String(dateStr || "").match(/(\d{4})/);
  return m ? Math.max(0, 2026 - Number(m[1])) : null;
}

// Établissement 0-100 : à quel point l'entreprise "tourne" et a du budget.
function establishmentScore(reviews: number | null, rating: number | null, eff: number): number {
  let s = 0;
  const r = reviews ?? 0;
  if (r >= 500) s += 82; else if (r >= 150) s += 72; else if (r >= 50) s += 60;
  else if (r >= 10) s += 46; else if (r >= 1) s += 30; else s += 14;
  if (rating != null) { if (rating >= 4.5) s += 8; else if (rating >= 4.0) s += 4; }
  if (eff >= 10) s += 12; else if (eff >= 5) s += 8; else if (eff >= 1) s += 4;
  return Math.min(100, s);
}

async function auditSite(url: string): Promise<{ score: number; reasons: string[] }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5500);
    const r = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" } });
    clearTimeout(t);
    if (r.status >= 500) return { score: 8, reasons: ["site en erreur serveur"] };
    const finalUrl = r.url || url;
    const html = (await r.text()).slice(0, 200000);
    let score = 0; const bad: string[] = [];
    if (finalUrl.startsWith("https://")) score += 20; else bad.push("pas de HTTPS (site non sécurisé)");
    if (/<meta[^>]+name=["']viewport["']/i.test(html)) score += 20; else bad.push("pas adapté au mobile");
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
    if (title.length >= 10) score += 15; else bad.push("titre SEO absent");
    if (/<meta[^>]+name=["']description["'][^>]*content=["'][^"']{20,}/i.test(html)) score += 15; else bad.push("pas de meta description");
    if (/application\/ld\+json/i.test(html)) score += 15; else bad.push("aucune donnée structurée (SEO/IA)");
    const textLen = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
    if (textLen >= 800) score += 15; else bad.push("contenu très pauvre");
    return { score: Math.min(100, score), reasons: bad };
  } catch { return { score: 0, reasons: ["site injoignable"] }; }
}

async function placesSearch(key: string, query: string): Promise<any[]> {
  const r = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.userRatingCount,places.rating,places.nationalPhoneNumber" },
    body: JSON.stringify({ textQuery: query, languageCode: "fr", maxResultCount: 20 }),
  });
  if (!r.ok) return [];
  return (await r.json()).places || [];
}

// Enrichissement Pappers (best-effort) : effectif + ancienneté + dirigeant + siren.
async function pappersLookup(key: string, name: string, cp: string | null): Promise<{ eff: number; age: number | null; siren: string | null; dirigeant: any } | null> {
  try {
    const url = new URL(`${PAPPERS_BASE}/recherche`);
    url.searchParams.set("api_token", key);
    url.searchParams.set("q", name);
    if (cp) url.searchParams.set("code_postal", cp);
    url.searchParams.set("par_page", "1");
    url.searchParams.set("precision", "approximative");
    url.searchParams.set("bases", "entreprises");
    const r = await fetch(url.toString());
    if (!r.ok) return null;
    const e = (await r.json()).resultats?.[0];
    if (!e) return null;
    const d = e.dirigeants?.[0];
    return {
      eff: effectifNum(e.tranche_effectif || e.effectif),
      age: ageYears(e.date_creation_formate || e.date_creation),
      siren: e.siren || null,
      dirigeant: d ? { prenom: d.prenom || "", nom: d.nom || "", qualite: d.qualite || "" } : null,
    };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { sectors, location, limit } = await req.json();
    if (!Array.isArray(sectors) || sectors.length === 0 || !location) {
      return new Response(JSON.stringify({ error: "Paramètres requis : sectors (liste) + location." }), { status: 400, headers: cors });
    }
    const placesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const pappersKey = Deno.env.get("PAPPERS_API_KEY");
    if (!placesKey) return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY manquante." }), { status: 500, headers: cors });

    const city = cleanCity(String(location));
    const cpHint = extractCP(String(location));
    const deepN = Math.min(Math.max(Number(limit) || 14, 3), 20);

    // 1. DÉCOUVERTE via Places (1 requête par secteur)
    const found: any[] = [];
    const seen = new Set<string>();
    for (const sector of sectors.slice(0, 6)) {
      const isB2B = B2B_HINTS.some((h) => strip(String(sector)).includes(h));
      const places = await placesSearch(placesKey, `${sector} ${city}`);
      for (const p of places) {
        const nom = p.displayName?.text || "";
        const website = p.websiteUri || null;
        const key = host(website) || strip(nom);
        if (!nom || seen.has(key)) continue;
        seen.add(key);
        found.push({
          nom, website,
          adresse: p.formattedAddress || null,
          telephone: p.nationalPhoneNumber || null,
          avis: p.userRatingCount ?? null,
          note: p.rating ?? null,
          secteur: String(sector), isB2B,
        });
      }
    }
    if (found.length === 0) {
      return new Response(JSON.stringify({ candidates: [], count: 0, warning: `Aucun établissement trouvé pour ces secteurs à « ${city} ».` }), { status: 200, headers: cors });
    }

    // On analyse en profondeur les mieux établis (plus d'avis = tourne le plus)
    found.sort((a, b) => (b.avis ?? 0) - (a.avis ?? 0));
    const toAnalyze = found.slice(0, deepN);

    // 2. Analyse par candidat (parallèle) : audit site + Pappers + scores
    const analyzed = await Promise.all(toAnalyze.map(async (c) => {
      const reasons: string[] = [];
      const cpCand = extractCP(c.adresse || "") || cpHint;

      const [audit, pap] = await Promise.all([
        c.website ? auditSite(c.website) : Promise.resolve({ score: 0, reasons: ["aucun site web"] }),
        pappersKey ? pappersLookup(pappersKey, c.nom, cpCand) : Promise.resolve(null),
      ]);

      const eff = pap?.eff ?? 0;
      const age = pap?.age ?? null;
      const establishment = establishmentScore(c.avis, c.note, eff);

      // Raisons "budget/établi"
      if (c.avis != null) reasons.push(`${c.avis} avis Google${c.note ? ` (${c.note}/5)` : ""}`);
      if (eff >= 1) reasons.push(`${eff} salarié${eff > 1 ? "s" : ""}`);
      if (age != null) reasons.push(`établie depuis ${age} ans`);

      // Faiblesse = qualité du site (ce qu'on vient corriger)
      let weakness: number;
      if (!c.website) { weakness = 82; reasons.push("aucun site web"); }
      else {
        weakness = 100 - audit.score;
        for (const b of audit.reasons.slice(0, 3)) reasons.push(b);
      }

      let opportunity = Math.round((establishment * weakness) / 100);
      if (c.isB2B) opportunity = Math.min(100, Math.round(opportunity * 1.15));

      return {
        nom: c.nom, secteur: c.secteur, adresse: c.adresse, telephone: c.telephone,
        website: c.website, avis: c.avis, note: c.note, effectif: eff, anciennete: age,
        siren: pap?.siren ?? null, dirigeant: pap?.dirigeant ?? null,
        site_score: c.website ? audit.score : 0,
        etablissement: establishment, faiblesse: weakness, opportunite: opportunity, b2b: c.isB2B,
        raisons: [...new Set(reasons)].slice(0, 6),
      };
    }));

    analyzed.sort((a, b) => b.opportunite - a.opportunite);
    return new Response(JSON.stringify({ candidates: analyzed, count: analyzed.length, scanned: found.length, city }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
