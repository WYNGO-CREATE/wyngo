/**
 * ─── Radiographie du marché, dans le Mode appel ───────────────────────
 *
 * Ce que pèse RÉELLEMENT le marché du prospect, et les arguments qui portent
 * sur lui. À ne pas confondre avec l'analyse concurrentielle juste au-dessus :
 * celle-ci ne nomme personne et ne coûte rien — elle compte, elle ne piste pas.
 *
 * Deux principes tiennent tout l'écran :
 *
 *   • Les chiffres locaux sont MESURÉS dans la base officielle des
 *     entreprises, pas estimés. « 70 boulangeries à Albi » est vrai et
 *     vérifiable ; « un boulanger avec un site gagne X » ne l'est pas.
 *
 *   • Chaque chiffre national affiche SA SOURCE, à l'écran, sous les yeux de
 *     celui qui appelle. S'il ne peut pas répondre à « ça vient d'où ? », il
 *     ne doit pas le dire.
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Activity, Loader2, MapPin, Quote, AlertTriangle, HelpCircle, Ban, Lightbulb,
} from "lucide-react";

type Argument = {
  axe: string; dit: string; question: string;
  fig: string | null; txt: string | null; source: string | null;
};
type Fiche = {
  entreprise: string | null; metier: string | null; ville: string | null;
  naf: string | null; identite_par: string | null;
  partage_le_code_avec: string[];
  marche: {
    commune: number | null; departement: number | null; departement_code: string | null;
    france: number | null; france_plafonne: boolean;
  } | null;
  angle: string; ouverture: string;
  arguments: Argument[]; sans_chiffre: string[]; a_eviter: string[];
};

const AXES: Record<string, { label: string; classe: string }> = {
  trouve:      { label: "Être trouvé",     classe: "bg-sky-500/12 text-sky-700 dark:text-sky-400" },
  credibilite: { label: "Crédibilité",     classe: "bg-violet-500/12 text-violet-700 dark:text-violet-400" },
  temps:       { label: "Temps gagné",     classe: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  recrutement: { label: "Recrutement",     classe: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  maitrise:    { label: "Maîtrise",        classe: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-400" },
  resilience:  { label: "Indépendance",    classe: "bg-teal-500/12 text-teal-700 dark:text-teal-400" },
  chiffre:     { label: "Chiffre d'affaires", classe: "bg-rose-500/12 text-rose-700 dark:text-rose-400" },
};

const nb = (n: number | null | undefined) =>
  typeof n === "number" ? n.toLocaleString("fr-FR") : "—";

export function RadiographiePanel({ prospectId, metier, ville }: {
  prospectId?: string; metier?: string | null; ville?: string | null;
}) {
  const [chargement, setChargement] = useState(false);
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [manuel, setManuel] = useState({ metier: metier ?? "", ville: ville ?? "" });

  const lancer = async () => {
    setChargement(true); setFiche(null);
    const corps = prospectId
      ? { prospect_id: prospectId, metier: manuel.metier || undefined, ville: manuel.ville || undefined }
      : { metier: manuel.metier, ville: manuel.ville };
    const { data, error } = await supabase.functions.invoke("radiographie-marche", { body: corps });
    setChargement(false);
    if (error || (data as { error?: string })?.error) {
      toast.error("Analyse impossible", { description: error?.message || (data as { error?: string })?.error });
      return;
    }
    const d = data as { fiche: Fiche; alerte: string[] | null };
    setFiche(d.fiche);
    if (d.alerte?.length) {
      toast.warning("Relis ces passages", { description: d.alerte.slice(0, 2).join(" · "), duration: 10000 });
    }
  };

  const m = fiche?.marche;

  return (
    <div className="rounded-lg border border-sky-200 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20 p-4 mb-5 space-y-3">
      <p className="text-xs uppercase tracking-wide font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5" /> Radiographie du marché
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[11px]">Métier</Label>
          <Input className="h-8 text-sm" placeholder="Ex : boulangerie"
            value={manuel.metier} onChange={(e) => setManuel((o) => ({ ...o, metier: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Ville</Label>
          <Input className="h-8 text-sm" placeholder="Ex : Albi"
            value={manuel.ville} onChange={(e) => setManuel((o) => ({ ...o, ville: e.target.value }))} />
        </div>
      </div>

      <Button onClick={lancer} disabled={chargement || (!prospectId && !manuel.metier)}
        className="w-full gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white">
        {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
        {chargement ? "Mesure du marché en cours…" : fiche ? "Relancer" : "Analyser son marché"}
      </Button>

      {fiche && (
        <div className="space-y-3">
          {/* ── Ce qu'on a mesuré ── */}
          {m?.commune != null && (
            <div className="rounded-md border bg-background/70 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-2">
                <MapPin className="h-3 w-3" /> Mesuré à l'instant · base officielle des entreprises
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[[nb(m.commune), fiche.ville], [nb(m.departement), `département ${m.departement_code ?? ""}`],
                  [m.france_plafonne ? "10 000+" : nb(m.france), "France"]].map(([v, l], i) => (
                  <div key={i}>
                    <p className="text-xl font-semibold tabular-nums leading-none">{v}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{l}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2.5">
                Établissements sous le code {fiche.naf}
                {fiche.partage_le_code_avec?.length > 0 && (
                  <>
                    {" "}— <b>ce code couvre aussi {fiche.partage_le_code_avec.slice(0, 3).join(", ")}</b>.
                    Dis « établissements du même code », jamais « {fiche.metier}s ».
                  </>
                )}
              </p>
            </div>
          )}

          <div className="rounded-md border bg-background/70 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">L'angle</p>
            <p className="text-sm leading-relaxed">{fiche.angle}</p>
          </div>

          <div className="rounded-md border bg-background/70 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-1.5">
              <Quote className="h-3 w-3" /> Les 20 premières secondes
            </p>
            <p className="text-sm leading-relaxed italic">« {fiche.ouverture} »</p>
          </div>

          {/* ── Les arguments, chacun avec sa source ── */}
          <div className="space-y-2">
            {fiche.arguments.map((a, i) => (
              <div key={i} className="rounded-md border bg-background/70 p-3">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                    AXES[a.axe]?.classe ?? "bg-muted text-muted-foreground")}>
                    {AXES[a.axe]?.label ?? a.axe}
                  </span>
                  <span className="font-semibold tabular-nums">{a.fig}</span>
                  <span className="text-xs text-muted-foreground flex-1 min-w-0">{a.txt}</span>
                </div>
                <p className="text-sm leading-relaxed">{a.dit}</p>
                <p className="text-sm leading-relaxed mt-1.5 text-muted-foreground flex gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{a.question}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-2">Source : {a.source}</p>
              </div>
            ))}
          </div>

          {fiche.sans_chiffre?.length > 0 && (
            <div className="rounded-md border bg-background/70 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-3 w-3" /> Sans aucun chiffre — souvent ce qui touche le plus
              </p>
              <ul className="text-sm space-y-1.5">
                {fiche.sans_chiffre.map((x, i) => <li key={i} className="leading-relaxed">— {x}</li>)}
              </ul>
            </div>
          )}

          {fiche.a_eviter?.length > 0 && (
            <div className="rounded-md border border-rose-500/25 bg-rose-500/[0.04] p-3">
              <p className="text-[11px] uppercase tracking-wider text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1.5 mb-2">
                <Ban className="h-3 w-3" /> À ne pas dire à celui-là
              </p>
              <ul className="text-sm space-y-1.5">
                {fiche.a_eviter.map((x, i) => <li key={i} className="leading-relaxed">— {x}</li>)}
              </ul>
            </div>
          )}

          {!m?.commune && (
            <p className="text-xs text-amber-700 dark:text-amber-400 flex gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Le marché local n'a pas pu être mesuré pour ce métier — n'avance aucun chiffre de ville.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
