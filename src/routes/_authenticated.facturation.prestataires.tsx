/**
 * ─── Facturation · Prestataires ───────────────────────────────────────
 *
 * Lenny, Ilyes et Lucas prospectent ; Nino développe. Tous en entreprise
 * individuelle : ce sont des prestataires, et c'est à EUX d'émettre une
 * facture. En pratique, personne ne le fait le 3 du mois.
 *
 * On passe donc par l'AUTOFACTURATION (art. 289, I-2 du CGI) : Group Arsène
 * établit la facture au nom du prestataire, qui l'a autorisé par un mandat
 * signé, et qui garde le droit de la contester.
 *
 * Le calcul n'est pas saisi à la main : la commission se déduit des factures
 * clients du mois, rattachées aux prospects que la personne a apportés.
 */

import { AdminSeul } from "@/components/admin-seul";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Link2, FileText, Check,
  ShieldCheck, ShieldAlert, AlertTriangle, Send, Loader2, Copy, Euro, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/facturation/prestataires")({
  component: PageProtegee,
  head: () => ({ meta: [{ title: "Prestataires — Facturation Group Arsène" }] }),
});

type Prestataire = {
  id: string; user_id: string | null; nom_complet: string; denomination: string;
  siret: string | null; adresse: string | null; code_postal: string | null; ville: string | null;
  email: string; iban: string | null; bic: string | null;
  regime_tva: "franchise" | "reel"; taux_tva: number; tva_numero: string | null;
  nature: "prospection" | "developpement";
  commission_pct: number | null; base_commission: "facture_payee" | "facture_emise";
  mandat_token: string; mandat_signe_le: string | null; mandat_signe_par: string | null;
  actif: boolean;
};

type Facture = {
  id: string; prestataire_id: string; numero: string | null; periode: string;
  statut: "brouillon" | "emise" | "validee" | "contestee" | "payee";
  lignes: Ligne[]; total_ht: number; total_tva: number; total_ttc: number;
  emise_le: string | null; validee_le: string | null; contestee_le: string | null;
  motif_contestation: string | null; payee_le: string | null; token: string;
};

type Ligne = { libelle: string; detail?: string; base?: number; taux?: number; montant: number };

const eur = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const moisLabel = (p: string) => {
  const [a, m] = p.split("-");
  return new Date(Number(a), Number(m) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};
const ESPACE = "https://espaceclient.grouparsene.fr";

const ETATS: Record<Facture["statut"], { texte: string; classe: string }> = {
  brouillon: { texte: "Brouillon", classe: "bg-muted text-muted-foreground" },
  emise:     { texte: "En attente de validation", classe: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  validee:   { texte: "Validée", classe: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  contestee: { texte: "Contestée", classe: "bg-rose-500/12 text-rose-700 dark:text-rose-400" },
  payee:     { texte: "Réglée", classe: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300" },
};

function PrestatairesPage() {
  const qc = useQueryClient();
  const [periode, setPeriode] = useState(() => new Date().toISOString().slice(0, 7));
  const [fiche, setFiche] = useState<Partial<Prestataire> | null>(null);

  const prestataires = useQuery({
    queryKey: ["prestataires"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prestataires" as any)
        .select("*").order("nom_complet");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Prestataire[];
    },
  });

  const factures = useQuery({
    queryKey: ["prestataire_factures", periode],
    queryFn: async () => {
      const { data, error } = await supabase.from("prestataire_factures" as any)
        .select("*").eq("periode", periode);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Facture[];
    },
  });

  const decaler = (n: number) => {
    const [a, m] = periode.split("-").map(Number);
    const d = new Date(a, m - 1 + n, 1);
    setPeriode(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const total = useMemo(
    () => (factures.data ?? []).reduce((s, f) => s + Number(f.total_ttc || 0), 0),
    [factures.data],
  );
  const aRegler = useMemo(
    () => (factures.data ?? []).filter((f) => f.statut === "validee")
      .reduce((s, f) => s + Number(f.total_ttc || 0), 0),
    [factures.data],
  );
  const sansMandat = (prestataires.data ?? []).filter((p) => p.actif && !p.mandat_signe_le);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
          <Link to="/facturation"><ArrowLeft className="h-4 w-4" /> Facturation</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prestataires</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vous établissez leurs factures en leur nom, avec leur mandat. Ils valident.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setFiche({ nature: "prospection", regime_tva: "franchise", base_commission: "facture_payee", taux_tva: 20 })}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {sansMandat.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/[0.04]">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">
                {sansMandat.length === 1 ? "Un mandat manque" : `${sansMandat.length} mandats manquent`}
              </p>
              <p className="text-muted-foreground mt-0.5">
                Sans mandat signé, aucune facture ne peut être émise à leur nom — c'est la
                condition de l'article 289 du CGI, et le système la refusera.
                Envoyez le lien à {sansMandat.map((p) => p.nom_complet).join(", ")}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="flex items-center gap-5 text-sm">
            <div>
              <span className="text-muted-foreground">Total du mois </span>
              <span className="font-semibold tabular-nums">{eur(total)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Validé à régler </span>
              <span className="font-semibold tabular-nums">{eur(aRegler)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {prestataires.isLoading && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}

      {prestataires.data?.length === 0 && (
        <Card><CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun prestataire enregistré. Ajoutez Lenny, Ilyes, Lucas et Nino pour commencer.
          </p>
        </CardContent></Card>
      )}

      {(prestataires.data ?? []).map((p) => (
        <FichePrestataire
          key={p.id} p={p} periode={periode}
          facture={(factures.data ?? []).find((f) => f.prestataire_id === p.id) ?? null}
          onEditer={() => setFiche(p)}
          onChange={() => {
            qc.invalidateQueries({ queryKey: ["prestataire_factures", periode] });
            qc.invalidateQueries({ queryKey: ["prestataires"] });
          }}
        />
      ))}

      <DialogFiche
        valeur={fiche} onClose={() => setFiche(null)}
        onSaved={() => { setFiche(null); qc.invalidateQueries({ queryKey: ["prestataires"] }); }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function FichePrestataire({ p, periode, facture, onEditer, onChange }: {
  p: Prestataire; periode: string; facture: Facture | null;
  onEditer: () => void; onChange: () => void;
}) {
  const [apercu, setApercu] = useState<Ligne[] | null>(null);

  // Ce que la personne a apporté sur le mois, calculé en base.
  const commissions = useQuery({
    queryKey: ["commissions", p.id, periode],
    enabled: p.nature === "prospection" && !!p.user_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("prestataire_commissions" as any, {
        p_prestataire: p.id, p_periode: periode,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as { client: string; numero: string; date_ref: string; montant_ht: number; commission: number }[];
    },
  });

  const lignesProposees: Ligne[] = useMemo(() => {
    if (p.nature !== "prospection") return [];
    return (commissions.data ?? []).map((c) => ({
      libelle: `Apport d'affaire — ${c.client}`,
      detail: `Facture client ${c.numero ?? "—"} · ${c.date_ref ?? ""}`,
      base: Number(c.montant_ht), taux: Number(p.commission_pct ?? 0),
      montant: Number(c.commission),
    }));
  }, [commissions.data, p]);

  const creer = useMutation({
    mutationFn: async (lignes: Ligne[]) => {
      const ht = lignes.reduce((s, l) => s + Number(l.montant || 0), 0);
      const tva = p.regime_tva === "franchise" ? 0 : Math.round(ht * Number(p.taux_tva) / 100 * 100) / 100;
      const { error } = await supabase.from("prestataire_factures" as any).insert({
        prestataire_id: p.id, periode, lignes: lignes as any,
        total_ht: ht, total_tva: tva, total_ttc: ht + tva, statut: "brouillon",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Brouillon créé"); setApercu(null); onChange(); },
    onError: (e: Error) => toast.error("Création impossible", { description: e.message }),
  });

  // Toutes les affaires ne passent pas par le CRM : un deal trouvé au
  // téléphone, une recommandation, un dépannage. On doit pouvoir porter une
  // ligne à la main — sinon il faudrait fabriquer un faux prospect pour que
  // le calcul tombe juste.
  const ajouterLigne = useMutation({
    mutationFn: async (ligne: Ligne) => {
      const lignes = [...(facture?.lignes ?? []), ligne];
      const ht = lignes.reduce((s, l) => s + Number(l.montant || 0), 0);
      const tva = p.regime_tva === "franchise" ? 0 : Math.round(ht * Number(p.taux_tva) / 100 * 100) / 100;
      if (facture) {
        const { error } = await supabase.from("prestataire_factures" as any)
          .update({ lignes: lignes as any, total_ht: ht, total_tva: tva, total_ttc: ht + tva })
          .eq("id", facture.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("prestataire_factures" as any).insert({
          prestataire_id: p.id, periode, lignes: lignes as any,
          total_ht: ht, total_tva: tva, total_ttc: ht + tva, statut: "brouillon",
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => { toast.success("Ligne ajoutée"); onChange(); },
    onError: (e: Error) => toast.error("Ajout impossible", { description: e.message }),
  });

  const retirerLigne = useMutation({
    mutationFn: async (index: number) => {
      const lignes = (facture?.lignes ?? []).filter((_, i) => i !== index);
      const ht = lignes.reduce((s, l) => s + Number(l.montant || 0), 0);
      const tva = p.regime_tva === "franchise" ? 0 : Math.round(ht * Number(p.taux_tva) / 100 * 100) / 100;
      const { error } = await supabase.from("prestataire_factures" as any)
        .update({ lignes: lignes as any, total_ht: ht, total_tva: tva, total_ttc: ht + tva })
        .eq("id", facture!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => onChange(),
    onError: (e: Error) => toast.error("Suppression impossible", { description: e.message }),
  });

  const changerStatut = useMutation({
    mutationFn: async (modif: Record<string, unknown>) => {
      const { error } = await supabase.from("prestataire_factures" as any)
        .update(modif).eq("id", facture!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => onChange(),
    onError: (e: Error) => toast.error("Refusé", { description: e.message }),
  });

  const copier = (url: string, quoi: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success(`Lien ${quoi} copié`),
      () => toast.error("Copie impossible"),
    );
  };

  const totalPropose = lignesProposees.reduce((s, l) => s + l.montant, 0);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{p.nom_complet}</h3>
              <Badge variant="secondary" className="text-[11px]">
                {p.nature === "prospection" ? `Commission ${p.commission_pct ?? 0} %` : "Forfait par mission"}
              </Badge>
              {p.mandat_signe_le ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Mandat signé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                  <ShieldAlert className="h-3.5 w-3.5" /> Mandat non signé
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {p.denomination}{p.siret ? ` · SIRET ${p.siret}` : ""} · {p.email}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="h-8 gap-1.5"
              onClick={() => copier(`${ESPACE}/mandat/${p.mandat_token}`, "du mandat")}>
              <Link2 className="h-3.5 w-3.5" /> Mandat
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={onEditer}>Modifier</Button>
          </div>
        </div>

        {/* ── Sa facture du mois ── */}
        {facture ? (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {facture.numero ? `Facture n° ${facture.numero}` : "Brouillon"}
                </span>
                <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", ETATS[facture.statut].classe)}>
                  {ETATS[facture.statut].texte}
                </span>
              </div>
              <span className="font-semibold tabular-nums">{eur(facture.total_ttc)}</span>
            </div>

            {facture.statut === "contestee" && (
              <div className="rounded-md bg-rose-500/[0.06] border border-rose-500/20 p-3 text-sm">
                <p className="font-medium text-rose-700 dark:text-rose-400">Contestée</p>
                <p className="text-muted-foreground mt-0.5">« {facture.motif_contestation} »</p>
              </div>
            )}

            <ul className="text-sm space-y-1">
              {(facture.lignes ?? []).map((l, i) => (
                <li key={i} className="flex justify-between gap-2 items-start">
                  <span className="text-muted-foreground min-w-0">
                    {l.libelle}
                    {l.detail && <span className="block text-[11px] opacity-70">{l.detail}</span>}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="tabular-nums">{eur(l.montant)}</span>
                    {facture.statut === "brouillon" && (
                      <button type="button" title="Retirer cette ligne"
                        className="text-muted-foreground hover:text-destructive transition"
                        onClick={() => retirerLigne.mutate(i)}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {facture.statut === "brouillon" && (
              <LigneLibre onAjouter={(l) => ajouterLigne.mutate(l)} enCours={ajouterLigne.isPending} />
            )}

            <div className="flex gap-1.5 flex-wrap pt-1">
              {facture.statut === "brouillon" && (
                <Button size="sm" className="h-8 gap-1.5" disabled={changerStatut.isPending || !p.mandat_signe_le}
                  onClick={() => changerStatut.mutate({ statut: "emise" })}>
                  <Send className="h-3.5 w-3.5" /> Émettre
                </Button>
              )}
              {facture.statut !== "brouillon" && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5"
                  onClick={() => copier(`${ESPACE}/note/${facture.token}`, "de la facture")}>
                  <Copy className="h-3.5 w-3.5" /> Lien
                </Button>
              )}
              {(facture.statut === "emise" || facture.statut === "validee") && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={changerStatut.isPending}
                  onClick={() => changerStatut.mutate({ statut: "payee", payee_le: new Date().toISOString() })}>
                  <Check className="h-3.5 w-3.5" /> Marquer réglée
                </Button>
              )}
              {facture.statut === "brouillon" && !p.mandat_signe_le && (
                <span className="text-xs text-amber-700 dark:text-amber-400 self-center">
                  Mandat à signer avant l'émission.
                </span>
              )}
            </div>
          </div>
        ) : (
          // Pas encore de facture ce mois-ci. Deux chemins, toujours ouverts
          // tous les deux : ce que le CRM a calculé, et ce qu'on porte à la
          // main pour les affaires qui ne sont pas passées par lui.
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            {p.nature === "prospection" && (
              commissions.isLoading ? (
                <p className="text-sm text-muted-foreground">Calcul des apports du mois…</p>
              ) : lignesProposees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune affaire encaissée à son nom sur {moisLabel(periode)} dans le CRM.
                  {!p.user_id && " Aucun compte CRM n'est rattaché à cette fiche — l'attribution automatique est impossible."}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">
                    <b>{lignesProposees.length}</b> affaire{lignesProposees.length > 1 ? "s" : ""} sur {moisLabel(periode)}
                    {" — commission "}<b className="tabular-nums">{eur(totalPropose)}</b>
                  </p>
                  <ul className="text-sm space-y-1">
                    {lignesProposees.map((l, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-muted-foreground truncate">{l.libelle}</span>
                        <span className="tabular-nums shrink-0">{eur(l.montant)}</span>
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" className="h-8 gap-1.5 mt-1" disabled={creer.isPending}
                    onClick={() => creer.mutate(lignesProposees)}>
                    {creer.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Euro className="h-3.5 w-3.5" />}
                    Préparer la facture
                  </Button>
                </div>
              )
            )}

            {p.nature === "developpement" && (
              <p className="text-sm text-muted-foreground">
                Aucune facture préparée pour {moisLabel(periode)}. Ajoutez la mission livrée.
              </p>
            )}

            <LigneLibre onAjouter={(l) => ajouterLigne.mutate(l)} enCours={ajouterLigne.isPending} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ─── Porter une ligne à la main ────────────────────────────────────────
 *
 * Toutes les affaires ne passent pas par le CRM : un deal décroché au
 * téléphone, une recommandation d'un client, un dépannage un samedi. Sans
 * cette saisie, il faudrait fabriquer un faux prospect pour que le calcul
 * automatique tombe juste — et polluer la base pour une histoire de
 * comptabilité.
 *
 * Deux façons de chiffrer, parce que les deux situations existent :
 *   • un POURCENTAGE sur un montant d'affaire — le cas d'une commission ;
 *   • un MONTANT SEC — une mission au forfait, une prime, un dépannage.
 */
function LigneLibre({ onAjouter, enCours }: {
  onAjouter: (l: Ligne) => void; enCours: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [mode, setMode] = useState<"pourcentage" | "montant">("pourcentage");
  const [libelle, setLibelle] = useState("");
  const [detail, setDetail] = useState("");
  const [base, setBase] = useState("");
  const [taux, setTaux] = useState("");
  const [montant, setMontant] = useState("");

  const calcule = mode === "pourcentage"
    ? Math.round(Number(base) * Number(taux) / 100 * 100) / 100
    : Number(montant);
  const valide = libelle.trim().length > 2 && calcule > 0;

  const reset = () => {
    setLibelle(""); setDetail(""); setBase(""); setTaux(""); setMontant(""); setOuvert(false);
  };

  if (!ouvert) {
    return (
      <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => setOuvert(true)}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une ligne à la main
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
      <p className="text-xs text-muted-foreground">
        Pour une affaire qui n'est pas passée par le CRM — un deal au téléphone,
        une recommandation, un dépannage.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">De quoi s'agit-il</Label>
        <Input className="text-sm" placeholder="Ex : apport d'affaire — Garage Martin"
          value={libelle} onChange={(e) => setLibelle(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Précision (facultatif — elle figurera sur la facture)</Label>
        <Input className="text-sm" placeholder="Ex : trouvé par recommandation, signé le 12 août"
          value={detail} onChange={(e) => setDetail(e.target.value)} />
      </div>

      <div className="flex gap-1.5">
        {([["pourcentage", "Un % sur l'affaire"], ["montant", "Un montant fixe"]] as const).map(([m, l]) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={cn("h-7 px-2.5 rounded-md border text-xs transition",
              mode === m ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}>
            {l}
          </button>
        ))}
      </div>

      {mode === "pourcentage" ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Montant de l'affaire (HT)</Label>
            <Input className="text-sm" type="number" min="0" step="0.01" placeholder="3000"
              value={base} onChange={(e) => setBase(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sa part (%)</Label>
            <Input className="text-sm" type="number" min="0" max="100" step="0.5" placeholder="10"
              value={taux} onChange={(e) => setTaux(e.target.value)} />
          </div>
          <p className="text-sm font-semibold tabular-nums pb-2">
            = {eur(calcule)}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs">Montant HT</Label>
          <Input className="text-sm w-40" type="number" min="0" step="0.01" placeholder="450"
            value={montant} onChange={(e) => setMontant(e.target.value)} />
        </div>
      )}

      <div className="flex gap-1.5">
        <Button size="sm" className="h-8" disabled={!valide || enCours}
          onClick={() => {
            onAjouter({
              libelle: libelle.trim(),
              detail: detail.trim() || undefined,
              base: mode === "pourcentage" ? Number(base) : undefined,
              taux: mode === "pourcentage" ? Number(taux) : undefined,
              montant: calcule,
            });
            reset();
          }}>
          {enCours && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
          Ajouter
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={reset}>Annuler</Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function DialogFiche({ valeur, onClose, onSaved }: {
  valeur: Partial<Prestataire> | null; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = useState<Partial<Prestataire>>({});
  const [init, setInit] = useState<string | null>(null);

  // On recharge le formulaire quand on change de fiche.
  if (valeur && init !== (valeur.id ?? "nouveau")) {
    setInit(valeur.id ?? "nouveau");
    setV(valeur);
  }

  const equipe = useQuery({
    queryKey: ["equipe-pour-prestataires"],
    enabled: !!valeur,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("equipe" as any);
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
    },
  });

  const enregistrer = useMutation({
    mutationFn: async () => {
      const corps = {
        user_id: v.user_id || null,
        nom_complet: (v.nom_complet ?? "").trim(),
        denomination: (v.denomination ?? "").trim(),
        siret: v.siret || null, adresse: v.adresse || null,
        code_postal: v.code_postal || null, ville: v.ville || null,
        email: (v.email ?? "").trim(),
        iban: v.iban || null, bic: v.bic || null,
        regime_tva: v.regime_tva ?? "franchise", taux_tva: v.taux_tva ?? 20,
        tva_numero: v.tva_numero || null,
        nature: v.nature ?? "prospection",
        commission_pct: v.nature === "developpement" ? null : Number(v.commission_pct ?? 0),
        base_commission: v.base_commission ?? "facture_payee",
      };
      const q = v.id
        ? supabase.from("prestataires" as any).update(corps).eq("id", v.id)
        : supabase.from("prestataires" as any).insert(corps);
      const { error } = await q;
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Fiche enregistrée"); onSaved(); },
    onError: (e: Error) => toast.error("Enregistrement impossible", { description: e.message }),
  });

  const ch = (k: keyof Prestataire, x: unknown) => setV((o) => ({ ...o, [k]: x }));
  const denomOk = /(\bEI\b|entrepreneur individuel)/i.test(v.denomination ?? "");

  // Tant que la dénomination n'a pas été touchée, elle suit le nom saisi.
  // Personne n'a envie de retaper « Nino Bondon » puis d'ajouter « EI ».
  const majNom = (x: string) => setV((o) => {
    const suivait = !o.denomination || o.denomination === `${o.nom_complet ?? ""} EI`.trim();
    return { ...o, nom_complet: x, denomination: suivait ? `${x} EI`.trim() : o.denomination };
  });

  return (
    <Dialog open={!!valeur} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{v.id ? "Modifier la fiche" : "Nouveau prestataire"}</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ label="Nom et prénom" value={v.nom_complet} onChange={majNom} />
            <Champ label="Email" value={v.email} onChange={(x) => ch("email", x)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Dénomination sur la facture</Label>
            <Input className="text-sm" placeholder="Ex : Nino Bondon EI"
              value={v.denomination ?? ""} onChange={(e) => ch("denomination", e.target.value)} />
            {denomOk ? (
              <p className="text-[11px] text-muted-foreground">La mention « EI » est bien présente.</p>
            ) : (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Il manque « EI » — obligatoire sur la facture d'un entrepreneur individuel
                depuis le 15/05/2022. Vous pouvez enregistrer quand même, mais aucune facture
                ne pourra être émise tant que la mention n'y est pas.{" "}
                <button type="button" className="underline font-medium"
                  onClick={() => ch("denomination", `${(v.denomination ?? v.nom_complet ?? "").trim()} EI`.trim())}>
                  Ajouter « EI »
                </button>
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Champ label="SIRET" value={v.siret} onChange={(x) => ch("siret", x)} />
            <Champ label="Adresse" value={v.adresse} onChange={(x) => ch("adresse", x)} />
            <Champ label="Code postal" value={v.code_postal} onChange={(x) => ch("code_postal", x)} />
            <Champ label="Ville" value={v.ville} onChange={(x) => ch("ville", x)} />
            <Champ label="IBAN" value={v.iban} onChange={(x) => ch("iban", x)} />
            <Champ label="BIC" value={v.bic} onChange={(x) => ch("bic", x)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Compte CRM rattaché</Label>
            <select className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={v.user_id ?? ""} onChange={(e) => ch("user_id", e.target.value || null)}>
              <option value="">— aucun —</option>
              {(equipe.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              C'est ce lien qui permet d'attribuer les affaires apportées. Sans lui, aucune
              commission ne peut être calculée automatiquement.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nature de la prestation</Label>
            <div className="flex gap-1.5">
              {(["prospection", "developpement"] as const).map((n) => (
                <button key={n} type="button" onClick={() => ch("nature", n)}
                  className={cn("h-8 px-3 rounded-md border text-xs transition",
                    (v.nature ?? "prospection") === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent")}>
                  {n === "prospection" ? "Prospection" : "Développement"}
                </button>
              ))}
            </div>
          </div>

          {(v.nature ?? "prospection") === "prospection" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Commission (%)</Label>
                <Input className="text-sm" type="number" min="0" max="100" step="0.5"
                  value={v.commission_pct ?? ""} onChange={(e) => ch("commission_pct", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Calculée sur</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  value={v.base_commission ?? "facture_payee"} onChange={(e) => ch("base_commission", e.target.value)}>
                  <option value="facture_payee">les factures encaissées</option>
                  <option value="facture_emise">les factures émises</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Régime de TVA</Label>
            <select className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={v.regime_tva ?? "franchise"} onChange={(e) => ch("regime_tva", e.target.value)}>
              <option value="franchise">Franchise en base (art. 293 B du CGI)</option>
              <option value="reel">Assujetti à la TVA</option>
            </select>
          </div>

          {v.regime_tva === "reel" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Champ label="N° TVA intracommunautaire" value={v.tva_numero} onChange={(x) => ch("tva_numero", x)} />
              <div className="space-y-1.5">
                <Label className="text-xs">Taux (%)</Label>
                <Input className="text-sm" type="number" value={v.taux_tva ?? 20}
                  onChange={(e) => ch("taux_tva", Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button disabled={enregistrer.isPending || !v.nom_complet?.trim() || !v.email?.trim()}
            onClick={() => enregistrer.mutate()}>
            {enregistrer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Champ({ label, value, onChange }: {
  label: string; value: string | null | undefined; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input className="text-sm" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}


/** Les prestataires : gestion de l'agence — pas le métier d'un collaborateur. */
function PageProtegee() {
  return <AdminSeul quoi="Les prestataires"><PrestatairesPage /></AdminSeul>;
}
