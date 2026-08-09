/**
 * ─── Préparer le 3e appel : celui de la décision ──────────────────────
 *
 * Le 2e rendez-vous présente ; le 3e décide. Ce n'est pas la même
 * conversation, et la préparation ne peut pas être la même.
 *
 * ── Ce qui change tout ──
 * Le deck du 2e est PARTAGÉ À L'ÉCRAN : il ne peut jamais nommer les
 * hésitations du prospect. Cette fiche-ci est PRIVÉE, lue par Hugo pendant
 * qu'il téléphone. Elle doit donc dire franchement ce qui bloque — c'est
 * précisément ce qu'il faut pour le lever.
 *
 * ── Le principe de conception ──
 * Un appel de closing n'a pas un script, il en a autant que de situations.
 * Le prospect enthousiaste sans budget, celui qui attend son associé, celui
 * qui ne répond plus, celui qui a demandé une remise : ce sont quatre appels
 * différents. La fiche part donc du DIAGNOSTIC, et tout le reste en découle.
 *
 * ── Les règles que le modèle ne peut pas enfreindre ──
 * Elles viennent de Hugo, elles ne se discutent pas :
 *   • aucun chiffre, résultat, client ou référence inventé ;
 *   • jamais un mot sur un concurrent ;
 *   • on parle en GAIN, jamais en perte : pas d'urgence fabriquée, pas de
 *     culpabilisation, pas de « vous allez perdre » ;
 *   • aucune promesse de déplacement — Group Arsène travaille de Toulouse ;
 *   • pas d'abonnement mensuel ;
 *   • les objections ne s'inventent pas : elles viennent de ce que le
 *     prospect a réellement dit, et de nulle part ailleurs.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLE = Deno.env.get("ANTHROPIC_API_KEY")!;
// Même modèle que le reste du CRM : une seule variable à changer le jour
// où l'on migre.
const MODELE = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-5-20250929";
const H = { apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json" };

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

const SYSTEME = `Tu prépares Hugo Malet, fondateur de Group Arsène (agence web, Toulouse),
pour son TROISIÈME appel avec un prospect : celui de la décision.

Tu écris une FICHE PRIVÉE. Le prospect ne la verra jamais. Elle est lue par Hugo
pendant qu'il téléphone. Elle doit donc être franche sur ce qui bloque, et
directement utilisable : des phrases qu'il peut dire telles quelles, pas des
conseils généraux.

CE QUE GROUP ARSÈNE VEND : un site web fabriqué sur mesure, livré rapidement,
avec un espace client où le commerçant suit en direct la fréquentation de son
site et les gens qui cherchent à le joindre. Paiement à la prestation.

RÈGLES ABSOLUES — les enfreindre rend la fiche inutilisable :
1. N'invente JAMAIS un chiffre, un résultat, un client, un témoignage, une
   référence, un délai qu'on n'a pas donné. Si tu ne sais pas, tu ne dis rien.
2. Ne mentionne JAMAIS un concurrent, ni de près ni de loin. Aucune comparaison.
3. Parle en GAIN, jamais en perte. Interdits : « vous allez perdre », « vous
   passez à côté », « chaque jour sans site vous coûte », toute urgence
   fabriquée, toute culpabilisation, toute peur.
4. Ne promets AUCUN déplacement : pas de visite sur place, pas de journée
   d'immersion, pas de photos prises chez le client. On travaille de Toulouse.
5. Pas d'abonnement mensuel.
6. Les objections que tu traites doivent venir de ce que le prospect a
   RÉELLEMENT dit ou fait, tel que rapporté. Tu peux anticiper une objection
   probable, mais tu dois alors la présenter comme probable, pas comme dite.
7. Le tutoiement pour parler à Hugo ; le vouvoiement dans les phrases qu'il
   dira au prospect.
8. Français naturel, phrases courtes, aucun jargon commercial. Jamais
   « levier », « ROI », « win-win », « accompagnement à 360 ».

TON : calme et sûr. Hugo ne supplie pas et ne pousse pas. Il aide quelqu'un à
prendre une décision qui lui sera utile. Si la réponse est non, c'est une
réponse acceptable et la relation continue.

Réponds UNIQUEMENT avec un objet JSON, sans texte autour :
{
  "diagnostic": "2 à 4 phrases : où en est vraiment ce prospect, et pourquoi. Sois franc.",
  "ouverture": "Les 30 premières secondes, mot pour mot. Une phrase qui rappelle où on en est et ouvre la décision sans la forcer.",
  "point_a_lever": { "quoi": "Le seul vrai blocage, nommé en une phrase.",
                     "comment": "Comment le lever, en 2 à 4 phrases que Hugo peut dire." },
  "objections": [ { "dit": "Ce que le prospect risque de dire, dans ses mots à lui",
                    "reponse": "La réponse, mot pour mot, en gain",
                    "pourquoi": "En une phrase à Hugo : pourquoi cette réponse marche" } ],
  "chemin": [ "Étape concrète vers l'accord, formulée comme une proposition à faire" ],
  "pieges": [ "Ce qu'il ne faut surtout pas faire ou dire DANS CETTE situation précise" ],
  "si_non": "Comment terminer si c'est non : honnêtement, sans insister, en laissant la porte ouverte.",
  "a_verifier": [ "Information qui manque et qu'il faudrait obtenir pendant l'appel" ]
}
4 à 6 objections. 3 à 5 étapes. 3 à 4 pièges. 2 à 4 points à vérifier.`;


/**
 * ─── Le contrôle anti-invention ───────────────────────────────────────
 *
 * La consigne « n'invente aucun chiffre » ne suffit pas. Au premier essai, le
 * modèle a écrit « souvent les vétérinaires me disent qu'ils perdent 4 à 5
 * appels par jour » — un chiffre et une référence client entièrement
 * fabriqués, exactement ce qui ne doit jamais sortir de la bouche de Hugo.
 *
 * On détecte donc mécaniquement les tournures à risque, puis on demande une
 * réécriture ciblée. Demander gentiment est une intention ; vérifier est une
 * garantie.
 */
const SUSPECTS: { motif: RegExp; quoi: string }[] = [
  { motif: /\b\d+\s*(?:à|-|et)\s*\d+\s*(?:%|appels?|clients?|fois|heures?|jours?|semaines?)/gi,
    quoi: "fourchette chiffrée" },
  { motif: /\b\d+\s*%/g, quoi: "pourcentage" },
  { motif: /(?:mes|les|nos)\s+(?:autres\s+)?clients?\s+(?:me\s+)?(?:disent|racontent|constatent|ont)/gi,
    quoi: "référence à d'autres clients" },
  { motif: /\b(?:souvent|généralement|la plupart|en moyenne|statistiquement)\b[^.!?]{0,60}\b\d/gi,
    quoi: "généralité chiffrée" },
  { motif: /\b(?:vétérinaires?|boulangers?|artisans?|commerçants?|garagistes?)\s+me\s+disent/gi,
    quoi: "témoignage de métier inventé" },
  { motif: /\b(?:x\s*\d|\d+\s*fois plus)/gi, quoi: "multiplicateur" },
];

/** Les chiffres légitimes : ceux que Hugo a lui-même saisis. */
function chiffresConnus(...sources: string[]): Set<string> {
  const s = new Set<string>();
  for (const t of sources) for (const m of String(t ?? "").matchAll(/\d+/g)) s.add(m[0]);
  return s;
}

function repererInventions(fiche: unknown, connus: Set<string>): string[] {
  const texte = JSON.stringify(fiche);
  const trouves: string[] = [];
  for (const { motif, quoi } of SUSPECTS) {
    for (const m of texte.matchAll(motif)) {
      // Un chiffre déjà présent dans ce que Hugo a saisi n'est pas inventé.
      const nombres = [...m[0].matchAll(/\d+/g)].map((x) => x[0]);
      if (nombres.length && nombres.every((n) => connus.has(n))) continue;
      trouves.push(`${quoi} : « ${m[0].trim()} »`);
    }
  }
  return [...new Set(trouves)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const moi = appelant(req);
    if (!moi) return json({ error: "Non authentifié." }, 401);
    if (!CLE) return json({ error: "ANTHROPIC_API_KEY absente." }, 500);

    const { prospect_id, situation } = await req.json();
    if (!prospect_id) return json({ error: "prospect_id requis." }, 400);

    // Tout ce qu'on sait déjà : on ne redemande jamais ce qui est en base.
    const cr = await fetch(`${URL_SB}/rest/v1/rpc/contexte_closing`, {
      method: "POST",
      headers: { apikey: SRV, Authorization: req.headers.get("Authorization")!, "Content-Type": "application/json" },
      body: JSON.stringify({ p_prospect: prospect_id }),
    });
    const ctx = await cr.json();
    if (!ctx?.prospect) return json({ error: "Prospect introuvable." }, 404);

    const p = ctx.prospect;
    const recap = ctx.deck?.recap ?? {};
    const s = situation ?? {};

    const message = `PROSPECT
Entreprise : ${p.company ?? "—"}
Interlocuteur : ${[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}
Métier : ${p.industry ?? "—"} · ${p.location ?? "—"}
Site actuel : ${p.website || "aucun"}

CE QUI RESSORT DU 1er RENDEZ-VOUS (saisi avant le 2e)
Objectif exprimé : ${recap.objectif || "—"}
Objections entendues : ${recap.objections || "—"}
Budget évoqué : ${recap.budget_non_aborde === "1" ? "le budget n'a jamais été abordé" : (recap.budget || "—")}
Délai souhaité : ${recap.delai || "—"}
Qui décide : ${recap.decideur || "—"}
Contexte : ${recap.contexte || "—"}
Prix annoncé au 2e rendez-vous : ${recap.prix_min || "?"} à ${recap.prix_max || "?"} €

DEPUIS LE 2e RENDEZ-VOUS — c'est la partie décisive
Réaction à la présentation : ${s.reaction || "non précisée"}
Ce qu'il a dit, textuellement : ${s.verbatim || "—"}
Ce qui semble bloquer : ${s.blocage || "non identifié"}
Temps écoulé depuis : ${s.depuis || "—"}
Relances déjà faites : ${s.relances || "aucune"}
Qui manque à la décision : ${s.manquant || "—"}
Le panier retenu / discuté : ${s.panier || "—"}
Ce que Hugo veut obtenir de cet appel : ${s.objectif_appel || "un accord, ou une réponse claire"}
Autre chose à savoir : ${s.notes || "—"}

APPELS DÉJÀ JOURNALISÉS : ${JSON.stringify(ctx.appels ?? []).slice(0, 900)}

Prépare la fiche du 3e appel.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": CLE, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELE, max_tokens: 4000, temperature: 0.4,
        system: SYSTEME,
        messages: [{ role: "user", content: message }],
      }),
    });
    if (!res.ok) {
      return json({ error: `Modèle indisponible : ${(await res.text()).slice(0, 200)}` }, 502);
    }
    const rep = await res.json();
    const texte = (rep?.content ?? []).map((c: any) => c?.text ?? "").join("").trim();

    let fiche: any;
    try {
      fiche = JSON.parse(texte.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""));
    } catch {
      return json({ error: "Réponse illisible du modèle." }, 502);
    }

    // ── Contrôle, puis réécriture ciblée si nécessaire ──
    const connus = chiffresConnus(
      JSON.stringify(recap), JSON.stringify(s), p.company ?? "", p.location ?? "");
    let inventions = repererInventions(fiche, connus);

    if (inventions.length) {
      const rr = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": CLE, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODELE, max_tokens: 4000, temperature: 0.2,
          system: `Tu corriges une fiche de préparation d'appel. Elle contient des
affirmations INVENTÉES : chiffres, statistiques ou témoignages de clients qui
n'ont jamais été fournis. Hugo ne dira jamais une chose qu'il ne peut pas
prouver — un prospect qui vérifie et découvre un chiffre faux est perdu pour
toujours.

Réécris UNIQUEMENT les phrases fautives. Ne reformule rien d'autre. Remplace
l'argument chiffré par un argument vrai et concret, sans chiffre : ce que le
site fait, ce que le client verra dans son espace, ce qui lui fera gagner du
temps. Garde exactement la même structure JSON et les mêmes clés.

Réponds uniquement avec le JSON corrigé.`,
          messages: [{ role: "user", content:
            `À CORRIGER :\n${inventions.join("\n")}\n\nFICHE :\n${JSON.stringify(fiche)}` }],
        }),
      });
      if (rr.ok) {
        const t2 = ((await rr.json())?.content ?? []).map((c: any) => c?.text ?? "").join("").trim();
        try {
          const corrigee = JSON.parse(t2.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""));
          const restantes = repererInventions(corrigee, connus);
          // On ne garde la correction que si elle améliore vraiment les choses.
          if (restantes.length < inventions.length) { fiche = corrigee; inventions = restantes; }
        } catch { /* on garde la version d'origine et on signale */ }
      }
    }

    const ins = await fetch(`${URL_SB}/rest/v1/closing_preps`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({
        prospect_id, owner_id: moi, deck_id: ctx.deck?.id ?? null,
        situation: s, fiche, modele: MODELE,
      }),
    });
    const ligne = (await ins.json())?.[0];

    return json({
      ok: true, id: ligne?.id ?? null, fiche,
      // Si le contrôle n'a pas tout nettoyé, on le dit franchement plutôt que
      // de laisser Hugo découvrir un chiffre inventé au téléphone.
      alerte: inventions.length ? inventions : null,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
