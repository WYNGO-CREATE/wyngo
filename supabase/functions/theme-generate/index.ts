// ─── Theme Generate — palette de site sur-mesure par IA ────────────────
//
//  POST { description }  → { vars }
//  L'IA traduit une description ("bleu marine et or, ambiance luxe") en une
//  palette cohérente de variables CSS du design-system Wyngo (--wy-*),
//  en choisissant UNE des 4 typos autorisées (Inter, Fraunces, Archivo,
//  Playfair Display). Le front applique ensuite ces vars à tout le site.

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

const FONTS = ["Inter", "Fraunces", "Archivo", "Playfair Display"];
const hex = (s: string) => (/^#[0-9a-fA-F]{6}$/.test(String(s || "").trim()) ? s.trim() : null);

const SYS = `Tu es directeur artistique. On te donne une description d'ambiance/couleurs pour le site d'un commerce. Tu renvoies UNIQUEMENT un JSON (aucun texte autour) avec une palette COHÉRENTE et LISIBLE :
{
  "display": une police de titres parmi ["Inter","Fraunces","Archivo","Playfair Display"],
  "body": "Inter",
  "bg": "#hex (fond principal)",
  "bg2": "#hex (fond secondaire, proche de bg)",
  "ink": "#hex (texte principal, fort contraste avec bg)",
  "muted": "#hex (texte secondaire, lisible sur bg)",
  "surface": "#hex (cartes, souvent blanc ou proche)",
  "accent": "#hex (couleur d'accent, le texte BLANC doit y être lisible)",
  "accent2": "#hex (variante d'accent)",
  "radius": "ex 12px",
  "dark": true si fond sombre sinon false
}
Règles : contraste WCAG suffisant (ink sur bg, blanc sur accent). Choisis la police qui colle à l'ambiance (Fraunces/Playfair = élégant/luxe, Archivo = moderne/audacieux, Inter = clean/pro). Respecte les couleurs demandées si précises.`;

async function viaClaude(desc: string): Promise<any | null> {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 500, temperature: 0.4, system: SYS, messages: [{ role: "user", content: desc }] }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const txt = (d.content || []).map((c: any) => c.text || "").join("");
    const m = txt.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
}

async function viaGemini(desc: string): Promise<any | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: "user", parts: [{ text: desc }] }], generationConfig: { temperature: 0.4, responseMimeType: "application/json" } }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
    return txt ? JSON.parse(txt) : null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const { description } = await req.json().catch(() => ({}));
    if (!description?.trim()) return json({ error: "description requise" }, 400);

    const p = (await viaClaude(description)) || (await viaGemini(description));
    if (!p) return json({ error: "IA indisponible" }, 200);

    // Validation + valeurs sûres
    const display = FONTS.includes(p.display) ? p.display : "Inter";
    const bg = hex(p.bg) || "#ffffff";
    const bg2 = hex(p.bg2) || "#f2f2f2";
    const ink = hex(p.ink) || "#111111";
    const muted = hex(p.muted) || "#555555";
    const surface = hex(p.surface) || "#ffffff";
    const accent = hex(p.accent) || "#1B4BE3";
    const accent2 = hex(p.accent2) || accent;
    const radius = /^\d+px$/.test(String(p.radius || "")) ? p.radius : "12px";
    const dw = display === "Archivo" ? "800" : display === "Inter" ? "600" : "700";

    const vars =
      `--wy-display:'${display}';--wy-body:'Inter';--wy-dw:${dw};` +
      `--wy-bg:${bg};--wy-bg2:${bg2};--wy-ink:${ink};--wy-muted:${muted};` +
      `--wy-surface:${surface};--wy-accent:${accent};--wy-accent2:${accent2};--wy-radius:${radius}`;

    return json({ ok: true, vars, palette: { display, bg, ink, accent, dark: !!p.dark } });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
