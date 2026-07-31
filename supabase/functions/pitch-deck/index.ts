// ─── Pitch Deck — présentation de vente du 2e RDV ─────────────────────
//
//  POST (JWT utilisateur) { prospect_id, recap? }
//  Génère une présentation de 8 diapos ULTRA adaptée au prospect à partir du
//  RÉCAP du 1er RDV saisi par le commercial + les vraies données du prospect
//  + une banque de statistiques réelles SOURCÉES (l'IA n'invente aucun
//  chiffre, et surtout aucune objection que le prospect n'a pas exprimée).
//  Inclut le slug du mockup de son futur site.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-5-20250929";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// ── Banque de statistiques RÉELLES et sourcées (jamais d'invention) ──────
// Chiffres largement repris dans le secteur du marketing local FR. L'IA ne
// peut citer QUE ces faits (ou les données propres du prospect).
const FACTS = [
  // ── Recherche locale & intention d'achat ──
  { stat: "87 % des Français consultent Internet avant de choisir un commerce ou un artisan local", source: "Solocal / Opinionway", theme: "local" },
  { stat: "4 recherches Google sur 5 ont une intention locale", source: "Google", theme: "local" },
  { stat: "76 % des personnes qui font une recherche locale sur smartphone visitent un établissement dans les 24 h", source: "Google", theme: "local" },
  { stat: "28 % des recherches locales aboutissent à un achat", source: "Google", theme: "local" },
  { stat: "« près de moi » : ces recherches ont été multipliées par 2 ces dernières années", source: "Google", theme: "local" },
  // ── Site web : crédibilité & conversion ──
  { stat: "75 % des internautes jugent la crédibilité d'une entreprise à partir du design de son site web", source: "Université de Stanford", theme: "site" },
  { stat: "Il faut 0,05 seconde à un visiteur pour se faire une opinion sur un site", source: "Google / étude EPFL", theme: "site" },
  { stat: "Un site qui met plus de 3 s à charger fait fuir 53 % des visiteurs mobiles", source: "Google", theme: "site" },
  { stat: "Plus de 60 % du trafic web provient désormais du mobile", source: "Statista", theme: "site" },
  // ── Coût de l'absence de site ──
  { stat: "Environ 1 TPE française sur 3 n'a toujours pas de site web", source: "Baromètre France Num", theme: "absence" },
  { stat: "Les TPE/PME ayant une présence en ligne avancée croissent jusqu'à 2× plus vite que les autres", source: "France Num / Bpifrance", theme: "absence" },
  { stat: "Sans site, une entreprise est jugée moins fiable par plus de la moitié des consommateurs", source: "Visual Objects", theme: "absence" },
  // ── Avis & réputation (Google) ──
  { stat: "Gagner 1 étoile sur Google peut augmenter le chiffre d'affaires de 5 à 9 %", source: "Harvard Business School", theme: "avis" },
  { stat: "88 % des consommateurs font autant confiance aux avis en ligne qu'à une recommandation personnelle", source: "BrightLocal", theme: "avis" },
  { stat: "Une fiche Google Business complète reçoit 7× plus de clics qu'une fiche incomplète", source: "Google", theme: "avis" },
  { stat: "Le 1er résultat sur Google capte à lui seul environ 28 % des clics", source: "Sistrix", theme: "avis" },
  // ── Exemples par secteur (à n'utiliser que si le métier correspond) ──
  { stat: "9 personnes sur 10 lisent les avis en ligne avant de choisir un restaurant", source: "TripAdvisor", theme: "restauration" },
  { stat: "Plus de 8 Français sur 10 recherchent un artisan sur Internet avant de le contacter", source: "Opinionway pour Solocal", theme: "artisanat / BTP" },
  { stat: "Plus de la moitié des prises de rendez-vous en coiffure/beauté se font désormais en ligne", source: "Planity / secteur beauté", theme: "beauté / coiffure" },
  { stat: "80 % des consommateurs se renseignent en ligne avant d'acheter en magasin (effet ROPO)", source: "Google", theme: "commerce / retail" },
  // ── Recherche & visibilité ──
  { stat: "97 % des consommateurs recherchent en ligne les entreprises locales", source: "BrightLocal", theme: "local" },
  { stat: "46 % des recherches effectuées sur Google concernent une information locale", source: "Google", theme: "local" },
  { stat: "68 % des expériences en ligne commencent par un moteur de recherche", source: "BrightEdge", theme: "local" },
  { stat: "Les 3 premiers résultats naturels de Google captent plus de la moitié des clics", source: "Sistrix", theme: "local" },
  { stat: "Une recherche locale sur mobile sur deux aboutit à une visite dans la journée", source: "Google", theme: "local" },
  // ── Site : vitesse et confiance ──
  { stat: "Le taux de conversion baisse d'environ 4,4 % par seconde de chargement supplémentaire", source: "Portent", theme: "site" },
  { stat: "Une fiche Google Business avec photos génère jusqu'à 42 % de demandes d'itinéraire en plus", source: "Google", theme: "avis" },
  { stat: "Un consommateur lit en moyenne une dizaine d'avis avant d'accorder sa confiance à une entreprise locale", source: "BrightLocal", theme: "avis" },
  { stat: "73 % des consommateurs ne tiennent compte que des avis publiés dans le mois", source: "BrightLocal", theme: "avis" },
];

// ── L'offre Wyngo : constantes FIXES injectées dans la présentation.
//    L'IA ne doit RIEN inventer ici : ni prix, ni délai, ni garantie.
const PALIERS = [
  { nom: "Site Performance", prix: "2 144 €", heures: "102 h", pour: "une vitrine premium qui convertit vraiment",
    inclus: "Site sur-mesure, chargement sous la seconde, mobile parfait, SEO technique, rédaction de vos textes, tableau de bord de suivi." },
  { nom: "Système Connecté", prix: "4 500 €", heures: "214 h", pour: "supprimer la saisie manuelle et automatiser la relation client",
    inclus: "Tout le Site Performance + automatisation des emails et formulaires, connexion à un outil déjà utilisé (agenda, CRM), tableau de bord temps réel." },
  { nom: "Écosystème sur-mesure", prix: "8 230 € et +", heures: "392 h", pour: "un système digital complet, taillé sur l'organisation",
    inclus: "Tout le Système Connecté + outil métier sur-mesure, interconnexion ERP et facturation, portail client sécurisé." },
];
const METHODE = [
  { etape: "Le brief", detail: "On prend le temps de comprendre votre métier, vos clients et vos prestations. On rédige vos textes à partir de ce que vous nous racontez." },
  { etape: "La première maquette — sous 48 h", detail: "Vous voyez le résultat avant de payer le moindre euro. Vous validez, ou on retravaille." },
  { etape: "La mise en ligne — sous 21 jours", detail: "Développement, référencement technique, tests, mise en ligne et formation." },
  { etape: "Le suivi", detail: "On reste à vos côtés 2 ans, sans surcoût. Un interlocuteur unique, réponse sous 24 h." },
];

// ── Le panier : base modulable + options chiffrées à l'heure (× 21 €/h).
//    Le prospect coche en direct pendant la visio, le total bouge sous ses yeux.
// Ce que comprend la base, au plancher de la tranche. La collecte d'avis est
// OFFERTE : elle ne se facture plus en option.
const BASE_INCLUS = [
  "Un design dessiné pour vous — aucun modèle tout fait, aucun thème racheté",
  "Vos textes rédigés à partir de ce que vous nous racontez de votre métier",
  "Parfait sur mobile, et chargé en moins d'une seconde",
  "Référencement local, pour sortir sur les recherches de votre ville",
  "Vos avis Google affichés et collectés automatiquement — offert",
  "Un tableau de bord pour suivre vos visiteurs et vos demandes",
  "Hébergement, maintenance et garantie 2 ans",
];

// Ce qui fait monter vers le haut de la tranche — le prospect doit comprendre
// d'où vient l'écart, sinon la fourchette a l'air arbitraire.
const VARIATION = [
  "Le nombre de pages : une vitrine de 4 à 5 pages, ou un site complet de 10 à 12",
  "La quantité de contenu à écrire : quelques paragraphes, ou chacune de vos prestations détaillée",
  "Les animations et les effets sur-mesure : une mise en page sobre, ou un site qui bouge et réagit",
  "Le volume de photos à préparer, retoucher et optimiser",
  "Le nombre de formulaires, ou un vrai parcours de demande de devis",
  "Plusieurs établissements ou plusieurs zones d'intervention à traiter séparément",
];

// Options — prix divisés par deux par rapport au barème horaire d'origine.
const OPTIONS = [
  { id: "resa",       label: "Réservation / prise de rendez-vous en ligne", prix: 420, quoi: "Un agenda synchronisé : vos clients réservent leur créneau seuls, même la nuit." },
  { id: "devis",      label: "Demande de devis guidée",                     prix: 310, quoi: "Le visiteur décrit son besoin étape par étape ; vous recevez une demande déjà qualifiée." },
  { id: "equipe",     label: "Espace interne pour vous et votre équipe",    prix: 470, quoi: "Un espace privé qui centralise tout : dossiers en cours, devis, factures, avancement — chacun voit ce qui le concerne." },
  { id: "membre",     label: "Espace client privé",                         prix: 370, quoi: "Chaque client retrouve ses documents, ses devis et son historique." },
  { id: "paiement",   label: "Paiement en ligne sécurisé",                  prix: 260, quoi: "Encaisser un acompte ou une commande directement depuis le site." },
  { id: "boutique",   label: "Boutique en ligne / catalogue produits",      prix: 580, quoi: "Vendre vos produits en ligne, avec fiches, stocks et commandes." },
  { id: "galerie",    label: "Galerie de réalisations avant / après",       prix: 190, quoi: "Vos réalisations mises en valeur, avec le glissement avant-après qui fait la démonstration." },
  { id: "blog",       label: "Blog / actualités éditable",                  prix: 210, quoi: "Publier vous-même vos nouveautés — et gagner des positions sur Google." },
  { id: "newsletter", label: "Newsletter & emails automatiques",            prix: 230, quoi: "Garder le lien avec vos clients sans y penser (relances, offres, rappels)." },
  { id: "compta",     label: "Export comptable / lien facturation",         prix: 290, quoi: "Fini la double saisie : les données partent vers votre outil de facturation." },
  { id: "chatbot",    label: "Assistant IA sur-mesure",                     prix: 470, quoi: "Il répond aux questions courantes de vos visiteurs 24 h/24 et qualifie les demandes." },
  { id: "multilingue",label: "Site multilingue",                            prix: 310, quoi: "Toucher une clientèle étrangère ou frontalière dans sa langue." },
];

// Ce qu'on sait faire techniquement, dit simplement. L'IA pioche dedans et
// relie au métier — elle n'invente aucune capacité.
// Diapo « ce qu'on est capable de construire » : volontairement GÉNÉRIQUE.
// Le but n'est pas de décrire son futur site — c'est de lui faire comprendre
// qu'il peut tout demander. Contenu figé, l'IA n'y touche pas.
const TECHNIQUE_TITRE = "Ce qu'on est capable de construire";
const TECHNIQUE_SOUS_TITRE = "Aucune limite technique de notre côté : le site suit l'idée, jamais l'inverse";
const TECHNIQUE_BULLETS = [
  { text: "Des pages qui se mettent à jour toutes seules depuis vos données — tarifs, stocks, disponibilités, plannings : vous changez une fois, le site suit partout" },
  { text: "Un site qui charge en moins d'une seconde, même chargé en images et en animations" },
  { text: "Des animations et de la 3D directement dans le navigateur, sans rien à installer : faire tourner un objet, dérouler une histoire au fil du défilement" },
  { text: "Des outils sur-mesure qu'aucun modèle tout fait ne propose : un simulateur, un configurateur, un calculateur d'estimation" },
  { text: "Une connexion à n'importe quel outil que vous utilisez déjà — agenda, facturation, messagerie — pour supprimer les doubles saisies" },
  { text: "Et si vous avez une idée qui n'est pas dans cette liste : dites-la. Techniquement, on n'est bloqués par rien." },
];

// Les puces de la diapo panier sont FIXES : l'IA y résumait systématiquement
// la colonne « ce qui fait monter le prix », affichée juste en dessous.
const PANIER_BULLETS = [
  { text: "Vous composez vous-même : cochez ce qui vous sert, le total se recalcule sous vos yeux." },
  { text: "Vous pouvez commencer par la base seule, et ajouter plus tard quand le besoin arrive." },
  { text: "Aucun paiement avant que vous ayez validé la première maquette." },
];

// Nos réalisations — sites réellement livrés, montrés et navigables en visio.
const REALISATIONS = [
  { nom: "Archimaides", url: "https://www.archimaides.com", quoi: "Architecte d'intérieur à Toulouse" },
  { nom: "Don Demeure", url: "https://don-demeure.vercel.app", quoi: "Patrimoine et immobilier" },
  { nom: "Mission Magis", url: "https://missionmagis.com", quoi: "Lavage automobile à domicile" },
  { nom: "Artefact Neural", url: "https://artefactneural.com", quoi: "Studio technologique" },
];

const INCLUS = [
  "Hébergement de votre site",
  "Tableau de bord de suivi des performances",
  "Maintenance technique et mises à jour de sécurité",
  "Ajustements et petites évolutions (couleurs, textes, ajouts ponctuels)",
];
const ENGAGEMENTS = [
  "Garantie 2 ans incluse — on reste à vos côtés 2 ans minimum, sans un euro de plus.",
  "Chargement sous la seconde — garanti, ou on retravaille jusqu'à l'atteindre.",
  "Aucun paiement avant que vous ayez validé la première maquette.",
  "Le code source vous appartient — vous n'êtes prisonnier de personne.",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if (!ANTHROPIC_API_KEY) return json({ error: "no_ai", message: "Clé IA non configurée." });
    const { prospect_id, recap } = await req.json();
    if (!prospect_id) return json({ error: "missing", message: "prospect_id requis" });
    const R = (recap || {}) as Record<string, string>;
    const champ = (v?: string) => (typeof v === "string" && v.trim() ? v.trim() : null);

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user?.id) return json({ error: "unauth", message: "Non authentifié" }, 401);
    const userId = u.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: p } = await admin.from("prospects").select("*").eq("id", prospect_id).eq("owner_id", userId).maybeSingle();
    if (!p) return json({ error: "not_found", message: "Prospect introuvable." });

    // Mockup : dernier aperçu de site généré pour ce prospect
    const { data: prev } = await admin.from("prospect_previews")
      .select("slug, generated_at").eq("prospect_id", prospect_id).order("generated_at", { ascending: false }).limit(1).maybeSingle();

    // Contexte relationnel : ce qui s'est dit au 1er appel (clé pour adapter)
    const { data: calls } = await admin.from("call_logs")
      .select("*").eq("prospect_id", prospect_id).order("created_at", { ascending: false }).limit(3);
    const callNotes = (calls || [])
      .map((c: Record<string, unknown>) => (c.summary || c.notes || c.transcript || "") as string)
      .filter(Boolean).join("\n---\n").slice(0, 2500);

    const hasWebsite = p.website_status === "has_website" || (!!p.website && p.website_status !== "no_website");
    const ctx = {
      entreprise: p.company || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      interlocuteur: `${p.first_name || ""} ${p.last_name || ""}`.trim() || null,
      secteur: p.brief_activity || p.industry || "—",
      ville: p.location || "—",
      site_actuel: hasWebsite ? (p.website || "oui") : "aucun site web",
      score_site: p.website_score ?? null,
      objectif: p.brief_objective || null,
      mots_cles: Array.isArray(p.brief_keywords) ? p.brief_keywords.join(", ") : null,
      notes_crm: p.notes || null,
    };

    // Le récap saisi par le commercial prime sur tout le reste : c'est le seul
    // endroit d'où peuvent venir les objections et le budget RÉELS du prospect.
    const recapLignes = [
      ["Ce qu'il veut vraiment (son objectif)", champ(R.objectif)],
      ["Ce qui le freine — SES objections, dites au 1er appel", champ(R.objections)],
      ["Budget évoqué", champ(R.budget)],
      ["Échéance / urgence", champ(R.delai)],
      ["Qui décide", champ(R.decideur)],
      ["Ce qu'il a raconté (notes libres)", champ(R.contexte)],
    ].filter(([, v]) => v) as [string, string][];
    const RECAP_BLOC = recapLignes.length
      ? recapLignes.map(([k, v]) => `• ${k} : ${v}`).join("\n")
      : "(aucun récap saisi)";
    // Le prix annoncé est celui qu'HUGO a donné au 1er appel, pas celui du barème :
    // c'est tout l'intérêt, la présentation doit coller à ce qui a été dit.
    const num = (v?: string) => { const n = parseInt(String(v ?? "").replace(/[^0-9]/g, ""), 10); return Number.isFinite(n) && n > 0 ? n : null; };
    const baseMin = num(R.prix_min) ?? 1800;
    const baseMax = num(R.prix_max) ?? 2400;
    // Deux situations très différentes : soit un prix a déjà été annoncé et on le
    // confirme, soit le sujet n'a jamais été ouvert et c'est CE rendez-vous qui
    // l'introduit — le ton et l'enchaînement des diapos ne peuvent pas être les mêmes.
    const budgetNeuf = R.budget_non_aborde === "1" || R.budget_non_aborde === "true";
    // Trois façons d'annoncer : une fourchette, un plancher, ou un prix ferme.
    const mode = (["tranche", "apartir", "fixe"].includes(R.prix_mode || "") ? R.prix_mode : "tranche") as "tranche" | "apartir" | "fixe";
    const prixDit = mode === "tranche" ? `${baseMin} € à ${baseMax} €`
      : mode === "apartir" ? `à partir de ${baseMin} €` : `${baseMin} €`;

    // Ce qu'un client lui rapporte : c'est LUI qui donne le chiffre, on fait
    // juste la multiplication. Rien d'inventé, et c'est son propre argent.
    const valeurClient = num(R.valeur_client);
    const eur = (n: number) => `${n.toLocaleString("fr-FR").replace(/\u202f/g, " ")} €`;
    const ARITHMETIQUE = valeurClient ? `
── L'ARITHMÉTIQUE DE SON PROPRE ARGENT (chiffre qu'IL a donné : un client lui rapporte environ ${eur(valeurClient)}) ──
• 1 client de plus par mois = ${eur(valeurClient * 12)} sur un an
• 1 client de plus par semaine = ${eur(valeurClient * 52)} sur un an
• Le site (${prixDit}) est remboursé dès ${Math.max(1, Math.ceil(baseMin / valeurClient))} client${Math.ceil(baseMin / valeurClient) > 1 ? "s" : ""} gagné${Math.ceil(baseMin / valeurClient) > 1 ? "s" : ""}
Ces trois lignes sont les SEULS calculs autorisés. Formule-les TOUJOURS en gain possible (« un client de plus par mois, c'est X sur l'année »), JAMAIS en perte (« ce que vous perdez », « ce qui part ailleurs ») : on montre ce qu'il y a à gagner, on ne culpabilise pas.` : "";

    const OFFRE_BLOC = `
── LA BASE (tranche EXACTE, n'annonce aucun autre montant) ──
Le site lui-même : ${prixDit}, une fois, sans abonnement.
Compris :
${BASE_INCLUS.map((x) => `  - ${x}`).join("\n")}${mode === "tranche" ? `
Ce qui fait monter vers ${baseMax} € :
${VARIATION.map((x) => `  - ${x}`).join("\n")}` : ""}

── OPTIONS (le prospect les coche EN DIRECT pendant la visio, le total bouge) ──
${OPTIONS.map((o) => `• [${o.id}] ${o.label} — ${o.prix} € — ${o.quoi}`).join("\n")}

── MÉTHODE (les 4 étapes, délais EXACTS) ──
${METHODE.map((m, i) => `${i + 1}. ${m.etape} : ${m.detail}`).join("\n")}

── TOUJOURS INCLUS ──
${INCLUS.map((x) => `• ${x}`).join("\n")}

── ENGAGEMENTS ──
${ENGAGEMENTS.map((x) => `• ${x}`).join("\n")}`;

    const BUDGET_CONSIGNE = budgetNeuf
      ? `LE PRIX N'A JAMAIS ÉTÉ ÉVOQUÉ — c'est cette présentation qui ouvre le sujet. Adapte en conséquence :
- Diapo 1 (recap) : aucune allusion à un budget, un prix ou un investissement. Il n'en a jamais été question.
- Diapos 2 à 6 : on installe la valeur AVANT le chiffre. Chaque diapo doit rendre le prix évident quand il arrivera : ce que ça lui rapporte, le temps gagné, ce qui est compris pour 2 ans.
- Diapo 7 (panier) : le sous-titre annonce clairement qu'on aborde les chiffres pour la première fois, sans détour et sans s'excuser. Le premier bullet introduit la tranche calmement ; le deuxième explique qu'il compose lui-même et peut commencer par la base seule ; le troisième rappelle qu'aucun paiement n'intervient avant qu'il ait validé la maquette.
- Ton : on présente, on ne défend pas. Pas de justification anticipée, pas de « je sais que ça peut paraître cher ».
- Fiche "questions" : commence par les questions d'argent, ce sont celles qui vont tomber — « combien ça coûte au total », « pourquoi une tranche et pas un prix fixe », « est-ce que je peux commencer par la base et ajouter plus tard », « y a-t-il des frais après ».`
      : `LE PRIX A DÉJÀ ÉTÉ ANNONCÉ au 1er appel : la diapo 7 le CONFIRME, elle ne le redécouvre pas. Reste cohérent avec ce qui a été dit, sans jamais annoncer un autre montant de base.`;

    const system = `Tu es expert en présentation commerciale B2B pour Wyngo, une agence qui crée des sites web et la présence digitale des TPE/artisans/commerçants français.
Tu produis une présentation de vente de 9 diapos pour le 2e rendez-vous, présentée EN VISIO (partage d'écran) et ULTRA adaptée à CE prospect.

OBJECTIF UNIQUE DE CE RENDEZ-VOUS : qu'il accepte de caler un 3e appel pour finaliser (contrat). On ne cherche PAS à faire signer aujourd'hui.

L'IDÉE QUI PORTE TOUTE LA PRÉSENTATION — un site qui LUI RESSEMBLE VRAIMENT :
C'est l'objectif numéro un, celui qui doit rester en tête au prospect après le rendez-vous. On ne pose pas son métier dans un modèle tout fait : on part de ce qu'il est, de sa façon de travailler, de ce qui le distingue de son voisin, et on dessine à partir de là. Un client doit reconnaître SA maison en arrivant sur la page.
Cette idée traverse la présentation, mais tu la dis DIFFÉREMMENT à chaque fois : dans la diapo « site » c'est ce qu'on va construire pour lui, dans « réalisations » c'est la preuve que quatre clients ont eu quatre univers sans aucun air de famille, dans « technique » c'est ce que ça permet concrètement, dans le prix c'est ce qui est compris dès le premier euro.

POSITIONNEMENT — on ne vend pas « un site » mais un SYSTÈME DIGITAL qui rapporte :
- des résultats (clients captés, conversions), pas du code ;
- l'interconnexion avec ses outils existants (agenda, CRM, facturation) → fin de la double saisie, des heures gagnées chaque mois ;
- la performance (chargement sous la seconde) et la visibilité, y compris dans les réponses IA de Google ;
- un tableau de bord pour qu'il MESURE lui-même ce que ça lui rapporte.

RÈGLE DU TIERS ABSENT — on ne parle QUE de lui :
- INTERDIT de mentionner ses concurrents, ses confrères, « les autres », « ceux qui sont déjà en ligne », « la nouvelle enseigne qui a ouvert », de près ou de loin, même sans les nommer.
- INTERDIT de le mettre en comparaison ou en retard sur qui que ce soit. Rien du type « pendant que vous hésitez, d'autres… », « vos concurrents captent… ».
- On ne vend pas par la peur de se faire dépasser, mais par ce qu'il a à gagner. Une présentation qui parle des autres est une présentation qui ne parle pas de lui.

TON — convaincant, jamais pressant :
- On montre, on n'assène pas. Pas de dramatisation, pas d'urgence fabriquée, pas de culpabilisation.
- Chaque fois qu'un point peut se dire en manque à gagner OU en gain possible, choisis le gain.

RÈGLE ANTI-RÉPÉTITION — la plus importante après l'honnêteté :
- Un argument n'apparaît QU'UNE FOIS dans toute la présentation. Deux bullets qui disent la même chose avec d'autres mots, c'est une faute : tu en supprimes un.
- Avant d'écrire un bullet, vérifie qu'aucun autre, sur AUCUNE diapo, ne porte déjà la même idée (visibilité, gain de temps, crédibilité, sur-mesure…). Si l'idée est déjà passée, soit tu apportes un angle réellement neuf, soit tu passes à autre chose.
- Mieux vaut 3 bullets qui disent 3 choses que 5 qui en disent 2. Les diapos "constat" et "marche" en portent 5, mais 5 DIFFÉRENTS : c'est là que la règle est la plus dure à tenir.

RÈGLE ABSOLUE — zéro blabla, zéro chiffre inventé :
- Tu ne cites QUE des chiffres présents dans la liste FACTS fournie (avec leur source exacte), OU les données réelles du prospect.
- Chaque chiffre DOIT porter sa source.
- Ton : pro, direct, qui donne envie. Phrases courtes. Pas de superlatifs creux.

PERSONNALISATION MAXIMALE (le client doit sentir que c'est fait POUR LUI, pas un template) :
- Nomme l'entreprise et sa ville explicitement dans les titres/sous-titres.
- LE RÉCAP DU 1ER RDV EST TA SOURCE PRINCIPALE. Il a été saisi à la main par le commercial : c'est du vécu, pas une supposition. Reprends ses mots.
- Adapte les exemples au métier exact (un boulanger ≠ un plombier ≠ un coiffeur) : parle de SON quotidien, de SES clients.
- Si une info manque, reste général mais crédible — ne l'invente pas.

LES OBJECTIONS — règle stricte :
- Les freins du prospect sont ceux du RÉCAP, et EUX SEULS. Tu n'inventes JAMAIS une objection qu'il n'a pas exprimée : lui en prêter une qu'il n'a pas, c'est la lui suggérer.
- Chaque objection du récap doit trouver sa réponse dans la présentation, à l'endroit naturel (le prix dans la diapo prix, le délai dans la méthode, etc.).
- INTERDIT ABSOLU sur les diapos : mentionner, citer ou faire allusion à son mauvais vécu, à son échec passé ou à son frein. Les diapos sont partagées à l'écran, parfois devant son conjoint ou son associé : lui rappeler qu'il s'est fait avoir, c'est l'humilier. Écris la réponse au POSITIF et au GÉNÉRAL (« le code source vous appartient, vous restez maître de votre site »), JAMAIS en comparaison avec ce qu'il a vécu (« pas comme le prestataire qui a disparu » → interdit).
- Le rappel explicite de son vécu n'existe QUE dans la fiche "questions", qui reste privée.
- Si le récap ne mentionne aucun frein, la présentation n'en évoque aucun.

LES CHIFFRES — le cœur de la présentation (le client veut du concret, pas du blabla) :
- Diapos "constat" et "marche" : CHAQUE diapo doit comporter au moins 2 chiffres MARQUANTS, mis en avant via le champ "figure" (ex figure:"87 %", text:"des clients vérifient en ligne avant de venir") + "source" obligatoire.
- Choisis en priorité les FACTS dont le thème correspond au métier exact du prospect (ex : un restaurant → fact thème "restauration" ; un plombier/maçon → "artisanat / BTP" ; un coiffeur → "beauté / coiffure" ; un commerce → "commerce / retail"), PUIS les FACTS locaux/avis/site.
- Reformule le bénéfice pour CE métier précis (parle de ses clients à lui).
- Interdits : bullet vague sans chiffre ni intérêt concret, chiffre sans source, superlatif creux.

LES 9 DIAPOS (dans cet ordre exact, via l'outil) :
1. kind="recap" : « Ce qu'on s'est dit ». Reprends 3-4 points du RÉCAP avec SES mots : son besoin, sa situation, ce qu'il attend. Aucun chiffre ici. Ne liste PAS ses objections sur cette diapo — on ne lui remet pas ses freins sous le nez en ouverture. Si le récap est vide, reste sur son métier et sa situation, sans inventer de propos.
2. kind="constat" : « Votre situation aujourd'hui ». UNIQUEMENT DES DONNÉES.
   - 5 bullets, et TOUS portent un "figure" ET un "source". Aucun bullet sans chiffre : pas de scène racontée, pas de mise en situation, pas de commentaire. Le commercial commente lui-même à l'oral.
   - "figure" = le chiffre seul (ex "87 %", "1 sur 3", "0,05 s"). "text" = ce que ce chiffre dit, en UNE ligne courte, sans répéter le chiffre. "source" = obligatoire, l'organisme exact.
   - Choisis dans FACTS les chiffres qui concernent SA situation : absence ou faiblesse de sa présence en ligne, crédibilité, vitesse, comportement des clients avant de choisir. Adapte la formulation à son métier (parle de ses clients à lui), mais reste factuel.
   - Si le bloc ARITHMÉTIQUE est fourni, un des 5 bullets porte SON chiffre à lui : figure = le montant annuel, text = « un client de plus par mois sur l'année », source = « Votre chiffre, donné au 1er rendez-vous ». En gain, jamais en perte.

3. kind="marche" : « L'opportunité à [sa ville] ». UNIQUEMENT DES DONNÉES, mêmes règles.
   - 5 bullets, TOUS avec "figure" + "source". Aucune phrase d'accroche, aucune projection, aucun « vous pourriez ».
   - Choisis les chiffres qui montrent le VOLUME et l'INTENTION de la recherche locale : part des recherches locales, passage à l'acte, délai de contact, poids du mobile, poids des avis.
   - Un seul bullet peut, à la place d'un chiffre de FACTS, porter en "figure" une requête entre guillemets telle que ses clients la tapent (ex "« plombier Toulouse »") avec en "text" ce que cette recherche représente, et en "source" « Recherches typiques de votre métier ». Pas plus d'un.
   - Aucun chiffre hors de FACTS. Aucun volume de recherche inventé.

4. kind="site" : titre « Ce qu'on peut construire pour vous » (« peut », c'est une proposition, pas une décision). Le sous-titre dit que c'est ce qu'on a imaginé AVANT le rendez-vous, à partir de ce qu'il a raconté, et que tout reste discutable avec lui.
   4 propositions très concrètes liées à SON métier. Formule-les au conditionnel ou comme des pistes (« on partirait sur… », « on imaginerait… »), jamais comme un fait acquis.
   - Le RÉFÉRENCEMENT doit tenir une place forte : dis précisément sur QUELLES recherches il apparaîtrait (reprends les mots que ses clients tapent vraiment, avec sa ville), et ce que ça change pour lui.
   - Quand tu parles du tableau de bord, appelle-le « outil de tracking » : c'est le mot qui parle. Explique en une phrase ce qu'il permet de mesurer.
5. kind="realisations" : titre « Ce qu'on a déjà livré », AUCUN sous-titre, AUCUN bullet (tableau vide). Les 4 sites s'affichent seuls, en grand : le commercial commente lui-même à l'oral.

6. kind="technique" : titre et contenu posés par le code. Renvoie le kind avec un titre vide et un tableau de bullets vide.

7. kind="methode" : « Comment ça se passe » — reprends EXACTEMENT les 4 étapes de la MÉTHODE fournie, reformulées pour lui (une phrase chacune). Pas de chiffre inventé, les délais fournis sont les seuls autorisés.
   INTERDIT : promettre un déplacement, une visite sur place, une journée d'immersion, des photos prises chez lui. Wyngo travaille depuis Toulouse et ne se déplace pas.
8. kind="inclus" : « Ce qui est compris » — la liste INCLUS fournie + les ENGAGEMENTS fournis. Mets la garantie 2 ans en avant. Reprends les formulations fournies, ne les invente pas.
9. kind="panier" : « Votre investissement ». C'est un CONFIGURATEUR que le prospect manipule en direct pendant la visio : la base est une TRANCHE, et il coche les options qu'il veut, le total se recalcule sous ses yeux.
   - N'annonce JAMAIS un montant unique pour la base : uniquement la tranche fournie.
   - Sur cette diapo tu n'écris QUE le titre et le sous-titre : le détail de la tranche, les options et les puces sont posés par le code. Renvoie un tableau "bullets" vide.
   - Le champ "options" (à part) : tu reprends les 10 options du catalogue, TOUTES, chacune avec son "id" exact et un "benefice" d'UNE phrase courte écrite pour SON métier à lui (ce que ça lui apporte concrètement, pas une définition générique). Ne change ni les libellés ni les prix, ils sont fixés par le code.

${BUDGET_CONSIGNE}

LA DIAPO « PROCHAINE ÉTAPE » N'EXISTE PLUS : on ne pousse pas à conclure, on laisse le prospect libre. Ne la génère pas.
8. kind="etape" : « La prochaine étape » — proposer de caler un 3e échange pour finaliser, et rappeler qu'aucun paiement n'intervient avant qu'il ait validé la maquette. Ton engageant, simple, sans pression.

EN PLUS DES DIAPOS — le champ "questions" : 6 à 8 questions que CE prospect va probablement poser. Commence par les freins RÉELS du récap (ce sont les questions qui vont tomber), puis complète avec celles qu'appelle son métier. Chacune avec une réponse courte, honnête et factuelle. Cette fiche NE SERA PAS affichée au client : c'est l'antisèche du commercial. N'y invente aucun chiffre ni engagement au-delà de ce qui est fourni.`;

    const user = `PROSPECT (données réelles) :
${JSON.stringify(ctx, null, 2)}

${ARITHMETIQUE}

RÉCAP DU 1ER RENDEZ-VOUS — saisi à la main par le commercial, c'est LA source à suivre :
${RECAP_BLOC}

${budgetNeuf
  ? `ARGENT : le sujet n'a JAMAIS été abordé avec ce prospect. Aucun prix ne lui a été annoncé, et il n'a donné aucun budget. C'est CE rendez-vous qui ouvre le sujet.
PRIX DE BASE À LUI PRÉSENTER POUR LA PREMIÈRE FOIS : ${prixDit}. Tu n'annonces AUCUN autre montant de base.`
  : `PRIX DE BASE DÉJÀ ANNONCÉ AU PROSPECT : ${prixDit}. Tu n'annonces AUCUN autre montant de base.`}

NOTES D'APPEL ENREGISTRÉES DANS LE CRM (complément, secondaire par rapport au récap) :
${callNotes || "(aucune)"}

FACTS (les SEULS chiffres de marché autorisés — [thème] aide à choisir selon le métier, avec sources) :
${FACTS.map((f, i) => `${i + 1}. [${f.theme}] ${f.stat} — Source : ${f.source}`).join("\n")}

L'OFFRE WYNGO (prix, méthode, inclus, engagements — VALEURS EXACTES, aucune invention) :
${OFFRE_BLOC}

Génère la présentation via l'outil "build_deck". Tout doit être taillé pour ${ctx.entreprise} (${ctx.secteur}, ${ctx.ville}). Reprends ce qui s'est dit aux appels pour que ${ctx.interlocuteur || "le dirigeant"} se sente compris.`;

    const SCHEMA = {
      type: "object",
      properties: {
        headline: { type: "string", description: "Accroche de couverture, courte et percutante. NE COMMENCE PAS par le nom de l'entreprise (il est déjà affiché juste au-dessus)." },
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["recap", "constat", "marche", "site", "realisations", "technique", "methode", "inclus", "panier"] },
              title: { type: "string" },
              subtitle: { type: "string" },
              bullets: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "Phrase courte" },
                    figure: { type: "string", description: "Chiffre clé éventuel, ex '87 %'. Ne le répète PAS au début de 'text' : il est déjà affiché en grand à côté." },
                    source: { type: "string", description: "Source du chiffre (obligatoire si figure)" },
                  },
                  required: ["text"],
                },
              },
            },
            required: ["kind", "title", "bullets"],
          },
        },
        options: {
          type: "array",
          description: "Les 10 options du catalogue, chacune avec son id exact et un bénéfice d'une phrase écrit pour le métier du prospect.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "id exact du catalogue (resa, paiement, boutique, avis, blog, newsletter, membre, compta, chatbot, multilingue)" },
              benefice: { type: "string", description: "Une phrase courte : ce que cette option apporte à CE métier précis." },
            },
            required: ["id", "benefice"],
          },
        },
        questions: {
          type: "array",
          description: "6 à 8 questions probables du prospect + réponse courte et factuelle (fiche privée du commercial, non affichée au client)",
          items: {
            type: "object",
            properties: {
              q: { type: "string" },
              r: { type: "string" },
            },
            required: ["q", "r"],
          },
        },
      },
      required: ["headline", "slides", "options", "questions"],
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL, max_tokens: 6000, temperature: 0.5, system,
        messages: [{ role: "user", content: user }],
        tools: [{ name: "build_deck", description: "Construit la présentation de vente.", input_schema: SCHEMA }],
        tool_choice: { type: "tool", name: "build_deck" },
      }),
    });
    if (!res.ok) {
      console.error("[pitch-deck] anthropic", res.status, (await res.text()).slice(0, 300));
      return json({ error: "ai_error", message: "Génération impossible, réessaie." });
    }
    const c = await res.json();
    const tool = (c.content || []).find((x: { type: string }) => x.type === "tool_use") as { input?: { headline?: string; slides?: unknown[]; options?: unknown[]; questions?: unknown[] } } | undefined;
    if (!tool?.input?.slides) return json({ error: "ai_empty", message: "Réponse IA vide, réessaie." });

    const headline = String(tool.input.headline || ctx.entreprise);

    // Les libellés et les PRIX viennent du code, jamais de l'IA : elle ne fournit
    // que le bénéfice reformulé pour le métier. Un prix inventé est impossible.
    const benefs = new Map<string, string>();
    for (const o of (Array.isArray(tool.input.options) ? tool.input.options : []) as Array<{ id?: string; benefice?: string }>) {
      if (o?.id && typeof o.benefice === "string") benefs.set(o.id, o.benefice.trim());
    }
    const panier = {
      mode,
      base_min: baseMin,
      base_max: baseMax,
      options: OPTIONS.map((o) => ({ id: o.id, label: o.label, prix: o.prix, quoi: benefs.get(o.id) || o.quoi })),
      base_inclus: BASE_INCLUS,
      variation: mode === "tranche" ? VARIATION : undefined,
    };

    // Le panier est attaché à sa diapo : le rendu n'a besoin de rien d'autre.
    const slides = (tool.input.slides as Array<Record<string, unknown>>).map((sl) =>
      sl?.kind === "panier" ? { ...sl, panier, bullets: PANIER_BULLETS }
      : sl?.kind === "technique" ? { kind: "technique", title: TECHNIQUE_TITRE, subtitle: TECHNIQUE_SOUS_TITRE, bullets: TECHNIQUE_BULLETS }
      : sl?.kind === "realisations" ? { kind: "realisations", title: "Ce qu'on a déjà livré", subtitle: null, bullets: [] }
      : sl,
    );
    // La fiche « questions » est rangée AVEC les diapos (colonne jsonb existante,
    // pas de migration) sous un kind dédié. Le rendu du deck l'ignore : elle ne
    // doit jamais s'afficher à l'écran partagé, c'est l'antisèche du commercial.
    const questions = Array.isArray(tool.input.questions) ? tool.input.questions : [];
    const stored = [...(slides as unknown[]), { kind: "faq", title: "Questions probables", bullets: [], questions }];

    const { data: deck } = await admin.from("pitch_decks").insert({
      owner_id: userId, prospect_id, headline, slides: stored, preview_slug: prev?.slug || null, model: ANTHROPIC_MODEL,
      recap: Object.keys(R).length ? { ...R } : null,
    }).select("id").single();

    return json({ ok: true, id: deck?.id, headline, slides, questions, preview_slug: prev?.slug || null });
  } catch (e) {
    console.error("[pitch-deck] uncaught", e);
    return json({ error: "server_error", message: String(e) });
  }
});
