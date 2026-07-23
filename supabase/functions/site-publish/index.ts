// ─── Site Publish — met le site client en ligne ───────────────────────
//
//  POST { site_id, base }  (authentifié)
//    → écrit le HTML du site dans le bucket `previews` sous <slug>.html,
//      passe le site "published", et renvoie l'URL publique servie par le
//      Worker à /p/<slug> (vrai lien partageable, content-type correct).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non authentifié" }, 401);

    const { site_id, base } = await req.json().catch(() => ({}));
    if (!site_id) return json({ error: "site_id requis" }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    // Espace partagé : tout membre de l'équipe peut publier
    const { data: roleRow } = await db.from("user_roles").select("user_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!roleRow) return json({ error: "Accès refusé" }, 403);

    const { data: site } = await db.from("client_sites").select("*").eq("id", site_id).maybeSingle();
    if (!site) return json({ error: "Site introuvable" }, 404);
    if (!site.html || !site.html.trim()) return json({ error: "Le site est vide — rien à publier." }, 400);

    const slug = (site.slug || `site-${site_id.slice(0, 8)}`).replace(/[^a-z0-9\-]/gi, "");
    const origin = (base || "").replace(/\/$/, "") || `https://wyngoworkspace.bold-unit-739e.workers.dev`;

    // Pages additionnelles
    const { data: pages } = await db.from("site_pages").select("title, slug, html, position").eq("site_id", site_id).order("position");
    const extra = (pages || []).filter((p: any) => p.html && p.html.trim());

    // Barre de navigation (uniquement si plusieurs pages)
    const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const navItems = [{ title: "Accueil", path: slug }, ...extra.map((p: any) => ({ title: p.title, path: `${slug}__${(p.slug || "").replace(/[^a-z0-9\-]/gi, "")}` }))];
    // Nav qui adopte le style du site (vars --wy-*) avec repli neutre
    const nav = navItems.length > 1
      ? `<nav id="wy-nav" style="position:sticky;top:0;z-index:9998;display:flex;gap:22px;justify-content:center;align-items:center;padding:14px 20px;background:color-mix(in srgb,var(--wy-surface,#fff) 90%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid color-mix(in srgb,var(--wy-ink,#111) 10%,transparent);font-family:var(--wy-body,system-ui),sans-serif;font-size:14px;flex-wrap:wrap">${navItems.map((it) => `<a href="${origin}/p/${it.path}" style="color:var(--wy-ink,#111);text-decoration:none;font-weight:500;opacity:.85">${esc(it.title)}</a>`).join("")}</nav>`
      : "";
    const injectNav = (h: string) => {
      if (!nav) return h;
      let out = h.replace(/<nav id="wy-nav"[\s\S]*?<\/nav>/i, "");
      return /<body[^>]*>/i.test(out) ? out.replace(/(<body[^>]*>)/i, `$1${nav}`) : nav + out;
    };

    // Liens internes vers une autre page : href="page:slug" → vraie URL.
    // "page:" seul / accueil / home → page d'accueil.
    const knownSlugs = new Set(extra.map((p: any) => (p.slug || "").replace(/[^a-z0-9\-]/gi, "")));
    const rewriteLinks = (h: string) =>
      h.replace(/href=["']page:([^"']*)["']/gi, (_m, raw) => {
        const key = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9\-]/g, "");
        if (!key || key === "accueil" || key === "home" || key === "index") return `href="${origin}/p/${slug}"`;
        if (knownSlugs.has(key)) return `href="${origin}/p/${slug}__${key}"`;
        return `href="${origin}/p/${slug}"`; // page inconnue → accueil (jamais de lien mort)
      });

    const put = async (p: string, h: string) => {
      const { error } = await db.storage.from("previews").upload(p, new Blob([h], { type: "text/html" }), { upsert: true, contentType: "text/html; charset=utf-8" });
      if (error) throw new Error(error.message);
    };

    // Accueil + sous-pages (nav + liens internes réécrits)
    await put(`${slug}.html`, injectNav(rewriteLinks(site.html)));
    for (const p of extra) {
      await put(`${slug}__${(p.slug || "").replace(/[^a-z0-9\-]/gi, "")}.html`, injectNav(rewriteLinks(p.html)));
    }

    await db.from("client_sites").update({
      status: "published", published_at: new Date().toISOString(),
      production_stage: site.production_stage === "brief" || site.production_stage === "design" || site.production_stage === "review" ? "live" : site.production_stage,
      html_path: `${slug}.html`, slug,
    }).eq("id", site_id);

    return json({ ok: true, url: `${origin}/p/${slug}`, pages: extra.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
