/**
 * ─── Statut prospect (Kanban) ─────────────────────────────────────────
 *
 *   - Toutes les colonnes tiennent à l'écran (grille responsive qui passe
 *     à la ligne) — plus de scroll horizontal.
 *   - Statuts intégrés + statuts personnalisés libres (créés à la volée,
 *     mémorisés, partagés avec la fiche prospect via localStorage).
 *   - Changement de statut en 1 clic (menu sur la carte) OU glisser-déposer.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PROSPECT_STATUSES, STATUS_LABELS, STATUS_VARIANTS, type ProspectStatus } from "@/lib/crm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Search, Phone, Mail, ChevronDown, ArrowRightLeft, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pipeline")({
  component: PipelinePage,
  head: () => ({ meta: [{ title: "Statut prospect — Wyngo Workspace" }] }),
});

type ProspectRow = {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: ProspectStatus;
  custom_status: string | null;
  tags: string[] | null;
  updated_at: string;
};

type Col = { key: string; label: string; type: "builtin" | "custom"; value: string };

const CUSTOM_VARIANT = "bg-violet-100 text-violet-700 border-violet-200";
const LS_KEY = "wyngo-custom-status";

function loadCustom(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

function PipelinePage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [scope, setScope] = useState<"mine" | "team">("team");
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [customCols, setCustomCols] = useState<string[]>(() => loadCustom());

  const addCol = (name: string) => setCustomCols((prev) => {
    const next = Array.from(new Set([...prev, name]));
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  const { data: prospects } = useQuery({
    queryKey: ["pipeline", scope, user?.id, role],
    queryFn: async () => {
      let q = supabase
        .from("prospects")
        .select("id, first_name, last_name, company, email, phone, status, custom_status, tags, updated_at")
        .order("updated_at", { ascending: false });
      if (scope === "mine") q = q.eq("owner_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ProspectRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, custom_status }: { id: string; status?: ProspectStatus; custom_status?: string | null }) => {
      const patch = {
        updated_at: new Date().toISOString(),
        ...(status !== undefined ? { status } : {}),
        ...(custom_status !== undefined ? { custom_status } : {}),
      };
      const { error } = await supabase.from("prospects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      qc.invalidateQueries({ queryKey: ["prospects"] });
      toast.success(`Statut → ${vars.custom_status ?? STATUS_LABELS[vars.status as ProspectStatus] ?? ""}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveTo = (id: string, col: Col) => {
    if (col.type === "builtin") updateStatus.mutate({ id, status: col.value as ProspectStatus, custom_status: null });
    else updateStatus.mutate({ id, custom_status: col.value });
  };

  const filtered = useMemo(() => {
    const qq = query.trim().toLowerCase();
    if (!qq) return prospects || [];
    return (prospects || []).filter((p) =>
      [p.first_name, p.last_name, p.company, p.email].filter(Boolean).some((v) => v!.toLowerCase().includes(qq)),
    );
  }, [prospects, query]);

  // Colonnes = statuts intégrés + statuts perso (créés ∪ présents en base)
  const columns: Col[] = useMemo(() => {
    const dataCustom = Array.from(new Set((prospects || []).map((p) => p.custom_status).filter(Boolean) as string[]));
    const allCustom = Array.from(new Set([...customCols, ...dataCustom]));
    return [
      ...PROSPECT_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s], type: "builtin" as const, value: s })),
      ...allCustom.map((c) => ({ key: "c:" + c, label: c, type: "custom" as const, value: c })),
    ];
  }, [prospects, customCols]);

  const inCol = (p: ProspectRow, col: Col) =>
    col.type === "custom" ? p.custom_status === col.value : !p.custom_status && p.status === col.value;

  const colVariant = (col: Col) => (col.type === "builtin" ? STATUS_VARIANTS[col.value as ProspectStatus] : CUSTOM_VARIANT);

  function handleDrop(col: Col) {
    const id = dragId;
    setDragId(null);
    setOverCol(null);
    if (!id) return;
    const p = (prospects || []).find((x) => x.id === id);
    if (!p || inCol(p, col)) return;
    moveTo(id, col);
  }

  function promptNewCol() {
    const n = window.prompt("Nom du nouveau statut ?");
    if (n && n.trim()) addCol(n.trim());
  }

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Statut prospect</h1>
          <p className="text-muted-foreground text-sm">
            Glisse une carte dans une colonne (ou via le menu « Déplacer »). Crée tes propres statuts avec « + Nouveau statut ».
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un prospect…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 w-[240px]"
            />
          </div>
          <Button variant="outline" size="sm" onClick={promptNewCol} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nouveau statut
          </Button>
          <Select value={scope} onValueChange={(v) => setScope(v as "mine" | "team")}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="team">Équipe entière</SelectItem>
              <SelectItem value="mine">Mes prospects</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Bandeau de stats par statut (tout visible, wrap) ─── */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(116px, 1fr))" }}>
        {columns.map((col) => (
          <div key={col.key} className={cn("rounded-lg border px-3 py-2 text-center", colVariant(col))}>
            <div className="text-xl font-bold tabular-nums leading-tight">{filtered.filter((p) => inCol(p, col)).length}</div>
            <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80 truncate">{col.label}</div>
          </div>
        ))}
      </div>

      {/* ─── Colonnes Kanban — grille responsive, toutes visibles ─── */}
      <div className="grid gap-3 items-start" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(212px, 1fr))" }}>
        {columns.map((col) => {
          const cards = filtered.filter((p) => inCol(p, col));
          return (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
              onDragLeave={() => setOverCol((o) => (o === col.key ? null : o))}
              onDrop={() => handleDrop(col)}
              className={cn(
                "bg-muted/30 rounded-lg p-2.5 min-h-[160px] transition-colors",
                overCol === col.key && "ring-2 ring-primary bg-primary/5",
              )}
            >
              <div className={cn("text-xs font-bold px-2 py-1.5 rounded mb-3 border flex items-center justify-between", colVariant(col))}>
                <span className="truncate">{col.label}</span>
                <span className="tabular-nums opacity-80 flex-none ml-1">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map((p) => (
                  <ProspectCard
                    key={p.id}
                    prospect={p}
                    columns={columns}
                    currentColKey={col.key}
                    colVariant={colVariant}
                    draggingId={dragId}
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => setDragId(null)}
                    onMove={(c) => moveTo(p.id, c)}
                  />
                ))}
                {cards.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded">
                    Glissez ici
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Tuile « + Nouveau statut » */}
        <button
          type="button"
          onClick={promptNewCol}
          className="min-h-[160px] rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Nouveau statut
        </button>
      </div>
    </div>
  );
}

// ─── Carte prospect ───────────────────────────────────────────────────
function ProspectCard({
  prospect: p,
  columns,
  currentColKey,
  colVariant,
  draggingId,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  prospect: ProspectRow;
  columns: Col[];
  currentColKey: string;
  colVariant: (c: Col) => string;
  draggingId: string | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (c: Col) => void;
}) {
  const current = columns.find((c) => c.key === currentColKey);
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn("hover:shadow-md transition-shadow", draggingId === p.id && "opacity-50")}
    >
      <CardContent className="p-2.5 space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn("w-full h-7 px-2 justify-between text-[11px] font-semibold border", current && colVariant(current))}
            >
              <span className="inline-flex items-center gap-1"><ArrowRightLeft className="h-3 w-3" /> Déplacer</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 max-h-72 overflow-y-auto">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Changer le statut
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.filter((c) => c.key !== currentColKey).map((c) => (
              <DropdownMenuItem key={c.key} onClick={() => onMove(c)} className="gap-2">
                <span className={cn("inline-block h-2 w-2 rounded-full", colVariant(c).split(" ")[0])} />
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div>
          <Link to="/prospects/$id" params={{ id: p.id }} className="font-semibold text-sm hover:underline block truncate">
            {p.first_name} {p.last_name}
          </Link>
          {p.company && <div className="text-xs text-muted-foreground truncate">{p.company}</div>}
        </div>

        {(p.phone || p.email) && (
          <div className="flex items-center gap-1.5 pt-1 border-t">
            {p.phone && (
              <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground" title={p.phone}>
                <Phone className="h-3 w-3" /> Appeler
              </a>
            )}
            {p.email && (
              <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground" title={p.email}>
                <Mail className="h-3 w-3" /> Email
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
