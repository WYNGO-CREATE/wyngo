/**
 * ─── Pappers Search — Recherche TPE françaises ───
 *
 * Pont vers l'API Pappers (https://api.pappers.fr/v2). La clé API vit en
 * secret Supabase (PAPPERS_API_KEY) — jamais exposée au front.
 *
 * Actions supportées (champ `action` du body) :
 *   • "test"      → vérifie que la clé est valide
 *   • "search"    → recherche d'entreprises par activité, ville, effectif…
 *   • "enrich"    → détail d'une entreprise par SIREN (dirigeants, etc.)
 *
 * La réponse "search" est normalisée pour l'UI :
 *   {
 *     entreprises: [
 *       { siret, siren, nom, code_naf, libelle_naf, ville, code_postal,
 *         tranche_effectif, site_web?, dirigeant_principal?, ... }
 *     ],
 *     pagination: { page, par_page, total }
 *   }
 *
 * Doc API : https://www.pappers.fr/api/documentation
 */

import { searchEntreprises } from "../_shared/entreprises.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PAPPERS_API_KEY = Deno.env.get("PAPPERS_API_KEY");
const PAPPERS_BASE = "https://api.pappers.fr/v2";

async function callPappers(path: string, params: Record<string, string | number | undefined>) {
  if (!PAPPERS_API_KEY) {
    throw new Error(
      "PAPPERS_API_KEY non configurée dans Supabase Edge Functions Secrets. " +
        "Ajoute-la depuis https://supabase.com/dashboard → ton projet → Edge Functions → Secrets.",
    );
  }

  const url = new URL(`${PAPPERS_BASE}${path}`);
  url.searchParams.set("api_token", PAPPERS_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), { method: "GET" });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      (data as { message?: string; error?: string })?.message ||
      (data as { message?: string; error?: string })?.error ||
      `Pappers ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as Record<string, unknown>;
}

// ─── Actions ───

async function actionTest() {
  // Health-check de la source principale : l'API officielle de l'État.
  const { total } = await searchEntreprises({ q: "boulangerie", codePostal: "31000", perPage: 1 });
  return { ok: true, source: "api-recherche-entreprises-etat", echantillon: total };
}

type PappersEntreprise = {
  siren: string;
  siege?: {
    siret?: string;
    ville?: string;
    code_postal?: string;
    adresse_ligne_1?: string;
  };
  nom_entreprise?: string;
  denomination?: string;
  code_naf?: string;
  libelle_code_naf?: string;
  effectif?: string;
  tranche_effectif?: string;
  site_web?: string;
  email?: string;
  telephone?: string;
  date_creation_formate?: string;
  dirigeants?: Array<{
    nom?: string;
    prenom?: string;
    qualite?: string;
  }>;
  domaine_email?: string;
};

// ─── Zone de chasse : ville + rayon (communes réelles autour) ───
// Utilise geo.api.gouv.fr (API officielle, gratuite, sans clé) pour obtenir la
// liste EXACTE des communes/villages dans le rayon demandé. On garde le nom de
// chaque commune : le commercial doit toujours voir où se trouve le prospect.
const GEO = "https://geo.api.gouv.fr";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const normCity = (s: string | null | undefined) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

async function geoJson(path: string): Promise<any> {
  try {
    const r = await fetch(`${GEO}${path}`);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function resolveZone(ville: string | undefined, cp: string | undefined, rayonKm: number) {
  // 1. Commune centrale
  let c: any = null;
  if (cp && /^\d{5}$/.test(cp.trim())) {
    const l = await geoJson(`/communes?codePostal=${cp.trim()}&fields=nom,centre,codeDepartement,codesPostaux`);
    c = l?.[0] || null;
  }
  if (!c && ville) {
    const l = await geoJson(`/communes?nom=${encodeURIComponent(ville)}&fields=nom,centre,codeDepartement,codesPostaux&boost=population&limit=1`);
    c = l?.[0] || null;
  }
  if (!c?.centre?.coordinates) return null;
  const center = { lat: c.centre.coordinates[1], lng: c.centre.coordinates[0] };

  // 2. Départements touchés par le rayon (échantillonnage sur 8 directions)
  const depts = new Set<string>([c.codeDepartement]);
  const probes = await Promise.all(
    Array.from({ length: 8 }, (_, i) => {
      const brg = (i * 45 * Math.PI) / 180;
      const lat = center.lat + (rayonKm / 111.32) * Math.cos(brg);
      const lng = center.lng + (rayonKm / (111.32 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(brg);
      return geoJson(`/communes?lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}&fields=codeDepartement`);
    }),
  );
  for (const p of probes) if (p?.[0]?.codeDepartement) depts.add(p[0].codeDepartement);

  // 3. Toutes les communes de ces départements, filtrées par distance réelle
  const lists = await Promise.all(
    [...depts].map((d) => geoJson(`/departements/${d}/communes?fields=nom,centre,codesPostaux,population`)),
  );
  const communes: Array<{ nom: string; cps: string[]; pop: number }> = [];
  const names = new Set<string>();
  const cps = new Set<string>();
  for (const list of lists) {
    for (const com of list || []) {
      const co = com?.centre?.coordinates;
      if (!co) continue;
      if (haversineKm(center, { lat: co[1], lng: co[0] }) > rayonKm) continue;
      communes.push({ nom: com.nom, cps: com.codesPostaux || [], pop: com.population || 0 });
      names.add(normCity(com.nom));
      for (const p of com.codesPostaux || []) cps.add(p);
    }
  }
  // Les grandes communes d'abord : c'est là que se trouvent les entreprises.
  communes.sort((a, b) => b.pop - a.pop);
  if (names.size === 0) return null;
  return { center, centerName: c.nom, depts: [...depts], names, cps, communes };
}

async function actionSearch(params: {
  code_naf?: string;
  ville?: string;
  code_postal?: string;
  tranche_effectif?: string; // code INSEE ("01", "02", "03", "11"…)
  q?: string;
  page?: number;
  par_page?: number;
  max_results?: number;  // objectif de prospects utiles
  rayon_km?: number;     // 0/absent = ville stricte ; >0 = ville + périphérie
  with_site_web?: boolean | null;
}) {
  const target = Math.min(Math.max(params.max_results ?? params.par_page ?? 20, 1), 300);
  const rayon = Math.min(Math.max(Number(params.rayon_km) || 0, 0), 60);
  const zone = rayon > 0 ? await resolveZone(params.ville, params.code_postal, rayon) : null;

  // L'API officielle n'applique ses filtres géographiques QUE si elle reçoit
  // aussi un mot-clé. On interroge donc commune par commune (les plus peuplées
  // d'abord, c'est là que sont les entreprises), jusqu'à atteindre l'objectif.
  const cibles: Array<{ q: string; cp?: string }> = zone
    ? zone.communes.map((c) => ({ q: c.nom, cp: c.cps[0] }))
    : [{
        q: (params.ville || params.code_postal || "").trim(),
        cp: (params.code_postal || "").trim() || undefined,
      }];

  const collected: any[] = [];
  const seen = new Set<string>();
  let rejected = 0;
  let scanned = 0;
  const communesTouchees = new Set<string>();
  const villeDemandee = normCity(params.ville);

  for (const cible of cibles) {
    if (collected.length >= target) break;
    if (!cible.q) continue;

    for (let page = 1; page <= 3 && collected.length < target; page++) {
      const { results } = await searchEntreprises({
        q: cible.q,
        naf: params.code_naf,
        codePostal: cible.cp,
        trancheEffectif: params.tranche_effectif,
        page,
        perPage: 25,
      });
      scanned += results.length;
      if (results.length === 0) break;

      for (const e of results) {
        // Vérification géographique sur le résultat lui-même : les filtres de
        // l'API ne sont pas fiables à 100 %, on ne livre pas un prospect hors zone.
        const nv = normCity(e.ville);
        const dansZone = zone
          ? zone.names.has(nv)
          : (!villeDemandee || nv.includes(villeDemandee));
        if (!dansZone) { rejected++; continue; }
        if (e.siren && seen.has(e.siren)) continue;
        if (e.siren) seen.add(e.siren);
        if (e.ville) communesTouchees.add(e.ville);

        collected.push({
          siren: e.siren,
          siret: e.siret,
          nom: e.nom,
          code_naf: e.naf,
          libelle_naf: null,          // non fourni par l'API : le front retombe sur le métier choisi
          ville: e.ville,
          code_postal: e.code_postal,
          adresse: e.adresse,
          tranche_effectif: e.effectif_label,
          site_web: null,             // récupéré ensuite via places-enrich
          email: null,                // récupéré ensuite via email-finder / scraper
          telephone: null,
          date_creation: e.date_creation,
          chiffre_affaires: e.ca,
          resultat_net: e.resultat,
          annee_finances: e.annee_finances,
          dirigeant_principal: e.dirigeant,
        });
        if (collected.length >= target) break;
      }
      if (results.length < 25) break;
    }
  }

  return {
    ok: true,
    entreprises: collected.slice(0, target),
    pagination: { page: 1, par_page: 25, total: collected.length },
    rejected_out_of_zone: rejected,
    scanned_pages: scanned,
    source: "api-recherche-entreprises-etat",
    zone: zone
      ? { centre: zone.centerName, rayon_km: rayon, communes: zone.communes.length, departements: zone.depts }
      : null,
    communes_touchees: [...communesTouchees].slice(0, 60),
  };
}

async function actionEnrich(params: { siren: string }) {
  if (!params.siren) throw new Error("siren requis");
  const data = await callPappers("/entreprise", { siren: params.siren });
  return { ok: true, entreprise: data };
}

// ─── Handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    if (!action) return json({ error: "Champ `action` requis" }, 400);

    switch (action) {
      case "test":
        return json(await actionTest());
      case "search":
        return json(await actionSearch(body.params || {}));
      case "enrich":
        return json(await actionEnrich(body.params || {}));
      default:
        return json({ error: `Action inconnue : ${action}` }, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[pappers-search]", msg);
    return json({ error: msg }, 500);
  }
});
