/**
 * ─── Facturation · Déclarations mensuelles ────────────────────────────
 *
 * Un espace pro pour déclarer chaque mois (URSSAF / impôts) :
 *   • CA ENCAISSÉ du mois (le chiffre à déclarer en micro-entreprise)
 *   • CA facturé + TVA collectée (si régime réel)
 *   • liste des factures du mois, export CSV pour le comptable
 *   • marquer le mois comme "déclaré"
 *   • cumul annuel encaissé vs plafond micro (indicatif)
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Printer, Check, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/facturation/declarations")({
  component: DeclarationsPage,
  head: () => ({ meta: [{ title: "Déclarations — Facturation Group Arsène" }] }),
});

// Plafonds micro-entreprise prestations de services (2025, indicatif)
const PLAFOND_MICRO = 77700;
const SEUIL_TVA = 37500;

type Facture = { id: string; number: string | null; client_name: string | null; status: string; total_ht: number; total_vat: number; total_ttc: number; issue_date: string | null; paid_at: string | null };

const eur = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const ym = (d: string | null) => (d ? d.slice(0, 7) : "");

function DeclarationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const periodKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const periodISO = `${periodKey}-01`;
  const yearKey = String(month.getFullYear());
  const monthLabel = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const { data: settings } = useQuery({
    queryKey: ["billing_settings"],
    queryFn: async () => (await supabase.from("billing_settings").select("legal_name, siret, vat_regime, is_ei").eq("id", true).maybeSingle()).data,
  });
  const isFranchise = settings?.vat_regime !== "normal";

  const { data: factures } = useQuery({
    queryKey: ["declarations-factures", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Facture[]> => {
      const { data } = await supabase.from("documents")
        .select("id, number, client_name, status, total_ht, total_vat, total_ttc, issue_date, paid_at")
        .eq("type", "facture").neq("status", "brouillon")
        .order("issue_date", { ascending: false });
      return (data as Facture[]) || [];
    },
  });

  const { data: declarations } = useQuery({
    queryKey: ["monthly-declarations"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("monthly_declarations").select("period, declared_at");
      const m = new Map<string, string>();
      for (const d of (data as { period: string; declared_at: string }[]) || []) m.set(d.period.slice(0, 7), d.declared_at);
      return m;
    },
  });

  const all = factures || [];
  // Factures émises ce mois (par date d'émission)
  const emisMois = all.filter((f) => ym(f.issue_date) === periodKey);
  // Factures encaissées ce mois (par date de paiement) → le CA à déclarer
  const encaisseMois = all.filter((f) => f.status === "paye" && ym(f.paid_at) === periodKey);

  const caFacture = emisMois.reduce((s, f) => s + Number(f.total_ttc || 0), 0);
  const caEncaisse = encaisseMois.reduce((s, f) => s + Number(f.total_ttc || 0), 0);
  const tvaMois = isFranchise ? 0 : emisMois.reduce((s, f) => s + Number(f.total_vat || 0), 0);

  // Cumul annuel encaissé
  const caAnnee = all.filter((f) => f.status === "paye" && (f.paid_at || "").slice(0, 4) === yearKey).reduce((s, f) => s + Number(f.total_ttc || 0), 0);
  const pctPlafond = Math.min(100, Math.round((caAnnee / PLAFOND_MICRO) * 100));

  const declaredAt = declarations?.get(periodKey);

  const markDeclared = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("monthly_declarations").upsert({
        owner_id: user!.id, period: periodISO,
        ca_facture: caFacture, ca_encaisse: caEncaisse, tva: tvaMois,
        declared_at: new Date().toISOString(),
      }, { onConflict: "period" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["monthly-declarations"] }); toast.success(`${monthLabel} marqué comme déclaré ✓`); },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCSV = () => {
    const rows = [["Numéro", "Émise le", "Client", "HT", "TVA", "TTC", "Statut", "Encaissée le"]];
    for (const f of emisMois) {
      rows.push([
        f.number || "", f.issue_date || "", (f.client_name || "").replace(/;/g, ","),
        String(Number(f.total_ht || 0).toFixed(2)), String(Number(f.total_vat || 0).toFixed(2)), String(Number(f.total_ttc || 0).toFixed(2)),
        f.status, f.paid_at ? f.paid_at.slice(0, 10) : "",
      ]);
    }
    rows.push([]);
    rows.push(["", "", "TOTAL FACTURÉ", "", "", caFacture.toFixed(2), "", ""]);
    rows.push(["", "", "TOTAL ENCAISSÉ", "", "", caEncaisse.toFixed(2), "", ""]);
    const csv = "﻿" + rows.map((r) => r.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `wyngo-declaration-${periodKey}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const shiftMonth = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const isFuture = month > new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const STATUS: Record<string, { label: string; cls: string }> = {
    paye: { label: "Encaissée", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
    envoye: { label: "En attente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
    en_retard: { label: "En retard", cls: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
    accepte: { label: "Acceptée", cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1"><Link to="/facturation"><ArrowLeft className="h-4 w-4" /> Facturation</Link></Button>
        <div>
          <h1 className="text-2xl font-bold">Déclarations mensuelles</h1>
          <p className="text-sm text-muted-foreground">Ton récap prêt pour l'URSSAF, les impôts ou le comptable.</p>
        </div>
      </div>

      {/* Navigateur de mois */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-3">
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <p className="font-semibold capitalize text-lg">{monthLabel}</p>
          {declaredAt
            ? <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 mt-0.5"><Check className="h-3 w-3" /> Déclaré le {new Date(declaredAt).toLocaleDateString("fr-FR")}</Badge>
            : <span className="text-xs text-muted-foreground">Non déclaré</span>}
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => shiftMonth(1)} disabled={isFuture}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">CA encaissé</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{eur(caEncaisse)}</p>
          <p className="text-[11px] text-primary mt-1">👉 à déclarer (URSSAF)</p>
        </div>
        <Kpi label="CA facturé" value={eur(caFacture)} hint="factures émises" />
        {!isFranchise && <Kpi label="TVA collectée" value={eur(tvaMois)} hint="à reverser" />}
        <Kpi label="Factures" value={String(emisMois.length)} hint={`${encaisseMois.length} encaissée(s)`} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => markDeclared.mutate()} disabled={markDeclared.isPending} className="gap-1.5">
          <Check className="h-4 w-4" /> {declaredAt ? "Mettre à jour la déclaration" : "Marquer comme déclaré"}
        </Button>
        <Button variant="outline" onClick={exportCSV} disabled={emisMois.length === 0} className="gap-1.5"><Download className="h-4 w-4" /> Exporter en CSV</Button>
        <Button variant="outline" onClick={() => window.print()} className="gap-1.5"><Printer className="h-4 w-4" /> Imprimer / PDF</Button>
      </div>

      {isFranchise && (
        <p className="text-xs text-muted-foreground -mt-2">Régime <b>franchise en base de TVA</b> (art. 293 B du CGI) : aucune TVA à collecter ni reverser.</p>
      )}

      {/* Factures du mois */}
      <Card>
        <CardContent className="p-0">
          {emisMois.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Aucune facture émise sur {monthLabel}.</div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <span>Facture</span><span>Statut</span><span className="text-right">TTC</span>
              </div>
              {emisMois.map((f) => (
                <div key={f.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 items-center text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{f.number || "—"} {f.client_name ? `· ${f.client_name}` : ""}</p>
                    <p className="text-xs text-muted-foreground">Émise le {f.issue_date ? new Date(f.issue_date).toLocaleDateString("fr-FR") : "—"}{f.paid_at ? ` · encaissée le ${new Date(f.paid_at).toLocaleDateString("fr-FR")}` : ""}</p>
                  </div>
                  <Badge className={cn("border-0 whitespace-nowrap", (STATUS[f.status] || STATUS.envoye).cls)}>{(STATUS[f.status] || { label: f.status }).label}</Badge>
                  <span className="text-right font-semibold tabular-nums">{eur(f.total_ttc)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cumul annuel + plafond micro */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">CA encaissé cumulé {yearKey}</p>
            <p className="text-lg font-bold tabular-nums">{eur(caAnnee)}</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full", pctPlafond > 85 ? "bg-rose-500" : pctPlafond > 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pctPlafond}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {pctPlafond}% du plafond micro-entreprise services ({eur(PLAFOND_MICRO)}). Seuil de TVA ≈ {eur(SEUIL_TVA)}. <i>Montants indicatifs {yearKey} — à confirmer avec ton comptable.</i>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
