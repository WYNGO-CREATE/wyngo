/**
 * ─── L'offre Group Arsène — source unique ─────────────────────────────
 *
 * Ces valeurs sont récitées au prospect : au 2e rendez-vous par la
 * présentation, au 3e par celle de la décision, et reprises dans le contrat.
 * Elles vivaient en double dans `pitch-deck`. Deux copies d'un tarif finissent
 * toujours par diverger — et le jour où elles divergent, on annonce un prix
 * en visio et un autre sur le devis.
 */

export const METHODE = [
  { etape: "Le brief", detail: "On prend le temps de comprendre votre métier, vos clients et vos prestations. On rédige vos textes à partir de ce que vous nous racontez." },
  { etape: "La première maquette — sous 48 h", detail: "Vous voyez le résultat avant de payer le moindre euro. Vous validez, ou on retravaille." },
  { etape: "La mise en ligne — sous 21 jours", detail: "Développement, référencement technique, tests, mise en ligne et formation." },
  { etape: "Le suivi", detail: "On reste à vos côtés 2 ans, sans surcoût. Un interlocuteur unique, réponse sous 24 h." },
];

// ── Le panier : base modulable + options chiffrées à l'heure (× 21 €/h).
//    Le prospect coche en direct pendant la visio, le total bouge sous ses yeux.
// Ce que comprend la base, au plancher de la tranche. La collecte d'avis est
// OFFERTE : elle ne se facture plus en option.
export const BASE_INCLUS = [
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
export const VARIATION = [
  "Le nombre de pages : une vitrine de 4 à 5 pages, ou un site complet de 10 à 12",
  "La quantité de contenu à écrire : quelques paragraphes, ou chacune de vos prestations détaillée",
  "Les animations et les effets sur-mesure : une mise en page sobre, ou un site qui bouge et réagit",
  "Le volume de photos à préparer, retoucher et optimiser",
  "Le nombre de formulaires, ou un vrai parcours de demande de devis",
  "Plusieurs établissements ou plusieurs zones d'intervention à traiter séparément",
];

// Options — prix divisés par deux par rapport au barème horaire d'origine.
export const OPTIONS = [
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
export const TECHNIQUE_TITRE = "Ce qu'on est capable de construire";
export const TECHNIQUE_SOUS_TITRE = "Aucune limite technique de notre côté : le site suit l'idée, jamais l'inverse";
export const TECHNIQUE_BULLETS = [
  { text: "Des pages qui se mettent à jour toutes seules depuis vos données — tarifs, stocks, disponibilités, plannings : vous changez une fois, le site suit partout" },
  { text: "Un site qui charge en moins d'une seconde, même chargé en images et en animations" },
  { text: "Des animations et de la 3D directement dans le navigateur, sans rien à installer : faire tourner un objet, dérouler une histoire au fil du défilement" },
  { text: "Des outils sur-mesure qu'aucun modèle tout fait ne propose : un simulateur, un configurateur, un calculateur d'estimation" },
  { text: "Une connexion à n'importe quel outil que vous utilisez déjà — agenda, facturation, messagerie — pour supprimer les doubles saisies" },
  { text: "Et si vous avez une idée qui n'est pas dans cette liste : dites-la. Techniquement, on n'est bloqués par rien." },
];

// Les puces de la diapo panier sont FIXES : l'IA y résumait systématiquement
// la colonne « ce qui fait monter le prix », affichée juste en dessous.
export const PANIER_BULLETS = [
  { text: "Vous composez vous-même : cochez ce qui vous sert, le total se recalcule sous vos yeux." },
  { text: "Vous pouvez commencer par la base seule, et ajouter plus tard quand le besoin arrive." },
  { text: "Aucun paiement avant que vous ayez validé la première maquette." },
];

// Nos réalisations — sites réellement livrés, montrés et navigables en visio.
export const REALISATIONS = [
  { nom: "Archimaides", url: "https://www.archimaides.com", quoi: "Architecte d'intérieur à Toulouse" },
  { nom: "Don Demeure", url: "https://don-demeure.vercel.app", quoi: "Patrimoine et immobilier" },
  { nom: "Mission Magis", url: "https://missionmagis.com", quoi: "Lavage automobile à domicile" },
  { nom: "Artefact Neural", url: "https://artefactneural.com", quoi: "Studio technologique" },
];

export const INCLUS = [
  "Hébergement de votre site",
  "Tableau de bord de suivi des performances",
  "Maintenance technique et mises à jour de sécurité",
  "Ajustements et petites évolutions (couleurs, textes, ajouts ponctuels)",
];
export const ENGAGEMENTS = [
  "Garantie 2 ans incluse — on reste à vos côtés 2 ans minimum, sans un euro de plus.",
  "Chargement sous la seconde — garanti, ou on retravaille jusqu'à l'atteindre.",
  "Aucun paiement avant que vous ayez validé la première maquette.",
  "Le code source vous appartient — vous n'êtes prisonnier de personne.",
];
