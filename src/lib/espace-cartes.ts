/**
 * ─── Les cartes du tableau de bord client ─────────────────────────────
 *
 * Chaque carte est une brique indépendante : elle sait ce qu'elle affiche et
 * quelle fonction de mesure l'alimente. Le client coche celles qu'il veut,
 * son choix est gardé dans son navigateur.
 *
 * Une carte masquée n'interroge rien — c'est ce qui rend le tableau de bord
 * modulable sans le rendre lent.
 */

export type CarteId =
  | "resume" | "courbe" | "contacts" | "provenance"
  | "pages" | "appareils" | "rythme";

export type Carte = {
  id: CarteId;
  titre: string;
  /** Ce que la carte répond, en langage de commerçant. */
  aquoi: string;
  rpc: string;
  /** Occupe toute la largeur. */
  large?: boolean;
  /** Toujours affichée : sans elle l'écran n'a plus de sens. */
  socle?: boolean;
};

export const CARTES: Carte[] = [
  {
    id: "resume", titre: "L'essentiel", socle: true, large: true,
    aquoi: "Vos chiffres du mois, comparés au mois précédent.",
    rpc: "mesure_resume",
  },
  {
    id: "contacts", titre: "Ils ont voulu vous joindre", socle: true, large: true,
    aquoi: "Clics sur votre numéro, votre email, votre itinéraire — les visites qui comptent vraiment.",
    rpc: "mesure_contacts",
  },
  {
    id: "courbe", titre: "Jour après jour", large: true,
    aquoi: "L'évolution de la fréquentation, pour repérer vos pics.",
    rpc: "mesure_courbe",
  },
  {
    id: "provenance", titre: "D'où ils viennent",
    aquoi: "Google, réseaux sociaux, ou directement votre adresse.",
    rpc: "mesure_provenance",
  },
  {
    id: "pages", titre: "Ce qu'ils regardent",
    aquoi: "Les pages les plus consultées de votre site.",
    rpc: "mesure_pages",
  },
  {
    id: "appareils", titre: "Sur quel écran",
    aquoi: "Téléphone, ordinateur ou tablette.",
    rpc: "mesure_public",
  },
  // « De quelles villes » a été retirée : le collecteur ne reçoit aucune
  // donnée de localisation — pays et ville sont nuls sur 100 % des lignes —
  // la carte affichait donc « inconnue » à 100 %.
  {
    id: "rythme", titre: "À quelles heures", large: true,
    aquoi: "Les moments de la semaine où l'on vous consulte le plus.",
    rpc: "mesure_rythme",
  },
];

const CLE = "arsene.espace.cartes";

/** Par défaut : l'essentiel et les contacts, plus la courbe et la provenance. */
const DEFAUT: CarteId[] = ["resume", "contacts", "courbe", "provenance", "pages", "appareils"];

export function cartesChoisies(): CarteId[] {
  if (typeof window === "undefined") return DEFAUT;
  try {
    const v = window.localStorage.getItem(CLE);
    if (!v) return DEFAUT;
    const l = JSON.parse(v) as CarteId[];
    return Array.isArray(l) ? l : DEFAUT;
  } catch { return DEFAUT; }
}

export function enregistrerCartes(l: CarteId[]) {
  try { window.localStorage.setItem(CLE, JSON.stringify(l)); } catch { /* quota */ }
}
