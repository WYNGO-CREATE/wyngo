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
];

// ── L'offre Wyngo : constantes FIXES injectées dans la présentation.
//    L'IA ne doit RIEN inventer ici : ni prix, ni délai, ni garantie.
const PALIERS = [
  { nom: "Site Performance", prix: "2 144 €", heures: "102 h", pour: "une vitrine premium qui convertit vraiment",
    inclus: "Site sur-mesure, chargement sous la seconde, mobile parfait, SEO technique, textes et photos, tableau de bord de suivi." },
  { nom: "Système Connecté", prix: "4 500 €", heures: "214 h", pour: "supprimer la saisie manuelle et automatiser la relation client",
    inclus: "Tout le Site Performance + automatisation des emails et formulaires, connexion à un outil déjà utilisé (agenda, CRM), tableau de bord temps réel." },
  { nom: "Écosystème sur-mesure", prix: "8 230 € et +", heures: "392 h", pour: "un système digital complet, taillé sur l'organisation",
    inclus: "Tout le Système Connecté + outil métier sur-mesure, interconnexion ERP et facturation, portail client sécurisé." },
];
const METHODE = [
  { etape: "La journée d'immersion", detail: "On vient chez vous. On observe votre métier, on écoute vos clients, on rédige vos textes et on produit vos photos sur place." },
  { etape: "La première maquette — sous 48 h", detail: "Vous voyez le résultat avant de payer le moindre euro. Vous validez, ou on retravaille." },
  { etape: "La mise en ligne — sous 21 jours", detail: "Développement, référencement technique, tests, mise en ligne et formation." },
  { etape: "Le suivi", detail: "On reste à vos côtés 2 ans, sans surcoût. Un interlocuteur unique, réponse sous 24 h." },
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
    const palierImpose = champ(R.palier) && R.palier !== "auto" ? R.palier.trim() : null;

    const OFFRE_BLOC = `
── PALIERS (prix EXACTS, n'en invente aucun autre) ──
${PALIERS.map((t) => `• ${t.nom} — ${t.prix} (${t.heures} de développement) — pour ${t.pour}. Comprend : ${t.inclus}`).join("\n")}

── MÉTHODE (les 4 étapes, délais EXACTS) ──
${METHODE.map((m, i) => `${i + 1}. ${m.etape} : ${m.detail}`).join("\n")}

── TOUJOURS INCLUS ──
${INCLUS.map((x) => `• ${x}`).join("\n")}

── ENGAGEMENTS ──
${ENGAGEMENTS.map((x) => `• ${x}`).join("\n")}`;

    const system = `Tu es expert en présentation commerciale B2B pour Wyngo, une agence qui crée des sites web et la présence digitale des TPE/artisans/commerçants français.
Tu produis une présentation de vente de 8 diapos pour le 2e rendez-vous, présentée EN VISIO (partage d'écran) et ULTRA adaptée à CE prospect.

OBJECTIF UNIQUE DE CE RENDEZ-VOUS : qu'il accepte de caler un 3e appel pour finaliser (contrat). On ne cherche PAS à faire signer aujourd'hui.

POSITIONNEMENT — on ne vend pas « un site » mais un SYSTÈME DIGITAL qui rapporte :
- des résultats (clients captés, conversions), pas du code ;
- l'interconnexion avec ses outils existants (agenda, CRM, facturation) → fin de la double saisie, des heures gagnées chaque mois ;
- la performance (chargement sous la seconde) et la visibilité, y compris dans les réponses IA de Google ;
- un tableau de bord pour qu'il MESURE lui-même ce que ça lui rapporte.

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

LES 8 DIAPOS (dans cet ordre exact, via l'outil) :
1. kind="recap" : « Ce qu'on s'est dit ». Reprends 3-4 points du RÉCAP avec SES mots : son besoin, sa situation, ce qu'il attend. Aucun chiffre ici. Ne liste PAS ses objections sur cette diapo — on ne lui remet pas ses freins sous le nez en ouverture. Si le récap est vide, reste sur son métier et sa situation, sans inventer de propos.
2. kind="constat" : sa situation RÉELLE (site actuel ou absence, visibilité) et ce que ça lui coûte. 2 chiffres "figure"+"source".
3. kind="marche" : le marché chiffré de SON secteur en local, formulé comme une opportunité. 2-3 chiffres "figure"+"source".
4. kind="site" : « Ce qu'on construit pour vous » — 3-4 bénéfices très concrets liés à SON métier (le mockup s'affiche à côté). Parle système : captation de clients, automatisation, temps gagné.
5. kind="methode" : « Comment ça se passe » — reprends EXACTEMENT les 4 étapes de la MÉTHODE fournie, reformulées pour lui (une phrase chacune). Pas de chiffre inventé, les délais fournis sont les seuls autorisés.
6. kind="inclus" : « Ce qui est compris » — la liste INCLUS fournie + les ENGAGEMENTS fournis. Mets la garantie 2 ans en avant. Reprends les formulations fournies, ne les invente pas.
7. kind="prix" : « Votre investissement ». Un SEUL palier.
   - Le sous-titre nomme le palier SANS répéter le montant (le montant est affiché en grand juste en dessous).
   - Le PREMIER bullet porte OBLIGATOIREMENT figure = le prix EXACT du palier (ex figure:"2 144 €") et text = la nature du prix (ex "une fois — pas d'abonnement, pas de frais cachés"). Pas de source sur celui-là.
   - Les bullets suivants : pourquoi CE palier pour lui, ce que ça comprend, et son risque (aucun paiement avant validation de la maquette).
   - Mise en perspective autorisée (clients gagnés, heures d'administratif économisées) mais JAMAIS de promesse de résultat chiffré.
8. kind="etape" : « La prochaine étape » — proposer de caler un 3e échange pour finaliser, et rappeler qu'aucun paiement n'intervient avant qu'il ait validé la maquette. Ton engageant, simple, sans pression.

EN PLUS DES DIAPOS — le champ "questions" : 6 à 8 questions que CE prospect va probablement poser. Commence par les freins RÉELS du récap (ce sont les questions qui vont tomber), puis complète avec celles qu'appelle son métier. Chacune avec une réponse courte, honnête et factuelle. Cette fiche NE SERA PAS affichée au client : c'est l'antisèche du commercial. N'y invente aucun chiffre ni engagement au-delà de ce qui est fourni.`;

    const user = `PROSPECT (données réelles) :
${JSON.stringify(ctx, null, 2)}

RÉCAP DU 1ER RENDEZ-VOUS — saisi à la main par le commercial, c'est LA source à suivre :
${RECAP_BLOC}
${palierImpose ? `\nPALIER À PRÉSENTER (imposé par le commercial, n'en choisis pas un autre) : ${palierImpose}` : ""}

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
              kind: { type: "string", enum: ["recap", "constat", "marche", "site", "methode", "inclus", "prix", "etape"] },
              title: { type: "string" },
              subtitle: { type: "string" },
              bullets: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "Phrase courte" },
                    figure: { type: "string", description: "Chiffre clé éventuel, ex '87 %'" },
                    source: { type: "string", description: "Source du chiffre (obligatoire si figure)" },
                  },
                  required: ["text"],
                },
              },
            },
            required: ["kind", "title", "bullets"],
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
      required: ["headline", "slides", "questions"],
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
    const tool = (c.content || []).find((x: { type: string }) => x.type === "tool_use") as { input?: { headline?: string; slides?: unknown[]; questions?: unknown[] } } | undefined;
    if (!tool?.input?.slides) return json({ error: "ai_empty", message: "Réponse IA vide, réessaie." });

    const headline = String(tool.input.headline || ctx.entreprise);
    const slides = tool.input.slides;
    // La fiche « questions » est rangée AVEC les diapos (colonne jsonb existante,
    // pas de migration) sous un kind dédié. Le rendu du deck l'ignore : elle ne
    // doit jamais s'afficher à l'écran partagé, c'est l'antisèche du commercial.
    const questions = Array.isArray(tool.input.questions) ? tool.input.questions : [];
    const stored = [...(slides as unknown[]), { kind: "faq", title: "Questions probables", bullets: [], questions }];

    const { data: deck } = await admin.from("pitch_decks").insert({
      owner_id: userId, prospect_id, headline, slides: stored, preview_slug: prev?.slug || null, model: ANTHROPIC_MODEL,
      recap: recapLignes.length || palierImpose ? { ...R } : null,
    }).select("id").single();

    return json({ ok: true, id: deck?.id, headline, slides, questions, preview_slug: prev?.slug || null });
  } catch (e) {
    console.error("[pitch-deck] uncaught", e);
    return json({ error: "server_error", message: String(e) });
  }
});
