/**
 * ─── Group Arsène Studio — Éditeur de site piloté par l'IA ───────────────────
 *
 * Édite le site d'un client. Aperçu en direct (iframe) + modifications en
 * langage naturel : tu décris la modif, l'IA modifie le vrai HTML.
 *   "change le titre en…"  ·  "mets les horaires à jour"
 *   "ajoute une section avis"  ·  "des couleurs plus chaudes"
 *
 * Bouton "Publier" → marque le site en ligne (déploiement réel : brique
 * suivante, quand le client aura son domaine).
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Wand2, Loader2, Rocket, Monitor, Smartphone, Undo2, Maximize2, Image as ImageIcon, Code2 } from "lucide-react";
import { SitePhotosPanel } from "@/components/site-photos-panel";
import { SiteCodePanel } from "@/components/site-code-panel";
import { SiteIntegrationsPanel } from "@/components/site-integrations-panel";
import { SiteDesignPanel } from "@/components/site-design-panel";
import { buildFullPage, getCurrentPack } from "@/lib/site-design-system";
import { useAuth } from "@/hooks/use-auth";
import { Plug, Palette, Plus, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const APP_URL = "https://wyngo.bold-unit-739e.workers.dev";

export const Route = createFileRoute("/_authenticated/studio_/site/$id")({
  component: SiteEditor,
  head: () => ({ meta: [{ title: "Éditeur de site — Group Arsène Studio" }] }),
});

type Site = { id: string; prospect_id: string; title: string | null; slug: string | null; status: string; html: string | null };

const SUGGESTIONS = [
  "Rends le ton plus chaleureux et accueillant",
  "Mets les horaires d'ouverture à jour",
  "Ajoute une section avis clients",
  "Change la couleur principale pour quelque chose de plus moderne",
  "Raccourcis le texte d'accroche, plus percutant",
];

type SitePage = { id: string; title: string; slug: string; html: string | null; position: number };

function SiteEditor() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [html, setHtml] = useState<string>("");
  const [undoStack, setUndoStack] = useState<string[]>([]); // historique multi-niveaux
  const pushUndo = useCallback((cur: string) => { if (cur) setUndoStack((s) => [...s.slice(-29), cur]); }, []);
  const [instruction, setInstruction] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [panel, setPanel] = useState<"ia" | "design" | "photos" | "code" | "apps">("ia");
  const [history, setHistory] = useState<{ instruction: string; summary: string }[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null); // null = page d'accueil (client_sites.html)
  const initedFor = useRef<string | null>(null); // init unique par site (évite l'écrasement)

  // Pages additionnelles (l'accueil = client_sites.html)
  const { data: pages } = useQuery({
    queryKey: ["site-pages", id],
    queryFn: async (): Promise<SitePage[]> => {
      const { data } = await supabase.from("site_pages").select("id, title, slug, html, position").eq("site_id", id).order("position");
      return (data as SitePage[]) || [];
    },
  });

  // Persiste le HTML sur la page active (accueil OU sous-page) + active l'undo.
  const persist = useCallback(async (newHtml: string) => {
    pushUndo(html);
    setHtml(newHtml);
    const now = new Date().toISOString();
    if (activePageId === null) {
      const { error } = await supabase.from("client_sites").update({ html: newHtml, updated_at: now }).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("site_pages").update({ html: newHtml, updated_at: now }).eq("id", activePageId);
      if (error) throw error;
    }
  }, [html, id, activePageId, pushUndo]);

  // Change de page : charge le HTML frais depuis la base
  const switchPage = useCallback(async (pid: string | null) => {
    setActivePageId(pid); setUndoStack([]);
    if (pid === null) {
      const { data } = await supabase.from("client_sites").select("html").eq("id", id).maybeSingle();
      setHtml((data as { html: string | null } | null)?.html || "");
    } else {
      const { data } = await supabase.from("site_pages").select("html").eq("id", pid).maybeSingle();
      setHtml((data as { html: string | null } | null)?.html || "");
    }
  }, [id]);

  const addPage = useMutation({
    mutationFn: async () => {
      const title = (prompt("Nom de la page (ex : Services, Contact)") || "").trim();
      if (!title) return null;
      const slug = title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || `page-${Date.now()}`;
      const pack = getCurrentPack(html) || "editorial";
      const { data, error } = await supabase.from("site_pages").insert({
        site_id: id, owner_id: user!.id, title, slug,
        html: buildFullPage(pack, title), position: (pages?.length || 0) + 1,
      }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (pid) => { qc.invalidateQueries({ queryKey: ["site-pages", id] }); if (pid) switchPage(pid); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePage = useMutation({
    mutationFn: async (pid: string) => {
      const { error } = await supabase.from("site_pages").delete().eq("id", pid);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site-pages", id] }); switchPage(null); toast.success("Page supprimée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Crée une page via l'IA : squelette dans le thème → contenu adapté à la demande
  const createPageAI = useMutation({
    mutationFn: async ({ title, instruction }: { title: string; instruction: string }) => {
      const slug = title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || `page-${Date.now()}`;
      const pack = getCurrentPack(html) || "editorial";
      let pageHtml = buildFullPage(pack, title);
      try {
        const { data } = await supabase.functions.invoke("site-edit", { body: { instruction, html: pageHtml } });
        if (data?.ok && data.html) pageHtml = data.html;
      } catch { /* garde le squelette */ }
      const { data: row, error } = await supabase.from("site_pages").insert({
        site_id: id, owner_id: user!.id, title, slug, html: pageHtml, position: (pages?.length || 0) + 1,
      }).select("id").single();
      if (error) throw error;
      return row.id as string;
    },
    onSuccess: (pid) => { qc.invalidateQueries({ queryKey: ["site-pages", id] }); switchPage(pid); toast.success("Page créée ✨"); setInstruction(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Routeur IA : créer une page OU éditer la page courante
  const [aiBusy, setAiBusy] = useState(false);
  const runAi = async (instr: string) => {
    if (!instr.trim()) return;
    setAiBusy(true);
    try {
      const { data } = await supabase.functions.invoke("site-page-ai", { body: { instruction: instr, pages: (pages || []).map((p) => p.title) } });
      if (data?.intent === "create" && data.title) {
        await createPageAI.mutateAsync({ title: data.title, instruction: instr });
      } else {
        await edit.mutateAsync(instr);
      }
    } catch (e) { toast.error((e as Error).message); }
    setAiBusy(false);
  };

  const { data: site, isLoading } = useQuery({
    queryKey: ["studio-site", id],
    queryFn: async (): Promise<Site | null> => {
      const { data } = await supabase.from("client_sites").select("id, prospect_id, title, slug, status, html").eq("id", id).maybeSingle();
      return (data as Site) || null;
    },
  });

  // Charge le HTML initial UNE SEULE FOIS par site (travail existant, sinon
  // la maquette). On ne ré-initialise pas si la query se rafraîchit, sinon
  // une édition en cours serait écrasée.
  useEffect(() => {
    if (!site || initedFor.current === id) return;
    initedFor.current = id;
    if (site.html) { setHtml(site.html); return; }
    (async () => {
      const { data: prev } = await supabase.from("prospect_previews")
        .select("html_url, slug").eq("prospect_id", site.prospect_id).order("generated_at", { ascending: false }).limit(1).maybeSingle();
      const url = prev?.html_url || (prev?.slug ? `${APP_URL}/p/${prev.slug}` : null);
      if (url) { try { const r = await fetch(url); if (r.ok) setHtml(await r.text()); } catch { /* */ } }
    })();
  }, [site, id]);

  // Undo multi-niveaux : dépile l'historique et restaure sur la page active
  const undo = useMutation({
    mutationFn: async () => {
      if (undoStack.length === 0) return null;
      const restored = undoStack[undoStack.length - 1];
      setUndoStack((s) => s.slice(0, -1));
      const now = new Date().toISOString();
      if (activePageId === null) await supabase.from("client_sites").update({ html: restored, updated_at: now }).eq("id", id);
      else await supabase.from("site_pages").update({ html: restored, updated_at: now }).eq("id", activePageId);
      return restored;
    },
    onSuccess: (restored) => { if (restored != null) { setHtml(restored); toast.success("Annulé"); } },
    onError: (e: Error) => toast.error(e.message),
  });

  const edit = useMutation({
    mutationFn: async (instr: string) => {
      // Accueil : le serveur écrit client_sites. Sous-page : on envoie le HTML
      // courant, le serveur le renvoie édité, on persiste sur la sous-page.
      const body = activePageId === null
        ? { site_id: id, instruction: instr }
        : { instruction: instr, html };
      const { data, error } = await supabase.functions.invoke("site-edit", { body });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "Modification impossible");
      return data as { html: string; summary: string };
    },
    onMutate: (instr) => { pushUndo(html); return { instr }; },
    onSuccess: async (d, instr) => {
      setHtml(d.html);
      if (activePageId !== null) {
        await supabase.from("site_pages").update({ html: d.html, updated_at: new Date().toISOString() }).eq("id", activePageId);
      }
      setHistory((h) => [...h, { instruction: instr, summary: d.summary || "Modification appliquée" }]);
      setInstruction("");
      toast.success(`Modifié : ${d.summary || "site mis à jour"}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: async () => {
      // 1. on enregistre le HTML courant, 2. on met en ligne (bucket public)
      await supabase.from("client_sites").update({ html, updated_at: new Date().toISOString() }).eq("id", id);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("https://mwkkgubvdswmdaiswepl.supabase.co/functions/v1/site-publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ site_id: id, base: window.location.origin }),
      });
      const out = await res.json();
      if (!res.ok || out.error) throw new Error(out.error || "Publication impossible");
      return out as { url: string };
    },
    onSuccess: (out) => {
      qc.invalidateQueries({ queryKey: ["studio-site", id] });
      qc.invalidateQueries({ queryKey: ["studio-sites"] });
      try { navigator.clipboard.writeText(out.url); } catch { /* */ }
      window.open(out.url, "_blank");
      toast.success("Site en ligne 🚀 — lien copié", { description: out.url, duration: 10000 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Aperçu éditeur : reveal désactivé (tout visible) + barre de nav cliquable
  // multi-pages → on peut passer d'une page à l'autre EN DIRECT dans l'aperçu.
  const previewHtml = useMemo(() => {
    if (!html) return html;
    let out = html;
    const css = "<style>.wy-reveal{opacity:1!important;transform:none!important}</style>";
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, css + "</head>") : css + out;

    const subs = pages || [];
    if (subs.length > 0) {
      const items = [{ slug: "", title: "Accueil" }, ...subs.map((p) => ({ slug: p.slug, title: p.title }))];
      const activeSlug = activePageId === null ? "" : (subs.find((p) => p.id === activePageId)?.slug || "");
      const nav = `<nav style="position:sticky;top:0;z-index:9999;display:flex;gap:20px;justify-content:center;align-items:center;padding:12px 18px;background:color-mix(in srgb,var(--wy-surface,#fff) 92%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid color-mix(in srgb,var(--wy-ink,#111) 10%,transparent);font:500 14px var(--wy-body,system-ui),sans-serif;flex-wrap:wrap">${items.map((it) => `<a href="page:${it.slug || "accueil"}" style="text-decoration:none;color:var(--wy-ink,#111);opacity:${it.slug === activeSlug ? "1" : ".55"};${it.slug === activeSlug ? "font-weight:700" : ""}">${(it.title || "").replace(/[<>]/g, "")}</a>`).join("")}</nav>`;
      out = /<body[^>]*>/i.test(out) ? out.replace(/(<body[^>]*>)/i, `$1${nav}`) : nav + out;
    }
    // Intercepte les liens page: → demande au parent (éditeur) de changer de page
    const sc = `<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="page:"]');if(a){e.preventDefault();try{parent.postMessage({wy:'nav',slug:a.getAttribute('href').slice(5)},'*');}catch(_){}}},true);</script>`;
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, sc + "</body>") : out + sc;
    return out;
  }, [html, pages, activePageId]);

  // L'aperçu demande de naviguer → on change de page dans l'éditeur
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { wy?: string; slug?: string };
      if (!d || d.wy !== "nav") return;
      const slug = String(d.slug || "").toLowerCase().replace(/[^a-z0-9\-]/g, "");
      if (!slug || slug === "accueil" || slug === "home" || slug === "index") switchPage(null);
      else { const pg = (pages || []).find((p) => p.slug === slug); if (pg) switchPage(pg.id); }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pages, switchPage]);

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  if (!site) return <div className="p-6 text-muted-foreground">Site introuvable. <Link to="/studio" className="text-primary underline">Retour Studio</Link></div>;

  return (
    <div className="h-[calc(100vh-3rem)] -m-6 flex flex-col">
      {/* Barre du haut */}
      <div className="border-b px-4 py-2 flex items-center justify-between gap-3 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" asChild className="gap-1"><Link to="/studio"><ArrowLeft className="h-4 w-4" /> Studio</Link></Button>
          <div className="min-w-0">
            <p className="font-semibold truncate text-sm">{site.title || "Site client"}</p>
          </div>
          <Badge className={cn("border-0", site.status === "published" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300")}>
            {site.status === "published" ? "En ligne" : "Brouillon"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {undoStack.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => undo.mutate()} disabled={undo.isPending} title="Annuler la dernière modification">
              <Undo2 className="h-3.5 w-3.5" /> Annuler
            </Button>
          )}
          <div className="flex rounded-md border overflow-hidden mr-1">
            <button onClick={() => setDevice("desktop")} className={cn("px-2 py-1.5", device === "desktop" ? "bg-muted" : "hover:bg-muted/50")} title="Bureau"><Monitor className="h-3.5 w-3.5" /></button>
            <button onClick={() => setDevice("mobile")} className={cn("px-2 py-1.5", device === "mobile" ? "bg-muted" : "hover:bg-muted/50")} title="Mobile"><Smartphone className="h-3.5 w-3.5" /></button>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" disabled={!html} title="Voir le site en plein écran"
            onClick={() => { const b = new Blob([html], { type: "text/html" }); window.open(URL.createObjectURL(b), "_blank"); }}>
            <Maximize2 className="h-3.5 w-3.5" /> Plein écran
          </Button>
          <Button size="sm" onClick={() => publish.mutate()} disabled={publish.isPending || !html} className="gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white">
            {publish.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />} Publier
          </Button>
        </div>
      </div>

      {/* Barre des pages */}
      <div className="border-b bg-card/60 px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto">
        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <button onClick={() => switchPage(null)}
          className={cn("px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition", activePageId === null ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
          Accueil
        </button>
        {(pages || []).map((p) => (
          <span key={p.id} className={cn("group flex items-center rounded-md transition", activePageId === p.id ? "bg-primary/10" : "hover:bg-muted")}>
            <button onClick={() => switchPage(p.id)}
              className={cn("pl-2.5 pr-1 py-1 text-xs font-medium whitespace-nowrap", activePageId === p.id ? "text-primary" : "text-muted-foreground")}>
              {p.title}
            </button>
            <button onClick={() => { if (confirm(`Supprimer la page « ${p.title} » ?`)) deletePage.mutate(p.id); }}
              className="px-1 text-muted-foreground/50 hover:text-rose-500" title="Supprimer la page">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <button onClick={() => addPage.mutate()} disabled={addPage.isPending}
          className="px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted whitespace-nowrap flex items-center gap-1">
          <Plus className="h-3 w-3" /> Page
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Panneau gauche : onglets IA / Photos */}
        <div className="w-80 border-r bg-card flex flex-col">
          <div className="grid grid-cols-5 gap-1 p-2 border-b">
            <button onClick={() => setPanel("ia")} className={cn("flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition", panel === "ia" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
              <Sparkles className="h-3.5 w-3.5" /> IA
            </button>
            <button onClick={() => setPanel("design")} className={cn("flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition", panel === "design" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
              <Palette className="h-3.5 w-3.5" /> Design
            </button>
            <button onClick={() => setPanel("photos")} className={cn("flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition", panel === "photos" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
              <ImageIcon className="h-3.5 w-3.5" /> Photos
            </button>
            <button onClick={() => setPanel("code")} className={cn("flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition", panel === "code" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
              <Code2 className="h-3.5 w-3.5" /> Code
            </button>
            <button onClick={() => setPanel("apps")} className={cn("flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition", panel === "apps" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
              <Plug className="h-3.5 w-3.5" /> Apps
            </button>
          </div>

          {panel === "design" ? (
            <SiteDesignPanel html={html} onChange={persist} siteName={site.title || undefined} siteId={id} />
          ) : panel === "photos" ? (
            <SitePhotosPanel html={html} siteId={id} onChange={persist} />
          ) : panel === "code" ? (
            <SiteCodePanel html={html} onChange={persist} />
          ) : panel === "apps" ? (
            <SiteIntegrationsPanel html={html} onChange={persist} />
          ) : (
          <div className="p-4 space-y-3 overflow-y-auto">
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Discuter avec l'IA</p>
              <p className="text-xs text-muted-foreground mt-0.5">Dis ce qui ne va pas, l'IA modifie le site. Enchaîne autant de fois que tu veux.</p>
            </div>

            {/* Fil de discussion : modifs déjà appliquées */}
            {history.length > 0 && (
              <div className="space-y-1.5">
                {history.map((h, i) => (
                  <div key={i} className="rounded-lg border bg-muted/30 p-2 text-xs">
                    <p className="font-medium text-foreground/90">🗣️ {h.instruction}</p>
                    <p className="text-muted-foreground mt-0.5">✓ {h.summary}</p>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              placeholder="Édite la page (« change le titre… ») OU crée une page (« crée une page Produits avec 3 produits », « ajoute une sous-page Contact »)."
              className="resize-none text-sm"
              disabled={aiBusy || edit.isPending}
            />
            <Button className="w-full gap-1.5" disabled={!instruction.trim() || aiBusy || edit.isPending} onClick={() => runAi(instruction)}>
              {(aiBusy || edit.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {(aiBusy || edit.isPending) ? "Travail…" : "Appliquer"}
            </Button>

            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Suggestions</p>
              <div className="space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setInstruction(s)} disabled={edit.isPending}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded-md border hover:bg-muted/50 transition disabled:opacity-50">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Aperçu live */}
        <div className="flex-1 bg-muted/30 overflow-auto flex items-start justify-center p-4">
          {html ? (
            <iframe
              title="Aperçu du site"
              srcDoc={previewHtml}
              className={cn("bg-white rounded-lg shadow-xl border transition-all", device === "mobile" ? "w-[390px] h-[844px] max-w-full" : "w-full h-full min-h-[80vh]")}
            />
          ) : (
            <div className="text-muted-foreground text-sm flex items-center gap-2 mt-20"><Loader2 className="h-4 w-4 animate-spin" /> Chargement de la maquette…</div>
          )}
        </div>
      </div>
    </div>
  );
}
