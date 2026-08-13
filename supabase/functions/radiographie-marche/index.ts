/**
 * ─── Radiographie du marché local ─────────────────────────────────────
 *
 * Dans le Mode appel : en un clic, ce que pèse RÉELLEMENT le marché du
 * prospect, et les arguments qui portent sur lui.
 *
 * ── Le principe : on mesure, on n'estime pas ──
 * « Un boulanger avec un site fait en moyenne X € de plus » n'existe dans
 * aucune source sérieuse. L'inventer, c'est offrir au prospect l'occasion de
 * vérifier et de ne rien trouver — et là, tout l'appel tombe.
 *
 * Ce qu'on fait à la place est plus fort, parce que ça parle de LUI :
 *   1. on lit son code d'activité et sa commune à la source (base Sirene) ;
 *   2. on compte combien d'entreprises exercent le même métier dans sa
 *      commune, puis dans son département — chiffres vrais, vérifiables,
 *      et qu'aucun concurrent ne lui a jamais donnés ;
 *   3. on y adosse des faits nationaux réellement sourcés (`_shared/faits.ts`).
 *
 * ── Les axes ──
 * Un dirigeant que « vous gagnerez plus » n'émeut pas est souvent touché par
 * le temps passé au téléphone, par les candidats qui le regardent avant de
 * postuler, ou par le fait que ce que Google raconte de lui, ce n'est pas
 * lui qui l'écrit. La fiche couvre plusieurs axes, jamais le seul chiffre
 * d'affaires.
 *
 * Aucune donnée payante : uniquement l'API publique des entreprises.
 */

import { FAITS, faitsPour, secteursDe, AXES, type Fait } from "../_shared/faits.ts";
import { nafDuMetier, metiersDuNaf } from "../_shared/metiers-naf.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLE = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODELE = "claude-sonnet-5";
const H = { apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json" };
const API = "https://recherche-entreprises.api.gouv.fr/search";

function appelant(req: Request): string | null {
  const t = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const p = t.split(".");
  if (p.length !== 3) return null;
  try {
    const c = p[1].replace(/-/g, "+").replace(/_/g, "/");
    const charge = JSON.parse(atob(c.padEnd(Math.ceil(c.length / 4) * 4, "=")));
    return charge?.role === "service_role" ? null : (charge?.sub ?? null);
  } catch { return null; }
}

/** Une ville tapée à la main contient souvent l'adresse entière. */
function villeSeule(v?: string | null): string {
  const t = String(v ?? "").trim();
  if (!t) return "";
  // « 12 rue des Lilas, 31000 Toulouse » → « Toulouse »
  const apresCp = t.match(/\b\d{5}\s+([A-Za-zÀ-ÿ' -]{2,})$/);
  if (apresCp) return apresCp[1].trim();
  const dernier = t.split(",").pop()!.trim();
  return dernier.replace(/\b\d{5}\b/, "").trim() || t;
}

async function chercher(params: Record<string, string>) {
  const u = new URL(API);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { signal: AbortSignal.timeout(20000) });
  if (!r.ok) return null;
  return await r.json();
}

/**
 * L'identité officielle du prospect. Passer par son SIRET donne le code
 * d'activité EXACT et la commune EXACTE — bien plus fiable que de deviner le
 * métier depuis un libellé saisi à la main.
 */
async function identite(siret?: string | null, entreprise?: string | null, ville?: string | null) {
  if (siret) {
    const d = await chercher({ q: String(siret).replace(/\s/g, ""), per_page: "1" });
    const r = d?.results?.[0];
    if (r) {
      const s = r.siege ?? {};
      return {
        naf: s.activite_principale ?? r.activite_principale ?? null,
        commune: s.libelle_commune ?? s.commune ?? null,
        code_commune: s.commune ?? null,
        departement: s.departement ?? null,
        nom: r.nom_complet ?? null,
        source: "SIRET",
      };
    }
  }
  if (entreprise) {
    const d = await chercher({ q: `${entreprise} ${villeSeule(ville)}`.trim(), per_page: "1" });
    const r = d?.results?.[0];
    if (r) {
      const s = r.siege ?? {};
      return {
        naf: s.activite_principale ?? r.activite_principale ?? null,
        commune: s.libelle_commune ?? s.commune ?? null,
        code_commune: s.commune ?? null,
        departement: s.departement ?? null,
        nom: r.nom_complet ?? null,
        source: "nom + ville",
      };
    }
  }
  return { naf: null, commune: villeSeule(ville) || null, code_commune: null, departement: null, nom: entreprise ?? null, source: "saisie" };
}



/**
 * ─── Localiser la commune pour de bon ─────────────────────────────────
 *
 * Filtrer par `q=Castres` renvoie le bon NOMBRE (l'API applique bien le
 * filtre) mais les fiches affichées sont celles des sièges sociaux, souvent
 * ailleurs. Lire le département là-dedans donnait des résultats absurdes :
 * Castres rattaché aux Hautes-Pyrénées, Albi aux Pyrénées-Atlantiques.
 *
 * On passe donc par le code INSEE officiel de la commune. Et on demande
 * plusieurs résultats en exigeant le nom EXACT : `nom=Chaumont&limit=1`
 * renvoie Chaumontel, parce que l'API classe par pertinence et non par
 * population.
 */
async function communeInsee(nom: string): Promise<{ code: string; nom: string; departement: string } | null> {
  const propre = nom.trim();
  if (propre.length < 2) return null;
  try {
    const u = new URL("https://geo.api.gouv.fr/communes");
    u.searchParams.set("nom", propre);
    u.searchParams.set("fields", "nom,code,codeDepartement,population");
    u.searchParams.set("limit", "15");
    const r = await fetch(u.toString(), { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const liste = await r.json();
    if (!Array.isArray(liste) || !liste.length) return null;

    const sansAccent = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
    const cible = sansAccent(propre);
    const exactes = liste.filter((c: { nom: string }) => sansAccent(c.nom) === cible);
    // À nom égal, la plus peuplée : c'est celle dont on parle neuf fois sur dix.
    const choisie = (exactes.length ? exactes : liste)
      .sort((a: { population?: number }, b: { population?: number }) => (b.population ?? 0) - (a.population ?? 0))[0];
    return { code: choisie.code, nom: choisie.nom, departement: choisie.codeDepartement };
  } catch { return null; }
}

/** Combien exercent le même métier autour de lui. Chiffres bruts, vérifiables. */
async function densite(naf: string | null, insee: { code: string; nom: string; departement: string } | null) {
  if (!naf) return null;
  const [ville, dep, france] = await Promise.all([
    insee ? chercher({ activite_principale: naf, code_commune: insee.code, per_page: "1" }) : Promise.resolve(null),
    insee ? chercher({ activite_principale: naf, departement: insee.departement, per_page: "1" }) : Promise.resolve(null),
    chercher({ activite_principale: naf, per_page: "1" }),
  ]);
  // La base plafonne son compteur à 10 000. Annoncer « 10 000 en France »
  // comme un décompte exact serait faux : on le dit tel quel.
  const brut = (n: unknown) => (typeof n === "number" ? n : null);
  const fr = brut(france?.total_results);
  return {
    commune: brut(ville?.total_results),
    departement: brut(dep?.total_results),
    departement_code: insee?.departement ?? null,
    france: fr,
    france_plafonne: fr !== null && fr >= 10000,
    libelle_naf: naf,
  };
}

/** Un fait par axe, en privilégiant ceux qui visent son métier. */
function selection(metier: string | null, naf: string | null): Fait[] {
  const dispo = faitsPour(metier, naf);
  const parAxe = new Map<string, Fait>();
  for (const f of dispo) {
    // `faitsPour` place les faits sectoriels en tête : le premier vu gagne.
    if (!parAxe.has(f.axe)) parAxe.set(f.axe, f);
  }
  return [...parAxe.values()];
}

const SCHEMA = {
  type: "object",
  properties: {
    angle: { type: "string", description: "Une phrase : l'angle d'attaque de cet appel, propre à ce métier et à cette ville." },
    ouverture: { type: "string", description: "Ce que Hugo dit dans les 20 premières secondes. Parle de LUI, pas de l'agence. Aucun chiffre." },
    arguments: {
      type: "array",
      description: "4 à 6 arguments. Chacun s'appuie sur UN fait de la liste fournie, cité par son numéro. Un argument par axe, jamais deux fois le même axe.",
      items: {
        type: "object",
        properties: {
          axe: { type: "string", description: "L'axe travaillé : trouve, credibilite, temps, recrutement, maitrise, resilience, chiffre" },
          fait: { type: "integer", description: "Le NUMÉRO du fait choisi dans la liste. Le chiffre et la source seront recopiés — tu ne les écris pas." },
          dit: { type: "string", description: "Comment Hugo l'amène à l'oral, en une ou deux phrases, dans les mots de CE métier. Aucun chiffre : il est affiché à côté." },
          question: { type: "string", description: "La question ouverte qui suit, pour le faire parler plutôt que l'écouter subir." },
        },
        required: ["axe", "fait", "dit", "question"],
      },
    },
    sans_chiffre: {
      type: "array",
      description: "2 à 3 arguments qui ne s'appuient sur AUCUN chiffre — du raisonnement concret propre à son métier. C'est souvent ce qui touche le plus.",
      items: { type: "string" },
    },
    a_eviter: {
      type: "array",
      description: "2 à 3 choses à ne surtout pas dire à ce prospect précis, vu son métier.",
      items: { type: "string" },
    },
  },
  required: ["angle", "ouverture", "arguments", "sans_chiffre", "a_eviter"],
};

/**
 * Les tournures inventées qui ne portent pas de chiffre.
 *
 * Le premier essai réel a produit « beaucoup de confrères notaires disent que
 * le numérique leur fait gagner un vrai confort ». Aucun chiffre, donc le
 * contrôle numérique laissait passer — mais c'est un témoignage fabriqué, et
 * un notaire à qui on sert ça demande immédiatement lesquels.
 */
const TOURNURES: { motif: RegExp; quoi: string }[] = [
  { motif: /\b(?:beaucoup de|la plupart des|certains|plusieurs|des)\s+(?:confrères|collègues|clients|artisans|commerçants|boulangers|notaires|plombiers|coiffeurs)[^.!?]{0,40}\b(?:disent|racontent|constatent|témoignent|nous ont dit)/gi,
    quoi: "témoignage de confrères inventé" },
  { motif: /(?:mes|nos)\s+(?:autres\s+)?clients?\s+(?:me\s+)?(?:disent|racontent|constatent|ont)/gi,
    quoi: "référence à d'autres clients" },
  { motif: /\b(?:vos concurrents?|vos confrères|les autres|ceux qui sont déjà)\b/gi,
    quoi: "mention d'un tiers" },
  { motif: /\b(?:je me déplace|nous venons chez vous|sur place chez vous|une journée entière|je passe vous voir)\b/gi,
    quoi: "promesse de déplacement" },
  { motif: /\b(?:derni[èe]re? chance|offre limitée|valable jusqu|il est urgent|vous êtes en retard|vous perdez déjà)\b/gi,
    quoi: "urgence ou culpabilisation" },
];

function tournuresInterdites(objet: unknown): string[] {
  const texte = JSON.stringify(objet);
  const out: string[] = [];
  for (const { motif, quoi } of TOURNURES) {
    for (const m of texte.matchAll(motif)) out.push(`${quoi} : « ${m[0].trim()} »`);
  }
  return [...new Set(out)];
}

/** Tout chiffre qui n'a pas été fourni est une invention. */
function chiffresInventes(objet: unknown, autorises: Set<string>): string[] {
  const trouves: string[] = [];
  const texte = JSON.stringify(objet);
  for (const m of texte.matchAll(/\d[\d  .,]*\s*(?:%|€|fois|sur \d|heures?|clients?|appels?)?/g)) {
    const brut = m[0].trim();
    const nombres = [...brut.matchAll(/\d+/g)].map((x) => x[0]);
    if (!nombres.length) continue;
    if (nombres.every((n) => autorises.has(n))) continue;
    trouves.push(brut);
  }
  return [...new Set(trouves)].slice(0, 8);
}

async function anthropic(system: string, contenu: string) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": CLE, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELE, max_tokens: 3000, system,
      messages: [{ role: "user", content: contenu }],
      tools: [{ name: "fiche", description: "Construit la fiche d'arguments.", input_schema: SCHEMA }],
      tool_choice: { type: "tool", name: "fiche" },
    }),
  });
  if (!r.ok) throw new Error((await r.text()).slice(0, 200));
  const c = await r.json();
  return (c.content || []).find((x: { type: string }) => x.type === "tool_use")?.input ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const moi = appelant(req);
    if (!moi) return json({ error: "Non authentifié." }, 401);
    if (!CLE) return json({ error: "ANTHROPIC_API_KEY absente." }, 500);

    const corps = await req.json();
    let { metier, ville } = corps as { metier?: string; ville?: string };
    let siret: string | null = null, entreprise: string | null = null;

    // Depuis une fiche prospect : on ne redemande rien de ce qu'on sait déjà.
    if (corps.prospect_id) {
      const r = await fetch(
        `${URL_SB}/rest/v1/prospects?id=eq.${corps.prospect_id}&select=company,siret,location,industry,brief_activity`,
        { headers: H });
      const p = (await r.json())?.[0];
      if (!p) return json({ error: "Prospect introuvable." }, 404);
      siret = p.siret ?? null;
      entreprise = p.company ?? null;
      metier = metier || p.industry || p.brief_activity || "";
      ville = ville || p.location || "";
    }

    const id = await identite(siret, entreprise, ville);
    const commune = id.commune || villeSeule(ville);

    // Saisie à la main : pas de SIRET, donc pas de code d'activité officiel.
    // On le prend dans le catalogue des 287 métiers plutôt que de le deviner.
    if (!id.naf && metier) {
      const cat = nafDuMetier(metier);
      if (cat) { id.naf = cat.naf; id.source = `catalogue (${cat.label})`; }
    }

    const insee = commune ? await communeInsee(commune) : null;
    const marche = await densite(id.naf, insee);
    const faits = selection(metier ?? null, id.naf);

    // ── Ce que le modèle a le droit d'utiliser, et rien d'autre ──
    const listeFaits = faits
      .map((f, i) => `${i + 1}. [${f.axe}] ${f.fig} — ${f.txt} (${f.source}${f.annee ? `, ${f.annee}` : ""})`)
      .join("\n");

    // Un code partagé compte plusieurs métiers : il faut le dire, sinon le
    // chiffre est faux même s'il est exact.
    const partage = metiersDuNaf(id.naf).filter((m) => m.toLowerCase() !== String(metier ?? "").toLowerCase());

    const mesures = marche
      ? `Sur son marché — chiffres relevés à l'instant dans la base officielle des entreprises :
- ${marche.commune ?? "?"} établissements exercent le même métier à ${insee?.nom ?? commune}
- ${marche.departement ?? "?"} dans le département ${marche.departement_code ?? "?"}
- ${marche.france_plafonne ? "plus de 10 000" : (marche.france ?? "?")} en France
Code d'activité : ${id.naf ?? "inconnu"} (identité retrouvée par ${id.source})
${partage.length
  ? `⚠️ Ce code couvre aussi : ${partage.slice(0, 6).join(", ")}. Le décompte ci-dessus les INCLUT. Ne dis donc jamais « X ${metier}s » : dis « X établissements du même code d'activité », ou reformule sans le chiffre.`
  : `Ce code ne couvre que ce métier : le décompte lui correspond exactement.`}`
      : `Le code d'activité n'a pas pu être retrouvé : ne cite AUCUN chiffre de marché local.`;

    const SYSTEME = `Tu prépares une fiche d'arguments pour un appel à froid, chez Group Arsène, cabinet toulousain qui crée des sites web pour les TPE, artisans et commerçants.

Elle est PRIVÉE : elle est sous les yeux de celui qui appelle, jamais sous ceux du prospect.

RÈGLE ABSOLUE SUR LES CHIFFRES : tu n'en écris AUCUN. Pas un pourcentage, pas un montant, pas un « deux fois plus ». Tu désignes un fait par son numéro dans la liste fournie ; le chiffre et sa source seront recopiés à côté de ta phrase. Un chiffre inventé, c'est un prospect qui vérifie, ne trouve rien, et raccroche pour de bon.

SORTIR DU CHIFFRE D'AFFAIRES. Beaucoup de dirigeants ne réagissent pas à « vous gagnerez plus » — ils l'ont déjà entendu dix fois. Ce qui les touche :
${Object.entries(AXES).map(([a, q]) => `- ${a} : ${q}`).join("\n")}
Tu traites plusieurs axes, jamais deux arguments sur le même. L'axe « chiffre » ne vient qu'en dernier, et seulement s'il a du sens pour ce métier.

TON : on ne dramatise pas, on ne fabrique pas d'urgence, on ne culpabilise pas. Chaque fois qu'une idée peut se dire en perte OU en gain, choisis le gain.

INTERDIT : citer ses concurrents ou ses confrères, même sans les nommer ; promettre un déplacement (Group Arsène travaille depuis Toulouse) ; inventer un témoignage, un client ou un résultat.

ÉCRIS DANS SES MOTS À LUI. « Vos clients savent si vous êtes ouvert le lundi sans vous appeler » vaut mieux que « amélioration de l'expérience utilisateur ».`;

    const CONTENU = `LE PROSPECT
Entreprise : ${id.nom || entreprise || "—"}
Métier : ${metier || "—"}
Ville : ${commune || "—"}
Familles de métier reconnues : ${secteursDe(metier, id.naf).join(", ") || "aucune — reste général"}

${mesures}

LES FAITS QUE TU PEUX UTILISER (aucun autre n'existe) :
${listeFaits}

Construis la fiche avec l'outil "fiche".`;

    let fiche = await anthropic(SYSTEME, CONTENU);
    if (!fiche) return json({ error: "Réponse vide, réessaie." }, 502);

    // ── Vérification mécanique ──
    const autorises = new Set<string>();
    for (const t of [listeFaits, mesures, String(marche?.commune), String(marche?.departement), String(marche?.france)]) {
      for (const m of String(t).matchAll(/\d+/g)) autorises.add(m[0]);
    }
    let alerte = [...chiffresInventes(fiche, autorises), ...tournuresInterdites(fiche)];
    if (alerte.length) {
      const corrige = await anthropic(
        `Tu corriges une fiche d'appel. Les passages signalés contiennent soit un chiffre qui ne vient d'aucune source fournie, soit une tournure interdite : témoignage de confrères ou de clients inventé, mention d'un tiers, promesse de déplacement, urgence fabriquée.

Réécris UNIQUEMENT ces passages. Un chiffre non sourcé ne se remplace pas par un autre chiffre : on dit la même idée sans chiffre. Un témoignage inventé ne se remplace pas par un autre témoignage : on parle de CE dirigeant et de son quotidien. Le reste ne bouge pas, mot pour mot.`,
        `FICHE :\n${JSON.stringify(fiche, null, 1)}\n\nÀ REPRENDRE :\n${alerte.map((a) => `- ${a}`).join("\n")}`);
      if (corrige) {
        fiche = corrige;
        alerte = [...chiffresInventes(fiche, autorises), ...tournuresInterdites(fiche)];
      }
    }

    // Les chiffres et les sources sont recollés depuis la liste — jamais
    // repris de la sortie du modèle.
    const args = (fiche.arguments ?? []).map((a: { fait: number; axe: string; dit: string; question: string }) => {
      const f = faits[Number(a.fait) - 1];
      return {
        axe: a.axe, dit: a.dit, question: a.question,
        fig: f?.fig ?? null, txt: f?.txt ?? null,
        source: f ? `${f.source}${f.annee ? `, ${f.annee}` : ""}` : null,
      };
    }).filter((a: { fig: string | null }) => a.fig);

    const sortie = {
      entreprise: id.nom || entreprise,
      metier, ville: insee?.nom ?? commune,
      naf: id.naf, identite_par: id.source,
      marche,
      partage_le_code_avec: partage,
      angle: fiche.angle,
      ouverture: fiche.ouverture,
      arguments: args,
      sans_chiffre: fiche.sans_chiffre ?? [],
      a_eviter: fiche.a_eviter ?? [],
    };

    if (corps.prospect_id) {
      await fetch(`${URL_SB}/rest/v1/radiographies`, {
        method: "POST", headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify({ prospect_id: corps.prospect_id, owner_id: moi, fiche: sortie, modele: MODELE }),
      });
    }

    return json({ ok: true, fiche: sortie, alerte: alerte.length ? alerte : null });
  } catch (e) {
    return json({ error: String(e).slice(0, 300) }, 500);
  }
});
