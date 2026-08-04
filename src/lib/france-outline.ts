/**
 * ─── Contour de la France métropolitaine ──────────────────────────────
 *
 * Un tracé volontairement grossier — une centaine de points le long des côtes
 * et des frontières, la Corse à part. Ce n'est pas de la cartographie : on ne
 * mesure rien dessus, on veut juste que l'équipe reconnaisse son pays et voie
 * les territoires conquis se répartir dessus.
 *
 * Le prix d'un vrai fond de carte (GeoJSON des départements, ~800 Ko) serait
 * sans rapport avec le service rendu.
 */

/** Points [longitude, latitude], dans le sens horaire depuis Dunkerque. */
export const FRANCE_METRO: [number, number][] = [
  // Manche & mer du Nord
  [2.38, 51.03], [1.85, 50.96], [1.60, 50.72], [1.55, 50.20], [1.08, 49.93],
  [0.10, 49.49], [-0.25, 49.29], [-1.15, 49.35], [-1.62, 49.68], [-1.85, 49.40],
  [-1.60, 48.83], [-2.02, 48.65], [-2.55, 48.60], [-3.05, 48.78], [-3.98, 48.72],
  // Bretagne
  [-4.49, 48.39], [-4.73, 48.04], [-4.10, 47.80], [-3.37, 47.72], [-3.10, 47.50],
  [-2.55, 47.52], [-2.20, 47.27],
  // Côte atlantique
  [-2.25, 46.95], [-1.78, 46.49], [-1.15, 46.16], [-1.03, 45.62], [-0.95, 45.15],
  [-1.16, 44.65], [-1.30, 44.20], [-1.45, 43.85], [-1.56, 43.48], [-1.78, 43.35],
  // Pyrénées
  [-0.75, 42.95], [0.65, 42.70], [1.45, 42.50], [2.05, 42.35], [3.03, 42.44],
  // Méditerranée
  [3.05, 43.02], [3.70, 43.40], [4.15, 43.55], [4.85, 43.35], [5.05, 43.32],
  [5.90, 43.10], [6.35, 43.15], [6.95, 43.55], [7.30, 43.70], [7.53, 43.78],
  // Alpes
  [7.00, 44.15], [6.90, 44.85], [7.00, 45.50], [6.80, 45.85], [6.20, 46.20],
  [6.10, 46.40], [6.45, 46.75], [6.05, 46.95], [6.45, 47.10], [7.00, 47.35],
  [7.58, 47.59],
  // Rhin & frontière nord-est
  [7.80, 48.60], [8.20, 48.65], [8.10, 48.95], [7.60, 49.05], [6.85, 49.20],
  [6.35, 49.47], [5.80, 49.55], [5.45, 49.50], [4.85, 50.15], [4.20, 49.95],
  [3.65, 50.35], [3.15, 50.78],
];

/** La Corse, tracée séparément. */
export const CORSE: [number, number][] = [
  [8.57, 42.98], [9.00, 42.82], [9.35, 43.00], [9.55, 42.65], [9.40, 42.10],
  [9.30, 41.60], [9.15, 41.38], [8.75, 41.55], [8.70, 41.92], [8.55, 42.35],
];
