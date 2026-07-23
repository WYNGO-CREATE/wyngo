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
  // L'endpoint "recherche" avec un paramètre minimal sert de health-check
  const data = await callPappers("/recherche", { q: "test", par_page: 1 });
  const total = (data as { total?: number })?.total;
  return { ok: true, pappers_total_sample: total };
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
    [...depts].map((d) => geoJson(`/departements/${d}/communes?fields=nom,centre,codesPostaux`)),
  );
  const communes: Array<{ nom: string; cps: string[] }> = [];
  const names = new Set<string>();
  const cps = new Set<string>();
  for (const list of lists) {
    for (const com of list || []) {
      const co = com?.centre?.coordinates;
      if (!co) continue;
      if (haversineKm(center, { lat: co[1], lng: co[0] }) > rayonKm) continue;
      communes.push({ nom: com.nom, cps: com.codesPostaux || [] });
      names.add(normCity(com.nom));
      for (const p of com.codesPostaux || []) cps.add(p);
    }
  }
  if (names.size === 0) return null;
  return { center, centerName: c.nom, depts: [...depts], names, cps, communes };
}

async function actionSearch(params: {
  code_naf?: string;
  ville?: string;
  code_postal?: string;
  tranche_effectif?: string; // "0", "1", "2", "3" (codes Pappers)
  q?: string;
  page?: number;
  par_page?: number;
  max_results?: number; // objectif de résultats utiles (après filtrage géo) — pagination auto
  rayon_km?: number;     // 0/absent = ville stricte ; >0 = ville + périphérie
  with_site_web?: boolean | null; // true = uniquement avec site, false = uniquement sans, null/undef = tous
}) {
  // Objectif : nombre de prospects UTILES voulus (après rejet hors-zone).
  // On pagine l'API Pappers (100/page) jusqu'à l'atteindre, avec garde-fou.
  const target = Math.min(Math.max(params.max_results ?? params.par_page ?? 20, 1), 300);
  const PER_PAGE = 100;
  const MAX_PAGES = 8; // 8 × 100 = 800 entreprises scannées max par chasse

  function normalizeCity(s: string | null | undefined): string {
    if (!s) return "";
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  }
  // Zone de chasse : soit la ville stricte (rayon 0), soit ville + périphérie.
  const rayon = Math.min(Math.max(Number(params.rayon_km) || 0, 0), 60);
  const zone = rayon > 0 ? await resolveZone(params.ville, params.code_postal, rayon) : null;
  const requestedVille = zone ? "" : normalizeCity(params.ville);
  const requestedCp = zone ? "" : (params.code_postal || "").trim();

  function mapResultats(resultats: PappersEntreprise[]) {
    return resultats.map((r) => {
      const principal = r.dirigeants?.[0];
      return {
        siren: r.siren,
        siret: r.siege?.siret || null,
        nom: r.nom_entreprise || r.denomination || "Sans nom",
        code_naf: r.code_naf || null,
        libelle_naf: r.libelle_code_naf || null,
        ville: r.siege?.ville || null,
        code_postal: r.siege?.code_postal || null,
        adresse: r.siege?.adresse_ligne_1 || null,
        tranche_effectif: r.tranche_effectif || r.effectif || null,
        site_web: r.site_web || null,
        email: r.email || null,
        telephone: r.telephone || null,
        date_creation: r.date_creation_formate || null,
        dirigeant_principal: principal
          ? { prenom: principal.prenom || "", nom: principal.nom || "", qualite: principal.qualite || "" }
          : null,
      };
    });
  }

  // Filtrage défensif : on REJETTE les sieges hors de la ville/CP demandés
  // (le commercial doit pouvoir cibler une zone de façon 100% fiable).
  function geoFilter(list: ReturnType<typeof mapResultats>) {
    return list.filter((e) => {
      // Rayon : on accepte toute commune réellement située dans la zone.
      if (zone) {
        const cp = (e.code_postal || "").trim();
        if (cp && zone.cps.has(cp)) return true;
        const n = normCity(e.ville);
        return !!n && zone.names.has(n);
      }
      if (requestedVille) {
        const eVille = normalizeCity(e.ville);
        if (!eVille || !eVille.includes(requestedVille)) return false;
      }
      if (requestedCp) {
        const eCp = (e.code_postal || "").trim();
        if (!eCp || !eCp.startsWith(requestedCp)) return false;
      }
      return true;
    });
  }

  const collected: ReturnType<typeof mapResultats> = [];
  const seen = new Set<string>();
  let totalApi = 0;
  let rejected = 0;
  let scannedPages = 0;

  // En mode rayon on interroge Pappers département par département (la zone peut
  // déborder sur un département voisin), puis on ne garde que les communes
  // réellement situées dans le rayon.
  const queryScopes: Array<Record<string, string | undefined>> = zone
    ? zone.depts.map((d) => ({ departement: d }))
    : [{ code_postal: params.code_postal, ville: params.ville }];

  for (const scope of queryScopes) {
    let page = params.page ?? 1;
    for (let i = 0; i < MAX_PAGES && collected.length < target; i++, page++) {
      const apiParams: Record<string, string | number | undefined> = {
        code_naf: params.code_naf,
        q: params.q,
        page,
        par_page: PER_PAGE,
        precision: "exacte",
        bases: "entreprises",
        ...scope,
      };
      if (params.tranche_effectif) apiParams["tranche_effectif"] = params.tranche_effectif;

      const data = await callPappers("/recherche", apiParams);
      const resultats = (data?.resultats as PappersEntreprise[]) || [];
      scannedPages++;
      if (totalApi === 0) totalApi = (data?.total as number) || 0;

      const mapped = mapResultats(resultats);
      const kept = geoFilter(mapped);
      rejected += mapped.length - kept.length;
      for (const e of kept) {
        if (e.siren && seen.has(e.siren)) continue; // dédup inter-pages
        if (e.siren) seen.add(e.siren);
        collected.push(e);
      }
      if (resultats.length < PER_PAGE) break; // plus de pages disponibles
    }
    if (collected.length >= target) break;
  }

  const entreprises = collected.slice(0, target);

  return {
    ok: true,
    entreprises,
    pagination: {
      page: params.page || 1,
      par_page: PER_PAGE,
      total: totalApi || entreprises.length,
    },
    rejected_out_of_zone: rejected,
    scanned_pages: scannedPages,
    zone: zone
      ? { centre: zone.centerName, rayon_km: rayon, communes: zone.communes.length, departements: zone.depts }
      : null,
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
