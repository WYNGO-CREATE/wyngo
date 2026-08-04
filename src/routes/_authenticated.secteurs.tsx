/**
 * ─── Missions & carte de conquête ─────────────────────────────────────
 *
 * Une mission = un métier × une ville, ATTRIBUÉE automatiquement. Personne ne
 * réserve rien à la main : la protection contre les doublons existe déjà
 * ailleurs (ce qui entre au CRM devient inaccessible aux autres, et la mémoire
 * de chasse les écarte). Ce qui manquait, c'était de dire à chacun où aller.
 *
 * Une mission se ferme quand toutes ses cibles — entreprises sans site ou au
 * site obsolète — ont été appelées. La suivante arrive aussitôt.
 *
 * La carte montre les territoires pris par l'équipe : ce qui est en cours, et
 * ce qui est conquis. C'est le seul endroit où l'on voit le travail
 * s'accumuler.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TRADES } from "@/lib/trades-catalog";
import { FRANCE_METRO, CORSE } from "@/lib/france-outline";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Flag, Target, PhoneCall, Trophy, Compass } from "lucide-react";

export const Route = createFileRoute("/_authenticated/secteurs")({
  component: Missions,
  head: () => ({ meta: [{ title: "Missions — Group Arsène Workspace" }] }),
});

type Mission = {
  id: string; metier: string; commune: string; total_connu: number | null;
  verifies: number; cibles: number; appelees: number; etat: string;
  region: string | null; nouvelle: boolean;
};
type Conquete = {
  commune: string; metier: string; lat: number; lng: number;
  par: string; conquise_le: string | null; etat: string;
};

const RAYONS = [10, 20, 30, 40];

// Couleur par collaborateur, stable d'une session à l'autre.
const TEINTES = ["#1B4BE3", "#0F766E", "#B45309", "#7C3AED", "#BE123C"];
const teinte = (nom: string) => {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) % 997;
  return TEINTES[h % TEINTES.length];
};

/**
 * Projection très simple de la France métropolitaine sur un rectangle.
 * Suffisante pour situer des villes les unes par rapport aux autres — on ne
 * fait pas de cartographie, on montre une progression.
 */
const BORNES = { latMin: 41.3, latMax: 51.1, lngMin: -5.2, lngMax: 9.6 };
const projeter = (lat: number, lng: number) => ({
  x: ((lng - BORNES.lngMin) / (BORNES.lngMax - BORNES.lngMin)) * 100,
  y: ((BORNES.latMax - lat) / (BORNES.latMax - BORNES.latMin)) * 105,
});

/** Un contour lat/lng → la liste de points attendue par <polygon>. */
const trace = (pts: [number, number][]) =>
  pts.map(([lng, lat]) => { const p = projeter(lat, lng); return `${p.x},${p.y}`; }).join(" ");

function Missions() {
  const qc = useQueryClient();
  const [naf, setNaf] = useState(TRADES[0]?.naf ?? "");
  const [ville, setVille] = useState("Toulouse");
  const [rayon, setRayon] = useState(30);

  const mission = useQuery({
    queryKey: ["mission-courante"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("mission_courante");
      if (error) throw new Error(error.message);
      return ((data || [])[0] ?? null) as Mission | null;
    },
  });

  const carte = useQuery({
    queryKey: ["carte-conquetes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("carte_conquetes");
      if (error) throw new Error(error.message);
      return (data || []) as Conquete[];
    },
  });

  // Une mission est une proposition : on doit pouvoir la refuser sans se
  // justifier. Le territoire redevient libre pour quelqu'un d'autre.
  const passer = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("mission_passer");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Mission passée — on t'en propose une autre.");
      qc.invalidateQueries({ queryKey: ["mission-courante"] });
      qc.invalidateQueries({ queryKey: ["carte-conquetes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const regions = useQuery({
    queryKey: ["conquete-regions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("conquete_par_region");
      if (error) throw new Error(error.message);
      return (data || []) as { region: string; missions: number; conquises: number; villes_total: number }[];
    },
  });

  const ouvrirTerritoire = useMutation({
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
      toast.success(`${r.crees} missions ouvertes · ${r.total_entreprises.toLocaleString("fr-FR")} entreprises`);
      qc.invalidateQueries({ queryKey: ["mission-courante"] });
      qc.invalidateQueries({ queryKey: ["carte-conquetes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const m = mission.data;
  const restantAAppeler = m ? Math.max(0, Number(m.cibles) - Number(m.appelees)) : 0;
  const restantAVerifier = m ? Math.max(0, (m.total_connu ?? 0) - Number(m.verifies)) : 0;
  const pct = m && (m.total_connu ?? 0) > 0
    ? Math.min(100, Math.round((Number(m.verifies) / (m.total_connu ?? 1)) * 100)) : 0;

  const conquises = (carte.data ?? []).filter((c) => c.etat === "conquise");
  const enCours = (carte.data ?? []).filter((c) => c.etat === "en_cours");

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="h-6 w-6" /> Missions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Un métier, une ville. La mission se ferme quand toutes les cibles ont été appelées — et la suivante arrive.
        </p>
      </div>

      {/* ─── Ma mission ─── */}
      {mission.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!mission.isLoading && !m && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Aucune mission disponible pour le moment.
          </CardContent>
        </Card>
      )}

      {m && (
        <Card className="border-primary ring-1 ring-primary/25">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Ta mission</p>
                <h2 className="text-xl font-bold mt-0.5">{m.metier} à {m.commune}</h2>
                <p className="text-sm text-muted-foreground">
                  {m.region}
                  {m.total_connu != null
                    ? ` · ${m.total_connu.toLocaleString("fr-FR")} entreprises sur le secteur`
                    : " · taille du secteur connue après la première chasse"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px]"><Flag className="h-3 w-3 mr-1" /> en cours</Badge>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
                  disabled={passer.isPending} onClick={() => passer.mutate()}>
                  {passer.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Passer mon tour"}
                </Button>
              </div>
            </div>

            {/* La barre n'a de sens que si l'on connaît la taille du secteur —
                ce n'est le cas qu'après une première chasse. */}
            {m.total_connu != null ? (
              <div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {Number(m.verifies)} vérifiées sur {m.total_connu.toLocaleString("fr-FR")}
                  {restantAVerifier > 0 && <> · <b className="text-foreground">{restantAVerifier} à vérifier dans la chasse</b></>}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {Number(m.verifies)} entreprise{Number(m.verifies) > 1 ? "s" : ""} vérifiée{Number(m.verifies) > 1 ? "s" : ""} pour l'instant.
              </p>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-rose-600" /><b>{Number(m.cibles)}</b> cible{Number(m.cibles) > 1 ? "s" : ""} trouvée{Number(m.cibles) > 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <PhoneCall className="h-4 w-4" />{Number(m.appelees)} appelée{Number(m.appelees) > 1 ? "s" : ""}
              </span>
              {restantAAppeler > 0 && (
                <span className="font-medium text-emerald-700 dark:text-emerald-500">{restantAAppeler} à appeler</span>
              )}
            </div>

            <p className="text-xs text-muted-foreground border-t pt-3">
              Lance la chasse sur <b>{m.metier}</b> à <b>{m.commune}</b> pour révéler les cibles,
              puis appelle-les. La mission se ferme toute seule quand il n'en reste plus.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Ouvrir un territoire à la main ───
          Les missions arrivent toutes seules ; ceci ne sert qu'à forcer une
          zone précise — un déplacement, une opportunité, une demande. */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Les missions se génèrent seules. Ce bloc ne sert qu'à <b>forcer une zone précise</b> :
            il découpe la ville et ses alentours en missions, avec le nombre réel d'entreprises.
          </p>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
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
          <Button disabled={ouvrirTerritoire.isPending} onClick={() => ouvrirTerritoire.mutate()} className="gap-1.5">
            {ouvrirTerritoire.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
            Ouvrir le territoire
          </Button>
        </div>
        </CardContent>
      </Card>

      {/* ─── Carte de conquête ─── */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4" /> Carte de conquête</h2>
            <p className="text-xs text-muted-foreground">
              <b className="text-foreground">{conquises.length}</b> territoire{conquises.length > 1 ? "s" : ""} conquis ·{" "}
              {enCours.length} en cours
            </p>
          </div>

          <div className="relative w-full rounded-lg border bg-muted/20 overflow-hidden">
            <svg viewBox="0 0 100 105" className="w-full h-auto block">
              {/* Le pays, pour qu'on sache où l'on est. */}
              <polygon points={trace(FRANCE_METRO)}
                className="fill-muted/50 stroke-muted-foreground/40" strokeWidth={0.35} />
              <polygon points={trace(CORSE)}
                className="fill-muted/50 stroke-muted-foreground/40" strokeWidth={0.35} />

              {(carte.data ?? []).map((c, i) => {
                const p = projeter(c.lat, c.lng);
                const fini = c.etat === "conquise";
                return (
                  <circle
                    key={`${c.commune}-${c.metier}-${i}`}
                    cx={p.x} cy={p.y} r={fini ? 1.5 : 1.1}
                    fill={fini ? teinte(c.par) : "transparent"}
                    stroke={teinte(c.par)}
                    strokeWidth={0.6}
                    opacity={fini ? 1 : 0.65}
                  >
                    <title>{`${c.metier} à ${c.commune} — ${fini ? "conquis" : "en cours"} par ${c.par}`}</title>
                  </circle>
                );
              })}
            </svg>

            {(carte.data ?? []).length === 0 && (
              <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground px-6 text-center">
                Aucun territoire ouvert. La carte se remplira au fil des missions.
              </div>
            )}
          </div>

          {/* Avancement région par région : la vue d'ensemble que la carte
              seule ne donne pas. */}
          {(regions.data ?? []).some((r) => Number(r.missions) > 0) && (
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-xs border-t pt-3">
              {(regions.data ?? []).filter((r) => Number(r.missions) > 0).map((r) => (
                <div key={r.region} className="flex items-baseline justify-between gap-2">
                  <span className="truncate">{r.region}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {Number(r.conquises)}/{Number(r.missions)} · {Number(r.villes_total)} villes
                  </span>
                </div>
              ))}
            </div>
          )}

          {conquises.length > 0 && (
            <div className="space-y-1.5">
              {conquises.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: teinte(c.par) }} />
                  <b>{c.metier} à {c.commune}</b>
                  <span className="text-muted-foreground text-xs">— conquis par {c.par}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
