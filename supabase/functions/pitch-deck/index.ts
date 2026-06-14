// ─── Pitch Deck — présentation de vente du 2e RDV ─────────────────────
//
//  POST (JWT utilisateur) { prospect_id }
//  Génère une présentation de 4 diapos ULTRA adaptée au prospect, basée sur
//  ses VRAIES données + une banque de statistiques réelles SOURCÉES (l'IA
//  n'invente aucun chiffre). Inclut le slug du mockup de son futur site.

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
  { stat: "87 % des Français consultent Internet avant de choisir un commerce ou un artisan local", source: "Solocal / Opinionway" },
  { stat: "76 % des personnes qui font une recherche locale sur smartphone visitent un établissement dans les 24 h", source: "Google" },
  { stat: "28 % des recherches locales aboutissent à un achat", source: "Google" },
  { stat: "Gagner 1 étoile sur Google peut augmenter le chiffre d'affaires de 5 à 9 %", source: "Harvard Business School" },
  { stat: "88 % des consommateurs font autant confiance aux avis en ligne qu'à une recommandation personnelle", source: "BrightLocal" },
  { stat: "75 % des internautes jugent la crédibilité d'une entreprise à partir du design de son site web", source: "Université de Stanford" },
  { stat: "Plus de 60 % du trafic web provient désormais du mobile", source: "Statista" },
  { stat: "Le 1er résultat sur Google capte à lui seul environ 28 % des clics", source: "Étude Sistrix" },
  { stat: "Une fiche d'établissement complète sur Google reçoit 7× plus de clics qu'une fiche incomplète", source: "Google" },
  { stat: "Environ 1 TPE française sur 3 n'a toujours pas de site web", source: "Baromètre France Num" },
  { stat: "Les TPE/PME présentes en ligne croissent en moyenne plus vite que celles sans présence digitale", source: "France Num / Bpifrance" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if (!ANTHROPIC_API_KEY) return json({ error: "no_ai", message: "Clé IA non configurée." });
    const { prospect_id } = await req.json();
    if (!prospect_id) return json({ error: "missing", message: "prospect_id requis" });

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

    const hasWebsite = p.website_status === "has_website" || (!!p.website && p.website_status !== "no_website");
    const ctx = {
      entreprise: p.company || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      secteur: p.brief_activity || p.industry || "—",
      ville: p.location || "—",
      site_actuel: hasWebsite ? (p.website || "oui") : "aucun site web",
      score_site: p.website_score ?? null,
      objectif: p.brief_objective || null,
      mots_cles: Array.isArray(p.brief_keywords) ? p.brief_keywords.join(", ") : null,
    };

    const system = `Tu es expert en présentation commerciale B2B pour Wyngo, une agence qui crée des sites web et la présence digitale des TPE/artisans/commerçants français.
Tu produis une présentation de vente de 4 diapos pour le 2e rendez-vous, ULTRA adaptée à CE prospect, pour le convaincre de lancer son site avec Wyngo.

RÈGLE ABSOLUE — zéro blabla, zéro chiffre inventé :
- Tu ne cites QUE des chiffres présents dans la liste FACTS fournie (avec leur source exacte), OU les données réelles du prospect.
- Chaque chiffre DOIT porter sa source.
- Ton : pro, direct, qui donne envie. Phrases courtes. Pas de superlatifs creux.

Les 4 diapos (dans cet ordre, via l'outil) :
1. kind="constat" : la situation actuelle RÉELLE du prospect (son secteur, sa ville, son site actuel ou son absence de site) et ce que ça lui coûte. 1 chiffre sourcé qui appuie.
2. kind="marche" : le marché chiffré de son secteur/du local — 2-3 faits sourcés pertinents, formulés comme une opportunité pour lui.
3. kind="site" : ce que son futur site Wyngo va lui apporter concrètement (3-4 bénéfices). Pas besoin de chiffres ici (le mockup de son site sera affiché).
4. kind="offre" : la proposition Wyngo + l'impact attendu (formulé prudemment, ancré sur les faits) + la prochaine étape claire.`;

    const user = `PROSPECT (données réelles) :
${JSON.stringify(ctx, null, 2)}

FACTS (les SEULS chiffres autorisés, avec sources) :
${FACTS.map((f, i) => `${i + 1}. ${f.stat} — Source : ${f.source}`).join("\n")}

Génère la présentation via l'outil "build_deck". Adapte tout au secteur "${ctx.secteur}" et à la ville "${ctx.ville}".`;

    const SCHEMA = {
      type: "object",
      properties: {
        headline: { type: "string", description: "Accroche de couverture, courte et percutante, adaptée au client" },
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["constat", "marche", "site", "offre"] },
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
      },
      required: ["headline", "slides"],
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL, max_tokens: 2000, temperature: 0.5, system,
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
    const tool = (c.content || []).find((x: { type: string }) => x.type === "tool_use") as { input?: { headline?: string; slides?: unknown[] } } | undefined;
    if (!tool?.input?.slides) return json({ error: "ai_empty", message: "Réponse IA vide, réessaie." });

    const headline = String(tool.input.headline || ctx.entreprise);
    const slides = tool.input.slides;

    const { data: deck } = await admin.from("pitch_decks").insert({
      owner_id: userId, prospect_id, headline, slides, preview_slug: prev?.slug || null, model: ANTHROPIC_MODEL,
    }).select("id").single();

    return json({ ok: true, id: deck?.id, headline, slides, preview_slug: prev?.slug || null });
  } catch (e) {
    console.error("[pitch-deck] uncaught", e);
    return json({ error: "server_error", message: String(e) });
  }
});
