// ─── Section Generate — section sur-mesure par IA (thème du site) ──────
//
//  POST { description }  → { html }
//  L'IA code UNE seule <section> en utilisant le design-system Group Arsène
//  (classes .wy-* + variables --wy-*), donc elle adopte automatiquement
//  le thème/les couleurs actifs du site. Aucune couleur en dur.

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

// Emplacement photo neutre (rendu = boîte grise « Photo ») — remplaçable au bon endroit via l'onglet Photos
const PHOTO_PLACEHOLDER = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20400%20300'%3E%3Crect%20width='400'%20height='300'%20fill='%23ececec'/%3E%3Ctext%20x='200'%20y='158'%20font-family='sans-serif'%20font-size='20'%20fill='%23a0a0a0'%20text-anchor='middle'%3EPhoto%3C/text%3E%3C/svg%3E";

const SYS = `Tu es développeur front. On te décrit UNE section de site à créer. Tu renvoies UNIQUEMENT le code HTML d'UNE SEULE balise <section> (rien avant, rien après, pas de <html>/<body>, pas de \`\`\`).

CONTRAINTES STRICTES (design-system Group Arsène — pour que la section adopte le thème) :
- Racine : <section class="wy-section" style="background:var(--wy-bg)"> (ou var(--wy-bg2) pour alterner).
- Conteneur : <div class="wy-wrap">.
- Classes à utiliser : wy-eyebrow (sur-titre), wy-h2 (titre), wy-lead (intro), wy-card, wy-btn, wy-btn-ghost, wy-grid2 (2 colonnes), wy-pill, wy-step/wy-steps, wy-reveal (anime à l'apparition — mets-la sur les éléments).
- COULEURS : UNIQUEMENT via les variables var(--wy-ink), var(--wy-muted), var(--wy-accent), var(--wy-bg), var(--wy-bg2), var(--wy-surface). JAMAIS de couleur/police en dur.
- Typo : n'impose pas de police (les classes s'en chargent).
- Images / photos : utilise TOUJOURS un vrai emplacement <img class="wy-photo" src="WY_PHOTO" alt="description précise (ex: Pain au levain)" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:14px"> (garde le src littéral WY_PHOTO, NE mets jamais d'URL d'image). Chaque produit/visuel = un <img class="wy-photo"> distinct, pour que l'utilisateur dépose ensuite chaque photo au bon endroit.
- Texte : contenu réaliste mais générique, facilement éditable (placeholders clairs).
- LIENS VERS UNE AUTRE PAGE : pour qu'un bouton/lien mène à une autre page du site, utilise href="page:slug" (ex: href="page:produits", href="page:contact", href="page:accueil"). Ne mets jamais d'URL absolue inventée.
- Responsive et sobre.`;

async function viaClaude(desc: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 2000, temperature: 0.4, system: SYS, messages: [{ role: "user", content: `Section à créer : ${desc}` }] }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return (d.content || []).map((c: any) => c.text || "").join("");
  } catch { return null; }
}

async function viaGemini(desc: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: "user", parts: [{ text: `Section à créer : ${desc}` }] }], generationConfig: { temperature: 0.4 } }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch { return null; }
}

function extractSection(raw: string): string | null {
  let t = (raw || "").trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const s = t.toLowerCase().indexOf("<section");
  const e = t.toLowerCase().lastIndexOf("</section>");
  if (s < 0 || e < 0) return null;
  return t.slice(s, e + "</section>".length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const { description } = await req.json().catch(() => ({}));
    if (!description?.trim()) return json({ error: "description requise" }, 400);

    const raw = (await viaClaude(description)) || (await viaGemini(description));
    let html = raw ? extractSection(raw) : null;
    if (!html) return json({ error: "Génération impossible — reformule la section voulue." }, 200);
    html = html.replace(/WY_PHOTO/g, PHOTO_PLACEHOLDER);

    return json({ ok: true, html });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
