/**
 * ─── Les faits qu'on a le droit de dire ───────────────────────────────
 *
 * Tout chiffre prononcé devant un prospect vient d'ici, et d'ici seulement.
 * Le modèle n'en produit aucun : il choisit dans cette liste et l'habille.
 *
 * ── La règle d'entrée ──
 * Un fait n'entre que s'il porte une SOURCE NOMMABLE à voix haute : une
 * institution, une étude, un organisme. « Une étude montre que » n'est pas
 * une source. Les pages de vente d'éditeurs de logiciels non plus — c'est
 * précisément là qu'on trouve les « jusqu'à 70 % de temps gagné » que
 * personne ne peut retrouver.
 *
 * Le test est simple : si le prospect demande « ça vient d'où ? », est-ce
 * qu'on peut répondre sans hésiter et est-ce qu'il peut vérifier lui-même ?
 * Si non, le fait n'a rien à faire ici.
 *
 * ── Les axes ──
 * `axe` sert à sortir du chiffre d'affaires. Un dirigeant qui n'est pas ému
 * par « vous gagnerez plus » l'est souvent par « vous passerez moins de
 * temps au téléphone », « vos candidats vous regardent avant de postuler »,
 * ou « ce que Google raconte de vous aujourd'hui, ce n'est pas vous qui
 * l'écrivez ».
 */

export type Axe =
  | "trouve"        // être trouvé quand on le cherche
  | "credibilite"   // ce qu'on inspire avant même de parler
  | "temps"         // les heures rendues au dirigeant
  | "recrutement"   // attirer et rassurer des candidats
  | "maitrise"      // maîtriser son image plutôt que la subir
  | "resilience"    // ne pas dépendre d'une plateforme qu'on ne possède pas
  | "chiffre";      // le chiffre d'affaires, quand c'est vraiment le sujet

export type Fait = {
  fig: string;
  txt: string;
  source: string;
  annee?: number;
  axe: Axe;
  /** Vide = valable pour tous les métiers. Sinon, secteurs concernés. */
  secteurs?: string[];
};

export const FAITS: Fait[] = [
  // ── Être trouvé ──────────────────────────────────────────────────────
  { fig: "84 %", txt: "des TPE et PME françaises ont au moins une présence en ligne",
    source: "Baromètre France Num", annee: 2025, axe: "trouve" },
  { fig: "69 %", txt: "des entreprises de 10 salariés ou plus ont un site web",
    source: "Insee, enquête TIC", annee: 2023, axe: "trouve" },
  { fig: "87 %", txt: "des Français consultent Internet avant de choisir un commerce ou un artisan près de chez eux",
    source: "Opinionway pour Solocal", axe: "trouve" },
  { fig: "4 sur 5", txt: "des recherches Google ont une intention locale",
    source: "Google", axe: "trouve" },
  { fig: "76 %", txt: "des personnes qui font une recherche locale sur téléphone se rendent dans un établissement dans les 24 heures",
    source: "Google", axe: "trouve" },
  { fig: "90 %", txt: "des recherches faites en France passent par Google",
    source: "StatCounter", axe: "trouve" },
  { fig: "1 sur 2", txt: "des clics vont aux trois premiers résultats naturels de Google",
    source: "Sistrix", axe: "trouve" },
  { fig: "28 %", txt: "des clics vont au tout premier résultat",
    source: "Sistrix", axe: "trouve" },

  // ── Crédibilité ──────────────────────────────────────────────────────
  { fig: "75 %", txt: "des internautes jugent la crédibilité d'une entreprise à partir de l'apparence de son site",
    source: "Université de Stanford", axe: "credibilite" },
  { fig: "0,05 seconde", txt: "le temps qu'il faut à un visiteur pour se faire une première opinion sur un site",
    source: "Google / EPFL", axe: "credibilite" },
  { fig: "1 sur 2", txt: "des consommateurs jugent une entreprise moins fiable quand elle n'a pas de site",
    source: "Visual Objects", axe: "credibilite" },
  { fig: "88 %", txt: "des consommateurs font autant confiance aux avis en ligne qu'à la recommandation d'un proche",
    source: "BrightLocal", axe: "credibilite" },
  { fig: "10 avis", txt: "lus en moyenne avant d'accorder sa confiance à une entreprise locale",
    source: "BrightLocal", axe: "credibilite" },
  { fig: "53 %", txt: "des visiteurs sur téléphone quittent un site qui met plus de 3 secondes à s'afficher",
    source: "Google", axe: "credibilite" },

  // ── Le temps rendu ───────────────────────────────────────────────────
  { fig: "78 %", txt: "des dirigeants de TPE et PME estiment que le numérique leur apporte un bénéfice réel",
    source: "Baromètre France Num", annee: 2025, axe: "temps" },
  { fig: "56 %", txt: "des entreprises du commerce proposent la commande ou la réservation en ligne",
    source: "Insee, enquête TIC", annee: 2023, axe: "temps", secteurs: ["commerce"] },
  { fig: "66 %", txt: "des entreprises de l'hébergement et de la restauration proposent la commande ou la réservation en ligne",
    source: "Insee, enquête TIC", annee: 2023, axe: "temps", secteurs: ["restauration", "hebergement"] },
  { fig: "37 %", txt: "des TPE et PME proposent la vente ou le paiement en ligne",
    source: "Baromètre France Num", annee: 2025, axe: "temps" },

  // ── Recrutement ──────────────────────────────────────────────────────
  // L'angle que personne n'utilise, et qui touche tous ceux qui peinent à
  // embaucher — c'est-à-dire presque tous les artisans et restaurateurs.
  { fig: "62 %", txt: "des entreprises présentes sur les réseaux sociaux s'en servent pour recruter",
    source: "Insee, enquête TIC", annee: 2023, axe: "recrutement" },
  { fig: "57 %", txt: "des entreprises de moins de 50 salariés qui utilisent un média social le font pour recruter",
    source: "Insee, enquête TIC", annee: 2023, axe: "recrutement" },

  // ── Maîtriser son image ──────────────────────────────────────────────
  { fig: "74 %", txt: "des entreprises présentes en ligne le sont d'abord pour maîtriser l'image de leur maison",
    source: "Insee, enquête TIC", annee: 2023, axe: "maitrise" },
  { fig: "48 %", txt: "s'en servent pour recueillir les retours de leurs clients et y répondre",
    source: "Insee, enquête TIC", annee: 2023, axe: "maitrise" },
  { fig: "× 7", txt: "de clics sur une fiche Google Business complète plutôt qu'incomplète",
    source: "Google", axe: "maitrise" },
  { fig: "+ 42 %", txt: "de demandes d'itinéraire pour une fiche Google Business avec photos",
    source: "Google", axe: "maitrise" },
  { fig: "73 %", txt: "des consommateurs ne tiennent compte que des avis publiés dans le mois",
    source: "BrightLocal", axe: "maitrise" },

  // ── Ne pas dépendre d'une plateforme ─────────────────────────────────
  { fig: "36 %", txt: "des TPE et PME ont déjà subi un incident de cybersécurité",
    source: "Baromètre France Num", annee: 2025, axe: "resilience" },
  { fig: "55 %", txt: "des TPE et PME disposent de compétences numériques en interne — les autres dépendent entièrement d'un tiers",
    source: "Baromètre France Num", annee: 2025, axe: "resilience" },

  // ── Chiffre d'affaires ───────────────────────────────────────────────
  { fig: "40 %", txt: "des TPE et PME constatent une hausse de leur chiffre d'affaires grâce au numérique",
    source: "Baromètre France Num", annee: 2025, axe: "chiffre" },
  { fig: "× 2", txt: "les TPE et PME à la présence en ligne avancée croissent jusqu'à deux fois plus vite",
    source: "France Num / Bpifrance", axe: "chiffre" },
  { fig: "+ 5 à 9 %", txt: "de chiffre d'affaires pour une étoile gagnée sur Google",
    source: "Harvard Business School", axe: "chiffre" },
  { fig: "28 %", txt: "des recherches locales aboutissent à un achat",
    source: "Google", axe: "chiffre" },

  // ── Par secteur ──────────────────────────────────────────────────────
  { fig: "91 %", txt: "des entreprises de l'hébergement et de la restauration qui ont un site y présentent leur offre et leurs prix",
    source: "Insee, enquête TIC", annee: 2023, axe: "trouve", secteurs: ["restauration", "hebergement"] },
  { fig: "9 sur 10", txt: "des clients lisent les avis en ligne avant de choisir un restaurant",
    source: "TripAdvisor", axe: "credibilite", secteurs: ["restauration"] },
  { fig: "85 %", txt: "des entreprises de l'immobilier qui ont un site y affichent leurs prix",
    source: "Insee, enquête TIC", annee: 2023, axe: "trouve", secteurs: ["immobilier"] },
  { fig: "82 %", txt: "des commerces qui ont un site s'en servent à présenter leurs produits et leurs prix",
    source: "Insee, enquête TIC", annee: 2023, axe: "trouve", secteurs: ["commerce"] },
  { fig: "55 %", txt: "des entreprises du bâtiment qui ont un site y décrivent leurs prestations",
    source: "Insee, enquête TIC", annee: 2023, axe: "trouve", secteurs: ["btp"] },
  { fig: "8 sur 10", txt: "des Français cherchent un artisan sur Internet avant de le contacter",
    source: "Opinionway pour Solocal", axe: "trouve", secteurs: ["btp", "artisanat"] },
  { fig: "1 sur 2", txt: "des prises de rendez-vous en coiffure et en beauté se font désormais en ligne",
    source: "Planity", axe: "temps", secteurs: ["beaute"] },
  { fig: "80 %", txt: "des consommateurs se renseignent en ligne avant d'acheter en magasin",
    source: "Google", axe: "chiffre", secteurs: ["commerce"] },
];

/**
 * Rattache un métier à ses familles de secteurs, pour ne servir que des faits
 * qui le concernent. On raisonne sur le libellé du métier ET son code NAF :
 * le libellé est plus riche, le code plus fiable.
 */
const FAMILLES: { secteur: string; motifs: RegExp; naf?: RegExp }[] = [
  { secteur: "restauration",
    motifs: /restaur|brasserie|pizz|traiteur|crêper|creper|bar\b|café|cafe\b|snack|food.?truck|glacier|salon de thé/i,
    naf: /^56\./ },
  { secteur: "hebergement",
    motifs: /hôtel|hotel|chambre d.hôte|gîte|gite|camping|résidence de tourisme/i, naf: /^55\./ },
  { secteur: "commerce",
    motifs: /boulanger|pâtiss|patiss|boucher|charcut|primeur|épicer|epicer|fleuriste|libraire|opticien|bijout|animalerie|magasin|boutique|caviste|poissonn|fromager|chocolat|tabac|presse/i,
    naf: /^47\./ },
  { secteur: "btp",
    motifs: /plombier|électric|electric|maçon|macon|couvreur|charpent|menuis|peintre|carreleur|serrur|chauffagiste|terrass|platr|plâtr|isolation|étanch|etanch|vitrier|storiste|paysagiste|piscin/i,
    naf: /^4[123]\./ },
  { secteur: "artisanat",
    motifs: /artisan|ébénist|ebenist|tapissier|encadreur|cordonnier|horloger|couturi|retouche|forgeron|potier|verrier/i },
  { secteur: "beaute",
    motifs: /coiff|esthét|esthet|barbier|onglerie|institut de beauté|spa\b|massage|tatou|manucure/i,
    naf: /^96\.0[23]/ },
  { secteur: "sante",
    motifs: /kiné|kine|ostéo|osteo|dentist|médecin|medecin|infirmi|podolog|orthophon|psycholog|sage-femme|vétérinaire|veterinaire|opticien|audio/i,
    naf: /^86\./ },
  { secteur: "auto",
    motifs: /garage|carross|mécanic|mecanic|pneu|concession|auto-?école|contrôle technique|contrôle automobile/i,
    naf: /^45\./ },
  { secteur: "immobilier",
    motifs: /agence immobili|immobilier|syndic|gestion locative|diagnostic immobilier/i, naf: /^68\./ },
  { secteur: "services",
    motifs: /avocat|notaire|expert.?comptable|conseil|architecte|géomètre|geometre|assurance|courtier|huissier|traducteur|agence de communication|agence seo/i,
    naf: /^(69|70|71|73)\./ },
  { secteur: "sport",
    motifs: /salle de sport|crossfit|fitness|coach sportif|yoga|pilates|danse|club de/i, naf: /^93\./ },
];

export function secteursDe(metier?: string | null, naf?: string | null): string[] {
  const m = String(metier ?? "");
  const n = String(naf ?? "");
  const trouves = FAMILLES
    .filter((f) => (m && f.motifs.test(m)) || (n && f.naf?.test(n)))
    .map((f) => f.secteur);
  return [...new Set(trouves)];
}

/**
 * Les faits utilisables pour ce métier : ceux qui le visent explicitement
 * d'abord, les généraux ensuite. Un fait sectoriel qui ne le concerne pas
 * est écarté — dire à un plombier ce que font les restaurateurs, c'est lui
 * signaler qu'on récite une fiche.
 */
export function faitsPour(metier?: string | null, naf?: string | null): Fait[] {
  const secteurs = secteursDe(metier, naf);
  const cible = FAITS.filter((f) => f.secteurs?.some((s) => secteurs.includes(s)));
  const generaux = FAITS.filter((f) => !f.secteurs);
  return [...cible, ...generaux];
}

/** Ce que chaque axe cherche à toucher — sert à guider la rédaction. */
export const AXES: Record<Axe, string> = {
  trouve: "être trouvé au moment où quelqu'un cherche exactement son métier près de chez lui",
  credibilite: "ce qu'il inspire avant même d'avoir décroché le téléphone",
  temps: "les heures qu'il passe à répéter ses horaires, ses tarifs et ses disponibilités",
  recrutement: "les candidats qui regardent l'entreprise avant de postuler",
  maitrise: "reprendre la main sur ce que Google raconte de lui aujourd'hui",
  resilience: "ne plus dépendre d'une page qu'il ne possède pas et qui peut disparaître",
  chiffre: "le chiffre d'affaires — à ne mettre en avant que si c'est vraiment son sujet",
};
