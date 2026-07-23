// ─────────────────────────────────────────────────────────────────────────
// premium-hunt — Chasse PREMIUM (dissociée de la chasse classique).
//
// Cible : LA pépite = entreprise ÉTABLIE/qui tourne (donc a du budget) dont le
// SITE WEB est FAIBLE (grosse marge de progrès). On score et on classe par
// « opportunité ». Aucune invention : Google Places + le site réel + Pappers.
//
// Entrée : { sectors: string[] (mots-clés métier), location: string (ville/CP),
//            limit?: number (candidats analysés, défaut 24),
//            radiusKm?: number (rayon de chasse, défaut 30) }
//
// Pipeline :
//   1. GÉOCODAGE de la ville → point central.
//   2. BALAYAGE géographique : la ville + 6 points en hexagone autour →
//      chaque point interroge Google Places (2 pages) → couvre la grande ville
//      ET toute sa périphérie / ses villages dans le rayon demandé.
//      Chaque résultat garde sa VILLE/VILLAGE réel + sa distance au centre.
//   3. Par candidat (en parallèle) : audit technique du site + enrichissement
//      Pappers (effectif, ancienneté) + Établissement / Faiblesse / Opportunité.
//   4. Classement par Opportunité. Bons sites déjà au top = gardés, derniers.
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
// Ville/village réel d'un établissement, depuis son adresse Google
// ("12 Rue X, 31700 Blagnac, France" → "Blagnac"). C'est ce qu'Hugo veut voir
// affiché même quand on ratisse à 30 km à la ronde.
function townOf(address: string | null): string | null {
  const s = (address || "").replace(/,\s*France\s*$/i, "").trim();
  if (!s) return null;
  const m = s.match(/\b\d{5}\s+([^,]+)/);
  if (m && m[1].trim().length > 1) return m[1].trim();
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1].replace(/\b\d{5}\b/g, "").trim() || null : null;
}
function effectifNum(t: string | null | undefined): number {
  const nums = String(t || "").match(/\d+/g);
  return nums ? Math.max(...nums.map(Number)) : 0;
}
function ageYears(dateStr: string | null | undefined): number | null {
  const m = String(dateStr || "").match(/(\d{4})/);
  return m ? Math.max(0, 2026 - Number(m[1])) : null;
}

// Distance à vol d'oiseau entre deux points (km).
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Centre + 6 points en hexagone : garantit que les communes de périphérie
// (et pas seulement le centre-ville) remontent dans les résultats.
function sweepCenters(c: { lat: number; lng: number }, radiusKm: number): { lat: number; lng: number }[] {
  const ring = radiusKm * 0.6;
  const pts = [c];
  for (let i = 0; i < 6; i++) {
    const brg = (i * 60 * Math.PI) / 180;
    pts.push({
      lat: c.lat + (ring / 111.32) * Math.cos(brg),
      lng: c.lng + (ring / (111.32 * Math.cos((c.lat * Math.PI) / 180))) * Math.sin(brg),
    });
  }
  return pts;
}

// Géocodage de la ville de départ via Places (même clé, pas d'API en plus).
async function geocode(key: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.location,places.formattedAddress" },
      body: JSON.stringify({ textQuery: city, languageCode: "fr", maxResultCount: 1 }),
    });
    if (!r.ok) return null;
    const loc = (await r.json()).places?.[0]?.location;
    return loc ? { lat: loc.latitude, lng: loc.longitude } : null;
  } catch { return null; }
}

type Problem = { titre: string; impact: string; gravite: "critique" | "majeur" | "mineur" };

// Audit technique approfondi (15+ contrôles + temps de chargement). Sort une note
// 0-100 (haut = bon site) ET une liste critique de PROBLÈMES avec leur IMPACT
// business — c'est ce qui sert d'argumentaire au téléphone.
async function auditSite(url: string): Promise<{ score: number; problems: Problem[]; loadMs: number | null }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const t0 = Date.now();
    const r = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" } });
    const loadMs = Date.now() - t0;
    clearTimeout(t);
    if (r.status >= 500) {
      return { score: 6, problems: [{ titre: "Site en erreur serveur (500)", impact: "Le site est inaccessible : chaque visiteur envoyé par Google est perdu.", gravite: "critique" }], loadMs };
    }
    const finalUrl = r.url || url;
    const enc = (r.headers.get("content-encoding") || "").toLowerCase();
    const html = (await r.text()).slice(0, 400000);
    let score = 0; const P: Problem[] = [];
    const add = (pts: number, ok: boolean, titre: string, impact: string, gravite: Problem["gravite"]) => {
      if (ok) score += pts; else P.push({ titre, impact, gravite });
    };

    // Sécurité & performance
    add(16, finalUrl.startsWith("https://"), "Pas de HTTPS",
      "Le navigateur affiche « site non sécurisé » au visiteur, et Google déclasse la page.", "critique");
    add(10, loadMs < 2500, `Site lent (${(loadMs / 1000).toFixed(1)} s)`,
      "Au-delà de ~3 s, une grande partie des visiteurs ferment avant même de voir la page.", "majeur");
    add(4, enc.includes("gzip") || enc.includes("br"), "Pas de compression",
      "Les pages sont plus lourdes que nécessaire, donc plus lentes sur mobile/4G.", "mineur");

    // Mobile
    add(14, /<meta[^>]+name=["']viewport["']/i.test(html), "Pas optimisé mobile",
      "La balise viewport manque : le site s'affiche en version bureau, illisible sur téléphone — or l'essentiel des recherches locales se fait au téléphone.", "critique");

    // SEO on-page
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
    add(9, title.length >= 10, "Titre de page absent ou trop court",
      "C'est la ligne bleue cliquable sur Google : sans elle, la page ne ressort pas et n'attire aucun clic.", "critique");
    add(9, /<meta[^>]+name=["']description["'][^>]*content=["'][^"']{20,}/i.test(html), "Meta description absente",
      "Google pioche un extrait au hasard sous le lien : aucune promesse commerciale, donc moins de clics.", "majeur");
    add(5, /<h1[\s>]/i.test(html), "Aucun titre H1",
      "Google ne sait pas de quoi parle la page : le référencement du métier et de la ville s'en trouve affaibli.", "majeur");
    add(4, /rel=["']canonical["']/i.test(html), "Pas de balise canonical",
      "Risque de contenu dupliqué : Google peut diluer ou ignorer les pages.", "mineur");
    add(3, /\blang=["'][a-z]/i.test(html), "Langue de la page non déclarée",
      "Petit signal SEO manquant, et gêne les lecteurs d'écran.", "mineur");

    // Données structurées / visibilité IA
    add(10, /application\/ld\+json/i.test(html), "Aucune donnée structurée (schema)",
      "Sans schema, l'entreprise est quasi invisible pour les réponses IA de Google (AI Overviews) et n'obtient ni étoiles, ni horaires, ni fiche enrichie dans les résultats.", "critique");
    add(4, /property=["']og:/i.test(html), "Pas de balises de partage (Open Graph)",
      "Quand le lien est partagé sur WhatsApp/LinkedIn/Facebook, l'aperçu est vide ou moche : ça décrédibilise.", "mineur");

    // Qualité / accessibilité
    const imgs = (html.match(/<img\b/gi) || []).length;
    const alts = (html.match(/<img\b[^>]*\balt=/gi) || []).length;
    add(5, imgs === 0 || alts / Math.max(1, imgs) >= 0.6, "Images sans texte alternatif",
      "Les images ne remontent pas dans Google Images et le site est inaccessible aux malvoyants.", "mineur");
    add(2, /<link[^>]+rel=["'][^"']*icon/i.test(html), "Pas de favicon",
      "Onglet sans logo : détail, mais ça fait « site bricolé ».", "mineur");
    const textLen = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
    add(10, textLen >= 900, "Contenu très pauvre",
      "Trop peu de texte pour que Google comprenne et positionne le site sur les recherches du métier.", "majeur");

    // Technologie datée
    const outdated = /wix\.com|jimdo|pagesjaunes|1&1|ionos-website|jquery-1\.|jquery\/1\.|<font\b|<marquee|<center\b|bgcolor=/i.test(html);
    add(5, !outdated, "Technologie / mise en page datée",
      "Site monté sur un constructeur bas de gamme ou du code obsolète : image vieillissante et évolutions bloquées.", "majeur");

    return { score: Math.max(0, Math.min(100, score)), problems: P, loadMs };
  } catch {
    return { score: 0, problems: [{ titre: "Site injoignable ou trop lent", impact: "Le site n'a pas répondu en 9 s : pour un visiteur comme pour Google, il n'existe pas.", gravite: "critique" }], loadMs: null };
  }
}

// Recherche Places, biaisée sur un point géographique + pagination.
async function placesSearch(
  key: string, query: string, bias: { lat: number; lng: number }, radiusM: number, pageToken?: string,
): Promise<{ places: any[]; next: string | null }> {
  try {
    const body: Record<string, unknown> = {
      textQuery: query, languageCode: "fr", maxResultCount: 20,
      locationBias: { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: radiusM } },
    };
    if (pageToken) body.pageToken = pageToken;
    const r = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.userRatingCount,places.rating,places.nationalPhoneNumber,places.location,nextPageToken",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return { places: [], next: null };
    const j = await r.json();
    return { places: j.places || [], next: j.nextPageToken || null };
  } catch { return { places: [], next: null }; }
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { sectors, location, limit, radiusKm } = await req.json();
    if (!Array.isArray(sectors) || sectors.length === 0 || !location) {
      return new Response(JSON.stringify({ error: "Paramètres requis : sectors (liste) + location." }), { status: 400, headers: cors });
    }
    const placesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const pappersKey = Deno.env.get("PAPPERS_API_KEY");
    if (!placesKey) return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY manquante." }), { status: 500, headers: cors });

    const city = cleanCity(String(location));
    const cpHint = extractCP(String(location));
    const deepN = Math.min(Math.max(Number(limit) || 24, 3), 40);
    const R = Math.min(Math.max(Number(radiusKm) || 30, 5), 60);

    // 1. Géocodage du point de départ
    const center = await geocode(placesKey, `${city}, France`);
    if (!center) {
      return new Response(JSON.stringify({ candidates: [], count: 0, warning: `Ville « ${city} » introuvable. Essaie « Ville » ou « CP Ville ».` }), { status: 200, headers: cors });
    }
    const centers = sweepCenters(center, R);
    const biasRadiusM = Math.round(R * 0.55 * 1000);

    // 2. BALAYAGE : chaque secteur × chaque point de l'hexagone × 2 pages
    const found: any[] = [];
    const seen = new Set<string>();
    const targetSectors = sectors.slice(0, 8).map(String);

    for (const sector of targetSectors) {
      const isB2B = B2B_HINTS.some((h) => strip(sector).includes(h));
      const perCenter = await Promise.all(centers.map(async (pt) => {
        const out: any[] = [];
        let token: string | undefined = undefined;
        for (let page = 0; page < 2; page++) {
          const { places, next }: { places: any[]; next: string | null } =
            await placesSearch(placesKey, sector, pt, biasRadiusM, token);
          out.push(...places);
          if (!next) break;
          token = next;
        }
        return out;
      }));

      for (const p of perCenter.flat()) {
        const nom = p.displayName?.text || "";
        const website = p.websiteUri || null;
        // Chasse Premium = uniquement les entreprises qui ONT déjà un site.
        if (!nom || !website) continue;
        const key = host(website) || strip(nom);
        if (seen.has(key)) continue;

        // Filtre géographique dur : dans le rayon demandé autour de la ville.
        const loc = p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null;
        const dist = loc ? haversineKm(center, loc) : null;
        if (dist != null && dist > R) continue;

        seen.add(key);
        found.push({
          nom, website,
          adresse: p.formattedAddress || null,
          ville: townOf(p.formattedAddress || null),
          distance_km: dist != null ? Math.round(dist * 10) / 10 : null,
          telephone: p.nationalPhoneNumber || null,
          avis: p.userRatingCount ?? null,
          note: p.rating ?? null,
          secteur: sector, isB2B,
        });
      }
    }

    if (found.length === 0) {
      return new Response(JSON.stringify({ candidates: [], count: 0, scanned: 0, city, radius_km: R, warning: `Aucun établissement avec site web trouvé pour ces métiers à ${R} km autour de « ${city} ».` }), { status: 200, headers: cors });
    }

    // On analyse en profondeur les mieux établis (plus d'avis = tourne le plus)
    found.sort((a, b) => (b.avis ?? 0) - (a.avis ?? 0));
    const toAnalyze = found.slice(0, deepN);

    // 3. Analyse par candidat (parallèle) : audit site + Pappers + scores
    const analyzed = await Promise.all(toAnalyze.map(async (c) => {
      const reasons: string[] = [];
      const cpCand = extractCP(c.adresse || "") || cpHint;

      const [audit, pap] = await Promise.all([
        auditSite(c.website),
        pappersKey ? pappersLookup(pappersKey, c.nom, cpCand) : Promise.resolve(null),
      ]);

      const eff = pap?.eff ?? 0;
      const age = pap?.age ?? null;
      const establishment = establishmentScore(c.avis, c.note, eff);

      // Preuves que l'entreprise tourne (= a du budget)
      if (c.avis != null) reasons.push(`${c.avis} avis Google${c.note ? ` (${c.note}/5)` : ""}`);
      if (eff >= 1) reasons.push(`${eff} salarié${eff > 1 ? "s" : ""}`);
      if (age != null) reasons.push(`établie depuis ${age} ans`);
      if (c.ville) reasons.push(c.distance_km != null && c.distance_km >= 1 ? `${c.ville} · à ${c.distance_km} km` : c.ville);

      const problems = audit.problems;
      const weakness = Math.min(100, 100 - audit.score);
      let opportunity = Math.round((establishment * weakness) / 100);
      if (c.isB2B) opportunity = Math.min(100, Math.round(opportunity * 1.15));

      const critiques = problems.filter((p) => p.gravite === "critique").length;
      const majeurs = problems.filter((p) => p.gravite === "majeur").length;
      const priorite = opportunity >= 55 ? "Chaud" : opportunity >= 30 ? "Tiède" : opportunity >= 12 ? "Froid" : "Site déjà solide";

      // Verdict synthétique : la phrase qu'Hugo lit avant de décrocher.
      let verdict: string;
      if (problems.length === 0) {
        verdict = "Site techniquement propre : peu de leviers, à contacter en dernier.";
      } else if (critiques >= 2 && establishment >= 60) {
        verdict = `Pépite : l'entreprise tourne clairement (${c.avis ?? 0} avis) mais son site cumule ${critiques} défauts critiques. Refonte à fort impact.`;
      } else if (critiques >= 1) {
        verdict = `${critiques} défaut${critiques > 1 ? "s" : ""} critique${critiques > 1 ? "s" : ""} bloque${critiques > 1 ? "nt" : ""} sa visibilité — angle d'entrée direct.`;
      } else {
        verdict = `Base correcte, ${majeurs} point${majeurs > 1 ? "s" : ""} majeur${majeurs > 1 ? "s" : ""} à corriger pour gagner en visibilité.`;
      }

      return {
        nom: c.nom, secteur: c.secteur, adresse: c.adresse,
        ville: c.ville, distance_km: c.distance_km,
        telephone: c.telephone, website: c.website,
        avis: c.avis, note: c.note, effectif: eff, anciennete: age,
        siren: pap?.siren ?? null, dirigeant: pap?.dirigeant ?? null,
        site_score: audit.score,
        load_ms: audit.loadMs ?? null,
        problemes: problems.slice(0, 10),
        nb_critiques: critiques, nb_majeurs: majeurs,
        verdict, priorite,
        etablissement: establishment, faiblesse: weakness, opportunite: opportunity, b2b: c.isB2B,
        raisons: [...new Set(reasons)].slice(0, 5),
      };
    }));

    analyzed.sort((a, b) => b.opportunite - a.opportunite);
    const villes = [...new Set(found.map((f) => f.ville).filter(Boolean))];
    return new Response(JSON.stringify({
      candidates: analyzed, count: analyzed.length, scanned: found.length,
      city, radius_km: R, villes_couvertes: villes.length, villes: villes.slice(0, 40),
    }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
