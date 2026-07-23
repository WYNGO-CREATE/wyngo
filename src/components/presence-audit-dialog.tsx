/**
 * ─── PresenceAuditDialog — Diagnostic de présence en ligne ────────────
 *
 * Score /100 + points rouges/orange/verts sur la présence digitale du
 * prospect, comparée à ses concurrents locaux. Crée le BESOIN avant de
 * montrer l'Aperçu Instantané (la solution).
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, AlertTriangle, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { category: string; label: string; status: "red" | "orange" | "green"; detail: string };
type Audit = {
  score: number; grade: string; summary: string; items: Item[];
  business: { company: string; city: string; rating: number | null; reviews: number; hasWebsite: boolean; photos: number };
  benchmark: { avgRating: number; avgReviews: number; n: number };
};

const STATUS = {
  red: { icon: AlertTriangle, cls: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  orange: { icon: AlertCircle, cls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  green: { icon: CheckCircle2, cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

function scoreColor(s: number) {
  if (s >= 80) return "#16a34a";
  if (s >= 60) return "#65a30d";
  if (s >= 40) return "#f59e0b";
  return "#e11d48";
}

export function PresenceAuditDialog({ prospectId, children }: { prospectId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("presence-audit", { body: { prospect_id: prospectId } });
      if (error) {
        // Récupère le vrai message renvoyé par la fonction (sinon message générique)
        let msg = error.message;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* garde le message générique */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      setAudit(data as Audit);
    } catch (e) {
      setError((e as Error).message || "Diagnostic impossible");
    }
    setLoading(false);
  };

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o && !audit && !loading) run();
  };

  const pct = audit ? audit.score : 0;
  const ring = `conic-gradient(${scoreColor(pct)} ${pct * 3.6}deg, var(--muted, #e5e7eb) 0deg)`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Diagnostic de présence en ligne</DialogTitle>
          <DialogDescription>Ce que vos clients voient de vous aujourd'hui — comparé à vos concurrents locaux.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Analyse de la présence en ligne… (Google, site, concurrents)</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-rose-600">{error}</p>
            <Button variant="outline" size="sm" onClick={run}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Réessayer</Button>
          </div>
        ) : audit ? (
          <div className="space-y-4">
            {/* Score */}
            <div className="flex items-center gap-4 rounded-xl border p-4 bg-card">
              <div className="relative shrink-0" style={{ width: 88, height: 88 }}>
                <div className="rounded-full" style={{ width: 88, height: 88, background: ring }} />
                <div className="absolute inset-[8px] rounded-full bg-background flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: scoreColor(pct) }}>{audit.score}</span>
                  <span className="text-[9px] text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">Présence {audit.grade.toLowerCase()}</p>
                <p className="text-xs text-muted-foreground mt-1">{audit.summary}</p>
              </div>
            </div>

            {/* Points */}
            <div className="space-y-2">
              {audit.items.map((it, i) => {
                const S = STATUS[it.status];
                const Icon = S.icon;
                return (
                  <div key={i} className={cn("rounded-lg border p-2.5 flex gap-2.5", S.bg)}>
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", S.cls)} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{it.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{it.detail}</p>
                    </div>
                    <span className="ml-auto text-[9px] uppercase tracking-wide text-muted-foreground/60 shrink-0">{it.category}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-center text-muted-foreground pt-1">
              💡 Argument d'appel : montrez ce diagnostic, puis l'<b>Aperçu Instantané</b> comme solution.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
