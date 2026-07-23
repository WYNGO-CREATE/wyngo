import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { PROSPECT_STATUSES, STATUS_LABELS, type ProspectStatus } from "@/lib/crm";
import { Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type BoardProspect = {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  status: string;
  custom_status: string | null;
};

type Col = { key: string; label: string; type: "builtin" | "custom"; value: string };

export function ProspectsBoard({
  prospects,
  customCols,
  onMove,
  onAddCol,
}: {
  prospects: BoardProspect[];
  customCols: string[];
  onMove: (id: string, col: { type: "builtin" | "custom"; value: string }) => void;
  onAddCol: (name: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const dataCustom = Array.from(
    new Set(prospects.map((p) => p.custom_status).filter(Boolean) as string[]),
  );
  const allCustom = Array.from(new Set([...customCols, ...dataCustom]));

  const cols: Col[] = [
    ...PROSPECT_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s], type: "builtin" as const, value: s })),
    ...allCustom.map((c) => ({ key: "c:" + c, label: c, type: "custom" as const, value: c })),
  ];

  const inCol = (p: BoardProspect, col: Col) =>
    col.type === "custom" ? p.custom_status === col.value : !p.custom_status && p.status === col.value;

  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 items-start min-w-max">
        {cols.map((col) => {
          const items = prospects.filter((p) => inCol(p, col));
          return (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
              onDragLeave={() => setOverCol((o) => (o === col.key ? null : o))}
              onDrop={() => { if (dragId) onMove(dragId, { type: col.type, value: col.value }); setDragId(null); setOverCol(null); }}
              className={cn(
                "w-[248px] flex-none rounded-xl border bg-muted/30 p-2 transition-colors",
                overCol === col.key && "ring-2 ring-primary bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between px-1.5 pb-2">
                <span className="text-sm font-medium truncate">{col.label}</span>
                <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5 border flex-none">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[48px]">
                {items.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "group rounded-lg border bg-background p-2.5 shadow-sm cursor-grab active:cursor-grabbing",
                      dragId === p.id && "opacity-40",
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 flex-none" />
                      <div className="min-w-0 flex-1">
                        <Link to="/prospects/$id" params={{ id: p.id }} className="text-sm font-medium hover:underline block truncate">
                          {p.first_name} {p.last_name}
                        </Link>
                        {p.company && <div className="text-xs text-muted-foreground truncate">{p.company}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="w-[200px] flex-none">
          <button
            type="button"
            onClick={() => { const n = window.prompt("Nom du nouveau statut ?"); if (n && n.trim()) onAddCol(n.trim()); }}
            className="w-full min-h-[88px] rounded-xl border border-dashed text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nouveau statut
          </button>
        </div>
      </div>
    </div>
  );
}
