/**
 * ─── Le Radar Tech · Espace de rédaction (admin) ──────────────────────
 * Écrire, éditer et publier les articles du média. Lecture publique via /radar.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Radar, Plus, Trash2, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/radar-ui";

export const Route = createFileRoute("/_authenticated/redaction")({
  component: RedactionPage,
  head: () => ({ meta: [{ title: "Rédaction — Le Radar Tech" }] }),
});

type Row = {
  id: string; slug: string; title: string; kicker: string | null; category: string;
  standfirst: string | null; body: string | null; cover_url: string | null; author: string;
  status: string; featured: boolean; seo_description: string | null; views: number; published_at: string | null;
};

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

const empty = (): Partial<Row> => ({ title: "", slug: "", kicker: "", category: "tech", standfirst: "", body: "", cover_url: "", author: "La rédaction", status: "brouillon", featured: false, seo_description: "" });

function RedactionPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Row>>(empty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const set = (k: keyof Row, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  const { data: rows = [] } = useQuery({
    queryKey: ["radar-admin"],
    queryFn: async (): Promise<Row[]> => {
      const { data } = await supabase.from("radar_articles").select("*").order("updated_at", { ascending: false });
      return (data as Row[]) || [];
    },
  });

  const openNew = () => { setEditingId(null); setDraft(empty()); };
  const openEdit = (r: Row) => { setEditingId(r.id); setDraft({ ...r }); };

  const save = useMutation({
    mutationFn: async (publish?: boolean) => {
      const title = (draft.title || "").trim();
      if (!title) throw new Error("Titre requis.");
      const slug = (draft.slug || slugify(title)).trim();
      const status = publish ? "publie" : (draft.status || "brouillon");
      const payload = {
        title, slug, kicker: draft.kicker || null, category: draft.category || "tech",
        standfirst: draft.standfirst || null, body: draft.body || null, cover_url: draft.cover_url || null,
        author: draft.author || "La rédaction", status, featured: !!draft.featured,
        seo_description: draft.seo_description || draft.standfirst || null,
        published_at: status === "publie" ? (draft.published_at || new Date().toISOString()) : draft.published_at || null,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from("radar_articles").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("radar_articles").insert(payload as never).select("id").single();
        if (error) throw error;
        setEditingId((data as { id: string }).id);
      }
    },
    onSuccess: (_d, publish) => { qc.invalidateQueries({ queryKey: ["radar-admin"] }); toast.success(publish ? "Article publié ✓" : "Brouillon enregistré"); },
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "Ce slug existe déjà — change le titre/slug." : e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("radar_articles").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["radar-admin"] }); if (editingId) openNew(); toast.success("Article supprimé"); },
  });

  const previewSlug = useMemo(() => draft.slug || slugify(draft.title || ""), [draft.slug, draft.title]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Radar className="h-6 w-6 text-primary" /> Rédaction — Le Radar Tech</h1>
        <a href="https://le-radar-tech.vercel.app" target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1 ml-2">Voir le site <ExternalLink className="h-3.5 w-3.5" /></a>
        <Button className="ml-auto gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> Nouvel article</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* Liste */}
        <Card><CardContent className="p-0 divide-y max-h-[75vh] overflow-auto">
          {rows.length === 0 && <div className="p-6 text-sm text-muted-foreground">Aucun article.</div>}
          {rows.map((r) => (
            <button key={r.id} onClick={() => openEdit(r)} className={cn("w-full text-left p-3 hover:bg-muted/50 transition", editingId === r.id && "bg-muted")}>
              <div className="flex items-center gap-2">
                <Badge className={cn("text-[10px]", r.status === "publie" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")}>{r.status === "publie" ? "Publié" : "Brouillon"}</Badge>
                {r.featured && <Badge className="text-[10px] bg-amber-100 text-amber-700">Une</Badge>}
                <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1"><Eye className="h-3 w-3" />{r.views}</span>
              </div>
              <p className="text-sm font-medium mt-1 line-clamp-2">{r.title}</p>
            </button>
          ))}
        </CardContent></Card>

        {/* Éditeur */}
        <Card><CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1"><Label className="text-xs">Titre</Label><Input value={draft.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Le titre de l'article" /></div>
            <div className="space-y-1"><Label className="text-xs">Surtitre (genre)</Label><Input value={draft.kicker || ""} onChange={(e) => set("kicker", e.target.value)} placeholder="Enquête, Outils…" /></div>
            <div className="space-y-1"><Label className="text-xs">Rubrique</Label>
              <select value={draft.category || "tech"} onChange={(e) => set("category", e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1"><Label className="text-xs">Chapô (accroche)</Label><Textarea rows={2} value={draft.standfirst || ""} onChange={(e) => set("standfirst", e.target.value)} placeholder="Une phrase qui donne envie de lire." /></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs">Corps de l'article (HTML : &lt;p&gt;, &lt;h2&gt;, &lt;a&gt;…)</Label><Textarea rows={12} value={draft.body || ""} onChange={(e) => set("body", e.target.value)} placeholder="<p>Votre texte…</p>" className="font-mono text-[13px]" /></div>
            <div className="space-y-1"><Label className="text-xs">Image de couverture (URL)</Label><Input value={draft.cover_url || ""} onChange={(e) => set("cover_url", e.target.value)} placeholder="https://…" /></div>
            <div className="space-y-1"><Label className="text-xs">Auteur</Label><Input value={draft.author || ""} onChange={(e) => set("author", e.target.value)} /></div>
            <div className="col-span-2 space-y-1"><Label className="text-xs">Slug (URL) — le-radar-tech.vercel.app/?a={previewSlug || "…"}</Label><Input value={draft.slug || ""} onChange={(e) => set("slug", slugify(e.target.value))} placeholder={slugify(draft.title || "") || "titre-de-l-article"} /></div>
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft.featured} onChange={(e) => set("featured", e.target.checked)} /> Mettre à la une (grand article en tête d'accueil)</label>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>Enregistrer le brouillon</Button>
            <Button onClick={() => save.mutate(true)} disabled={save.isPending}>Publier</Button>
            {editingId && draft.status === "publie" && <a href={`https://le-radar-tech.vercel.app/?a=${previewSlug}`} target="_blank" rel="noreferrer" className="inline-flex"><Button variant="ghost" className="gap-1.5">Voir <ExternalLink className="h-4 w-4" /></Button></a>}
            {editingId && <Button variant="ghost" className="ml-auto text-rose-600 gap-1.5" onClick={() => { if (confirm("Supprimer cet article ?")) del.mutate(editingId); }}><Trash2 className="h-4 w-4" /> Supprimer</Button>}
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
