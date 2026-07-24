/**
 * ─── Generate Pitch — Email cold ultra-personnalisé par prospect ───
 *
 * Pour un prospect donné, génère un email de prospection sur-mesure qui :
 *   1. Mentionne quelque chose de SPÉCIFIQUE sur l'entreprise (analyse de
 *      son site web actuel s'il en a un, ou pointe l'absence du site)
 *   2. Identifie une douleur concrète liée à l'offre Wyngo
 *   3. Pose la valeur Wyngo en réponse à cette douleur
 *   4. Soft CTA (suggestion d'échange de 15 min, pas de "ACHETEZ MAINTENANT")
 *
 * Le but est de passer d'un cold email générique (taux de réponse 1-3%) à
 * un cold email ULTRA-personnalisé (taux de réponse 8-15%).
 *
 * Body POST :
 *   { prospect_id: string }
 *
 * Réponse :
 *   { ok, subject, body, observations[], model }
 *
 * Sécurité : auth par JWT user (le prospect doit appartenir au user qui appelle).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-5-20250929";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Récupère un extrait du site du prospect (titre, description, snippets) ───
async function fetchWebsiteSnapshot(url: string): Promise<{
  title: string | null;
  description: string | null;
  excerpt: string | null;
}> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "WyngoBot/1.0 (+https://wyngo.fr)" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return { title: null, description: null, excerpt: null };
    const html = (await res.text()).slice(0, 30_000);

    const titleMatch = html.match(/<title[^>]*>([\s\S]{1,200}?)<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,300})["']/i);

    // Texte visible : on retire scripts/styles/balises et on prend 500 chars
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      title: titleMatch?.[1]?.trim() || null,
      description: descMatch?.[1]?.trim() || null,
      excerpt: text.slice(0, 800) || null,
    };
  } catch {
    return { title: null, description: null, excerpt: null };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SCÉNARIOS D'EMAIL — chaque situation du cycle commercial Wyngo.
// La `mission` dit à l'IA CE QU'IL FAUT ACCOMPLIR ; le cœur "valeurs Wyngo"
// (transparence, honnêteté, français natif) s'applique à TOUS.
// `usesContext` = ce scénario s'appuie sur une note fournie par Hugo
// (compte-rendu d'appel, message reçu du prospect, date de RDV…).
// ═══════════════════════════════════════════════════════════════════════
type Scenario = { id: string; label: string; group: string; usesContext: boolean; mission: string };

const SCENARIOS: Record<string, Scenario> = {
  cold: {
    id: "cold", label: "Premier contact (cold email)", group: "Prospection", usesContext: false,
    mission: `Premier email, le prospect ne te connaît pas.
• Personnalisation RÉELLE dès la 1ère phrase (un détail vu sur son site / son métier).
• 90 mots MAXIMUM, lu en 15 secondes.
• Pointe UNE douleur concrète liée au statut de son site (invisible sur Google, site daté…).
• CTA doux et non commercial : proposer 15 min d'échange, ou une analyse rapide gratuite.
• Ton humain : "Bonjour M. X, je suis Hugo, j'ai créé Wyngo pour aider…".`,
  },
  relance: {
    id: "relance", label: "Relance (sans réponse)", group: "Prospection", usesContext: false,
    mission: `Le prospect n'a pas répondu au 1er email. Relance courte et légère.
• 60 mots max. Pas de reproche, pas de "je me permets de revenir vers vous".
• Apporte un angle NOUVEAU ou une mini-preuve, ne répète pas le 1er email.
• Laisse une porte de sortie élégante ("si ce n'est pas le moment, dites-le-moi").`,
  },
  reponse_question: {
    id: "reponse_question", label: "Répondre à une question du prospect", group: "Prospection", usesContext: true,
    mission: `Le prospect a posé une question ou fait une remarque (voir CONTEXTE fourni par Hugo).
• Réponds PRÉCISÉMENT et honnêtement à ce qu'il demande, sans esquiver.
• Reste transparent : si une réponse a des nuances, dis-le.
• Termine par une relance douce vers la suite (échange, appel).`,
  },
  apres_appel_1: {
    id: "apres_appel_1", label: "Après le 1er appel (concluant)", group: "Cycle d'appel", usesContext: true,
    mission: `Email de suivi juste après un 1er appel qui s'est bien passé.
• Remercie sincèrement pour le temps accordé.
• Rappelle EN 2-3 POINTS ce qui s'est dit (utilise le CONTEXTE fourni par Hugo : ce qui a été abordé, ce qui a intéressé le prospect).
• Reformule le besoin identifié, pour montrer qu'on a écouté.
• Propose clairement le 2e appel (échange plus concret / présentation), avec une invitation à caler un créneau.
• Ton chaleureux et professionnel, jamais familier. 130 mots environ.`,
  },
  apres_appel_2: {
    id: "apres_appel_2", label: "Après le 2e appel (vers la conclusion)", group: "Cycle d'appel", usesContext: true,
    mission: `Email après un 2e appel, on se rapproche de la décision.
• Remercie et fais une courte SYNTHÈSE de ce qui a été convenu (utilise le CONTEXTE de Hugo).
• Rassure sur les garanties RÉELLES de Wyngo : aucun paiement avant validation de la première maquette, code source remis (le site lui appartient).
• Propose un dernier appel pour finaliser, et amorce les étapes concrètes (proposition / contrat).
• 150 mots environ, ton confiant et transparent.`,
  },
  confirmation_rdv: {
    id: "confirmation_rdv", label: "Confirmation d'un rendez-vous", group: "Cycle d'appel", usesContext: true,
    mission: `Confirme un rendez-vous / appel planifié (date, heure, moyen — voir CONTEXTE).
• Court et clair : rappelle la date et l'heure exactes, et le canal (téléphone, visio, sur place).
• Précise ce qu'on abordera, pour que le prospect vienne préparé.
• Propose de décaler facilement si besoin.`,
  },
  relance_no_show: {
    id: "relance_no_show", label: "Relance après RDV manqué", group: "Cycle d'appel", usesContext: false,
    mission: `Le prospect a manqué le rendez-vous. Relance bienveillante, ZÉRO reproche.
• Pars du principe qu'il a eu un imprévu ("un imprévu est vite arrivé").
• Repropose 2 créneaux concrets ou invite à en choisir un.
• Reste léger et chaleureux, 60 mots max.`,
  },
  objection_prix: {
    id: "objection_prix", label: "Objection : le prix", group: "Objections", usesContext: true,
    mission: `Le prospect trouve que c'est cher ou hésite sur le budget (voir CONTEXTE).
• Ne baisse JAMAIS le prix, ne brade pas. Recentre sur la VALEUR et le coût de l'inaction (clients perdus faute de visibilité).
• Rappelle les garanties qui lèvent le risque : 0 € avant validation de la maquette, code source remis.
• Transparence totale : explique ce qui est inclus (immersion, textes, photos, référencement, suivi).
• Termine en proposant d'en reparler, sans pression.`,
  },
  objection_reflexion: {
    id: "objection_reflexion", label: "Objection : « je vais réfléchir »", group: "Objections", usesContext: false,
    mission: `Le prospect veut réfléchir. Relance qui respecte sa décision tout en levant le doute.
• Reconnais que c'est une décision importante, sans culpabiliser.
• Rappelle 1 point qui réduit le risque (0 € avant maquette, engagement limité).
• Propose de répondre à LA question qui le retient encore.`,
  },
  objection_timing: {
    id: "objection_timing", label: "Objection : « pas le bon moment »", group: "Objections", usesContext: false,
    mission: `Le prospect dit que ce n'est pas le bon moment. Garde le lien pour plus tard.
• Comprends et n'insiste pas.
• Sème une idée utile (ex. la visibilité se construit dans le temps, mieux vaut anticiper).
• Propose de recontacter à une échéance précise. Chaleureux, sans pression.`,
  },
  envoi_contrat: {
    id: "envoi_contrat", label: "Envoi du contrat", group: "Closing", usesContext: true,
    mission: `Email qui accompagne l'envoi du contrat / de la proposition (voir CONTEXTE : ce qui a été convenu).
• Remercie pour la confiance.
• Récapitule EN CLAIR ce qui est inclus et les grandes lignes convenues (prestation, délais si connus).
• Explique la marche à suivre pour signer, simplement.
• Rassure : transparence, aucun engagement caché, code source remis. Ton posé et fiable.`,
  },
  presentation_offre: {
    id: "presentation_offre", label: "Présentation de l'offre / produit", group: "Closing", usesContext: true,
    mission: `Le prospect a montré de l'intérêt, on lui présente concrètement l'offre Wyngo (voir CONTEXTE).
• Structure claire : ce qu'il obtient (site sur-mesure, immersion, textes + photos, référencement local, suivi mensuel, code source remis).
• Mets en avant la MÉTHODE différenciante (journée d'immersion, on vient chez lui).
• Une seule offre, pas de catalogue. Termine sur la prochaine étape.`,
  },
  onboarding: {
    id: "onboarding", label: "Bienvenue après signature", group: "Après-vente", usesContext: true,
    mission: `Le prospect vient de signer : email de bienvenue et de mise en route (voir CONTEXTE).
• Félicite / remercie chaleureusement pour sa confiance.
• Donne les PROCHAINES ÉTAPES concrètes et rassurantes (ex. on planifie la journée d'immersion).
• Donne un interlocuteur unique (Hugo) et une disponibilité (réponse sous 24h).
• Ton enthousiaste mais pro.`,
  },
  remerciement: {
    id: "remerciement", label: "Email de remerciement", group: "Après-vente", usesContext: false,
    mission: `Email de remerciement simple et sincère (après un échange, un service rendu, une recommandation).
• Court, chaleureux, authentique. 60 mots max.
• Pas de vente. Juste de la gratitude et une porte ouverte pour la suite.`,
  },
};

const CORE_VALUES = `═══════════════════════════════════════════════════════════════════════
QUI TU ES — VALEURS NON NÉGOCIABLES
═══════════════════════════════════════════════════════════════════════
Tu écris au nom de Wyngo, cabinet français de présence digitale (Toulouse), qui
crée des sites internet sur-mesure et gère le référencement local des artisans,
commerçants et TPE. Tu écris à la 1ère personne, comme Hugo, le fondateur.

Wyngo se distingue par la TRANSPARENCE et l'EXIGENCE. Donc, RÈGLES ABSOLUES :
• N'invente JAMAIS un chiffre, un résultat, une référence client, un témoignage
  ou une collaboration. Si tu n'as pas la donnée, ne l'invente pas.
• Ne promets QUE ce qui est réel chez Wyngo : journée d'immersion chez le client,
  textes et photos produits sur place, référencement local, suivi mensuel,
  AUCUN paiement avant validation de la première maquette, code source remis
  (le site appartient au client), sélection de 9 entrepreneurs par trimestre.
• Français natif impeccable : phrases courtes, pas de langue commerciale ni
  administrative ("nous serions ravis", "veuillez trouver"), pas de calque
  anglais, pas d'emoji, pas de mots spam (GRATUIT en capitales, URGENT…).
• Jamais familier, jamais faussement enthousiaste. Chaleureux et net.`;

const OUTPUT_SPEC = `═══════════════════════════════════════════════════════════════════════
SORTIE — JSON STRICT
═══════════════════════════════════════════════════════════════════════
Retourne un JSON avec EXACTEMENT ces champs :
- subject : objet de l'email (max 65 caractères, sans le nom du destinataire)
- body : corps en texte brut, terminant par "Bien cordialement,\\n{{expediteur}}"
- observations : 3-5 puces expliquant tes choix (angle, ton, éléments repris)

Placeholders à utiliser dans le body :
- {{prenom}} → prénom du destinataire (salutation)
- {{expediteur}} → prénom de l'expéditeur (signature) — JAMAIS confondu avec le destinataire
- {{agence}} → nom du cabinet (au moins 1 fois si naturel)
- {{entreprise}}, {{ville}} → si pertinent`;

// ─── System prompt : cœur valeurs + mission du scénario choisi ───
function buildSystemPrompt(ctx: {
  agencyName: string;
  businessBrief?: string | null;
  targetClient?: string | null;
  valueProps?: string | null;
}, scenarioId: string): string {
  const scenario = SCENARIOS[scenarioId] || SCENARIOS.cold;
  const hasContext = ctx.businessBrief || ctx.targetClient || ctx.valueProps;
  const agencyBlock = hasContext
    ? `${ctx.businessBrief ? `Brief activité :\n${ctx.businessBrief}\n` : ""}${ctx.targetClient ? `Client cible :\n${ctx.targetClient}\n` : ""}${ctx.valueProps ? `Propositions de valeur :\n${ctx.valueProps}\n` : ""}`
    : "(Utilise ta connaissance de Wyngo, cabinet de création digitale pour TPE françaises.)";

  return `Tu es le meilleur rédacteur commercial francophone. Tu écris des emails
qui obtiennent une réponse, sans jamais sonner "commercial" ni robotisé.

${CORE_VALUES}

Contexte agence (nom : ${ctx.agencyName}) :
${agencyBlock}
═══════════════════════════════════════════════════════════════════════
SITUATION À TRAITER : ${scenario.label.toUpperCase()}
═══════════════════════════════════════════════════════════════════════
${scenario.mission}

${OUTPUT_SPEC}`;
}

// ─── User prompt = données spécifiques au prospect ───
function buildUserPrompt(p: {
  company: string;
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  industry?: string | null;
  location?: string | null;
  website_status: string;
  website_score?: number | null;
  website_url?: string | null;
  website_signals?: string[] | null;
  website_title?: string | null;
  website_description?: string | null;
  website_excerpt?: string | null;
  scenarioId?: string;
  context?: string | null;   // note libre de Hugo (compte-rendu d'appel, message reçu, date…)
}): string {
  const scenario = SCENARIOS[p.scenarioId || "cold"] || SCENARIOS.cold;
  const isCold = scenario.id === "cold";
  const lines: string[] = [];
  lines.push(`# PROSPECT À CONTACTER`);
  lines.push(`Entreprise : ${p.company}`);
  if (p.first_name || p.last_name) {
    lines.push(`Dirigeant : ${p.first_name || ""} ${p.last_name || ""}${p.title ? ` (${p.title})` : ""}`);
  }
  if (p.industry) lines.push(`Secteur d'activité : ${p.industry}`);
  if (p.location) lines.push(`Localisation : ${p.location}`);

  // ─── Contexte fourni par Hugo (déterminant pour les scénarios "chauds") ───
  if (p.context && p.context.trim()) {
    lines.push(``);
    lines.push(`# CONTEXTE DE LA SITUATION (fourni par Hugo — À UTILISER EN PRIORITÉ)`);
    lines.push(`"""`);
    lines.push(p.context.trim());
    lines.push(`"""`);
    lines.push(`→ Appuie-toi sur ces éléments réels pour rédiger. N'invente rien au-delà.`);
  } else if (scenario.usesContext) {
    lines.push(``);
    lines.push(`# NOTE : aucun détail spécifique fourni pour cette situation.`);
    lines.push(`→ Reste général mais crédible, sans inventer de faits précis (pas de chiffre, pas de date fictive).`);
  }

  // Le statut du site n'est central QUE pour la prospection à froid (cold /
  // relance). Pour les scénarios "chauds" (après appel, contrat…), la relation
  // existe déjà et le compte-rendu de Hugo prime — on n'encombre pas le prompt.
  if (isCold) {
    lines.push(``);
    lines.push(`# STATUT DU SITE WEB (analyse automatique)`);
    switch (p.website_status) {
      case "no_website":
        lines.push(`❌ AUCUN SITE WEB DÉTECTÉ. C'est notre cible PRIME — ce prospect est invisible sur Google.`);
        lines.push(`Angle email recommandé : la perte de visibilité face aux concurrents qui ont un site.`);
        break;
      case "outdated":
        lines.push(`⚠️ SITE PRÉSENT MAIS OBSOLÈTE (score ${p.website_score}/100).`);
        if (p.website_url) lines.push(`URL : ${p.website_url}`);
        if (p.website_signals?.length) {
          lines.push(`Problèmes détectés :`);
          for (const s of p.website_signals) {
            if (s === "not_responsive" || s === "partial_viewport") lines.push(`  - Site PAS responsive (mauvaise expérience sur mobile)`);
            if (s === "http_only") lines.push(`  - Pas de HTTPS (Google pénalise + alerte de sécurité dans Chrome)`);
            if (s === "legacy_html_tags") lines.push(`  - Code HTML très ancien (balises <font>, <center>…)`);
            if (s === "table_layout") lines.push(`  - Mise en page en tableaux (technique des années 2000)`);
            if (s.startsWith("copyright_")) lines.push(`  - Copyright de ${s.replace("copyright_", "")} → pas de mise à jour récente`);
            if (s.startsWith("wp_") && s.endsWith("_outdated")) lines.push(`  - Version WordPress obsolète (risque sécurité + bugs)`);
            if (s.startsWith("lastmod_") && s.endsWith("y_ago")) lines.push(`  - Site pas mis à jour depuis ${s.match(/lastmod_(\d+)y_ago/)?.[1]} ans`);
            if (s === "parking_page") lines.push(`  - Page parking (domaine acheté mais pas de vrai site)`);
          }
        }
        lines.push(`Angle email recommandé : moderniser un site qui ne convertit pas / pénalise leur image.`);
        break;
      case "has_website":
        lines.push(`✅ SITE WEB détecté (score ${p.website_score}/100).`);
        lines.push(`Angle email recommandé : amélioration continue, SEO, conversion — pas la refonte.`);
        break;
      default:
        lines.push(`❓ Statut du site inconnu.`);
    }
  }

  if (isCold && (p.website_title || p.website_description || p.website_excerpt)) {
    lines.push(``);
    lines.push(`# CONTENU DU SITE (à utiliser pour personnaliser !)`);
    if (p.website_title) lines.push(`Titre page : ${p.website_title}`);
    if (p.website_description) lines.push(`Description meta : ${p.website_description}`);
    if (p.website_excerpt) lines.push(`Extrait page :\n"""\n${p.website_excerpt}\n"""`);
    lines.push(`→ Cherche dans le contenu ci-dessus 1 détail spécifique à mentionner en intro pour montrer que tu as VRAIMENT regardé.`);
  }

  lines.push(``);
  lines.push(`Rédige maintenant l'email pour la situation « ${scenario.label} », en respectant les valeurs Wyngo et la mission décrites dans les instructions système.`);
  return lines.join("\n");
}

// ─── Provider Gemini (gratuit) ───
async function generateWithGemini(systemPrompt: string, userPrompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.5, // Un peu de créativité pour l'accroche, sans dériver
        maxOutputTokens: 4000,
        thinkingConfig: { thinkingBudget: 1500 },
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
            observations: { type: "array", items: { type: "string" } },
          },
          required: ["subject", "body", "observations"],
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const completion = await res.json();
  const text = completion.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini : pas de texte dans la réponse");
  let parsed: { subject: string; body: string; observations: string[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini : JSON invalide → ${text.slice(0, 200)}`);
  }
  return { result: parsed, model: GEMINI_MODEL };
}

// ─── Provider Anthropic Claude (qualité top, payant) ───
async function generateWithAnthropic(systemPrompt: string, userPrompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      temperature: 0.5,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [
        {
          name: "send_pitch",
          description: "Retourne le pitch cold email personnalisé.",
          input_schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              body: { type: "string" },
              observations: { type: "array", items: { type: "string" } },
            },
            required: ["subject", "body", "observations"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "send_pitch" },
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const completion = await res.json();
  const toolUse = (completion.content || []).find((c: { type: string }) => c.type === "tool_use") as
    | { input: { subject: string; body: string; observations: string[] } }
    | undefined;
  if (!toolUse?.input) throw new Error("Anthropic : pas de tool_use dans la réponse");
  return { result: toolUse.input, model: ANTHROPIC_MODEL };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!ANTHROPIC_API_KEY && !GEMINI_API_KEY) {
      return json(
        {
          error: "Aucune clé IA configurée",
          hint: "Ajoute GEMINI_API_KEY (gratuit) ou ANTHROPIC_API_KEY dans Supabase Edge Functions Secrets.",
        },
        500,
      );
    }

    // Liste des situations (métadonnées publiques, pas besoin d'auth).
    const preBody = await req.clone().json().catch(() => ({}));
    if (preBody?.list_scenarios) {
      return json({
        ok: true,
        scenarios: Object.values(SCENARIOS).map((s) => ({
          id: s.id, label: s.label, group: s.group, usesContext: s.usesContext,
        })),
      });
    }

    // Auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Non authentifié" }, 401);
    const userId = userData.user.id;

    const body = preBody;
    const prospectId = body?.prospect_id as string | undefined;
    if (!prospectId) return json({ error: "prospect_id requis" }, 400);
    const scenarioId = (body?.scenario as string | undefined) && SCENARIOS[body.scenario]
      ? (body.scenario as string) : "cold";
    const context = (body?.context as string | undefined) || null;

    // Charge le prospect (RLS : check côté DB qu'il appartient à l'user)
    const { data: prospect, error: pErr } = await userClient
      .from("prospects")
      .select("*")
      .eq("id", prospectId)
      .maybeSingle();
    if (pErr || !prospect) {
      return json({ error: "Prospect introuvable ou non autorisé" }, 404);
    }

    // Charge le contexte agence (via admin, lecture publique mais on évite RLS)
    const { data: agency } = await admin
      .from("agency_settings")
      .select("name, business_brief, target_client, value_props")
      .eq("id", true)
      .maybeSingle();

    // Si le prospect a un site, on en extrait un snapshot pour personnaliser
    let websiteSnapshot: {
      title: string | null;
      description: string | null;
      excerpt: string | null;
    } = { title: null, description: null, excerpt: null };
    if ((prospect as { website?: string | null }).website) {
      websiteSnapshot = await fetchWebsiteSnapshot(
        (prospect as { website: string }).website,
      );
    }

    // Récupère les signaux du website_check stockés (s'ils sont dans le JSON-style)
    // Note : aujourd'hui on ne stocke pas les signaux. On reconstruit à partir
    // du statut + score uniquement. Au futur : ajouter un champ website_signals jsonb.
    const signals: string[] = [];
    const wsStatus = (prospect as { website_status?: string }).website_status || "unknown";
    const wsScore = (prospect as { website_score?: number | null }).website_score;
    if (wsStatus === "outdated" && wsScore !== null && wsScore !== undefined) {
      if (wsScore < 35) signals.push("not_responsive", "http_only");
    }

    const systemPrompt = buildSystemPrompt({
      agencyName: agency?.name || "Wyngo",
      businessBrief: agency?.business_brief,
      targetClient: agency?.target_client,
      valueProps: agency?.value_props,
    }, scenarioId);

    // "Contact" est le placeholder posé par la chasse quand le dirigeant
    // est inconnu — on ne le passe pas à l'IA (sinon "Bonjour Contact").
    const cleanFirst = (prospect.first_name || "").trim().toLowerCase() === "contact"
      ? null : prospect.first_name;
    const cleanLast = (prospect.last_name || "").trim().toLowerCase() === "contact"
      ? null : prospect.last_name;

    const userPrompt = buildUserPrompt({
      company: prospect.company || cleanLast || "—",
      first_name: cleanFirst,
      last_name: cleanLast,
      title: (prospect as { title?: string | null }).title,
      industry: (prospect as { industry?: string | null }).industry,
      location: (prospect as { location?: string | null }).location,
      website_status: wsStatus,
      website_score: wsScore,
      website_url: (prospect as { website?: string | null }).website,
      website_signals: signals,
      website_title: websiteSnapshot.title,
      website_description: websiteSnapshot.description,
      website_excerpt: websiteSnapshot.excerpt,
      scenarioId,
      context,
    });

    // ⚠️ Pitch / cold emails : on FORCE Gemini (cheap & largement suffisant
    //    pour les emails), on garde les crédits Anthropic pour l'Aperçu
    //    Instantané où la qualité du copy fait toute la différence.
    //    Anthropic n'est utilisé qu'en dernier recours si Gemini est down.
    let generated;
    if (GEMINI_API_KEY) {
      generated = await generateWithGemini(systemPrompt, userPrompt);
    } else if (ANTHROPIC_API_KEY) {
      generated = await generateWithAnthropic(systemPrompt, userPrompt);
    } else {
      throw new Error("Aucune clé IA configurée");
    }

    // Log léger (non-bloquant)
    void userId;

    return json({
      ok: true,
      subject: generated.result.subject,
      body: generated.result.body,
      observations: generated.result.observations || [],
      model: generated.model,
      scenario: scenarioId,
      website_snapshot_used: !!(websiteSnapshot.title || websiteSnapshot.excerpt),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-pitch]", msg);
    return json({ error: msg }, 500);
  }
});
