// ─── Site Page AI — routeur d'intention (créer une page vs éditer) ─────
//
//  POST { instruction, pages: string[] }  → { intent: "create"|"edit", title? }
//  Décide si l'utilisateur veut CRÉER une nouvelle page/sous-page (et son
//  titre) ou MODIFIER la page courante. Le front exécute ensuite l'action.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";

const SYS = `Tu classes l'instruction d'un utilisateur qui construit un site web.
Deux intentions possibles :
- "create" : il veut CRÉER une nouvelle page ou sous-page (ex: "crée une page produits", "ajoute une sous-page contact", "fais une rubrique avis sur une autre page", "je veux une page tarifs").
- "edit" : il veut MODIFIER la page actuellement ouverte (ex: "change le titre", "mets le fond plus clair", "ajoute un bouton", "agrandis le logo", "ajoute une section avis ICI").
Réponds UNIQUEMENT en JSON : {"intent":"create"|"edit","title":"<nom court de la page si create, sinon vide>"}.
Le title est un nom court et propre (ex: "Produits", "Contact", "Nos tarifs").`;

// Repli heuristique si l'IA est indisponible
function heuristic(instr: string): { intent: string; title: string } {
  const t = instr.toLowerCase();
  const isCreate = /(cr[ée]e|cr[ée]er|ajoute|ajouter|fais|faire|nouvelle?|je veux|j'aimerais|met[s]?)\s+(une?\s+)?(nouvelle\s+)?(page|sous[- ]?page|rubrique|onglet)/.test(t);
  if (!isCreate) return { intent: "edit", title: "" };
  const m = instr.match(/(?:page|sous[- ]?page|rubrique|onglet)\s+(?:de\s+|pour\s+|sur\s+|d[e']\s*)?["«]?([\p{L}0-9 '&-]{2,30})/iu);
  let title = (m?.[1] || "").trim().replace(/\s+(qui|avec|et|pour|où|ou)\b.*$/i, "").trim();
  if (!title) title = "Nouvelle page";
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return { intent: "create", title };
}

async function classify(instr: string): Promise<{ intent: string; title: string } | null> {
  if (ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 120, temperature: 0, system: SYS, messages: [{ role: "user", content: instr }] }),
      });
      if (res.ok) {
        const d = await res.json();
        const txt = (d.content || []).map((c: any) => c.text || "").join("");
        const m = txt.match(/\{[\s\S]*\}/);
        if (m) { const p = JSON.parse(m[0]); if (p.intent) return { intent: p.intent === "create" ? "create" : "edit", title: String(p.title || "").slice(0, 40) }; }
      }
    } catch { /* fallback */ }
  }
  if (GEMINI_API_KEY) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: "user", parts: [{ text: instr }] }], generationConfig: { temperature: 0, responseMimeType: "application/json" } }),
      });
      if (res.ok) {
        const d = await res.json();
        const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
        if (txt) { const p = JSON.parse(txt); if (p.intent) return { intent: p.intent === "create" ? "create" : "edit", title: String(p.title || "").slice(0, 40) }; }
      }
    } catch { /* fallback */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const { instruction } = await req.json().catch(() => ({}));
    if (!instruction?.trim()) return json({ error: "instruction requise" }, 400);
    const r = (await classify(instruction)) || heuristic(instruction);
    return json({ ok: true, intent: r.intent, title: r.title });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
