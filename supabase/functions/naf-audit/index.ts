/**
 * ─── Trancher le code NAF d'un métier, par recoupement ────────────────
 *
 * Certains métiers ne se laissent pas identifier depuis Sirene seul : un salon
 * de thé s'appelle « Chez Marie », pas « Salon de thé Marie ». Compter les
 * mots dans les raisons sociales ne donne alors aucun signal.
 *
 * On croise donc deux sources indépendantes :
 *   • Google Places sait ce qu'une adresse EST — il la catégorise depuis les
 *     avis, les photos, le site, les horaires ;
 *   • Sirene sait sous quel code elle s'est DÉCLARÉE.
 *
 * On demande à Google la liste des salons de thé d'une ville, puis on lit le
 * code NAF de chacun dans Sirene. Le code majoritaire est le bon.
 *
 * Fonction d'audit, appelée à la main. Elle ne sert pas au produit.
 */

const PLACES_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lieu = {
  nom: string; cp: string | null; type: string | null;
  adresse: string; lat: number | null; lng: number | null;
};

async function lieux(requete: string): Promise<Lieu[]> {
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_KEY!,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.primaryType,places.location",
    },
    body: JSON.stringify({
      textQuery: requete,
      languageCode: "fr",
      regionCode: "FR",
      maxResultCount: 20,
    }),
  });
  if (!r.ok) throw new Error(`Places ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const d = await r.json();
  return ((d.places || []) as any[]).map((p) => ({
    nom: p?.displayName?.text ?? "",
    cp: (p?.formattedAddress?.match(/\b\d{5}\b/) ?? [null])[0],
    type: p?.primaryType ?? null,
    adresse: p?.formattedAddress ?? "",
    lat: p?.location?.latitude ?? null,
    lng: p?.location?.longitude ?? null,
  })).filter((l: Lieu) => l.nom);
}

/** « Café Épicerie L'Étoile ! » → « CAFE EPICERIE ETOILE » */
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")
   .toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const VIDES = new Set(["LE","LA","LES","DE","DU","DES","L","D","AU","AUX","ET","CHEZ","UN","UNE"]);

/**
 * Le code NAF déclaré par cet établissement.
 *
 * Un commerce s'inscrit rarement sous son nom d'enseigne : « Le Comptoir » est
 * déclaré « SARL DUPONT », enseigne « LE COMPTOIR ». On compare donc le nom
 * Google à la raison sociale ET aux enseignes, en exigeant que les mots
 * porteurs se retrouvent — sinon on préfère ne rien conclure.
 */
async function naf(nom: string, cp: string | null): Promise<string | null> {
  const u = new URL("https://recherche-entreprises.api.gouv.fr/search");
  u.searchParams.set("q", nom);
  if (cp) u.searchParams.set("code_postal", cp);
  u.searchParams.set("per_page", "10");
  const r = await fetch(u);
  if (!r.ok) return null;
  const d = await r.json();
  const res = (d.results || []) as any[];
  if (!res.length) return null;

  const mots = norm(nom).split(" ").filter((m) => m.length > 2 && !VIDES.has(m));
  if (!mots.length) return null;

  for (const e of res) {
    const etabs = (e.matching_etablissements || []) as any[];
    const enseignes = etabs.flatMap((x) => (x?.liste_enseignes || []) as string[]);
    const foin = norm([e.nom_complet, e.nom_raison_sociale, ...enseignes].filter(Boolean).join(" "));
    const trouves = mots.filter((m) => foin.includes(m)).length;
    // Tous les mots porteurs pour un nom court, la majorité pour un nom long.
    const requis = mots.length <= 2 ? mots.length : Math.ceil(mots.length * 0.6);
    if (trouves >= requis) return e.activite_principale ?? null;
  }
  return null;
}

/**
 * Le code NAF lu depuis l'ADRESSE.
 *
 * Beaucoup de commerçants sont immatriculés au nom du gérant, sans enseigne
 * enregistrée : la recherche par nom ne les trouve pas. On interroge alors les
 * établissements situés dans un rayon de 60 m, et on retient celui qui porte
 * le même numéro de rue — un numéro de voie ne trompe presque jamais.
 */
async function nafParAdresse(l: Lieu): Promise<string | null> {
  if (l.lat == null || l.lng == null) return null;
  const numero = (l.adresse.match(/^\s*(\d+)/) ?? [])[1];
  if (!numero) return null;

  const u = new URL("https://recherche-entreprises.api.gouv.fr/near_point");
  u.searchParams.set("lat", String(l.lat));
  u.searchParams.set("long", String(l.lng));
  u.searchParams.set("radius", "0.06");
  u.searchParams.set("per_page", "25");
  const r = await fetch(u);
  if (!r.ok) return null;
  const res = ((await r.json()).results || []) as any[];

  const rue = norm(l.adresse.replace(/^\s*\d+\s*/, "").split(",")[0])
    .split(" ").filter((m) => m.length > 3 && !VIDES.has(m));

  // On rassemble TOUT ce qui est déclaré à ce numéro de voie. Un boulanger et
  // un kinésithérapeute peuvent partager une entrée d'immeuble : dans ce cas
  // rien ne dit lequel Google a pointé, et on préfère ne pas conclure.
  const surPlace = new Set<string>();
  for (const e of res) {
    for (const et of (e.matching_etablissements || []) as any[]) {
      const adr = norm(et?.adresse || "");
      if (!adr.startsWith(numero + " ")) continue;
      if (rue.length && !rue.some((m) => adr.includes(m))) continue;
      if (e.activite_principale) surPlace.add(e.activite_principale);
    }
  }
  return surPlace.size === 1 ? [...surPlace][0] : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!PLACES_KEY) throw new Error("GOOGLE_PLACES_API_KEY absente");
    const { requete, villes } = await req.json() as { requete: string; villes: string[] };

    const compte: Record<string, number> = {};
    const types: Record<string, number> = {};
    const exemples: { nom: string; naf: string }[] = [];
    let vus = 0, identifies = 0;

    for (const ville of villes) {
      let L: Lieu[] = [];
      try { L = await lieux(`${requete} ${ville}`); } catch (_) { continue; }
      for (const l of L) {
        vus++;
        if (l.type) types[l.type] = (types[l.type] || 0) + 1;
        const code = (await naf(l.nom, l.cp)) ?? (await nafParAdresse(l));
        if (!code) continue;
        identifies++;
        compte[code] = (compte[code] || 0) + 1;
        if (exemples.length < 12) exemples.push({ nom: l.nom, naf: code });
      }
    }

    const classement = Object.entries(compte)
      .sort((a, b) => b[1] - a[1])
      .map(([code, n]) => ({ code, n, pct: Math.round((n / Math.max(identifies, 1)) * 100) }));

    return new Response(JSON.stringify({
      requete, vus, identifies, classement,
      types_google: Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 3),
      exemples,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
