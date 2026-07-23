// ─── Studio · Adaptation du contenu au métier (profil premium) ─────────
//
//  POST (JWT utilisateur) { site_id }
//   → lit le brief du prospect lié au site, demande à l'IA un PROFIL JSON
//     (accroche, micro-chiffres, services, vignettes savoir-faire, outils,
//     FAQ…) ADAPTÉ à l'activité, puis le renvoie. Le front l'injecte dans
//     buildStudioTemplate → site premium au design fiable + contenu métier.
//
//  Règle : aucun chiffre précis inventé (nb de clients, prix, notes). Les
//  "value" des vignettes sont qualitatives ("7j/7", "100%", "A→Z") ou une
//  année seulement si présente dans le brief.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SYS = `Tu es directeur de création pour un studio web haut de gamme. À partir des infos d'une entreprise, tu produis le CONTENU d'un site vitrine premium, ADAPTÉ à son métier, en français.

Tu réponds UNIQUEMENT par un objet JSON valide (aucun texte autour, pas de balises code), avec EXACTEMENT ces clés :
{
  "sectorLabel": "libellé court du métier + ville si connue (ex: 'Boulangerie artisanale · Toulouse')",
  "tagline": "titre d'accroche court et fort, 3 à 6 mots, peut contenir un <br> pour 2 lignes",
  "sub": "phrase d'accroche (max 160 caractères) qui décrit l'offre",
  "microStats": ["3 à 4 mini-atouts courts (2-3 mots), factuels et génériques, ex: 'Fait maison', 'Devis gratuit', 'Sur-mesure'"],
  "services": [{"title":"nom du service","desc":"1 phrase concrète"}],  // 3 à 4, propres au métier
  "savoirTitle": "titre de la section savoir-faire (5-8 mots)",
  "bento": [{"value":"valeur COURTE qualitative ('7j/7','100%','A→Z','Local') ou une ANNÉE seulement si fournie","label":"légende courte"}],  // exactement 4
  "toolsTitle": "titre section points forts (ex: 'Nos spécialités')",
  "tools": ["6 à 8 mots-clés/capacités propres au métier"],
  "faq": [{"q":"question fréquente réaliste","a":"réponse courte"}],  // 3
  "cta": "verbe d'action du bouton principal (ex: 'Commander', 'Prendre rendez-vous', 'Demander un devis')"
}

INTERDIT : inventer un nombre précis (clients, années sans info, prix, note). Reste concret, sobre, crédible. Adapte le vocabulaire au métier exact.`;

async function viaClaude(prompt: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1500, temperature: 0.5, system: SYS, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return (d.content || []).map((c: { text?: string }) => c.text || "").join("");
  } catch { return null; }
}
async function viaGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, responseMimeType: "application/json" } }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch { return null; }
}

function parseProfile(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  let t = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const { site_id } = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauth" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "unauth" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Récupère le prospect lié au site
    let prospect: Record<string, unknown> | null = null;
    if (site_id) {
      const { data: site } = await admin.from("client_sites").select("prospect_id, title").eq("id", site_id).maybeSingle();
      if (site?.prospect_id) {
        const { data: p } = await admin.from("prospects")
          .select("company, industry, sector, activity, city, brief_activity, brief_objective, brief_keywords")
          .eq("id", site.prospect_id).maybeSingle();
        prospect = p as Record<string, unknown> | null;
      }
    }

    const info = prospect
      ? [
          `Entreprise : ${prospect.company || "—"}`,
          prospect.sector || prospect.industry ? `Secteur : ${prospect.sector || prospect.industry}` : "",
          prospect.activity || prospect.brief_activity ? `Activité : ${prospect.brief_activity || prospect.activity}` : "",
          prospect.city ? `Ville : ${prospect.city}` : "",
          prospect.brief_objective ? `Objectif : ${prospect.brief_objective}` : "",
          prospect.brief_keywords ? `Mots-clés : ${prospect.brief_keywords}` : "",
        ].filter(Boolean).join("\n")
      : "Entreprise locale de services (artisan / commerçant). Adapte de façon générique mais crédible.";

    const raw = (await viaClaude(info)) || (await viaGemini(info));
    const profile = raw ? parseProfile(raw) : null;
    if (!profile) return json({ ok: false, error: "no_ai", message: "Adaptation IA indisponible — modèle générique appliqué." });

    return json({ ok: true, profile });
  } catch (e) {
    console.error("[studio-adapt]", e);
    return json({ ok: false, error: "server", message: String(e) });
  }
});
