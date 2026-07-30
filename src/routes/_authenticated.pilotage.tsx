/**
 * ─── Pilotage — tableau de bord business ──────────────────────────────
 * Vue d'ensemble : trésorerie (encaissé / en attente / pipeline), taux de
 * closing, courbe de CA sur 6 mois, entonnoir prospection → client, à-venir.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Euro, Clock, TrendingUp, Target, CalendarClock, CheckCircle2, FileText, Bell, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/pilotage")({
  component: PilotagePage,
  head: () => ({ meta: [{ title: "Pilotage — Wyngo" }] }),
});

type Doc = { id: string; number: string | null; type: string; status: string; total_ttc: number | null; client_name: string | null; due_date: string | null; sent_at: string | null; paid_at: string | null; issue_date: string | null; created_at: string };
type Prosp = { status: string; location: string | null };
const money = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const STATUS_LABELS: { key: string; label: string; cls: string }[] = [
  { key: "nouveau", label: "Nouveaux", cls: "bg-slate-400" },
  { key: "en_cours", label: "Appelés sans réponse", cls: "bg-sky-500" },
  { key: "a_relancer", label: "À relancer", cls: "bg-amber-500" },
  { key: "interesse", label: "Intéressés", cls: "bg-violet-500" },
  { key: "converti", label: "Convertis (clients)", cls: "bg-emerald-500" },
  { key: "perdu", label: "Perdus", cls: "bg-rose-400" },
];

function PilotagePage() {
  const { user } = useAuth();

  const { data: docs = [] } = useQuery({
    queryKey: ["pilotage-docs", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Doc[]> => {
      const { data } = await supabase.from("documents").select("id, number, type, status, total_ttc, client_name, due_date, sent_at, paid_at, issue_date, created_at");
      return (data as Doc[]) || [];
    },
  });

  const { data: prospectsData = [] } = useQuery({
    queryKey: ["pilotage-prospects", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Prosp[]> => {
      const { data } = await supabase.from("prospects").select("status, location");
      return (data as Prosp[]) || [];
    },
  });
  const prospectStatuses = prospectsData.map((p) => p.status);

  const { data: upcomingRdv = 0 } = useQuery({
    queryKey: ["pilotage-rdv", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "planifie").gte("scheduled_at", new Date().toISOString());
      return count ?? 0;
    },
  });

  const { data: dueCount = 0 } = useQuery({
    queryKey: ["pilotage-due", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const { count } = await supabase.from("follow_ups").select("*", { count: "exact", head: true }).eq("completed", false).lte("scheduled_at", end.toISOString());
      return count ?? 0;
    },
  });

  const { data: rdvSoon = 0 } = useQuery({
    queryKey: ["pilotage-rdv-soon", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("appointments").select("*", { count: "exact", head: true })
        .eq("status", "planifie").gte("scheduled_at", new Date().toISOString()).lte("scheduled_at", new Date(Date.now() + 36 * 3600_000).toISOString());
      return count ?? 0;
    },
  });

  const factures = docs.filter((d) => d.type === "facture");
  const devis = docs.filter((d) => d.type === "devis");
  const sum = (arr: Doc[]) => arr.reduce((s, d) => s + Number(d.total_ttc || 0), 0);

  const payees = factures.filter((d) => d.status === "paye");
  const encaisse = sum(payees);
  const enAttente = sum(factures.filter((d) => d.status === "envoye" || d.status === "en_retard"));
  const devisAccepte = sum(devis.filter((d) => d.status === "accepte"));
  const devisEnvoye = sum(devis.filter((d) => d.status === "envoye"));
  const pipeline = enAttente + devisAccepte + devisEnvoye;

  const devisEmis = devis.filter((d) => ["envoye", "accepte", "refuse"].includes(d.status));
  const devisGagnes = devis.filter((d) => d.status === "accepte").length;
  const tauxClosing = devisEmis.length ? Math.round((devisGagnes / devisEmis.length) * 100) : 0;

  // CA encaissé sur 6 mois
  const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
  const caByMonth = months.map((m) => {
    const key = format(m, "yyyy-MM");
    const total = payees.filter((d) => {
      const dt = d.paid_at || d.issue_date || d.created_at;
      return dt && format(new Date(dt), "yyyy-MM") === key;
    }).reduce((s, d) => s + Number(d.total_ttc || 0), 0);
    return { m, total };
  });
  const caMax = Math.max(1, ...caByMonth.map((x) => x.total));
  const caThisMonth = caByMonth[caByMonth.length - 1]?.total || 0;

  // Entonnoir prospects
  const counts: Record<string, number> = {};
  for (const s of prospectStatuses) counts[s] = (counts[s] || 0) + 1;
  const totalProspects = prospectStatuses.length;
  const convertis = counts["converti"] || 0;
  const tauxConv = totalProspects ? Math.round((convertis / totalProspects) * 100) : 0;
  const maxStatus = Math.max(1, ...STATUS_LABELS.map((s) => counts[s.key] || 0));

  // ── Alertes intelligentes ──
  const todayStr = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  const facturesRetard = factures.filter((d) => (d.status === "envoye" || d.status === "en_retard") && d.due_date && d.due_date < todayStr);
  const devisExpire = devis.filter((d) => d.status === "envoye" && d.due_date && d.due_date >= todayStr && d.due_date <= in7);
  const devisSansReponse = devis.filter((d) => {
    if (d.status !== "envoye") return false;
    const s = d.sent_at || d.issue_date;
    const vieux = s && Date.now() - new Date(s).getTime() > 10 * 86400_000;
    const expireBientot = d.due_date && d.due_date >= todayStr && d.due_date <= in7;
    return vieux && !expireBientot;
  });
  type Alert = { id: string; sev: "red" | "amber" | "sky"; text: string; to: "/facturation" | "/relances" | "/agenda" };
  const alerts: Alert[] = [];
  if (facturesRetard.length) alerts.push({ id: "fr", sev: "red", text: `${facturesRetard.length} facture${facturesRetard.length > 1 ? "s" : ""} en retard · ${money(sum(facturesRetard))} à encaisser`, to: "/facturation" });
  if (dueCount > 0) alerts.push({ id: "rl", sev: "amber", text: `${dueCount} relance${dueCount > 1 ? "s" : ""} à faire aujourd'hui`, to: "/relances" });
  if (devisExpire.length) alerts.push({ id: "de", sev: "amber", text: `${devisExpire.length} devis expire${devisExpire.length > 1 ? "nt" : ""} sous 7 jours — relance utile`, to: "/facturation" });
  if (devisSansReponse.length) alerts.push({ id: "dsr", sev: "sky", text: `${devisSansReponse.length} devis sans réponse depuis +10 jours`, to: "/facturation" });
  if (rdvSoon > 0) alerts.push({ id: "rdv", sev: "sky", text: `${rdvSoon} rendez-vous dans les 36 h`, to: "/agenda" });

  const ALERT_CLS: Record<string, string> = {
    red: "border-rose-300 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300",
    amber: "border-amber-300 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300",
    sky: "border-sky-300 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Pilotage</h1>
        <p className="text-sm text-muted-foreground">Ton business d'un coup d'œil : trésorerie, closing et prospection.</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={CheckCircle2} tone="emerald" label="Encaissé (total)" value={money(encaisse)} sub={`${money(caThisMonth)} ce mois-ci`} />
        <Kpi icon={Clock} tone="amber" label="En attente d'encaissement" value={money(enAttente)} sub="factures envoyées / en retard" />
        <Kpi icon={TrendingUp} tone="violet" label="Pipeline potentiel" value={money(pipeline)} sub="devis + factures à venir" />
        <Kpi icon={Target} tone="sky" label="Taux de closing devis" value={`${tauxClosing} %`} sub={`${devisGagnes}/${devisEmis.length} devis acceptés`} />
      </div>

      {/* Alertes intelligentes */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Alertes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a) => (
              <Link key={a.id} to={a.to} className={cn("flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition hover:opacity-90", ALERT_CLS[a.sev])}>
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> {a.text}</span>
                <span className="text-xs opacity-70 shrink-0">→</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trésorerie 6 mois */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Euro className="h-4 w-4 text-emerald-600" /> Encaissé — 6 derniers mois</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-40 pt-2">
            {caByMonth.map(({ m, total }) => (
              <div key={format(m, "yyyy-MM")} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{total > 0 ? money(total) : ""}</span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all" style={{ height: `${Math.max(2, (total / caMax) * 100)}%` }} title={money(total)} />
                <span className="text-[10px] text-muted-foreground capitalize">{format(m, "MMM", { locale: fr })}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Entonnoir prospection */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-violet-600" /> Entonnoir de prospection</CardTitle>
          <span className="text-xs text-muted-foreground">{totalProspects} prospects · <b className="text-emerald-600">{tauxConv}%</b> convertis</span>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {totalProspects === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun prospect pour l'instant. <Link to="/chasse" className="text-primary hover:underline">Lance une chasse →</Link></p>
          ) : STATUS_LABELS.map((s) => {
            const n = counts[s.key] || 0;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-xs w-32 shrink-0 text-muted-foreground">{s.label}</span>
                <div className="flex-1 h-6 rounded-md bg-muted/50 overflow-hidden">
                  <div className={cn("h-full rounded-md transition-all", s.cls)} style={{ width: `${Math.max(n ? 6 : 0, (n / maxStatus) * 100)}%` }} />
                </div>
                <span className="text-sm font-semibold tabular-nums w-8 text-right">{n}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* À venir */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Link to="/agenda" className="block">
          <Card className="hover:bg-muted/30 transition h-full"><CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><CalendarClock className="size-5" /></div>
            <div><div className="text-lg font-bold leading-none">{upcomingRdv}</div><div className="text-xs text-muted-foreground mt-1">rendez-vous à venir</div></div>
          </CardContent></Card>
        </Link>
        <Link to="/relances" className="block">
          <Card className="hover:bg-muted/30 transition h-full"><CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center"><FileText className="size-5" /></div>
            <div><div className="text-lg font-bold leading-none">{dueCount}</div><div className="text-xs text-muted-foreground mt-1">relances à faire aujourd'hui</div></div>
          </CardContent></Card>
        </Link>
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
};
function Kpi({ icon: Icon, label, value, sub, tone }: { icon: React.ElementType; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className={cn("size-9 rounded-lg flex items-center justify-center mb-3", TONE[tone])}><Icon className="size-4" /></div>
      <div className="text-xl font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1.5">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
