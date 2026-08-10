/**
 * ─── Ce que je gagne ──────────────────────────────────────────────────
 *
 * L'écran d'accueil d'un collaborateur, à la place du Pilotage.
 *
 * Un prospecteur n'a pas besoin de la trésorerie de l'agence — ça ne
 * l'informe pas, et ça ne le regarde pas. Ce qui le fait avancer, c'est de
 * voir ce que son mois lui rapporte, affaire par affaire, et où en sont ses
 * factures.
 *
 * Tout part de son CONTRAT DE PRESTATION : sans contrat rattaché à son
 * compte, il n'y a rien à calculer, et on le dit franchement plutôt que
 * d'afficher des zéros qui ressemblent à une panne.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Euro, ChevronLeft, ChevronRight, TrendingUp, Clock, ShieldCheck,
  ShieldAlert, FileText, Handshake, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/revenus")({
  component: RevenusPage,
  head: () => ({ meta: [{ title: "Mes revenus — Group Arsène" }] }),
});

type Affaire = { client: string; numero: string | null; date: string | null; base: number; commission: number };
type Contrat = {
  id: string; denomination: string; nature: "prospection" | "developpement";
  commission_pct: number | null; base_commission: string;
  mandat_signe_le: string | null; mandat_token: string;
};
type Revenus = {
  contrat: Contrat | null;
  mois: number; affaires: Affaire[];
  annee_encaisse: number; en_attente: number;
};
type Facture = {
  id: string; numero: string | null; periode: string; statut: string;
  total_ttc: number; token: string; emise_le: string | null;
};

const eur = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const moisLabel = (p: string) => {
  const [a, m] = p.split("-");
  return new Date(Number(a), Number(m) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};
const ESPACE = "https://espaceclient.grouparsene.fr";

const ETATS: Record<string, { texte: string; classe: string }> = {
  brouillon: { texte: "En préparation", classe: "bg-muted text-muted-foreground" },
  emise:     { texte: "À valider", classe: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  validee:   { texte: "Validée — en attente de règlement", classe: "bg-sky-500/12 text-sky-700 dark:text-sky-400" },
  contestee: { texte: "Contestée", classe: "bg-rose-500/12 text-rose-700 dark:text-rose-400" },
  payee:     { texte: "Réglée", classe: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
};

function RevenusPage() {
  const [periode, setPeriode] = useState(() => new Date().toISOString().slice(0, 7));

  const revenus = useQuery({
    queryKey: ["mes-revenus", periode],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("mes_revenus" as any, { p_periode: periode });
      if (error) throw new Error(error.message);
      return data as unknown as Revenus;
    },
  });

  const factures = useQuery({
    queryKey: ["mes-factures-prestataire"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prestataire_factures" as any)
        .select("id, numero, periode, statut, total_ttc, token, emise_le")
        .order("periode", { ascending: false }).limit(24);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Facture[];
    },
  });

  const decaler = (n: number) => {
    const [a, m] = periode.split("-").map(Number);
    const d = new Date(a, m - 1 + n, 1);
    setPeriode(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const r = revenus.data;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mes revenus</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ce que votre travail vous rapporte, affaire par affaire.
        </p>
      </div>

      {revenus.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {/* ── Pas encore de contrat rattaché ── */}
      {r && !r.contrat && (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <div className="mx-auto w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
              <Handshake className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="font-semibold">Aucun contrat de prestation rattaché</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Vos commissions se calculent à partir du contrat qui vous lie à Group Arsène.
              Tant qu'il n'est pas enregistré, cette page reste vide — demandez à Hugo de
              créer votre fiche prestataire.
            </p>
          </CardContent>
        </Card>
      )}

      {r?.contrat && (
        <>
          {/* ── Le contrat ── */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Mon contrat
                  </p>
                  <p className="font-medium mt-1">{r.contrat.denomination}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {r.contrat.nature === "prospection"
                      ? <>Commission de <b>{r.contrat.commission_pct} %</b> sur les affaires que
                          j'apporte, {r.contrat.base_commission === "facture_payee"
                            ? "calculée quand le client règle sa facture"
                            : "calculée à l'émission de la facture client"}.</>
                      : "Forfait convenu par mission livrée."}
                  </p>
                </div>
                {r.contrat.mandat_signe_le ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="h-4 w-4" /> Mandat signé
                  </span>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <a href={`${ESPACE}/mandat/${r.contrat.mandat_token}`} target="_blank" rel="noopener">
                      <ShieldAlert className="h-4 w-4 text-amber-600" /> Signer mon mandat
                    </a>
                  </Button>
                )}
              </div>

              {!r.contrat.mandat_signe_le && (
                <div className="mt-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/20 p-3 text-sm flex gap-2.5">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">
                    Ce mandat autorise Group Arsène à établir vos factures à votre place —
                    vous n'avez pas à les rédiger, mais vous validez chacune d'elles.
                    Sans lui, aucune facture ne peut être émise à votre nom.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Le mois ── */}
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => decaler(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium capitalize min-w-[9rem] text-center">{moisLabel(periode)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => decaler(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            <Chiffre icone={Euro} libelle="Ce mois-ci" valeur={eur(r.mois)}
              ton="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              detail={`${r.affaires.length} affaire${r.affaires.length > 1 ? "s" : ""}`} />
            <Chiffre icone={Clock} libelle="En attente de règlement" valeur={eur(r.en_attente)}
              ton="bg-amber-500/15 text-amber-600 dark:text-amber-400"
              detail="factures émises ou validées" />
            <Chiffre icone={TrendingUp} libelle={`Encaissé en ${periode.slice(0, 4)}`} valeur={eur(r.annee_encaisse)}
              ton="bg-sky-500/15 text-sky-600 dark:text-sky-400"
              detail="factures réglées" />
          </div>

          {/* ── D'où vient l'argent ── */}
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                Mes affaires de {moisLabel(periode)}
              </p>
              {r.affaires.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune affaire sur ce mois. Une affaire apparaît ici {r.contrat.base_commission === "facture_payee"
                    ? "le jour où le client règle sa facture"
                    : "dès que sa facture est envoyée au client"}.
                </p>
              ) : (
                <ul className="divide-y -mx-5">
                  {r.affaires.map((a, i) => (
                    <li key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.client}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.numero ? `Facture ${a.numero} · ` : ""}
                          {a.date ? new Date(a.date).toLocaleDateString("fr-FR") : ""}
                          {" · sur "}{eur(a.base)}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
                        {eur(a.commission)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* ── Mes factures ── */}
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                Mes factures
              </p>
              {(factures.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune facture pour l'instant. Group Arsène les établit en votre nom
                  chaque mois ; vous recevez un lien pour les valider.
                </p>
              ) : (
                <ul className="divide-y -mx-5">
                  {(factures.data ?? []).map((f) => (
                    <li key={f.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-sm">
                            {f.numero ? `n° ${f.numero}` : "En préparation"}
                            <span className="text-muted-foreground font-normal"> · {moisLabel(f.periode)}</span>
                          </p>
                          <span className={cn("inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium",
                            ETATS[f.statut]?.classe)}>
                            {ETATS[f.statut]?.texte ?? f.statut}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums">{eur(f.total_ttc)}</span>
                        {f.statut !== "brouillon" && (
                          <Button size="sm" variant="outline" className="h-8" asChild>
                            <a href={`${ESPACE}/note/${f.token}`} target="_blank" rel="noopener">
                              {f.statut === "emise" ? "Vérifier" : "Voir"}
                            </a>
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Chiffre({ icone: Icone, libelle, valeur, detail, ton }: {
  icone: typeof Euro; libelle: string; valeur: string; detail: string; ton: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", ton)}>
            <Icone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{libelle}</p>
            <p className="text-xl font-semibold tabular-nums leading-tight">{valeur}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">{detail}</p>
      </CardContent>
    </Card>
  );
}
