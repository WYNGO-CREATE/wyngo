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
    [...depts].map((d) => geoJson(`/departements/${d}/communes?fields=nom,code,centre,codesPostaux,population`)),
  );
  const communes: Array<{ nom: string; code: string; cps: string[]; pop: number }> = [];
  const names = new Set<string>();
  const cps = new Set<string>();
  for (const list of lists) {
    for (const com of list || []) {
      const co = com?.centre?.coordinates;
      if (!co) continue;
      if (haversineKm(center, { lat: co[1], lng: co[0] }) > rayonKm) continue;
      communes.push({ nom: com.nom, code: com.code, cps: com.codesPostaux || [], pop: com.population || 0 });
      names.add(normCity(com.nom));
      for (const p of com.codesPostaux || []) cps.add(p);
    }
  }
  // Les grandes communes d'abord : c'est là que se trouvent les entreprises.
  communes.sort((a, b) => b.pop - a.pop);
  if (names.size === 0) return null;
  return { center, centerName: c.nom, depts: [...depts], names, cps, communes };
}

/**
 * SIRET déjà présents dans le CRM, tous collaborateurs confondus.
 *
 * Sans ça, relancer la même chasse redonnait exactement les mêmes premiers
 * résultats : impossible d'aller plus loin que le tout premier lot, alors que
 * l'API de l'État connaît par exemple 3 864 avocats rien qu'en Haute-Garonne.
 * En les écartant, chaque chasse ramène des entreprises réellement nouvelles.
 */
async function sirenDejaConnus(): Promise<Set<string>> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Set();
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const vus = new Set<string>();
  try {
    // (a) Entreprises déjà dans le CRM, tous collaborateurs confondus.
    for (let from = 0; from < 50000; from += 1000) {
      const r = await fetch(`${url}/rest/v1/prospects?select=siret&siret=not.is.null`,
        { headers: { ...h, Range: `${from}-${from + 999}` } });
      if (!r.ok) break;
      const lot = await r.json() as Array<{ siret: string | null }>;
      for (const x of lot) if (x.siret) vus.add(x.siret.slice(0, 9));
      if (lot.length < 1000) break;
    }
    // (b) Entreprises déjà PROPOSÉES par une chasse précédente, même si
    //     personne ne les a importées. Sans ça, relancer « notaires à Lyon »
    //     redonnait exactement la même liste, indéfiniment.
    // ⚠️ On n'écarte QUE les entreprises dont le site est déjà bon : ce ne
    // sont pas des cibles, inutile de les revoir. Un prospect sans site ou au
    // site obsolète revient à chaque vague tant qu'il n'est pas entré dans le
    // CRM — c'est précisément celui qu'il ne faut jamais laisser filer.
    const depuis = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString();
    for (let from = 0; from < 200000; from += 1000) {
      const r = await fetch(
        `${url}/rest/v1/chasse_vus?select=siren&statut_site=eq.has_website&derniere_vue=gte.${depuis}`,
        { headers: { ...h, Range: `${from}-${from + 999}` } });
      if (!r.ok) break;
      const lot = await r.json() as Array<{ siren: string }>;
      for (const x of lot) if (x.siren) vus.add(x.siren);
      if (lot.length < 1000) break;
    }
  } catch { /* en cas de panne on préfère chasser large que planter */ }
  return vus;
}

/** SIREN déjà proposés lors d'une vague précédente (pour le rappel « oublié »). */
async function sirenDejaProposes(sirens: string[]): Promise<string[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key || sirens.length === 0) return [];
  try {
    const out: string[] = [];
    for (let i = 0; i < sirens.length; i += 200) {
      const lot = sirens.slice(i, i + 200);
      const r = await fetch(
        `${url}/rest/v1/chasse_vus?select=siren&siren=in.(${lot.join(",")})`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (!r.ok) continue;
      for (const x of await r.json() as Array<{ siren: string }>) out.push(x.siren);
    }
    return out;
  } catch { return []; }
}

/** Enregistre ce que la vague vient de montrer, pour que la suivante amène du neuf. */
async function memoriserVague(sirens: string[], metier: string, zone: string, userId: string | null) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key || sirens.length === 0) return;
  const now = new Date().toISOString();
  const lignes = sirens.map((siren) => ({
    siren, derniere_vue: now, vu_par: userId, metier, zone,
  }));
  try {
    for (let i = 0; i < lignes.length; i += 500) {
      await fetch(`${url}/rest/v1/chasse_vus?on_conflict=siren`, {
        method: "POST",
        headers: {
          apikey: key, Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(lignes.slice(i, i + 500)),
      });
    }
  } catch { /* la mémoire est un confort, jamais un bloquant */ }
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
  exclure_connus?: boolean; // defaut true : on ecarte deja-vus et deja-importes
  user_id?: string | null;  // qui lance la chasse (tracabilite de la memoire)
  rayon_km?: number;     // 0/absent = ville stricte ; >0 = ville + périphérie
  mots_cles?: string;    // métier mal capté par le code NAF → recherche par mots-clés
  naf_exclus?: string;   // préfixes NAF à écarter en mode mots-clés (séparés par |)
  with_site_web?: boolean | null;
}) {
  const target = Math.min(Math.max(params.max_results ?? params.par_page ?? 20, 1), 600);
  const rayon = Math.min(Math.max(Number(params.rayon_km) || 0, 0), 60);
  const zone = rayon > 0 ? await resolveZone(params.ville, params.code_postal, rayon) : null;

  // L'API officielle n'applique ses filtres géographiques QUE si elle reçoit
  // aussi un mot-clé. On interroge donc commune par commune (les plus peuplées
  // d'abord, c'est là que sont les entreprises), jusqu'à atteindre l'objectif.
  // ⚠️ PERFORMANCE : sur un métier rare, l'objectif n'est jamais atteint et on
  // balayait les ~230 communes de la zone (jusqu'à 78 s mesurées). Or les
  // entreprises se concentrent dans les communes peuplées — scanner un hameau
  // pour trouver un grossiste ne rapporte rien. On borne donc le balayage aux
  // MAX_COMMUNES plus peuplées, en gardant toujours la commune de départ.
  // ── MODE MOTS-CLÉS ──
  // Certains métiers ne sont PAS discriminés par leur code NAF : un conseiller
  // en gestion de patrimoine peut être déclaré en conseil, en immobilier ou en
  // assurance (vérifié sur 1 441 cabinets : aucun code dominant). Chercher par
  // NAF ramène alors les mauvaises entreprises. Dans ce cas on interroge par
  // MOTS-CLÉS sur le(s) département(s) de la zone, sans filtre NAF — le filtre
  // géographique sur le résultat reste appliqué plus bas.
  // Plusieurs VARIANTES possibles, séparées par « | » : un même métier se nomme
  // de plusieurs façons (« gestion de patrimoine », « gestion privée »…). On
  // interroge chaque variante — ça élargit la moisson SANS élargir le bruit,
  // contrairement à un mot-clé trop générique (« patrimoine » seul ramène 55 %
  // de SCI et de sociétés de location, inexploitables).
  const variantes = (params.mots_cles || "")
    .split("|").map((v) => v.trim()).filter(Boolean);
  // En mode mots-clés, la recherche plein texte attrape aussi des sociétés
  // hors cible (SCI, promotion immobilière, holdings) qui partagent le
  // vocabulaire. On écarte ces codes-là : mieux vaut 40 vrais prospects que
  // 55 dont 15 feront perdre un appel.
  const exclus = (params.naf_exclus || "")
    .split("|").map((v) => v.trim()).filter(Boolean);
  const motsCles = variantes.length > 0;
  const MAX_COMMUNES = 60;
  const cibles: Array<{ q: string; commune?: string; cp?: string; dept?: string; sansNaf?: boolean }> = motsCles
    ? (zone
        ? zone.depts.flatMap((d) => variantes.map((v) => ({ q: v, dept: d, sansNaf: true })))
        : variantes.map((v) => ({ q: v, cp: (params.code_postal || "").trim() || undefined, sansNaf: true })))
    : zone
    ? (() => {
        const centre = normCity(zone.centerName);
        const triees = [...zone.communes].sort((a, b) => {
          // la commune de départ passe toujours en premier
          const ac = normCity(a.nom) === centre ? 1 : 0;
          const bc = normCity(b.nom) === centre ? 1 : 0;
          if (ac !== bc) return bc - ac;
          return (b.pop || 0) - (a.pop || 0);
        });
        return triees.slice(0, MAX_COMMUNES).map((c) => ({ q: "", commune: c.code, cp: c.cps[0] }));
      })()
    : [{
        q: (params.ville || params.code_postal || "").trim(),
        cp: (params.code_postal || "").trim() || undefined,
      }];

  const collected: any[] = [];
  // Les entreprises déjà dans le CRM (de n'importe quel collaborateur) sont
  // écartées d'office : la chasse ne doit ramener que du nouveau.
  const dejaConnus = params.exclure_connus === false ? new Set<string>() : await sirenDejaConnus();
  let ignoresDejaConnus = 0;
  const seen = new Set<string>();
  let rejected = 0;
  let scanned = 0;
  const communesTouchees = new Set<string>();
  const villeDemandee = normCity(params.ville);

  for (const cible of cibles) {
    if (collected.length >= target) break;
    if (!cible.q && !cible.commune && !cible.dept) continue;

    // En mode mots-clés on balaie peu de cibles (1 par département) : on peut
    // donc paginer plus profond pour ramener autant de prospects.
    // On descend plus profond dans chaque commune : 3 pages plafonnaient la
    // recolte bien avant l'epuisement du gisement reel.
    const maxPages = cible.sansNaf ? 8 : 6;
    for (let page = 1; page <= maxPages && collected.length < target; page++) {
      const { results } = await searchEntreprises({
        // Sans code commune (mode mots-clés) on garde la requête texte ;
        // sinon on interroge purement par géographie + code NAF, ce qui évite
        // que les sociétés portant le nom de la ville remontent en tête.
        q: cible.q || undefined,
        codeCommune: cible.commune,
        naf: cible.sansNaf ? undefined : params.code_naf,
        codePostal: cible.cp,
        departement: cible.dept,
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
        if (exclus.length && e.naf && exclus.some((p) => e.naf!.startsWith(p))) { rejected++; continue; }
        if (e.siren && seen.has(e.siren)) continue;
        if (e.siren && dejaConnus.has(e.siren)) { ignoresDejaConnus++; continue; }
        if (e.siren) seen.add(e.siren);
        if (e.ville) communesTouchees.add(e.ville);

        const dist = zone && e.lat != null && e.lng != null
          ? Math.round(haversineKm(zone.center, { lat: e.lat, lng: e.lng }) * 10) / 10
          : null;
        collected.push({
          distance_km: dist,
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

  // On mémorise ce qui vient d'être montré : la prochaine vague amènera
  // d'autres entreprises, même si aucune n'est importée dans le CRM.
  const livres = collected.slice(0, target);
  // Ceux qui avaient déjà été proposés lors d'une vague précédente : le front
  // les signale (« tu ne l'avais pas retenu ») au lieu de les faire passer
  // pour des nouveautés.
  const dejaProposes = await sirenDejaProposes(livres.map((e: any) => e.siren).filter(Boolean));
  if (params.exclure_connus !== false) {
    await memoriserVague(
      livres.map((e: any) => e.siren).filter(Boolean),
      params.code_naf || params.mots_cles || "",
      zone ? `${zone.centerName} ${rayon}km` : (params.ville || params.code_postal || ""),
      params.user_id ?? null,
    );
  }

  return {
    ok: true,
    entreprises: livres,
    pagination: { page: 1, par_page: 25, total: collected.length },
    rejected_out_of_zone: rejected,
    deja_proposes: dejaProposes,
    ignores_deja_connus: ignoresDejaConnus,
    univers_connu: dejaConnus.size,
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
