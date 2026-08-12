/**
 * ─── La présentation du 3e appel : celle qui fait signer ──────────────
 *
 * Le 2e rendez-vous PRÉSENTE, le 3e DÉCIDE. Ce ne sont pas les mêmes
 * diapositives, et ce serait une faute de rejouer les mêmes : le prospect a
 * déjà vu l'argumentaire, le lui répéter donne le sentiment qu'on n'a pas
 * écouté. Ici on ne convainc plus — on rend la décision facile.
 *
 * ── Ce que cette présentation montre ──
 * Ce dont on a convenu, ce qu'il obtient exactement, quand, pour combien,
 * et ce qui se passe le lendemain de son accord. Rien d'autre.
 *
 * ── Ce qu'elle ne montre JAMAIS ──
 * La fiche de préparation du 3e appel (`closing-prep`) nomme franchement ce
 * qui bloque : le prix qui coince, l'associé qui traîne, les trois semaines
 * de silence. Elle est PRIVÉE et le reste. Cette présentation-ci est
 * partagée à l'écran, souvent projetée devant plusieurs personnes : y faire
 * figurer une objection, c'est mettre le prospect en défaut devant son
 * associé. On répond aux objections à l'oral, avec la fiche sous les yeux ;
 * l'écran, lui, ne parle que de ce qu'il obtient.
 *
 * Les prix et délais viennent de `_shared/offre.ts` — jamais du modèle.
 */

import {
  METHODE, BASE_INCLUS, OPTIONS, INCLUS, ENGAGEMENTS,
} from "../_shared/offre.ts";

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

/** L'utilisateur qui appelle, lu dans son jeton. */
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

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Les mêmes tournures à risque que pour la fiche de préparation. Un chiffre
 * inventé sur un écran partagé est pire que dans une note privée : le
 * prospect le lit, le retient, et peut le ressortir plus tard.
 */
const SUSPECTS: { motif: RegExp; quoi: string }[] = [
  { motif: /\b\d+\s*(?:à|-|et)\s*\d+\s*(?:%|appels?|clients?|fois|heures?|jours?|semaines?)/gi,
    quoi: "fourchette chiffrée" },
  { motif: /\b\d+\s*%/g, quoi: "pourcentage" },
  { motif: /(?:mes|les|nos)\s+(?:autres\s+)?clients?\s+(?:me\s+)?(?:disent|racontent|constatent|ont)/gi,
    quoi: "référence à d'autres clients" },
  { motif: /\b(?:souvent|généralement|la plupart|en moyenne|statistiquement)\b[^.!?]{0,60}\b\d/gi,
    quoi: "généralité chiffrée" },
  { motif: /\b(?:x\s*\d|\d+\s*fois plus)/gi, quoi: "multiplicateur" },
  // Propres au 3e appel : ce sont les tournures de pression, celles qui font
  // signer sur le moment et regretter le lendemain.
  { motif: /\b(?:derni[èe]re? chance|offre limitée|valable jusqu|plus que \d|dépêch|urgent)/gi,
    quoi: "urgence fabriquée" },
  { motif: /\b(?:vos concurrents?|les autres|vos confrères)\b/gi, quoi: "mention d'un tiers" },
  { motif: /\b(?:je me déplace|nous venons chez vous|sur place chez vous|une journée entière)\b/gi,
    quoi: "promesse de déplacement" },
];

function chiffresConnus(...sources: string[]): Set<string> {
  const s = new Set<string>();
  for (const t of sources) for (const m of String(t ?? "").matchAll(/\d+/g)) s.add(m[0]);
  return s;
}

function repererInventions(objet: unknown, connus: Set<string>): string[] {
  const texte = JSON.stringify(objet);
  const trouves: string[] = [];
  for (const { motif, quoi } of SUSPECTS) {
    for (const m of texte.matchAll(motif)) {
      const nombres = [...m[0].matchAll(/\d+/g)].map((x) => x[0]);
      if (nombres.length && nombres.every((n) => connus.has(n))) continue;
      trouves.push(`${quoi} : « ${m[0].trim()} »`);
    }
  }
  return [...new Set(trouves)];
}

async function anthropic(system: string, contenu: string, schema: unknown) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": CLE, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELE, max_tokens: 4000, system,
      messages: [{ role: "user", content: contenu }],
      tools: [{ name: "construire", description: "Construit la présentation de décision.", input_schema: schema }],
      tool_choice: { type: "tool", name: "construire" },
    }),
  });
  if (!r.ok) throw new Error((await r.text()).slice(0, 200));
  const c = await r.json();
  const outil = (c.content || []).find((x: { type: string }) => x.type === "tool_use");
  return outil?.input ?? null;
}


/**
 * ─── Ne jamais stocker une sortie difforme ────────────────────────────
 *
 * Au premier essai réel, le modèle a rendu un appel d'outil malformé : il a
 * glissé un `<parameter name="obtient">[…]` À L'INTÉRIEUR du champ précédent.
 * Résultat, une liste arrivée caractère par caractère — « • < », « • p »,
 * « • a »… — et le champ suivant vide. Projeté devant un client, c'est un
 * rendez-vous perdu.
 *
 * On répare ce qui se répare (les tableaux éclatés se recollent), on refuse
 * ce qui ne se répare pas, et on relance une fois. Faire confiance à la
 * sortie d'un modèle sans la regarder, c'est la même erreur que de croire
 * qu'il n'inventera pas de chiffres.
 */
const LISTES = ["convenu", "obtient", "apres", "sa_part"] as const;

function recoller(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const items = v.map((x) => String(x ?? ""));
  // Un tableau dont la quasi-totalité des entrées font un seul caractère est
  // une chaîne qui a été éclatée : on la recolle avant de juger.
  const seuls = items.filter((x) => x.length <= 1).length;
  if (items.length > 12 && seuls > items.length * 0.7) {
    const recollee = items.join("");
    const tab = recollee.match(/\[[\s\S]*\]/);
    if (tab) {
      try {
        const p = JSON.parse(tab[0]);
        if (Array.isArray(p)) return p.map((x) => String(x)).filter((x) => x.trim().length > 2);
      } catch { /* irrécupérable */ }
    }
    return null;
  }
  return items.filter((x) => x.trim().length > 2);
}

/** Dit ce qui cloche, liste vide si la sortie est saine. */
function defauts(s: Record<string, unknown>): string[] {
  const ko: string[] = [];
  for (const k of ["titre", "sous_titre", "phrase_finale"]) {
    const v = s?.[k];
    if (typeof v !== "string" || v.trim().length < 5) ko.push(k);
    // L'artefact d'appel d'outil malformé, où qu'il se trouve.
    else if (/<\/?parameter|<\/?invoke|antml:/i.test(v)) ko.push(`${k} (balise parasite)`);
  }
  for (const k of LISTES) {
    const propre = recoller(s?.[k]);
    if (!propre || propre.length < 2) ko.push(k);
    else if (propre.some((x) => /<\/?parameter|<\/?invoke|antml:/i.test(x))) ko.push(`${k} (balise parasite)`);
    else s[k] = propre;
  }
  return ko;
}


const SCHEMA = {
  type: "object",
  properties: {
    titre: { type: "string", description: "Titre de couverture, court. NE COMMENCE PAS par le nom de l'entreprise, il est déjà affiché au-dessus." },
    sous_titre: { type: "string", description: "Une ligne : ce qu'on lance ensemble. Pas de superlatif." },
    convenu: {
      type: "array",
      description: "3 à 5 points : ce dont on a convenu ensemble aux rendez-vous précédents, formulés comme des acquis. Repris de SES mots. Aucun point négatif, aucune objection.",
      items: { type: "string" },
    },
    obtient: {
      type: "array",
      description: "4 à 6 points : ce qu'il obtient concrètement, écrits pour SON métier. Tu ne cites que des éléments présents dans L'OFFRE fournie.",
      items: { type: "string" },
    },
    apres: {
      type: "array",
      description: "3 points : ce qui se passe une fois qu'il donne son accord, dans l'ordre. Concret et rassurant.",
      items: { type: "string" },
    },
    sa_part: {
      type: "array",
      description: "2 à 3 points : ce qu'on attend de lui, honnêtement (photos, textes, un créneau). Dire le vrai effort évite la mauvaise surprise.",
      items: { type: "string" },
    },
    phrase_finale: { type: "string", description: "Une phrase de clôture, calme, qui invite à décider sans presser. Pas d'urgence, pas de « dernière chance »." },
  },
  required: ["titre", "sous_titre", "convenu", "obtient", "apres", "sa_part", "phrase_finale"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const moi = appelant(req);
    if (!moi) return json({ error: "Non authentifié." }, 401);
    if (!CLE) return json({ error: "ANTHROPIC_API_KEY absente." }, 500);

    const { prospect_id, options_retenues } = await req.json();
    if (!prospect_id) return json({ error: "prospect_id requis." }, 400);

    // Même contexte que la fiche de préparation : le récap du 2e rendez-vous,
    // la fiche prospect, et ce qui a été saisi depuis.
    const rc = await fetch(`${URL_SB}/rest/v1/rpc/contexte_closing`, {
      method: "POST",
      headers: { apikey: SRV, Authorization: req.headers.get("Authorization")!, "Content-Type": "application/json" },
      body: JSON.stringify({ p_prospect: prospect_id }),
    });
    if (!rc.ok) return json({ error: (await rc.text()).slice(0, 200) }, 400);
    const ctx = await rc.json();
    const p = ctx?.prospect ?? {};
    const R = ctx?.deck?.recap ?? {};

    // La dernière fiche de préparation, si elle existe : elle dit ce qui
    // bloque. On s'en sert pour ORIENTER le contenu — sans jamais l'afficher.
    const fp = await fetch(
      `${URL_SB}/rest/v1/closing_preps?prospect_id=eq.${prospect_id}&select=situation,fiche&order=cree_le.desc&limit=1`,
      { headers: H });
    const prep = (await fp.json())?.[0] ?? null;

    const baseMin = num(R.prix_min) ?? 1800;
    const baseMax = num(R.prix_max) ?? 2400;
    const mode = (["tranche", "apartir", "fixe"].includes(R.prix_mode || "") ? R.prix_mode : "tranche");
    const prixDit = mode === "tranche" ? `${baseMin} € à ${baseMax} €`
      : mode === "apartir" ? `à partir de ${baseMin} €` : `${baseMin} €`;

    const retenues = Array.isArray(options_retenues) ? options_retenues : [];
    const optionsChoisies = OPTIONS.filter((o: { id: string }) => retenues.includes(o.id));
    const totalOptions = optionsChoisies.reduce((s: number, o: { prix: number }) => s + Number(o.prix || 0), 0);

    const SYSTEME = `Tu prépares la présentation du 3e rendez-vous pour Group Arsène, agence toulousaine qui crée des sites web pour les TPE, artisans et commerçants français.

CE RENDEZ-VOUS EST CELUI DE LA DÉCISION. Le prospect a déjà vu l'argumentaire au 2e. Le lui rejouer lui donnerait le sentiment qu'on ne l'a pas écouté. Ici on ne convainc plus : on rend la décision facile et évidente.

CETTE PRÉSENTATION EST PARTAGÉE À L'ÉCRAN, parfois devant l'associé ou le conjoint.

INTERDITS ABSOLUS — ce sont des fautes, pas des préférences :
- Aucune objection, aucune hésitation, aucun reproche à l'écran. Rien du type « vous nous disiez que le budget… », « malgré vos doutes… ». Le mettre en défaut devant un tiers ferait échouer le rendez-vous. Ces sujets se traitent à l'oral.
- Aucun rappel de son retard, de ce qu'il n'a pas, de ce qu'il perd. On parle de ce qu'il obtient.
- Aucune mention de ses concurrents, de ses confrères, des « autres », même sans les nommer.
- Aucune urgence fabriquée : pas de « dernière chance », pas d'offre qui expire, pas de compte à rebours.
- Aucun chiffre, pourcentage, statistique ou résultat qui ne figure pas explicitement dans les données fournies. Tu n'inventes RIEN — pas de « 3 fois plus de visites », pas de « mes clients constatent que… ».
- Aucun témoignage, aucun nom de client, aucune référence.
- Aucune promesse de déplacement : Group Arsène travaille depuis Toulouse.
- Aucun abonnement mensuel : le site se paie une fois.

TON : calme, sûr, factuel. Celui de quelqu'un qui a déjà décidé que ça allait bien se passer. Pas d'emphase, pas de superlatif, pas de point d'exclamation.

FORMULATION : des phrases courtes, concrètes, écrites pour SON métier à lui. « Vos clients réservent une table sans vous appeler » vaut mieux que « un système de réservation performant ».`;

    const CONTENU = `LE CLIENT
Entreprise : ${p.company || "—"} · ${p.industry || p.brief_activity || "—"} · ${p.location || "—"}
Interlocuteur : ${[p.first_name, p.last_name].filter(Boolean).join(" ") || "le dirigeant"}${p.title ? ` (${p.title})` : ""}

CE QUI S'EST DIT AUX RENDEZ-VOUS PRÉCÉDENTS
Objectif qu'il a exprimé : ${R.objectif || "—"}
Ce qu'il veut que le site fasse : ${R.attentes || R.contexte || "—"}
Délai souhaité : ${R.delai || "—"}
Qui décide : ${R.decideur || "—"}
${prep?.situation?.panier ? `Le panier discuté : ${prep.situation.panier}` : ""}
${prep?.situation?.objectif_appel ? `Ce que Hugo veut obtenir : ${prep.situation.objectif_appel}` : ""}

⚠️ Le contexte ci-dessous t'aide à ORIENTER le propos. Il ne doit JAMAIS apparaître à l'écran, ni en clair ni en allusion :
${prep?.situation?.blocage ? `— ce qui semble le retenir : ${prep.situation.blocage}` : "— rien de signalé"}
${prep?.situation?.reaction ? `— sa réaction à la présentation : ${prep.situation.reaction}` : ""}
Sers-t'en pour choisir QUOI mettre en avant (si le budget le retient, insiste sur ce qui est compris et sur le paiement après validation de la maquette ; si c'est un associé, rends le contenu lisible par quelqu'un qui découvre le projet).

L'OFFRE — VALEURS EXACTES, aucune invention
Le site : ${prixDit}, une fois, sans abonnement.
Compris dans la base :
${BASE_INCLUS.map((x: string) => `  - ${x}`).join("\n")}
${optionsChoisies.length
  ? `Options retenues avec lui :\n${optionsChoisies.map((o: { label: string; prix: number; quoi: string }) => `  - ${o.label} (${o.prix} €) — ${o.quoi}`).join("\n")}\nTotal des options : ${totalOptions} €`
  : "Aucune option retenue à ce stade : on part sur la base."}
Les étapes et leurs délais :
${METHODE.map((m: { etape: string; detail: string }, i: number) => `  ${i + 1}. ${m.etape} : ${m.detail}`).join("\n")}
Toujours compris :
${INCLUS.map((x: string) => `  - ${x}`).join("\n")}
Engagements :
${ENGAGEMENTS.map((x: string) => `  - ${x}`).join("\n")}

Construis la présentation avec l'outil "construire".`;

    let sortie = await anthropic(SYSTEME, CONTENU, SCHEMA);
    if (!sortie) return json({ error: "Réponse vide, réessaie." }, 502);

    // Une seule relance : si la sortie revient difforme deux fois de suite,
    // mieux vaut le dire que d'afficher n'importe quoi.
    let ko = defauts(sortie as Record<string, unknown>);
    if (ko.length) {
      sortie = await anthropic(
        SYSTEME,
        CONTENU + `\n\n⚠️ La tentative précédente était mal formée (${ko.join(", ")}). ` +
          `Chaque champ de liste doit être un VRAI tableau de phrases complètes. ` +
          `N'écris aucune balise dans le contenu.`,
        SCHEMA);
      if (!sortie) return json({ error: "Réponse vide, réessaie." }, 502);
      ko = defauts(sortie as Record<string, unknown>);
      if (ko.length) {
        return json({ error: `Présentation incomplète (${ko.join(", ")}). Relance la génération.` }, 502);
      }
    }

    // ── Vérification mécanique ──
    const connus = chiffresConnus(
      JSON.stringify(R), JSON.stringify(prep?.situation ?? {}), JSON.stringify(OPTIONS),
      JSON.stringify(METHODE), String(baseMin), String(baseMax), String(totalOptions));
    let alerte = repererInventions(sortie, connus);

    if (alerte.length) {
      const corrige = await anthropic(
        `Tu corriges une présentation destinée à être PROJETÉE devant un client.
Les passages signalés contiennent des éléments interdits : chiffres inventés, référence à des tiers, urgence fabriquée ou promesse de déplacement.
Réécris UNIQUEMENT ces passages. Tu ne remplaces pas un chiffre inventé par un autre chiffre : tu dis la même idée sans chiffre du tout.
Tout le reste doit rester identique, mot pour mot.`,
        `PRÉSENTATION :\n${JSON.stringify(sortie, null, 1)}\n\nPASSAGES À REPRENDRE :\n${alerte.map((a) => `- ${a}`).join("\n")}`,
        SCHEMA);
      if (corrige) {
        sortie = corrige;
        alerte = repererInventions(sortie, connus);
      }
    }

    // Les diapos de chiffres et de calendrier ne passent pas par le modèle :
    // elles sont construites depuis l'offre. Un prix ne s'improvise pas.
    const diapos = {
      ...sortie,
      prix: {
        base: prixDit,
        base_min: baseMin,
        base_max: baseMax,
        options: optionsChoisies.map((o: { id: string; label: string; prix: number }) =>
          ({ id: o.id, label: o.label, prix: o.prix })),
        total_options: totalOptions,
        mention: "Une seule fois, sans abonnement.",
      },
      etapes: METHODE,
      engagements: ENGAGEMENTS,
    };

    const ins = await fetch(`${URL_SB}/rest/v1/closing_decks`, {
      method: "POST", headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({
        prospect_id, owner_id: moi, diapos, options_retenues: retenues, modele: MODELE,
      }),
    });
    const cree = (await ins.json())?.[0] ?? null;

    return json({ ok: true, id: cree?.id, diapos, alerte: alerte.length ? alerte : null });
  } catch (e) {
    return json({ error: String(e).slice(0, 300) }, 500);
  }
});
