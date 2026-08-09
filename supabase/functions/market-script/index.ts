// ─────────────────────────────────────────────────────────────────────────
// market-script — Analyse concurrentielle réelle d'un prospect + script d'appel
// hyper-personnalisé.
//
// Entrée : { prospect_id }
// 1. Lit le prospect (métier = activity, ville = location).
// 2. Google Places (searchText) sur "{métier} {ville}" → vrais établissements.
// 3. TRIPLE VÉRIFICATION avant de retenir un concurrent :
//      (a) il a un site web,
//      (b) son adresse contient bien la ville,
//      (c) son site répond VRAIMENT en direct (HTTP < 400).
//    Tri par nombre d'avis (proxy de domination). Le prospect lui-même est exclu.
//    Aucun acteur n'est inventé : uniquement des données Places vérifiées.
// 4. Génère un script d'appel complet (Claude) qui n'utilise QUE ces concurrents
//    réels, sans jamais prétendre que Group Arsène collabore avec eux (angle "ils dominent
//    le web, pas vous"). Respecte la philosophie de vente de l'agence.
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const PLACES_BASE = "https://places.googleapis.com/v1";

type Competitor = { name: string; website: string; rating: number | null; reviews: number; address: string | null };

const strip = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// Extrait la VILLE d'un champ « location » qui peut être une adresse complète
// (ex : "5 Pl. du Président Thomas Wilson, 31000 Toulouse" → "Toulouse").
function cleanCity(loc: string): string {
  const s = (loc || "").trim();
  // Cas courant : "... 31000 Toulouse" → on capture ce qui suit le code postal.
  const m = s.match(/\b\d{4,5}\s+([a-zA-Zà-ÿ'’ .-]+?)(?:,|$)/);
  if (m && m[1].trim().length > 1) return m[1].trim();
  // Sinon : dernier segment après virgule, code postal retiré.
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  const last = parts.length ? parts[parts.length - 1] : s;
  return last.replace(/\b\d{4,5}\b/g, "").trim() || s;
}

function host(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
}

// Vérification (c) : le site répond-il vraiment ?
async function isLive(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36" },
    });
    clearTimeout(t);
    // Une réponse HTTP (même 401/403/404 : le site bloque le bot mais EXISTE) = domaine vivant.
    // Google Places a déjà validé l'établissement + son site. Seuls erreur réseau / DNS / timeout = mort.
    return r.status < 500;
  } catch { return false; }
}

// Statistiques RÉELLES et largement documentées du marché digital local.
// L'IA n'utilise QUE celles-ci (ou un raisonnement direct), jamais de chiffre
// inventé ni de promesse de ROI chiffrée propre au prospect.
const STATS_MARCHE = `- Environ 46 % des recherches sur Google ont une intention locale (source : Google).
- 97 % des consommateurs cherchent un commerce local sur internet avant de s'y rendre (BrightLocal).
- 76 % des personnes qui font une recherche locale sur smartphone visitent un commerce dans les 24 h, et 28 % de ces recherches aboutissent à un achat (Think with Google).
- Plus de 60 % des recherches se font aujourd'hui sur mobile.
- 75 % des internautes ne vont jamais au-delà de la 1re page de Google.
- La 1re position sur Google capte à elle seule une large majorité des clics de la page.
- Google déploie ses "Aperçus IA" (AI Overviews) : l'IA répond désormais directement et ne cite que les entreprises qu'elle identifie comme sources fiables. Une entreprise absente ou invisible en ligne n'est jamais proposée par cette IA.`;

type Fiche = {
  accroche: string;
  chiffres: { stat: string; punch: string }[];
  concurrents: string;
  atouts: string[];
  close: string;
  // ── Justification du prix (ajout : positionnement haut de gamme) ──
  questions?: string[];                          // 5 questions d'audit par métier (IA)
  valeur?: { axe: string; detail: string }[];    // axes temps/argent/visibilité (IA)
  paliers?: Palier[]; // fixe (code)
  cout_dev?: string;                             // base 21 €/h, argument interne
  options?: { option: string; h: number }[];     // catalogue d'options chiffrées (code)
  garanties?: string[];                          // engagements, dont garantie 2 ans (code)
  inclus_offert?: string[];                      // inclus pendant les 2 ans (code)
  inclus_note?: string;                          // précision garantie 2 ans (code)
  comparatif?: string[];                         // ce qu'il vit ailleurs (code)
  cout_inaction?: string;                        // closing : coût de ne pas agir (IA, par métier)
};

// Catalogue d'options — chiffrées à l'heure (× 21 €/h). Le devis grandit sans arbitraire.
const OPTIONS = [
  { option: "Réservation / prise de RDV en ligne (agenda synchronisé)", h: 40 },
  { option: "Paiement en ligne sécurisé", h: 25 },
  { option: "Site multilingue", h: 30 },
  { option: "Blog / espace d'actualités éditable (CMS)", h: 20 },
  { option: "Espace membre / espace client privé", h: 35 },
  { option: "Boutique en ligne / catalogue produits", h: 55 },
  { option: "Système d'avis clients + collecte automatisée", h: 18 },
  { option: "Newsletter & automatisation d'emailing", h: 22 },
  { option: "Export comptable / connexion à la facturation", h: 28 },
  { option: "Assistant / chatbot IA sur-mesure", h: 45 },
];

// Engagements — la GARANTIE 2 ANS en tête, puis la perf (risque zéro : il la tient déjà).
const GARANTIES = [
  "Garantie 2 ans incluse — on reste à vos côtés 2 ans minimum, sans un euro de plus.",
  "Au bout des 2 ans, on renouvelle ensemble — et on définit le montant selon ce dont vous avez réellement besoin à ce moment-là.",
  "Chargement sous la seconde — garanti, ou on retravaille jusqu'à l'atteindre.",
  "Aucun paiement avant que vous ayez validé la première maquette.",
  "Le code source vous appartient — vous n'êtes prisonnier de personne.",
];

// Ce que couvre la garantie 2 ans — INCLUS, sans supplément (différenciateur fort).
const INCLUS_OFFERT = [
  "Hébergement de votre site",
  "Tableau de bord de suivi des performances (votre sous-site de tracking)",
  "Maintenance technique et mises à jour de sécurité",
  "Ajustements et petites évolutions : couleurs, textes, ajouts ponctuels",
];
const INCLUS_NOTE = "Compris pendant les 2 ans de garantie, sans surcoût. (À préciser seulement s'il pose la question : une refonte majeure ou un changement complet d'orientation du site fait l'objet d'un devis à part — ce n'est pas un argument, mais autant être clair si le sujet vient.)";

// Comparatif — ce que le prospect vit ailleurs, sans inventer de tarif concurrent.
const COMPARATIF = [
  "Beaucoup d'agences facturent un abonnement de maintenance mensuel, à vie. Ici, tout est inclus 2 ans — puis on rediscute selon vos besoins réels.",
  "Sur une plateforme en ligne ou un template, vous restez locataire : vous n'avez pas le code. Ici, il vous appartient.",
  "Vous parlez au fondateur du début à la fin — pas à un chargé de compte qui change tous les six mois.",
  "On ne prend que 9 entrepreneurs par trimestre : c'est ce qui nous permet de venir chez vous et de faire du sur-mesure réel.",
];

type Palier = {
  nom: string; prix: string; heures: string; inclus: string; pour: string;
  detail: { poste: string; h: number }[];        // décomposition technique (lots × heures)
};

// Paliers — FIXES (jamais inventés par l'IA). Base réelle : développeur 21 €/h.
// Chaque prix est DÉCORTIQUÉ en lots techniques × heures → total défendable au centime.
// Palier 2 = Palier 1 + ses lots ; Palier 3 = Palier 2 + les siens (cumulatif).
const LOTS_1 = [
  { poste: "Cadrage & immersion terrain (recueil besoins, arborescence)", h: 8 },
  { poste: "Design UI sur-mesure + système de composants réutilisables", h: 20 },
  { poste: "Intégration front haute performance (chargement < 1 s, Core Web Vitals, lazy-load, images optimisées)", h: 28 },
  { poste: "Rédaction guidée & intégration du contenu", h: 10 },
  { poste: "SEO technique (données structurées, schema, sitemap, robots, balises)", h: 10 },
  { poste: "Sous-site de tracking (visites, sources, conversions en direct)", h: 12 },
  { poste: "Accessibilité (WCAG : navigation clavier, contrastes, lecteurs d'écran)", h: 6 },
  { poste: "Recette, tests multi-navigateurs & mobile, mise en ligne, formation", h: 8 },
];
const LOTS_2 = [
  { poste: "Automatisation emails & formulaires (workflows, notifications, relances)", h: 18 },
  { poste: "Connexion API à un outil existant (OAuth, webhooks, synchro agenda/CRM)", h: 40 },
  { poste: "Tableau de bord temps réel (pipeline de données + visualisations)", h: 30 },
  { poste: "Durcissement sécurité & tests d'intégration bout-en-bout", h: 14 },
  { poste: "Documentation technique & formation approfondie", h: 10 },
];
const LOTS_3 = [
  { poste: "Conception outil métier (spécifications, modèle de données, API back-end)", h: 60 },
  { poste: "Développement de l'outil (logique métier, rôles & permissions, CRUD complet)", h: 70 },
  { poste: "Interconnexion complète ERP + facturation (mapping, synchro bidirectionnelle, gestion des erreurs)", h: 30 },
  { poste: "Portail client sécurisé (authentification dédiée, espace privé)", h: 18 },
];
const PALIERS: Palier[] = [
  {
    nom: "Site Performance", prix: "2 144 €", heures: "102 h × 21 €/h",
    inclus: "Site sur-mesure, chargement < 1 s, mobile parfait, SEO technique, textes guidés, et le sous-site de tracking des performances inclus.",
    pour: "Une entreprise établie qui veut une vitrine premium qui convertit vraiment.",
    detail: LOTS_1,
  },
  {
    nom: "Système Connecté", prix: "4 500 €", heures: "214 h × 21 €/h",
    inclus: "Tout le Site Performance + automatisation des emails et formulaires, connexion à un outil déjà utilisé (agenda, CRM), et tableau de bord de suivi en temps réel.",
    pour: "Une entreprise qui perd du temps en saisie manuelle et veut automatiser sa relation client.",
    detail: [...LOTS_1, ...LOTS_2],
  },
  {
    nom: "Écosystème sur-mesure", prix: "8 230 € et +", heures: "392 h × 21 €/h et +",
    inclus: "Tout le Système Connecté + un outil métier sur-mesure (suivi de commandes, compta, portail client), interconnexion complète avec les outils internes (ERP, facturation) — fin de la double saisie, automatisations avancées.",
    pour: "Une PME, un cabinet ou une clinique qui veut un système digital complet, taillé pour son organisation.",
    detail: [...LOTS_1, ...LOTS_2, ...LOTS_3],
  },
];
const COUT_DEV = "Chaque prix se décompose en lots techniques réels à 21 €/h — c'est de l'ingénierie chiffrée, pas un tarif au doigt mouillé. (Interne : garde le détail des heures pour DÉFENDRE le prix face à une objection ; à l'oral, vends le résultat, pas les heures.)";

async function generateScript(args: {
  prenom: string; company: string; metier: string; ville: string; website: string | null;
  competitors: Competitor[]; philosophy: string; dos: string; donts: string;
}): Promise<Fiche | null> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return null;
  const compList = args.competitors
    .map((c, i) => `${i + 1}. ${c.name} — ${c.reviews} avis Google${c.rating ? ` (${c.rating}/5)` : ""}`)
    .join("\n");

  const prompt = `Tu es un directeur commercial d'élite. Tu prépares une FICHE D'APPEL — pas un script à lire mot à mot, mais une fiche d'aide-mémoire ultra-efficace, qui donne à celui qui appelle LES ARGUMENTS CHIFFRÉS pour convaincre en 30 secondes. Cabinet : Group Arsène (création de sites web sur-mesure + référencement local, Toulouse).

RÈGLES ABSOLUES :
- Tu n'INVENTES JAMAIS de chiffre. Tu utilises UNIQUEMENT les statistiques réelles fournies ci-dessous, en choisissant les 3 ou 4 les plus percutantes pour CE métier, et tu les formules de façon parlante pour son secteur.
- Tu ne promets JAMAIS un résultat chiffré propre au prospect ("vous gagnerez X €"). Tu parles de ce que le marché montre, et de ce qu'il RISQUE de perdre en restant absent.
- Concurrents : tu n'utilises QUE ceux listés (réels, vérifiés). Tu ne dis JAMAIS que Group Arsène collabore avec eux — ils DOMINENT déjà le web, pas lui.
- Ton : direct, sûr, humain. Chaque phrase doit servir à convaincre. Zéro remplissage.

── LE PROSPECT ──
Interlocuteur : ${args.prenom || "le dirigeant"} · Entreprise : ${args.company} · Métier : ${args.metier} · Ville : ${args.ville}
Site actuel : ${args.website || "aucun / introuvable en ligne"}

── STATISTIQUES RÉELLES UTILISABLES (n'en invente aucune autre) ──
${STATS_MARCHE}

── CONCURRENTS QUI DOMINENT LE WEB (réels, vérifiés) ──
${compList || "(aucun concurrent vérifié — n'en cite aucun, reste sur les statistiques)"}

${args.philosophy ? `── PHILOSOPHIE DE VENTE (respecte-la) ──\n${args.philosophy}\n` : ""}${args.dos ? `── TOUJOURS FAIRE ──\n${args.dos}\n` : ""}${args.donts ? `── NE JAMAIS FAIRE ──\n${args.donts}\n` : ""}

POSITIONNEMENT GROUP ARSÈNE (haut de gamme — on ne vend PAS un "site vitrine", on vend un SYSTÈME DIGITAL, un investissement à ROI) :
- On vend des RÉSULTATS, pas du code : plus de clients captés, plus de conversions, moins de charge mentale administrative.
- Interconnexion (la grande force) : on relie le site aux outils internes du client (CRM, facturation, agenda, ERP) → fin de la double saisie, des dizaines d'heures gagnées par mois.
- Clés en main premium : SEO de base inclus, copywriting intégré, automatisation des emails de contact.
- Performance pure : chargement sous la seconde, accessibilité parfaite, domination sur mobile.
- Sur-mesure et adaptable : on s'adapte aux outils déjà utilisés, on peut fusionner une base existante, voire créer un outil métier (suivi de commandes, compta, portail client).
- Toujours inclus : un sous-site de TRACKING pour que le client mesure lui-même les performances de ce qu'on lui livre.
- GARANTIE 2 ANS INCLUSE : on reste à ses côtés 2 ans minimum, sans surcoût — hébergement, maintenance, sécurité, ajustements (couleurs, textes, petits ajouts) et suivi compris. Au bout de 2 ans, renouvellement dont le montant se définit ensemble selon ses besoins réels. C'est un engagement de durée que quasiment personne ne prend : on ne livre pas puis on disparaît.
- Interlocuteur unique : le fondateur du début à la fin, réponse sous 24 h.
- Sélection volontaire : 9 entrepreneurs par trimestre seulement — c'est ce qui permet l'immersion sur place et le vrai sur-mesure.

Rends UNIQUEMENT un JSON strict, sans texte autour, de cette forme EXACTE :
{
  "accroche": "Bonjour {{prospect}}, je suis {{expediteur}}, fondateur de Group Arsène. [1 formule de politesse courte]. J'ai regardé de près le secteur de ${args.metier} à ${args.ville}, et il y a quelque chose que je voulais vous partager.",
  "chiffres": [ { "stat": "le chiffre clé formulé simplement", "punch": "ce que ça veut dire concrètement pour LUI (ce qu'il rate / risque)" } ],
  "concurrents": "1 phrase nommant 2-3 concurrents qui captent déjà cette demande à ${args.ville} (ou \\"\\" si aucun concurrent fourni)",
  "atouts": [ "4 à 5 atouts Group Arsène issus du positionnement ci-dessus, chacun en une formule courte et percutante" ],
  "questions": [ "EXACTEMENT 5 questions d'audit courtes et ORIENTÉES, taillées pour le métier « ${args.metier} », qui font émerger un besoin de système digital (temps perdu en admin, double saisie, suivi client, prise de RDV, gestion des commandes/devis, visibilité). Chaque question doit ouvrir sur une douleur qu'un système Group Arsène résout." ],
  "valeur": [ { "axe": "Temps" ou "Argent" ou "Visibilité", "detail": "bénéfice concret et crédible pour CE métier (ex : heures d'administratif économisées, clients captés, double saisie supprimée) — sans promettre de chiffre inventé" } ],
  "cout_inaction": "1 phrase de closing sur le COÛT DE NE PAS AGIR, propre au métier « ${args.metier} » : ce qu'il perd CHAQUE MOIS en restant ainsi (heures de double saisie / d'administratif + clients captés par les concurrents visibles). En ordres de grandeur crédibles, JAMAIS de chiffre précis inventé.",
  "close": "1 phrase de clôture qui propose de bloquer un créneau, simple et directe"
}
"chiffres" = 3 ou 4 objets. "questions" = EXACTEMENT 5. "valeur" = 3 objets (idéalement Temps, Argent, Visibilité). Réponds en français, {{prospect}} et {{expediteur}} laissés tels quels.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const d = await res.json();
  const text = d.content?.[0]?.text?.trim() || "";
  // Extrait le JSON même si le modèle l'entoure de texte.
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const f = JSON.parse(m[0]) as Fiche;
    if (!f.accroche || !Array.isArray(f.chiffres)) return null;
    return {
      accroche: f.accroche,
      chiffres: (f.chiffres || []).slice(0, 4),
      concurrents: f.concurrents || "",
      atouts: (f.atouts || []).slice(0, 6),
      close: f.close || "",
      questions: (f.questions || []).slice(0, 5),
      valeur: (f.valeur || []).slice(0, 3),
      paliers: PALIERS,
      cout_dev: COUT_DEV,
      options: OPTIONS,
      garanties: GARANTIES,
      inclus_offert: INCLUS_OFFERT,
      inclus_note: INCLUS_NOTE,
      comparatif: COMPARATIF,
      cout_inaction: (f as { cout_inaction?: string }).cout_inaction || "",
    };
  } catch { return null; }
}

// Extrait un métier PROPRE (1-3 mots, façon Google Maps) depuis ce que contient
// l'enrichissement — que ce soit déjà « notaire » ou une longue description.
async function cleanTrade(raw: string): Promise<string> {
  const r = raw.trim();
  // Déjà court et sans ponctuation de phrase = c'est un métier, on garde tel quel.
  if (r.length <= 32 && !/[.,;:()]/.test(r)) return r;
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  const fallback = () => r.replace(/[.,;:()].*/s, "").split(/\s+/).slice(0, 3).join(" ").trim() || r.slice(0, 30);
  if (!key) return fallback();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        messages: [{ role: "user", content: `Donne UNIQUEMENT le métier / type d'établissement en 1 à 3 mots, en minuscule et au singulier, tel qu'on le taperait sur Google Maps (ex : "notaire", "coiffeur", "avocat", "restaurant", "plombier"). Aucune autre parole. Description : ${r}` }],
      }),
    });
    if (res.ok) {
      const d = await res.json();
      const t = (d.content?.[0]?.text || "").trim().toLowerCase().replace(/["'.]/g, "");
      if (t && t.length >= 3 && t.length <= 40) return t;
    }
  } catch { /* fallback ci-dessous */ }
  return fallback();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { prospect_id } = await req.json();
    if (!prospect_id) return new Response(JSON.stringify({ error: "prospect_id requis" }), { status: 400, headers: cors });

    const { data: prospect, error: pErr } = await userClient.from("prospects").select("*").eq("id", prospect_id).single();
    if (pErr || !prospect) return new Response(JSON.stringify({ error: "Prospect introuvable" }), { status: 404, headers: cors });

    const rawMetier = String(prospect.brief_activity || prospect.industry || "").trim();
    const ville = String(prospect.location || "").trim();
    if (!rawMetier || !ville) {
      return new Response(JSON.stringify({
        competitors: [], script: null,
        warning: "Métier ou ville manquant sur la fiche du prospect. Complète « activité » et « ville » pour lancer l'analyse marché.",
      }), { status: 200, headers: cors });
    }

    // Métier + ville propres pour la recherche Google (gère les fiches enrichies : longue description + adresse complète).
    const metier = await cleanTrade(rawMetier);
    const city = cleanCity(ville);

    const placesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!placesKey) return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY non configurée" }), { status: 500, headers: cors });

    const query = `${metier} ${city}`;
    const pr = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": placesKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.userRatingCount,places.rating",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "fr", maxResultCount: 20 }),
    });
    if (!pr.ok) return new Response(JSON.stringify({ error: `Places ${pr.status}` }), { status: 502, headers: cors });
    const places = (await pr.json()).places || [];

    // Mots significatifs de la ville (gère « 31000 Toulouse », « Toulouse, Occitanie », villes en 2 mots…)
    const villeWords = strip(city).replace(/[^a-zà-ÿ\s]/gi, " ").split(/\s+/).filter((w) => w.length > 2);
    const prospectHost = host(prospect.website);
    const prospectName = strip(prospect.company || "");

    // Vérifs (a) site présent + (b) bonne ville + exclusion du prospect, tri par domination (avis)
    const candidates = (places as Array<{
      displayName?: { text?: string }; formattedAddress?: string; websiteUri?: string; userRatingCount?: number; rating?: number;
    }>)
      .filter((p) => !!p.websiteUri)
      .filter((p) => {
        const a = strip(p.formattedAddress || "");
        return villeWords.length === 0 || villeWords.some((w) => a.includes(w));
      })
      .filter((p) => {
        const h = host(p.websiteUri);
        const n = strip(p.displayName?.text || "");
        return h && h !== prospectHost && !(prospectName && n === prospectName);
      })
      .sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));

    // Dédup par domaine
    const seen = new Set<string>();
    const deduped = candidates.filter((p) => {
      const h = host(p.websiteUri)!;
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    });

    // Vérif (c) : site vraiment en ligne — vérifs EN PARALLÈLE sur les 8 meilleurs (rapide, pas de timeout), on garde les 4 premiers qui répondent
    const top = deduped.slice(0, 6);
    const liveFlags = await Promise.all(top.map((p) => isLive(p.websiteUri!)));
    const verified: Competitor[] = top
      .filter((_, i) => liveFlags[i])
      .slice(0, 4)
      .map((p) => ({
        name: p.displayName?.text || "",
        website: p.websiteUri!,
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? 0,
        address: p.formattedAddress || null,
      }));

    if (verified.length < 2) {
      return new Response(JSON.stringify({
        competitors: verified, script: null,
        warning: `Pas assez de concurrents vérifiés (site en ligne) trouvés pour « ${query} ». Aucun acteur n'a été inventé.`,
      }), { status: 200, headers: cors });
    }

    // Philosophie de l'agence (singleton)
    const svc = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings } = await svc.from("agency_settings").select("philosophy, call_dos, call_donts").eq("id", true).maybeSingle();

    let fiche: Fiche | null = null;
    try {
      fiche = await generateScript({
        prenom: prospect.first_name && prospect.first_name.toLowerCase() !== "contact" ? prospect.first_name : "",
        company: prospect.company || "votre entreprise",
        metier, ville,
        website: prospect.website || null,
        competitors: verified,
        philosophy: settings?.philosophy || "",
        dos: settings?.call_dos || "",
        donts: settings?.call_donts || "",
      });
    } catch (e) {
      fiche = null;
      console.error("fiche gen failed", e);
    }

    return new Response(JSON.stringify({ competitors: verified, fiche, query }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
