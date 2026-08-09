/**
 * ─── Group Arsène Studio — Pipeline de production des sites clients (CRM #2) ──
 *
 * Backend PARTAGÉ avec Group Arsène. Studio lit les prospects "convertis" (les
 * clients) et pilote la fabrication de leur site, de la maquette au suivi.
 *
 *   #4  Pipeline : Brief → Maquette → Validation client → En ligne → Suivi
 *       Chaque site porte une échéance + un éventuel point bloquant.
 *       Drag & drop d'une colonne à l'autre = changement d'étape.
 *   #5  Espace client : compte du client (suivi, messages, validation, audience).
 *   #3  Rapport mensuel : saisie des métriques + génération/envoi du rapport.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { EspaceClientDialog } from "@/components/espace-client-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Rocket, Wand2, ExternalLink, Globe, Hammer, CheckCircle2, PlusCircle,
  ClipboardList, Eye, HeartPulse, Link2, BarChart3, AlertTriangle, CalendarClock, MessageSquare, GripVertical, UserCog,
  Sparkles, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio")({
  component: StudioPage,
  head: () => ({ meta: [{ title: "Group Arsène Studio — Suivi client & espace client" }] }),
});

const SUPABASE_FN = "https://mwkkgubvdswmdaiswepl.supabase.co/functions/v1";
const APP_BASE = typeof window !== "undefined" ? window.location.origin : "";

function slugify(s: string): string {
  return (s || "site")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "site";
}

type Client = { id: string; first_name: string; last_name: string; company: string | null; email: string | null; status: string };
type Preview = { prospect_id: string; slug: string; html_url: string | null; generated_at: string };
type Site = {
  id: string; prospect_id: string; title: string | null; slug: string | null;
  status: string; custom_domain: string | null; created_at: string;
  production_stage: string; deadline: string | null; blocker: string | null;
  maquette_validated_at: string | null; portal_token: string | null;
};

const STAGES = [
  { key: "brief", label: "Brief & infos", icon: ClipboardList, tone: "amber" },
  { key: "design", label: "Maquette", icon: Wand2, tone: "violet" },
  { key: "review", label: "Validation client", icon: Eye, tone: "sky" },
  { key: "live", label: "En ligne", icon: Globe, tone: "emerald" },
  { key: "care", label: "Suivi", icon: HeartPulse, tone: "rose" },
] as const;

const STAGE_TONE: Record<string, string> = {
  amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  violet: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
  sky: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
  emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function StudioPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [reportSite, setReportSite] = useState<Site | null>(null);
  const [espaceSite, setEspaceSite] = useState<Site | null>(null);
  const [msgSite, setMsgSite] = useState<Site | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["studio-clients", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Client[]> => {
      const { data } = await supabase.from("prospects")
        .select("id, first_name, last_name, company, email, status")
        .eq("status", "converti")
        .order("updated_at", { ascending: false });
      return (data as Client[]) || [];
    },
  });

  const { data: previews } = useQuery({
    queryKey: ["studio-previews", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Map<string, Preview>> => {
      const { data } = await supabase.from("prospect_previews")
        .select("prospect_id, slug, html_url, generated_at")
        .order("generated_at", { ascending: false });
      const m = new Map<string, Preview>();
      for (const p of (data as Preview[]) || []) if (!m.has(p.prospect_id)) m.set(p.prospect_id, p);
      return m;
    },
  });

  const { data: sites } = useQuery({
    queryKey: ["studio-sites", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Site[]> => {
      const { data } = await supabase.from("client_sites")
        .select("id, prospect_id, title, slug, status, custom_domain, created_at, production_stage, deadline, blocker, maquette_validated_at, portal_token")
        .order("created_at", { ascending: false });
      return (data as Site[]) || [];
    },
  });

  // Messages client non lus, par site (badge sur la carte)
  const { data: unread } = useQuery({
    queryKey: ["portal-unread", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async (): Promise<Map<string, number>> => {
      const { data } = await supabase.from("portal_messages")
        .select("site_id").eq("author", "client").eq("read_by_agency", false);
      const m = new Map<string, number>();
      for (const r of (data as { site_id: string }[]) || []) m.set(r.site_id, (m.get(r.site_id) || 0) + 1);
      return m;
    },
  });

  const siteByProspect = useMemo(() => {
    const m = new Map<string, Site>();
    for (const s of sites || []) if (!m.has(s.prospect_id)) m.set(s.prospect_id, s);
    return m;
  }, [sites]);

  const toProduce = (clients || []).filter((c) => !siteByProspect.has(c.id));

  const createSite = useMutation({
    mutationFn: async (client: Client) => {
      const preview = previews?.get(client.id);
      const company = client.company || `${client.first_name} ${client.last_name}`.trim();
      const slug = `${slugify(company)}-${Math.random().toString(36).slice(2, 6)}`;
      // Le Studio ne FABRIQUE plus le site (c'est le développeur qui s'en charge) :
      // on ne génère aucun HTML de départ. On reprend seulement la maquette
      // commerciale si elle existe, pour que le client la retrouve dans son espace.
      let html: string | null = null;
      const url = preview?.html_url || (preview?.slug ? `${APP_BASE}/p/${preview.slug}` : null);
      if (url) { try { const r = await fetch(url); if (r.ok) { const t = await r.text(); if (t.trim()) html = t; } } catch { /* garde le starter */ } }
      const { data, error } = await supabase.from("client_sites").insert({
        prospect_id: client.id, owner_id: user!.id, preview_id: null,
        title: company, slug, status: "draft",
        production_stage: "brief",
        portal_token: crypto.randomUUID().replace(/-/g, ""),
        html, html_path: preview?.html_url || null,
      }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-sites"] });
      toast.success("Client ajouté au suivi 🚀 — son espace client est actif");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Crée un chantier de démonstration complet (client fictif + site prêt à
  // éditer + portail actif). Reproductible à volonté, supprimable d'un clic.
  const createDemo = useMutation({
    mutationFn: async () => {
      const stamp = new Date().toLocaleDateString("fr-FR");
      const company = `🎬 Démo — Boulangerie Martin`;
      const { data: prospect, error: pErr } = await supabase.from("prospects").insert({
        owner_id: user!.id, first_name: "Julien", last_name: "Martin",
        company, email: "demo@grouparsene.fr", phone: "06 12 34 56 78",
        status: "converti", source: "demo", location: "Toulouse",
        notes: `Chantier de démonstration créé le ${stamp}.`,
      }).select("id").single();
      if (pErr) throw pErr;
      const slug = `demo-martin-${Math.random().toString(36).slice(2, 6)}`;
      const { data: site, error: sErr } = await supabase.from("client_sites").insert({
        prospect_id: prospect.id, owner_id: user!.id, preview_id: null,
        title: company, slug, status: "draft", production_stage: "design",
        portal_token: crypto.randomUUID().replace(/-/g, ""),
        html: null,
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      }).select("id").single();
      if (sErr) throw sErr;
      return site.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-clients"] });
      qc.invalidateQueries({ queryKey: ["studio-sites"] });
      toast.success("Chantier de démo créé 🎬 — teste Espace client, Messages et Rapport !");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSite = useMutation({
    mutationFn: async (s: Site) => {
      const isDemo = (s.title || "").startsWith("🎬 Démo");
      const { error } = await supabase.from("client_sites").delete().eq("id", s.id);
      if (error) throw error;
      // Si c'est un client de démo, on supprime aussi le prospect fictif.
      if (isDemo && s.prospect_id) {
        const { data: c } = await supabase.from("prospects").select("source").eq("id", s.prospect_id).maybeSingle();
        if (c?.source === "demo") await supabase.from("prospects").delete().eq("id", s.prospect_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-clients"] });
      qc.invalidateQueries({ queryKey: ["studio-sites"] });
      toast.success("Chantier supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSite = useMutation({
    mutationFn: async (p: { id: string; patch: Partial<Site> }) => {
      const { error } = await supabase.from("client_sites").update(p.patch).eq("id", p.id);
      if (error) throw error;
    },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: ["studio-sites"] });
      const prev = qc.getQueryData<Site[]>(["studio-sites", user?.id]);
      qc.setQueryData<Site[]>(["studio-sites", user?.id], (old) =>
        (old || []).map((s) => (s.id === p.id ? { ...s, ...p.patch } : s)));
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["studio-sites", user?.id], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["studio-sites"] }),
  });

  const moveTo = (id: string, stage: string) => {
    const patch: Partial<Site> = { production_stage: stage };
    if (stage === "live") patch.status = "published";
    updateSite.mutate({ id, patch });
  };

  const clientName = (id: string) => {
    const c = clients?.find((x) => x.id === id);
    return c ? (c.company || `${c.first_name} ${c.last_name}`.trim()) : "Client";
  };
  const previewUrl = (id: string) => {
    const p = previews?.get(id);
    return p?.html_url || (p?.slug ? `${APP_BASE}/p/${p.slug}` : null);
  };


  const byStage = (stage: string) => (sites || []).filter((s) => (s.production_stage || "brief") === stage);

  const counts = STAGES.map((st) => byStage(st.key).length);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 md:p-6">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <Rocket className="size-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Group Arsène Studio</h1>
            <p className="text-sm text-muted-foreground">Suis chaque client et son espace dédié : avancement, échéances, blocages, messages et rapports. La réalisation technique du site est assurée par le développeur.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" disabled={createDemo.isPending}
            onClick={() => createDemo.mutate()} title="Créer un chantier de démonstration complet">
            <Sparkles className="size-3.5" /> Chantier de démo
          </Button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mt-5">
          <Stat icon={Hammer} label="À produire" value={toProduce.length} tone="amber" />
          {STAGES.map((st, i) => (
            <Stat key={st.key} icon={st.icon} label={st.label} value={counts[i]} tone={st.tone} />
          ))}
        </div>
      </div>

      {/* À produire — clients signés sans site */}
      {toProduce.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Hammer className="size-4" /> À lancer ({toProduce.length})
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {toProduce.map((c) => {
              const hasPreview = !!previews?.get(c.id);
              return (
                <Card key={c.id}>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="font-semibold">{c.company || `${c.first_name} ${c.last_name}`}</p>
                      <p className="text-xs text-muted-foreground">{c.first_name} {c.last_name}</p>
                    </div>
                    {hasPreview ? (
                      <a href={previewUrl(c.id)!} target="_blank" rel="noreferrer"
                        className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                        <Wand2 className="size-3" /> Maquette prête <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ Pas de maquette — tu peux quand même lancer la production.</p>
                    )}
                    <Button size="sm" className="w-full gap-1.5" disabled={createSite.isPending}
                      onClick={() => createSite.mutate(c)}>
                      <PlusCircle className="size-3.5" /> Lancer la production
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Pipeline de production */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Rocket className="size-4" /> Chantiers en cours
        </h2>
        {(sites || []).length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucun chantier. Lance la production d'un client signé ci-dessus pour le voir apparaître ici.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
            {STAGES.map((st) => {
              const items = byStage(st.key);
              const Icon = st.icon;
              return (
                <div key={st.key}
                  onDragOver={(e) => { e.preventDefault(); setOverCol(st.key); }}
                  onDragLeave={() => setOverCol((c) => (c === st.key ? null : c))}
                  onDrop={() => { if (dragId) moveTo(dragId, st.key); setDragId(null); setOverCol(null); }}
                  className={cn("rounded-xl border bg-muted/30 p-2.5 flex flex-col gap-2.5 transition-colors min-h-[120px]",
                    overCol === st.key && "ring-2 ring-primary/40 bg-primary/5")}>
                  <div className={cn("flex items-center gap-1.5 px-1 py-1 rounded-md border text-xs font-semibold", STAGE_TONE[st.tone])}>
                    <Icon className="size-3.5" /> {st.label}
                    <span className="ml-auto tabular-nums opacity-70">{items.length}</span>
                  </div>
                  {items.map((s) => (
                    <SiteCard
                      key={s.id}
                      site={s}
                      name={s.title || clientName(s.prospect_id)}
                      dragging={dragId === s.id}
                      onDragStart={() => setDragId(s.id)}
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
                      previewUrl={previewUrl(s.prospect_id)}
                      unread={unread?.get(s.id) || 0}
                      onEditDeadline={(d) => updateSite.mutate({ id: s.id, patch: { deadline: d || null } })}
                      onEditBlocker={(b) => updateSite.mutate({ id: s.id, patch: { blocker: b || null } })}
                      onReport={() => setReportSite(s)}
                      onEspace={() => setEspaceSite(s)}
                      onMessages={() => setMsgSite(s)}
                      onDelete={() => { if (confirm(`Supprimer le chantier « ${s.title || clientName(s.prospect_id)} » ?`)) deleteSite.mutate(s); }}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-3 opacity-60">—</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-center text-muted-foreground pt-1">
        Glisse une carte d'une colonne à l'autre pour faire avancer un chantier. Le client suit l'avancement en temps réel via son <b>portail</b>.
      </p>

      {espaceSite && (
        <EspaceClientDialog
          site={espaceSite as any}
          clientEmail={clients?.find((c) => c.id === espaceSite.prospect_id)?.email || null}
          onClose={() => setEspaceSite(null)}
        />
      )}

      {reportSite && (
        <ReportDialog
          site={reportSite}
          clientName={reportSite.title || clientName(reportSite.prospect_id)}
          clientEmail={clients?.find((c) => c.id === reportSite.prospect_id)?.email || null}
          onClose={() => setReportSite(null)}
        />
      )}

      {msgSite && (
        <MessagesDialog
          site={msgSite}
          clientName={msgSite.title || clientName(msgSite.prospect_id)}
          onClose={() => setMsgSite(null)}
        />
      )}
    </div>
  );
}

// ─── Fil de messages côté agence (#5) ──────────────────────────────────
function MessagesDialog({ site, clientName, onClose }: { site: Site; clientName: string; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: messages } = useQuery({
    queryKey: ["portal-thread", site.id],
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data } = await supabase.from("portal_messages")
        .select("id, author, body, created_at").eq("site_id", site.id).order("created_at", { ascending: true });
      // marque les messages client comme lus
      await supabase.from("portal_messages").update({ read_by_agency: true })
        .eq("site_id", site.id).eq("author", "client").eq("read_by_agency", false);
      qc.invalidateQueries({ queryKey: ["portal-unread"] });
      return (data as { id: string; author: string; body: string; created_at: string }[]) || [];
    },
  });

  const reply = useMutation({
    mutationFn: async () => {
      const body = text.trim();
      if (!body) return;
      const { error } = await supabase.from("portal_messages").insert({
        site_id: site.id, owner_id: user!.id, author: "agency", body, read_by_agency: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["portal-thread", site.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="size-5 text-primary" /> Messages — {clientName}</DialogTitle>
          <DialogDescription>Conversation du portail client. Vos réponses s'affichent côté client en temps réel.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto flex flex-col gap-2 py-1">
          {(messages || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun message pour l'instant.</p>
          ) : (messages || []).map((mm) => (
            <div key={mm.id} className={cn("max-w-[82%] rounded-xl px-3 py-2 text-sm",
              mm.author === "agency" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted")}>
              {mm.body}
              <div className={cn("text-[10px] mt-1", mm.author === "agency" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {mm.author === "agency" ? "Vous" : clientName} · {new Date(mm.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 items-end">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
            placeholder="Votre réponse au client…" className="resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) reply.mutate(); }} />
          <Button onClick={() => reply.mutate()} disabled={reply.isPending || !text.trim()}>Envoyer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Carte chantier ───────────────────────────────────────────────────
function SiteCard({
  site, name, dragging, onDragStart, onDragEnd, previewUrl, unread,
  onEditDeadline, onEditBlocker, onReport, onEspace, onMessages, onDelete,
}: {
  site: Site; name: string; dragging: boolean;
  onDragStart: () => void; onDragEnd: () => void; previewUrl: string | null; unread: number;
  onEditDeadline: (d: string) => void; onEditBlocker: (b: string) => void;
  onEspace: () => void;
  onReport: () => void; onMessages: () => void; onDelete: () => void;
}) {
  const [editBlk, setEditBlk] = useState(false);
  const [blk, setBlk] = useState(site.blocker || "");

  // Échéance : en retard / bientôt / ok
  const deadlineInfo = (() => {
    if (!site.deadline) return null;
    const d = new Date(site.deadline + "T00:00:00");
    const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
    const fmt = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    if (days < 0) return { fmt, cls: "text-rose-600 dark:text-rose-400 bg-rose-500/10", label: `En retard (${fmt})` };
    if (days <= 3) return { fmt, cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10", label: `J-${days} · ${fmt}` };
    return { fmt, cls: "text-muted-foreground bg-muted", label: fmt };
  })();

  return (
    <div
      className={cn("rounded-lg border bg-card p-2.5 space-y-2 shadow-sm",
        dragging && "opacity-40 ring-2 ring-primary")}>
      {/* Poignée de drag dédiée — le reste de la carte reste cliquable */}
      <div className="flex items-center gap-1.5">
        <span draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground -ml-1 px-0.5 py-1 shrink-0"
          title="Glisser pour changer d'étape">
          <GripVertical className="size-4" />
        </span>
        <p className="font-semibold text-sm leading-tight truncate flex-1">{name}</p>
        <button onClick={onDelete} title="Supprimer le chantier"
          className="text-muted-foreground/40 hover:text-rose-500 shrink-0 p-0.5">
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {site.maquette_validated_at && (
        <Badge className="border-0 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] gap-1">
          <CheckCircle2 className="size-2.5" /> Maquette validée
        </Badge>
      )}

      {/* Échéance */}
      <div className="flex items-center gap-1.5">
        <CalendarClock className="size-3 text-muted-foreground shrink-0" />
        <input type="date" value={site.deadline || ""}
          onChange={(e) => onEditDeadline(e.target.value)}
          className="text-[11px] bg-transparent border rounded px-1 py-0.5 w-full text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>
      {deadlineInfo && (
        <div className={cn("text-[10px] font-medium rounded px-1.5 py-0.5 inline-block", deadlineInfo.cls)}>
          {deadlineInfo.label}
        </div>
      )}

      {/* Point bloquant */}
      {editBlk ? (
        <div className="space-y-1">
          <Textarea value={blk} onChange={(e) => setBlk(e.target.value)} rows={2}
            placeholder="Ex : on attend les photos du client…"
            className="text-[11px] min-h-0 py-1" />
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => { onEditBlocker(blk); setEditBlk(false); }}>OK</Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { setBlk(site.blocker || ""); setEditBlk(false); }}>Annuler</Button>
          </div>
        </div>
      ) : site.blocker ? (
        <button onClick={() => setEditBlk(true)}
          className="w-full text-left text-[11px] rounded px-1.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-start gap-1">
          <AlertTriangle className="size-3 mt-0.5 shrink-0" /> <span className="line-clamp-2">{site.blocker}</span>
        </button>
      ) : (
        <button onClick={() => setEditBlk(true)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <AlertTriangle className="size-3" /> Signaler un blocage
        </button>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-1 pt-0.5">
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" onClick={onEspace}
          title="Adresse du site à mesurer et accès du client à son espace">
          <UserCog className="size-2.5" /> Espace client
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 relative" onClick={onMessages} title="Messages du client">
          <MessageSquare className="size-2.5" /> Messages
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{unread}</span>
          )}
        </Button>
        {site.production_stage === "live" || site.production_stage === "care" ? (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" onClick={onReport}>
            <BarChart3 className="size-2.5" /> Rapport
          </Button>
        ) : null}
        {previewUrl && (
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" asChild>
            <a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-2.5" /> Voir</a>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Rapport mensuel ───────────────────────────────────────────────────
//
// Il n'y a plus rien à saisir : les chiffres viennent de la mesure posée sur
// le site du client. On regarde, on envoie. Aucune API payante n'est appelée.
//
// La « position Google » a disparu : une position honnête dépend du mot-clé,
// de la ville et de l'appareil de celui qui cherche, et ne s'obtient qu'avec
// Search Console, site par site. L'inventer serait mentir. À la place, le
// rapport montre la part de visiteurs venus d'un moteur de recherche — ça se
// mesure, et ça répond à la même question du client : est-ce qu'on me trouve ?
function ReportDialog({ site, clientName, clientEmail, onClose }: {
  site: Site; clientName: string; clientEmail: string | null; onClose: () => void;
}) {
  const [email, setEmail] = useState(clientEmail || "");
  // Par défaut le mois écoulé : on ne fait pas le bilan d'un mois en cours.
  const moisDefaut = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();
  const [mois, setMois] = useState(moisDefaut);

  const apercu = useQuery({
    queryKey: ["rapport", site.id, mois],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("rapport-mensuel", {
        body: { action: "apercu", site_id: site.id, mois, base_url: window.location.origin },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
  });

  const envoyer = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("rapport-mensuel", {
        body: { action: "envoyer", site_id: site.id, mois, email: email.trim(),
                base_url: window.location.origin },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: (d) => {
      if (d?.avertissement) toast.warning(d.avertissement);
      else { toast.success("Rapport envoyé au client 📧"); onClose(); }
    },
    onError: (e: Error) => toast.error("Envoi impossible", { description: e.message }),
  });

  const c = apercu.data?.chiffres;
  const ev = (a: number, b: number) => {
    if (!b) return null;
    const p = Math.round(((a - b) / b) * 100);
    if (p === 0) return "stable";
    return `${p > 0 ? "+" : "−"}${Math.abs(p)} %`;
  };

  const grand = (label: string, v: number, av: number) => (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{(v ?? 0).toLocaleString("fr-FR")}</div>
      {ev(v, av) && <div className="text-[11px] text-muted-foreground">{ev(v, av)} vs mois dernier</div>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" /> Rapport mensuel — {clientName}
          </DialogTitle>
          <DialogDescription>
            Chiffres mesurés sur le site, rien à saisir. Vérifie et envoie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label className="text-xs">Mois</Label>
          <Input type="month" value={mois.slice(0, 7)}
            onChange={(e) => setMois(e.target.value + "-01")} className="h-9" />
        </div>

        {apercu.isLoading && (
          <p className="text-sm text-muted-foreground py-4">Calcul des chiffres…</p>
        )}
        {apercu.isError && (
          <p className="text-sm text-destructive py-2">{(apercu.error as Error).message}</p>
        )}

        {c && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {grand("Visiteurs", c.visiteurs, c.visiteurs_avant)}
              {grand("Ont voulu vous joindre", c.contacts, c.contacts_avant)}
              {grand("Venus d'une recherche", c.via_recherche, c.via_recherche_avant)}
            </div>
            {c.visites === 0 && (
              <p className="text-xs text-amber-600">
                Aucune visite mesurée sur ce mois. Si le site est en ligne, vérifie
                qu'il a bien été republié depuis que la mesure existe.
              </p>
            )}
          </>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Email du client</Label>
          <Input type="email" value={email} placeholder="client@exemple.fr"
            onChange={(e) => setEmail(e.target.value)} className="h-9" />
        </div>

        <DialogFooter className="gap-2">
          {apercu.data?.html && (
            <Button variant="outline" onClick={() => {
              const w = window.open("", "_blank");
              if (w) { w.document.write(apercu.data.html); w.document.close(); }
            }}>Voir l'email</Button>
          )}
          <Button onClick={() => envoyer.mutate()}
            disabled={envoyer.isPending || !email || !c}>
            {envoyer.isPending ? "Envoi…" : "Envoyer au client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stat ──────────────────────────────────────────────────────────────
const TONE: Record<string, string> = {
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};
function Stat({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border bg-card/60 p-2.5 flex items-center gap-2">
      <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", TONE[tone])}><Icon className="size-4" /></div>
      <div className="min-w-0">
        <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}
