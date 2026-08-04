/**
 * ─── Secteurs de prospection ──────────────────────────────────────────
 *
 * Un secteur = un métier × une commune. L'API de l'État en donne la taille
 * réelle : 56 kinés à Blagnac, 1 467 à Toulouse.
 *
 * L'intérêt n'est pas cosmétique. Tant que la prospection ressemble à un puits
 * sans fond, on ne sait jamais où on en est ni quand s'arrêter. Découpée en
 * secteurs mesurés, elle devient finissable : « il reste 16 kinés à Blagnac »
 * se traite, « il y a des kinés quelque part » ne se traite pas.
 *
 * Les secteurs sont SUGGÉRÉS, jamais imposés : chacun peut aller ailleurs.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TRADES } from "@/lib/trades-catalog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Map, Check, Target, PhoneCall } from "lucide-react";

export const Route = createFileRoute("/_authenticated/secteurs")({
  component: Secteurs,
  head: () => ({ meta: [{ title: "Secteurs — Group Arsène Workspace" }] }),
});

type Avancement = {
  id: string; metier: string; commune: string;
  suggere_a: string | null; suggere_nom: string | null;
  total_connu: number | null;
  verifies: number; cibles: number; au_crm: number; appeles: number;
};

const RAYONS = [10, 20, 30, 40];

function Secteurs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [naf, setNaf] = useState(TRADES[0]?.naf ?? "");
  const [ville, setVille] = useState("Toulouse");
  const [rayon, setRayon] = useState(20);

  const secteurs = useQuery({
    queryKey: ["secteurs-avancement"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("secteurs_avancement");
      if (error) throw new Error(error.message);
      return (data || []) as Avancement[];
    },
  });

  const decouper = useMutation({
    mutationFn: async () => {
      const t = TRADES.find((x) => x.naf === naf);
      const { data, error } = await supabase.functions.invoke("pappers-search", {
        body: { action: "secteurs", params: { code_naf: naf, metier: t?.label ?? naf, ville, rayon_km: rayon } },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { crees: number; total_entreprises: number };
    },
    onSuccess: (r) => {
      toast.success(`${r.crees} secteurs · ${r.total_entreprises.toLocaleString("fr-FR")} entreprises au total`);
      qc.invalidateQueries({ queryKey: ["secteurs-avancement"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const prendre = useMutation({
    mutationFn: async ({ id, mien }: { id: string; mien: boolean }) => {
      const { error } = await (supabase as any).from("secteurs")
        .update({ suggere_a: mien ? null : user?.id }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secteurs-avancement"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Les miens d'abord, puis les libres, puis ceux des collègues. À l'intérieur,
  // les secteurs les plus avancés en tête : on finit ce qu'on a commencé.
  const liste = [...(secteurs.data ?? [])].sort((a, b) => {
    const rang = (s: Avancement) => (s.suggere_a === user?.id ? 0 : s.suggere_a ? 2 : 1);
    if (rang(a) !== rang(b)) return rang(a) - rang(b);
    return Number(b.verifies) - Number(a.verifies);
  });

  const mien = (s: Avancement) => s.suggere_a === user?.id;
  const restantAVerifier = (s: Avancement) => Math.max(0, (s.total_connu ?? 0) - Number(s.verifies));
  const restantAAppeler = (s: Avancement) => Math.max(0, Number(s.cibles) - Number(s.appeles));
  const epuise = (s: Avancement) => (s.total_connu ?? 0) > 0 && restantAVerifier(s) === 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Map className="h-6 w-6" /> Secteurs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Un métier, une commune, un nombre réel d'entreprises. On sait où on en est, et quand un secteur est fini.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Métier</Label>
            <select value={naf} onChange={(e) => setNaf(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-2 text-sm">
              {TRADES.map((t) => <option key={t.id} value={t.naf}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ville de départ</Label>
            <Input value={ville} onChange={(e) => setVille(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rayon</Label>
            <div className="flex gap-1">
              {RAYONS.map((r) => (
                <button key={r} type="button" onClick={() => setRayon(r)}
                  className={cn("h-9 px-2.5 rounded-md border text-xs",
                    rayon === r ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}>
                  {r} km
                </button>
              ))}
            </div>
          </div>
          <Button disabled={decouper.isPending} onClick={() => decouper.mutate()} className="gap-1.5">
            {decouper.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Map className="h-4 w-4" />}
            Découper
          </Button>
        </CardContent>
      </Card>

      {secteurs.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!secteurs.isLoading && liste.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun secteur pour l'instant. Choisis un métier et une ville, puis « Découper » : chaque commune
          alentour devient un secteur avec son nombre réel d'entreprises.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {liste.map((s) => {
          const total = s.total_connu ?? 0;
          const pct = total > 0 ? Math.min(100, Math.round((Number(s.verifies) / total) * 100)) : 0;
          return (
            <Card key={s.id} className={cn(
              mien(s) && "border-primary ring-1 ring-primary/30",
              epuise(s) && "opacity-60",
            )}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-tight truncate">{s.commune}</h3>
                    <p className="text-xs text-muted-foreground truncate">{s.metier}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {epuise(s) && <Badge variant="outline" className="text-[10px]">terminé</Badge>}
                    {s.suggere_a && !mien(s) && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-400">
                        {s.suggere_nom ?? "pris"}
                      </Badge>
                    )}
                    <Button size="sm" variant={mien(s) ? "outline" : "default"} className="h-7 text-xs gap-1"
                      disabled={prendre.isPending}
                      onClick={() => prendre.mutate({ id: s.id, mien: mien(s) })}>
                      {mien(s) ? <><Check className="h-3 w-3" /> à moi</> : "Je prends"}
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {Number(s.verifies)} vérifiés sur {total.toLocaleString("fr-FR")}
                    {restantAVerifier(s) > 0 && <> · <b className="text-foreground">{restantAVerifier(s)} à vérifier</b></>}
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5 text-rose-600" />
                    <b>{Number(s.cibles)}</b> cible{Number(s.cibles) > 1 ? "s" : ""}</span>
                  <span className="text-muted-foreground">{Number(s.au_crm)} au CRM</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <PhoneCall className="h-3.5 w-3.5" />{Number(s.appeles)} appelés</span>
                  {restantAAppeler(s) > 0 && (
                    <span className="text-emerald-700 dark:text-emerald-500 font-medium">
                      {restantAAppeler(s)} à appeler
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
