// ─────────────────────────────────────────────────────────────────────────
// entreprises.ts — Source de données entreprises OFFICIELLE et GRATUITE.
//
// API « Recherche d'entreprises » de l'État (annuaire-entreprises / DINUM) :
//   https://recherche-entreprises.api.gouv.fr/search
// Gratuite, sans clé, sans quota. Base Sirene (INSEE) + RNE (INPI).
//
// Remplace Pappers (payant, crédits épuisables). Elle apporte MÊME PLUS :
//   • chiffre d'affaires + résultat net (signal de budget !)
//   • latitude/longitude du siège → rayon de chasse précis
//   • uniquement les entreprises ACTIVES
// Elle ne fournit PAS site web / email / téléphone : ceux-là viennent déjà de
// Google Places (places-enrich) et des outils email du CRM.
//
// ⚠️ Les filtres géographiques (code_postal, departement) ne sont appliqués par
// l'API que s'ils accompagnent une requête texte `q`. On passe donc toujours un
// `q` (le métier).
// ─────────────────────────────────────────────────────────────────────────

const BASE = "https://recherche-entreprises.api.gouv.fr/search";

// Codes INSEE de tranche d'effectif → nombre de salariés (borne basse, et
// libellé lisible). Piège : "12" signifie 20-49 salariés, PAS 12 salariés.
const TRANCHES: Record<string, { min: number; label: string }> = {
  "NN": { min: 0, label: "effectif non renseigné" },
  "00": { min: 0, label: "0 salarié" },
  "01": { min: 1, label: "1 à 2 salariés" },
  "02": { min: 3, label: "3 à 5 salariés" },
  "03": { min: 6, label: "6 à 9 salariés" },
  "11": { min: 10, label: "10 à 19 salariés" },
  "12": { min: 20, label: "20 à 49 salariés" },
  "21": { min: 50, label: "50 à 99 salariés" },
  "22": { min: 100, label: "100 à 199 salariés" },
  "31": { min: 200, label: "200 à 249 salariés" },
  "32": { min: 250, label: "250 à 499 salariés" },
  "41": { min: 500, label: "500 à 999 salariés" },
  "42": { min: 1000, label: "1 000 à 1 999 salariés" },
  "51": { min: 2000, label: "2 000 à 4 999 salariés" },
  "52": { min: 5000, label: "5 000 à 9 999 salariés" },
  "53": { min: 10000, label: "10 000 salariés et plus" },
};

export function effectifFromCode(code: string | null | undefined): { min: number; label: string } {
  return TRANCHES[String(code ?? "").trim()] ?? { min: 0, label: "effectif non renseigné" };
}

export type EntrepriseInfo = {
  siren: string | null;
  siret: string | null;
  nom: string;
  naf: string | null;
  ville: string | null;
  code_postal: string | null;
  adresse: string | null;
  lat: number | null;
  lng: number | null;
  effectif: number;            // borne basse de la tranche INSEE
  effectif_label: string;
  anciennete: number | null;   // en années
  date_creation: string | null;
  dirigeant: { prenom: string; nom: string; qualite: string } | null;
  ca: number | null;           // chiffre d'affaires le plus récent
  resultat: number | null;     // résultat net le plus récent
  annee_finances: string | null;
  confiance?: "exact" | "probable";
};

function ageYears(dateStr: string | null | undefined): number | null {
  const m = String(dateStr || "").match(/(\d{4})/);
  return m ? Math.max(0, new Date().getUTCFullYear() - Number(m[1])) : null;
}

// Dernier exercice connu (l'API renvoie { "2024": { ca, resultat_net }, ... }).
function lastFinance(fin: Record<string, any> | null | undefined) {
  if (!fin || typeof fin !== "object") return { ca: null, resultat: null, annee: null };
  const years = Object.keys(fin).filter((y) => /^\d{4}$/.test(y)).sort().reverse();
  for (const y of years) {
    const f = fin[y];
    // Un CA à 0 (ou absent) n'est pas une information exploitable : on l'ignore
    // plutôt que d'afficher « 0 € », qui laisserait croire à une entreprise morte.
    if (f && typeof f.ca === "number" && f.ca > 0) {
      return { ca: f.ca, resultat: typeof f.resultat_net === "number" ? f.resultat_net : null, annee: y };
    }
  }
  return { ca: null, resultat: null, annee: null };
}

export function mapEntreprise(r: any): EntrepriseInfo {
  const s = r?.siege || {};
  const d = (r?.dirigeants || []).find((x: any) => x?.type_dirigeant === "personne physique") || r?.dirigeants?.[0];
  const eff = effectifFromCode(r?.tranche_effectif_salarie);
  const fin = lastFinance(r?.finances);
  const prenoms = String(d?.prenoms || "").trim();
  return {
    siren: r?.siren || null,
    siret: s?.siret || null,
    nom: r?.nom_complet || r?.nom_raison_sociale || "Sans nom",
    naf: r?.activite_principale || null,
    ville: s?.libelle_commune || null,
    code_postal: s?.code_postal || null,
    adresse: s?.geo_adresse || s?.adresse || null,
    lat: s?.latitude != null ? Number(s.latitude) : null,
    lng: s?.longitude != null ? Number(s.longitude) : null,
    effectif: eff.min,
    effectif_label: eff.label,
    anciennete: ageYears(r?.date_creation),
    date_creation: r?.date_creation || null,
    dirigeant: d ? { prenom: prenoms.split(/\s+/)[0] || "", nom: d.nom || "", qualite: d.qualite || "" } : null,
    ca: fin.ca,
    resultat: fin.resultat,
    annee_finances: fin.annee,
  };
}

export type SearchOpts = {
  q: string;                    // OBLIGATOIRE (sinon les filtres géo sont ignorés)
  naf?: string;                 // code activité principale, ex "71.11Z"
  codePostal?: string;
  departement?: string;
  trancheEffectif?: string;     // code INSEE ("01", "02", "11"…)
  page?: number;
  perPage?: number;             // max 25 côté API
};

// ⚠️ L'API publique applique une LIMITE DE DÉBIT (~7 req/s par IP). Quand la
// chasse enrichit 20 prospects en parallèle, on la dépasse largement et elle
// répond 429 : sans garde-fou, on croit à tort que l'entreprise est introuvable
// (bug observé : enrichissement OK en local, vide en production).
// D'où : file d'attente (max 4 requêtes simultanées) + reprises espacées.
const MAX_PARALLELE = 4;
let enCours = 0;
const fileAttente: Array<() => void> = [];

async function creneau<T>(fn: () => Promise<T>): Promise<T> {
  if (enCours >= MAX_PARALLELE) await new Promise<void>((r) => fileAttente.push(r));
  enCours++;
  try {
    return await fn();
  } finally {
    enCours--;
    fileAttente.shift()?.();
  }
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function searchEntreprises(o: SearchOpts): Promise<{ results: EntrepriseInfo[]; total: number; pages: number }> {
  const u = new URL(BASE);
  u.searchParams.set("q", o.q);
  if (o.naf) u.searchParams.set("activite_principale", o.naf);
  if (o.codePostal) u.searchParams.set("code_postal", o.codePostal);
  if (o.departement) u.searchParams.set("departement", o.departement);
  if (o.trancheEffectif) u.searchParams.set("tranche_effectif_salarie", o.trancheEffectif);
  u.searchParams.set("page", String(o.page ?? 1));
  u.searchParams.set("per_page", String(Math.min(o.perPage ?? 25, 25)));
  u.searchParams.set("etat_administratif", "A"); // entreprises actives uniquement

  return await creneau(async () => {
    for (let essai = 0; essai < 4; essai++) {
      try {
        const r = await fetch(u.toString());
        if (r.status === 429 || r.status >= 500) {
          await pause(400 * (essai + 1) + Math.floor(Math.random() * 250));
          continue;
        }
        if (!r.ok) return { results: [], total: 0, pages: 0 };
        const j = await r.json();
        return {
          results: (j.results || []).map(mapEntreprise),
          total: j.total_results ?? 0,
          pages: j.total_pages ?? 0,
        };
      } catch {
        await pause(300 * (essai + 1));
      }
    }
    return { results: [], total: 0, pages: 0 };
  });
}

// Recherche ciblée d'UNE entreprise par son nom (+ CP si connu) — sert à
// enrichir un établissement trouvé via Google Places.
// Mots trop génériques pour identifier une société : ils font échouer la
// recherche (l'API exige que TOUS les mots correspondent).
const STOP = new Set([
  "agence", "garage", "societe", "ste", "groupe", "cabinet", "entreprise", "maison",
  "atelier", "boutique", "centre", "espace", "sarl", "sas", "sasu", "eurl", "sci", "snc",
  "ets", "etablissement", "etablissements", "france", "immobilier", "immobiliere",
  "auto", "autos", "automobile", "automobiles", "service", "services", "conseil",
  "restaurant", "boulangerie", "patisserie", "coiffure", "opticien", "pharmacie",
  "des", "les", "led", "de", "du", "la", "le", "et", "aux", "sur", "chez", "l", "d",
]);

const normTok = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// Réduit un nom commercial à ses mots distinctifs, en retirant les mots
// génériques, le métier et la ville (qui ne figurent pas dans la raison sociale).
function distinctiveTokens(nom: string, secteur?: string | null, ville?: string | null): string[] {
  const banned = new Set(STOP);
  for (const extra of [secteur, ville]) {
    for (const w of String(extra || "").split(/[\s'-]+/)) {
      const t = normTok(w);
      if (t.length > 1) banned.add(t);
    }
  }
  return String(nom || "")
    .split(/[\s'’,.\-–/()]+/)
    .map((w) => ({ raw: w.trim(), t: normTok(w) }))
    .filter((w) => w.t.length >= 3 && !banned.has(w.t) && !/^\d+$/.test(w.t))
    .sort((a, b) => b.t.length - a.t.length)
    .map((w) => w.raw);
}

export async function lookupEntreprise(
  nom: string,
  codePostal?: string | null,
  secteur?: string | null,
  ville?: string | null,
): Promise<EntrepriseInfo | null> {
  return await lookupProgressif(nom, codePostal, secteur, ville);
}

async function lookupProgressif(
  nom: string, codePostal?: string | null, secteur?: string | null, ville?: string | null,
): Promise<EntrepriseInfo | null> {
  const clean = String(nom || "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const cp = (codePostal || "").trim();
  const dept = /^\d{5}$/.test(cp) ? (/^9[78]/.test(cp) ? cp.slice(0, 3) : cp.slice(0, 2)) : null;
  const villeN = normTok(ville || "");

  const toks = distinctiveTokens(clean, secteur, ville);
  // Du plus précis au plus large : nom complet → mots distinctifs → 2 mots → 1 mot.
  const queries = [clean, toks.join(" "), toks.slice(0, 2).join(" "), toks[0] || ""]
    .map((q) => q.trim()).filter((q, i, a) => q && a.indexOf(q) === i);

  // ⚠️ Les filtres géographiques de l'API ne sont pas fiables à 100 % : une
  // requête « Lamy » en code postal 31000 peut remonter le groupe LAMY de PARIS
  // (199 M€, 2 500 salariés) au lieu de l'agence toulousaine. On revérifie donc
  // TOUJOURS la géographie sur le résultat lui-même. Mieux vaut aucune donnée
  // qu'un CA et un dirigeant faux sortis avant un appel.
  // `large` = on a cherché sur un mot réduit (ex. "LAMY") et pas sur le nom
  // complet : le risque d'homonyme explose, on exige alors la MÊME COMMUNE.
  // Sur le nom complet, le département suffit (le siège peut être à côté).
  const geoOk = (r: EntrepriseInfo, large: boolean) => {
    if (villeN && normTok(r.ville || "") === villeN) return true;
    if (large && villeN) return false; // mot réduit : même commune obligatoire
    if (dept) {
      const rcp = (r.code_postal || "").trim();
      if (rcp) return (/^9[78]/.test(rcp) ? rcp.slice(0, 3) : rcp.slice(0, 2)) === dept;
    }
    return false;
  };
  const hasTok = (r: EntrepriseInfo) => {
    const n = normTok(r.nom);
    return toks.length === 0 || toks.some((t) => n.includes(normTok(t)));
  };
  // "exact" : la raison sociale correspond vraiment au nom commercial.
  // "probable" : rattachement via un mot distinctif seulement (franchises,
  // enseignes) → à vérifier avant de citer un chiffre au téléphone.
  const confiance = (r: EntrepriseInfo): "exact" | "probable" => {
    const n = normTok(r.nom), t = normTok(clean);
    if (n === t) return "exact";
    // Une inclusion ne vaut que si la partie commune est substantielle :
    // « LAMY » inclus dans « agenceimmobilierelamy » ne prouve rien.
    const court = n.length <= t.length ? n : t;
    return (n.includes(t) || t.includes(n)) && court.length >= 8 ? "exact" : "probable";
  };
  const retenir = (r: EntrepriseInfo) => ({ ...r, confiance: confiance(r) });

  for (const q of queries) {
    const large = q !== clean;
    for (const scope of [cp ? { codePostal: cp } : null, dept ? { departement: dept } : null]) {
      if (!scope) continue;
      const { results } = await searchEntreprises({ q, ...scope, perPage: 10 });
      const valides = results.filter((r) => hasTok(r) && geoOk(r, large));
      if (valides.length === 0) continue;
      // On préfère une correspondance de nom franche s'il y en a une.
      const exact = valides.find((r) => confiance(r) === "exact");
      if (exact) return retenir(exact);
      // Sinon : plusieurs candidats plausibles dans la même zone = ambigu
      // (ex. trois franchises Nestenn à Toulouse). On ne devine pas.
      if (valides.length === 1) return retenir(valides[0]);
    }
  }
  return null;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
