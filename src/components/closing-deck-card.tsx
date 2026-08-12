/**
 * ─── Les diapositives du 3e appel ─────────────────────────────────────
 *
 * Ce qu'on PARTAGE à l'écran au rendez-vous de la décision — à ne pas
 * confondre avec la fiche de préparation juste au-dessus, qui reste privée
 * et nomme franchement ce qui bloque.
 *
 * Sept diapos, dans l'ordre d'une décision : ce dont on a convenu, ce qu'il
 * obtient, le calendrier, le budget, ce qu'on attend de lui, ce qui se passe
 * après, et la question. Les prix et les délais ne sont pas écrits par l'IA :
 * ils viennent du catalogue, recopiés tels quels.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Presentation, Loader2, Sparkles, Maximize2, X, ChevronLeft, ChevronRight,
  AlertTriangle, Check,
} from "lucide-react";

type Option = { id: string; label: string; prix: number };
type Diapos = {
  titre: string; sous_titre: string;
  convenu: string[]; obtient: string[]; apres: string[]; sa_part: string[];
  phrase_finale: string;
  prix: { base: string; options: Option[]; total_options: number; mention: string };
  etapes: { etape: string; detail: string }[];
  engagements: string[];
};

const eur = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Le catalogue d'options, pour cocher ce qui a été retenu avec lui. */
const CATALOGUE: { id: string; label: string }[] = [
  { id: "resa", label: "Réservation en ligne" },
  { id: "paiement", label: "Paiement en ligne" },
  { id: "boutique", label: "Boutique" },
  { id: "avis", label: "Avis clients" },
  { id: "blog", label: "Blog / actualités" },
  { id: "newsletter", label: "Newsletter" },
  { id: "membre", label: "Espace membre" },
  { id: "compta", label: "Lien comptabilité" },
  { id: "chatbot", label: "Assistant en ligne" },
  { id: "multilingue", label: "Multilingue" },
];

export function ClosingDeckCard({ prospect }: { prospect: { id: string; company: string | null } }) {
  const qc = useQueryClient();
  const [retenues, setRetenues] = useState<string[]>([]);
  const [plein, setPlein] = useState(false);
  const [n, setN] = useState(0);

  const deck = useQuery({
    queryKey: ["closing-deck", prospect.id],
    queryFn: async () => {
      const { data } = await supabase.from("closing_decks" as any)
        .select("id, diapos, options_retenues, cree_le")
        .eq("prospect_id", prospect.id).order("cree_le", { ascending: false }).limit(1).maybeSingle();
      return data as any;
    },
  });

  const generer = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("closing-deck", {
        body: { prospect_id: prospect.id, options_retenues: retenues },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { diapos: Diapos; alerte: string[] | null };
    },
    onSuccess: (d) => {
      if (d.alerte?.length) {
        toast.warning("Relis ces passages avant de projeter", {
          description: d.alerte.slice(0, 2).join(" · "), duration: 12000,
        });
      } else {
        toast.success("Présentation prête");
      }
      qc.invalidateQueries({ queryKey: ["closing-deck", prospect.id] });
    },
    onError: (e: Error) => toast.error("Génération impossible", { description: e.message }),
  });

  const d: Diapos | null = deck.data?.diapos ?? null;
  const pages = d ? construirePages(d, prospect.company) : [];

  const basculer = (id: string) =>
    setRetenues((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  return (
    <>
      <Card className="border-sky-500/25">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Presentation className="h-4 w-4 text-sky-600" /> Diapositives du 3ᵉ appel
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ce qu'on partage à l'écran pendant le rendez-vous de la décision.
                Aucune objection n'y figure — elles restent dans la fiche privée.
              </p>
            </div>
            {d && (
              <Button size="sm" variant="outline" className="gap-1.5"
                onClick={() => { setN(0); setPlein(true); }}>
                <Maximize2 className="h-4 w-4" /> Projeter
              </Button>
            )}
          </div>

          {/* ── Ce qui a été retenu avec lui ── */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Options retenues avec lui — elles apparaîtront chiffrées sur la diapo du budget :
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CATALOGUE.map((o) => (
                <button key={o.id} type="button" onClick={() => basculer(o.id)}
                  className={cn("h-7 px-2.5 rounded-md border text-xs transition",
                    retenues.includes(o.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent")}>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Rien de coché = on présente la base seule.
            </p>
          </div>

          <Button size="sm" disabled={generer.isPending} onClick={() => generer.mutate()} className="gap-1.5">
            {generer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {d ? "Refaire la présentation" : "Créer la présentation"}
          </Button>

          {/* ── Aperçu ── */}
          {d && (
            <div className="rounded-lg border divide-y">
              {pages.map((p, i) => (
                <button key={i} type="button" onClick={() => { setN(i); setPlein(true); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted/40 transition flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  <span className="text-sm font-medium truncate">{p.titre}</span>
                </button>
              ))}
            </div>
          )}

          {!d && !generer.isPending && (
            <p className="text-sm text-muted-foreground">
              Aucune présentation encore. Coche ce qui a été retenu, puis crée-la —
              elle reprend le récap du 2ᵉ rendez-vous et l'offre exacte.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Plein écran ── */}
      {plein && d && (
        <div className="fixed inset-0 z-50 bg-[#0B1220] text-white flex flex-col"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setN((x) => Math.min(x + 1, pages.length - 1));
            if (e.key === "ArrowLeft") setN((x) => Math.max(x - 1, 0));
            if (e.key === "Escape") setPlein(false);
          }} tabIndex={0} ref={(el) => el?.focus()}>
          <div className="flex items-center justify-between px-6 py-4 text-white/50 text-xs">
            <span>{prospect.company}</span>
            <span>{n + 1} / {pages.length}</span>
            <button onClick={() => setPlein(false)} className="hover:text-white transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 sm:px-16 py-6 flex items-center">
            <div className="w-full max-w-3xl mx-auto">{pages[n]?.contenu}</div>
          </div>

          <div className="flex items-center justify-between px-6 py-5">
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10"
              disabled={n === 0} onClick={() => setN((x) => x - 1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex gap-1.5">
              {pages.map((_, i) => (
                <button key={i} onClick={() => setN(i)}
                  className={cn("h-1.5 rounded-full transition-all",
                    i === n ? "w-6 bg-white" : "w-1.5 bg-white/25 hover:bg-white/50")} />
              ))}
            </div>
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10"
              disabled={n === pages.length - 1} onClick={() => setN((x) => x + 1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function construirePages(d: Diapos, entreprise: string | null) {
  const T = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-5">{children}</p>
  );
  const Liste = ({ items }: { items: string[] }) => (
    <ul className="space-y-3.5">
      {(items ?? []).map((x, i) => (
        <li key={i} className="flex gap-3 text-lg sm:text-xl leading-snug">
          <Check className="h-5 w-5 mt-1 shrink-0 text-sky-400" />
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );

  return [
    {
      titre: d.titre,
      contenu: (
        <div>
          <p className="text-sm text-white/40 mb-3">{entreprise}</p>
          <h1 className="text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight">{d.titre}</h1>
          <p className="text-xl text-white/60 mt-5 leading-snug">{d.sous_titre}</p>
        </div>
      ),
    },
    {
      titre: "Ce dont on a convenu",
      contenu: <div><T>Ce dont on a convenu</T><Liste items={d.convenu} /></div>,
    },
    {
      titre: "Ce que vous obtenez",
      contenu: <div><T>Ce que vous obtenez</T><Liste items={d.obtient} /></div>,
    },
    {
      titre: "Le déroulé",
      contenu: (
        <div>
          <T>Le déroulé</T>
          <ol className="space-y-5">
            {(d.etapes ?? []).map((e, i) => (
              <li key={i} className="flex gap-4">
                <span className="h-8 w-8 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-sm font-semibold shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xl font-medium leading-snug">{e.etape}</p>
                  <p className="text-white/55 mt-1 leading-snug">{e.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      titre: "Le budget",
      contenu: (
        <div>
          <T>Le budget</T>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-5xl sm:text-6xl font-semibold tracking-tight">{d.prix?.base}</span>
            <span className="text-white/50 text-lg">pour le site</span>
          </div>
          <p className="text-white/45 mt-2">{d.prix?.mention}</p>

          {(d.prix?.options ?? []).length > 0 && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-4">
                Ce qu'on a retenu ensemble
              </p>
              <ul className="space-y-2.5">
                {d.prix.options.map((o) => (
                  <li key={o.id} className="flex justify-between gap-4 text-lg">
                    <span className="text-white/85">{o.label}</span>
                    <span className="tabular-nums text-white/60">{eur(o.prix)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between gap-4 mt-5 pt-4 border-t border-white/10 text-xl font-semibold">
                <span>Total des options</span>
                <span className="tabular-nums">{eur(d.prix.total_options)}</span>
              </div>
            </div>
          )}

          <ul className="mt-8 space-y-2 text-sm text-white/50">
            {(d.engagements ?? []).map((e, i) => <li key={i}>— {e}</li>)}
          </ul>
        </div>
      ),
    },
    {
      titre: "Ce qu'on attend de vous",
      contenu: <div><T>Ce qu'on attend de vous</T><Liste items={d.sa_part} /></div>,
    },
    {
      titre: "La suite",
      contenu: (
        <div>
          <T>À partir de votre accord</T>
          <Liste items={d.apres} />
          <p className="text-2xl sm:text-3xl leading-snug mt-12 border-t border-white/10 pt-8">
            {d.phrase_finale}
          </p>
        </div>
      ),
    },
  ];
}
