/**
 * ─── Identité du cabinet ──────────────────────────────────────────────
 * Point UNIQUE de vérité pour l'adresse professionnelle.
 *
 * Elle était recopiée dans huit fichiers (login_hint Google, page de
 * connexion, page d'inscription, verrou Gmail côté serveur…). Un
 * changement d'adresse obligeait à tout retrouver, avec le risque d'en
 * oublier une et de casser l'envoi d'emails sans s'en apercevoir.
 *
 * Côté serveur, les fonctions Edge lisent la variable CABINET_EMAIL et
 * retombent sur cette même valeur si elle n'est pas définie.
 */

/** Adresse depuis laquelle le cabinet écrit, et seule boîte Gmail connectable. */
export const CABINET_EMAIL = "contact@wyngo.fr";

/** Nom affiché dans les emails sortants et sur les documents. */
export const CABINET_NOM = "Cabinet Wyngo";
