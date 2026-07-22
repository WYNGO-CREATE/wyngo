import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Phone, Copy, Check, MessageSquareWarning, Sparkles, Search, Loader2, Wand2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { renderTemplate } from "@/lib/render-template";

/**
 * Drawer latéral "Mode appel" affiché depuis la fiche d'un prospect.
 * Affiche les scripts d'ouverture + la banque d'objections, avec les variables
 * remplacées par les vraies infos du prospect (prénom, entreprise…).
 */

type CallScript = {
  id: string;
  kind: "script" | "objection";
  title: string;
  content: string;
  category: string | null;
};

type Prospect = {
  id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone?: string | null;
  website?: string | null;
  title?: string | null;
  location?: string | null;
};

export function CallModeDrawer({
  prospect, open, onOpenChange,
}: {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"script" | "objection">("script");
  const [search, setSearch] = useState("");

  const { data: scripts = [] } = useQuery({
    queryKey: ["call-scripts-drawer"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("call_scripts")
        .select("id, kind, title, content, category")
        .order("kind")
        .order("category")
        .order("position");
      return (data || []) as CallScript[];
    },
  });

  // Profil user pour la variable {{expediteur}}
  const { data: profile } = useQuery({
    queryKey: ["my-profile-call", user?.id],
    enabled: open && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: agency } = useQuery({
    queryKey: ["agency-call"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("agency_settings")
        .select("name, website_url")
        .eq("id", true)
        .maybeSingle();
      return data;
    },
  });

  const ctx = useMemo(
    () => ({
      first_name: prospect?.first_name,
      last_name: prospect?.last_name,
      company: prospect?.company,
      email: prospect?.email,
      phone: prospect?.phone,
      website: prospect?.website,
      title: (prospect as { title?: string | null })?.title ?? null,
      location: (prospect as { location?: string | null })?.location ?? null,
      sender_name: profile?.full_name,
      sender_email: profile?.email,
      sender_phone: (profile as { phone?: string | null })?.phone ?? null,
      agency_name: agency?.name,
      agency_website: agency?.website_url,
    }),
    [prospect, profile, agency],
  );

  const renderedScripts = useMemo(
    () => scripts.map((s) => ({
      ...s,
      renderedTitle: renderTemplate(s.title, ctx),
      renderedContent: renderTemplate(s.content, ctx),
    })),
    [scripts, ctx],
  );

  const filtered = renderedScripts.filter((s) => {
    if (s.kind !== tab) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return s.renderedTitle.toLowerCase().includes(q) || s.renderedContent.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by category
  const grouped: Record<string, typeof renderedScripts> = {};
  filtered.forEach((s) => {
    const c = s.category || "autre";
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push(s);
  });

  const CAT_LABELS: Record<string, string> = {
    prise_contact: "Prise de contact",
    qualification: "Qualification",
    closing:       "Closing",
    voicemail:     "Voicemail",
    prix:          "Prix",
    timing:        "Timing",
    decideur:      "Décideur",
    concurrent:    "Concurrent",
    esquive:       "Esquive",
    autre:         "Autre",
  };

  const countScript = renderedScripts.filter((s) => s.kind === "script").length;
  const countObjection = renderedScripts.filter((s) => s.kind === "objection").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto p-0"
      >
        <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Mode appel
          </SheetTitle>
          <SheetDescription>
            {prospect
              ? <>Variables remplies pour <strong>{prospect.first_name} {prospect.last_name}</strong>{prospect.company ? ` · ${prospect.company}` : ""}.</>
              : "Sélectionnez un prospect pour personnaliser les scripts."}
          </SheetDescription>

          {/* Tabs */}
          <div className="inline-flex rounded-md border bg-card overflow-hidden mt-3 w-fit">
            <button
              onClick={() => setTab("script")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
                tab === "script"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Scripts <span className="text-[10px] bg-background/40 px-1.5 py-0.5 rounded">{countScript}</span>
            </button>
            <button
              onClick={() => setTab("objection")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
                tab === "objection"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <MessageSquareWarning className="h-3.5 w-3.5" />
              Objections <span className="text-[10px] bg-background/40 px-1.5 py-0.5 rounded">{countObjection}</span>
            </button>
          </div>

          {/* Search */}
          {tab === "objection" && (
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher : prix, timing, décideur…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-background"
              />
            </div>
          )}
        </SheetHeader>

        <div className="px-6 py-5">
          {prospect && <MarketPanel prospectId={prospect.id} />}
          {scripts.length === 0 ? (
            <EmptyHint />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              Aucun résultat{search ? ` pour « ${search} »` : ""}.
            </p>
          ) : (
            <div className="space-y-7">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {CAT_LABELS[cat] || cat} <span className="text-muted-foreground/60">({items.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {items.map((s) => (
                      <ScriptItem key={s.id} script={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Analyse marché (concurrents réels vérifiés) + script sur-mesure, dans le Mode appel.
function MarketPanel({ prospectId }: { prospectId: string }) {
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{
    competitors?: { name: string; website: string; reviews: number }[];
    script?: string | null;
    warning?: string;
  } | null>(null);
  const run = async () => {
    setLoading(true);
    setRes(null);
    const { data, error } = await supabase.functions.invoke("market-script", { body: { prospect_id: prospectId } });
    setLoading(false);
    if (error) { toast.error("Analyse impossible", { description: error.message }); return; }
    setRes(data);
    if (data?.warning) toast.info(data.warning);
  };
  const comps = res?.competitors || [];
  return (
    <div className="rounded-lg border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 p-4 mb-5 space-y-2.5">
      <p className="text-xs uppercase tracking-wide font-semibold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
        <Search className="h-3.5 w-3.5" /> Analyse marché + script sur-mesure
      </p>
      <Button onClick={run} disabled={loading}
        className="w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        {loading ? "Analyse du marché en cours…" : res ? "Relancer l'analyse" : "Analyser le marché & générer le script"}
      </Button>
      {res && comps.length === 0 && (
        <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-md px-3 py-2">
          {res.warning || "Aucun concurrent vérifié trouvé. Vérifie que ce prospect a bien un métier (activité) ET une ville renseignés sur sa fiche."}
        </p>
      )}
      {comps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Concurrents dominants — réels, sites vérifiés en direct :</p>
          {comps.map((c) => (
            <a key={c.website} href={c.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 text-sm rounded border bg-background/60 px-3 py-2 hover:border-violet-300">
              <span className="font-medium truncate">{c.name}</span>
              <span className="text-muted-foreground shrink-0 inline-flex items-center gap-1 text-xs">{c.reviews} avis <ExternalLink className="h-3 w-3" /></span>
            </a>
          ))}
        </div>
      )}
      {res?.script && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Script sur-mesure</p>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
              onClick={() => navigator.clipboard.writeText(res.script!).then(() => toast.success("Script copié")).catch(() => toast.error("Copie impossible"))}>
              <Copy className="h-3 w-3" /> Copier
            </Button>
          </div>
          <div className="max-h-96 overflow-auto rounded border bg-background/60 p-3 text-sm leading-relaxed whitespace-pre-wrap">{res.script}</div>
        </div>
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="text-center py-12">
      <Phone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium">Aucun script enregistré</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Allez sur <strong>/scripts</strong> et cliquez « Importer le script de référence » pour démarrer.
      </p>
    </div>
  );
}

function ScriptItem({
  script,
}: {
  script: { id: string; kind: string; renderedTitle: string; renderedContent: string };
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script.renderedContent);
      setCopied(true);
      toast.success("Copié");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Impossible de copier");
    }
  };
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold flex-1">{script.renderedTitle}</h4>
        <Button variant="ghost" size="sm" onClick={copy} className="flex-shrink-0">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <p className="text-[13px] whitespace-pre-wrap leading-relaxed text-foreground/85">
        {script.renderedContent}
      </p>
    </div>
  );
}
