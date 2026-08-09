/**
 * ─── Préparation du 3e appel : celui de la décision ───────────────────
 *
 * Le 2e rendez-vous présente, le 3e décide. Cette fiche est PRIVÉE : elle
 * n'est jamais partagée à l'écran, contrairement au deck. Elle peut donc
 * nommer franchement ce qui bloque chez le prospect — c'est justement ce
 * qu'il faut pour le lever.
 *
 * Le formulaire ne redemande rien de ce que le CRM sait déjà : l'objectif,
 * les objections du 1er rendez-vous, le prix annoncé et le décideur sont lus
 * automatiquement dans le récap du 2e. On ne saisit que CE QUI A CHANGÉ
 * DEPUIS — et c'est précisément ce qui détermine l'appel.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PhoneCall, Loader2, Sparkles, AlertTriangle, Check, ArrowRight,
  MessageSquareQuote, ShieldAlert, Target, HelpCircle,
} from "lucide-react";

type Fiche = {
  diagnostic: string;
  ouverture: string;
  point_a_lever: { quoi: string; comment: string };
  objections: { dit: string; reponse: string; pourquoi?: string }[];
  chemin: string[];
  pieges: string[];
  si_non: string;
  a_verifier: string[];
};

type Situation = {
  reaction?: string; verbatim?: string; blocage?: string; depuis?: string;
  relances?: string; manquant?: string; panier?: string;
  objectif_appel?: string; notes?: string;
};

const REACTIONS = [
  "Enthousiaste", "Intéressé mais prudent", "Réservé",
  "Silencieux depuis", "A demandé un délai", "A demandé une remise",
];

export function ClosingCard({ prospect }: { prospect: { id: string; company: string | null } }) {
  const qc = useQueryClient();
  const [s, setS] = useState<Situation>({});
  const [ouvert, setOuvert] = useState(false);

  const derniere = useQuery({
    queryKey: ["closing-prep", prospect.id],
    queryFn: async () => {
      const { data } = await supabase.from("closing_preps" as any)
        .select("id, fiche, situation, cree_le, issue")
        .eq("prospect_id", prospect.id).order("cree_le", { ascending: false }).limit(1).maybeSingle();
      return data as any;
    },
  });

  const generer = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("closing-prep", {
        body: { prospect_id: prospect.id, situation: s },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { fiche: Fiche; alerte: string[] | null };
    },
    onSuccess: (d) => {
      if (d.alerte?.length) {
        toast.warning("Vérifie ces passages", {
          description: `Le contrôle a laissé passer : ${d.alerte.slice(0, 2).join(" · ")}`,
          duration: 12000,
        });
      } else {
        toast.success("Fiche prête");
      }
      setOuvert(false);
      qc.invalidateQueries({ queryKey: ["closing-prep", prospect.id] });
    },
    onError: (e: Error) => toast.error("Génération impossible", { description: e.message }),
  });

  const marquer = useMutation({
    mutationFn: async (issue: string) => {
      const { error } = await supabase.from("closing_preps" as any)
        .update({ issue, utilise_le: new Date().toISOString() })
        .eq("id", derniere.data?.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Noté."); qc.invalidateQueries({ queryKey: ["closing-prep", prospect.id] }); },
  });

  const f: Fiche | null = derniere.data?.fiche ?? null;
  const champ = (k: keyof Situation, v: string) => setS((x) => ({ ...x, [k]: v }));

  return (
    <Card className="border-amber-500/25">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-amber-600" /> Préparer le 3ᵉ appel
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              L'appel de la décision. Fiche privée — jamais partagée à l'écran.
            </p>
          </div>
          <Button size="sm" variant={f ? "outline" : "default"} onClick={() => setOuvert((v) => !v)}>
            {f ? "Refaire la fiche" : "Préparer"}
          </Button>
        </div>

        {/* ── Ce qui s'est passé depuis le 2e ── */}
        {ouvert && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              On ne redemande pas ce qu'on sait déjà : l'objectif, les objections du 1ᵉʳ rendez-vous,
              le prix annoncé et le décideur sont repris du récap. Saisis seulement ce qui a changé depuis.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs">Sa réaction à la présentation</Label>
              <div className="flex flex-wrap gap-1.5">
                {REACTIONS.map((r) => (
                  <button key={r} type="button" onClick={() => champ("reaction", r)}
                    className={cn("h-7 px-2.5 rounded-md border text-xs transition",
                      s.reaction === r ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Ce qu'il a dit, textuellement</Label>
              <Textarea rows={2} className="text-sm"
                placeholder="Ses mots à lui — c'est la seule source des objections traitées."
                value={s.verbatim ?? ""} onChange={(e) => champ("verbatim", e.target.value)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Ce qui semble bloquer</Label>
                <Input className="text-sm" placeholder="Ex : le prix, son associé"
                  value={s.blocage ?? ""} onChange={(e) => champ("blocage", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Depuis combien de temps</Label>
                <Input className="text-sm" placeholder="Ex : 9 jours"
                  value={s.depuis ?? ""} onChange={(e) => champ("depuis", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Relances déjà faites</Label>
                <Input className="text-sm" placeholder="Ex : un email sans réponse"
                  value={s.relances ?? ""} onChange={(e) => champ("relances", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Qui manque à la décision</Label>
                <Input className="text-sm" placeholder="Ex : son associé Marc"
                  value={s.manquant ?? ""} onChange={(e) => champ("manquant", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Le panier discuté</Label>
                <Input className="text-sm" placeholder="Ex : site 5 pages + prise de RDV"
                  value={s.panier ?? ""} onChange={(e) => champ("panier", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ce que tu veux obtenir</Label>
                <Input className="text-sm" placeholder="Ex : un accord, ou un RDV à trois"
                  value={s.objectif_appel ?? ""} onChange={(e) => champ("objectif_appel", e.target.value)} />
              </div>
            </div>

            <Button size="sm" disabled={generer.isPending} onClick={() => generer.mutate()} className="gap-1.5">
              {generer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Générer la fiche
            </Button>
          </div>
        )}

        {/* ── La fiche ── */}
        {f && !ouvert && (
          <div className="space-y-4">
            <Bloc icone={Target} titre="Où il en est">
              <p className="text-sm leading-relaxed">{f.diagnostic}</p>
            </Bloc>

            <Bloc icone={MessageSquareQuote} titre="Les 30 premières secondes">
              <p className="text-sm leading-relaxed italic">« {f.ouverture} »</p>
            </Bloc>

            <Bloc icone={AlertTriangle} titre="Le point à lever" ton="amber">
              <p className="text-sm font-medium">{f.point_a_lever?.quoi}</p>
              <p className="text-sm leading-relaxed mt-1.5">{f.point_a_lever?.comment}</p>
            </Bloc>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                S'il dit…
              </p>
              <div className="space-y-2.5">
                {(f.objections ?? []).map((o, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">« {o.dit} »</p>
                    <p className="text-sm leading-relaxed mt-1.5 text-muted-foreground">→ {o.reponse}</p>
                    {o.pourquoi && (
                      <p className="text-[11px] mt-1.5 text-muted-foreground/80 italic">{o.pourquoi}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Bloc icone={ArrowRight} titre="Le chemin vers l'accord">
              <ol className="text-sm space-y-1.5 list-decimal list-inside marker:text-muted-foreground">
                {(f.chemin ?? []).map((x, i) => <li key={i} className="leading-relaxed">{x}</li>)}
              </ol>
            </Bloc>

            <Bloc icone={ShieldAlert} titre="À ne pas faire" ton="rose">
              <ul className="text-sm space-y-1.5">
                {(f.pieges ?? []).map((x, i) => <li key={i} className="leading-relaxed">— {x}</li>)}
              </ul>
            </Bloc>

            {(f.a_verifier ?? []).length > 0 && (
              <Bloc icone={HelpCircle} titre="À vérifier pendant l'appel">
                <ul className="text-sm space-y-1">
                  {f.a_verifier.map((x, i) => <li key={i}>— {x}</li>)}
                </ul>
              </Bloc>
            )}

            <Bloc icone={Check} titre="Si c'est non">
              <p className="text-sm leading-relaxed italic">« {f.si_non} »</p>
            </Bloc>

            {/* ── Ce qui s'est réellement passé ── */}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Après l'appel — ça alimente la préparation suivante :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[["signe", "Signé"], ["a_relancer", "À relancer"],
                  ["reporte", "Reporté"], ["refus", "Refus"]].map(([v, l]) => (
                  <Button key={v} size="sm" variant={derniere.data?.issue === v ? "default" : "outline"}
                    className="h-7 text-xs" onClick={() => marquer.mutate(v)}>
                    {l}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!f && !ouvert && (
          <p className="text-sm text-muted-foreground">
            Aucune fiche encore. Prépare-la juste avant d'appeler — elle part de ce qui
            s'est passé depuis le 2ᵉ rendez-vous.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Bloc({ icone: Icone, titre, ton, children }: {
  icone: typeof Target; titre: string; ton?: "amber" | "rose"; children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border p-3.5",
      ton === "amber" && "border-amber-500/30 bg-amber-500/[0.04]",
      ton === "rose" && "border-rose-500/25 bg-rose-500/[0.03]")}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
        <Icone className="h-3.5 w-3.5" /> {titre}
      </p>
      {children}
    </div>
  );
}
