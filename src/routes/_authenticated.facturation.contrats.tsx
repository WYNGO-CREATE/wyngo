/**
 * ─── Facturation · Contrats de prestation ─────────────────────────────
 *
 * Génère des contrats conformes (droit FR/UE), signés en ligne (eIDAS) ou
 * sur papier. Deux types distincts :
 *   • Création de site (prestation ponctuelle)
 *   • Abonnement mensuel (référencement / maintenance)
 * Le texte est gelé (snapshot) à la création : le contrat signé est immuable.
 * ⚠️ Modèles à faire valider par un professionnel du droit.
 */

import { AdminSeul } from "@/components/admin-seul";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileSignature, Printer, Link2, Check, Trash2, Eye, X, Mail } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buildContract, type ContractKind, type ContractBody } from "@/lib/contract-templates";

export const Route = createFileRoute("/_authenticated/facturation/contrats")({
  component: PageProtegee,
  head: () => ({ meta: [{ title: "Contrats — Facturation Group Arsène" }] }),
});

const STATUS: Record<string, { label: string; cls: string }> = {
  brouillon: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
  envoye: { label: "Envoyé", cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  signe: { label: "Signé", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  refuse: { label: "Refusé", cls: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
  annule: { label: "Annulé", cls: "bg-muted text-muted-foreground" },
};

type ContractRow = {
  id: string; kind: ContractKind; number: string | null; title: string | null; status: string;
  client_name: string | null; client_email: string | null; share_token: string;
  signed_by_name: string | null; signed_at: string | null; created_at: string; body: ContractBody;
};

function ContractsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<ContractRow | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["billing-settings"],
    queryFn: async () => (await supabase.from("billing_settings").select("*").limit(1).maybeSingle()).data,
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: async (): Promise<ContractRow[]> => {
      const { data } = await supabase.from("contracts")
        .select("id, kind, number, title, status, client_name, client_email, share_token, signed_by_name, signed_at, created_at, body")
        .order("created_at", { ascending: false });
      return (data as ContractRow[]) || [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("contracts").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success("Contrat supprimé"); },
  });

  const activate = useMutation({
    mutationFn: async (ct: ContractRow) => {
      if (ct.status === "brouillon") await supabase.from("contracts").update({ status: "envoye", sent_at: new Date().toISOString() }).eq("id", ct.id);
      return `${window.location.origin}/contrat/${ct.share_token}`;
    },
    onSuccess: (link) => { navigator.clipboard?.writeText(link); qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success("Lien de signature copié"); },
  });

  const sendEmail = useMutation({
    mutationFn: async (ct: ContractRow) => {
      if (!ct.client_email) throw new Error("Renseignez l'email du client (recréez le contrat avec l'email).");
      const { data, error } = await supabase.functions.invoke("contract-send", { body: { contract_id: ct.id, origin: window.location.origin } });
      if (error) throw new Error(error.message);
      const res = data as { ok?: boolean; message?: string };
      if (!res?.ok) throw new Error(res?.message || "Envoi impossible.");
      return res;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success("Contrat envoyé par email"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const signPaper = useMutation({
    mutationFn: async (ct: ContractRow) => {
      const name = window.prompt("Nom du signataire (signature papier) :", ct.client_name || "");
      if (name === null) throw new Error("cancel");
      await supabase.from("contracts").update({ status: "signe", signed_at: new Date().toISOString(), signed_by_name: name || ct.client_name }).eq("id", ct.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success("Contrat marqué signé (papier)"); },
    onError: (e: Error) => { if (e.message !== "cancel") toast.error("Erreur"); },
  });

  const printContract = (ct: ContractRow) => {
    const b = ct.body || ({} as ContractBody);
    const secs = (b.sections || []).map((s) =>
      `<section><h2>${esc(s.h)}</h2>${(s.p || []).map((p) => `<p>${esc(p)}</p>`).join("")}</section>`).join("");
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) { toast.error("Autorisez les pop-ups pour imprimer"); return; }
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(b.title || "Contrat")}</title>
      <style>body{font-family:Georgia,serif;color:#111;max-width:720px;margin:24px auto;padding:0 20px;line-height:1.6;font-size:13px}
      h1{font-size:20px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.04em;border-left:3px solid #1B4BE3;padding-left:8px;margin:18px 0 6px}
      p{margin:0 0 6px;text-align:justify}.head{border-bottom:1px solid #ddd;padding-bottom:10px;margin-bottom:16px}
      .sig{margin-top:34px;display:flex;justify-content:space-between;gap:40px}.sig div{flex:1}.box{border:1px solid #999;height:90px;border-radius:6px;margin-top:6px}
      .disc{margin-top:24px;font-size:10px;color:#888;border-top:1px solid #eee;padding-top:8px}
      @media print{body{margin:0}}</style></head><body>
      <div class="head"><h1>${esc(b.title || "Contrat de prestation")}</h1>
      <div style="font-size:11px;color:#555">${ct.number ? "Réf. " + esc(ct.number) + " · " : ""}${esc(settings?.trade_name || settings?.legal_name || "Group Arsène")}${settings?.siret ? " · SIRET " + esc(settings.siret) : ""}</div></div>
      ${secs}
      <div class="sig"><div><b>Le Prestataire</b><div>Fait à ${esc(settings?.city || "…………")}, le ${new Date().toLocaleDateString("fr-FR")}</div><div class="box"></div></div>
      <div><b>Le Client</b> — « Lu et approuvé »<div>${esc(ct.client_name || "…………")}</div><div class="box"></div></div></div>
      <div class="disc">${esc(b.disclaimer || "")}</div></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon"><Link to="/facturation"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="h-6 w-6 text-primary" /> Contrats</h1>
          <p className="text-sm text-muted-foreground">Contrats de prestation conformes (droit FR/UE), signés en ligne ou sur papier.</p>
        </div>
        <Button className="ml-auto" onClick={() => setCreating(true)}>Nouveau contrat</Button>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
        ⚠️ Ces modèles couvrent les clauses usuelles obligatoires mais restent <b>à faire valider par un professionnel du droit</b> avant usage réel.
      </div>

      {creating && <CreateForm settings={settings} userId={user?.id} onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ["contracts"] }); }} onCancel={() => setCreating(false)} />}

      <Card>
        <CardContent className="p-0 divide-y">
          {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Aucun contrat. Créez-en un pour démarrer.</div>}
          {rows.map((ct) => (
            <div key={ct.id} className="flex items-center gap-3 p-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{ct.title || (ct.kind === "abonnement" ? "Abonnement" : "Création de site")}</span>
                  <Badge className={cn("text-[10px]", STATUS[ct.status]?.cls)}>{STATUS[ct.status]?.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {ct.client_name || "Client —"}{ct.number ? ` · ${ct.number}` : ""}
                  {ct.status === "signe" && ct.signed_by_name ? ` · signé par ${ct.signed_by_name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPreview(ct)} title="Aperçu"><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => printContract(ct)} title="Imprimer / PDF"><Printer className="h-4 w-4" /></Button>
                {ct.status !== "signe" && <Button variant="ghost" size="sm" onClick={() => sendEmail.mutate(ct)} disabled={sendEmail.isPending} title="Envoyer par email"><Mail className="h-4 w-4" /></Button>}
                {ct.status !== "signe" && <Button variant="ghost" size="sm" onClick={() => activate.mutate(ct)} title="Copier le lien de signature"><Link2 className="h-4 w-4" /></Button>}
                {ct.status !== "signe" && <Button variant="ghost" size="sm" onClick={() => signPaper.mutate(ct)} title="Marquer signé (papier)"><Check className="h-4 w-4" /></Button>}
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Supprimer ce contrat ?")) del.mutate(ct.id); }} title="Supprimer"><Trash2 className="h-4 w-4 text-rose-500" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPreview(null)}>
          <div className="bg-background rounded-xl max-w-2xl w-full max-h-[88vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">{preview.body?.title}</h2>
              <Button variant="ghost" size="icon" onClick={() => setPreview(null)}><X className="h-4 w-4" /></Button>
            </div>
            {(preview.body?.sections || []).map((s, i) => (
              <section key={i} className="mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide border-l-2 border-primary pl-2 mb-1">{s.h}</h3>
                {s.p.map((p, j) => <p key={j} className="text-[13px] text-muted-foreground mb-1.5 text-justify">{p}</p>)}
              </section>
            ))}
            <p className="text-[10px] text-muted-foreground border-t pt-2 mt-2">{preview.body?.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function CreateForm({ settings, userId, onDone, onCancel }: { settings: any; userId?: string; onDone: () => void; onCancel: () => void }) {
  const [kind, setKind] = useState<ContractKind>("creation");
  const [f, setF] = useState({
    client_name: "", client_email: "", client_address: "", client_postal_code: "", client_city: "", client_siret: "",
    description: "", price_ht: "", deposit_pct: "30", delay_days: "30",
    monthly_ht: "", commitment_months: "12", notice_days: "30",
    withdrawal: true, jurisdiction_city: settings?.city || "",
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!userId) { toast.error("Session expirée, reconnectez-vous."); return; }
    if (!f.client_name.trim()) { toast.error("Indiquez le nom du client."); return; }
    setBusy(true);
    try {
      const params = {
        description: f.description, withdrawal: f.withdrawal, jurisdiction_city: f.jurisdiction_city,
        price_ht: Number(f.price_ht) || 0, deposit_pct: Number(f.deposit_pct) || 0, delay_days: Number(f.delay_days) || 0,
        monthly_ht: Number(f.monthly_ht) || 0, commitment_months: Number(f.commitment_months) || 0, notice_days: Number(f.notice_days) || 0,
      };
      const client = {
        client_name: f.client_name, client_email: f.client_email, client_address: f.client_address,
        client_postal_code: f.client_postal_code, client_city: f.client_city, client_siret: f.client_siret, client_is_pro: true,
      };
      const body = buildContract(kind, settings || {}, client, params);
      const year = new Date().getFullYear();
      const { count } = await supabase.from("contracts").select("*", { count: "exact", head: true });
      const number = `CT-${year}-${String((count || 0) + 1).padStart(3, "0")}`;
      const { error } = await supabase.from("contracts").insert({
        owner_id: userId, kind, number, title: body.title, status: "brouillon",
        ...client, params, body: body as any,
      });
      if (error) throw error;
      toast.success("Contrat créé");
      onDone();
    } catch (e) { toast.error("Erreur à la création"); } finally { setBusy(false); }
  };

  return (
    <Card><CardContent className="p-5 space-y-4">
      <div className="flex gap-2">
        {(["creation", "abonnement"] as ContractKind[]).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={cn("flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition",
            kind === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted")}>
            {k === "creation" ? "🖥️ Création de site" : "🔄 Abonnement mensuel"}
            <span className="block text-[11px] font-normal text-muted-foreground">{k === "creation" ? "Prestation ponctuelle" : "Référencement / maintenance"}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom du client *"><Input value={f.client_name} onChange={(e) => set("client_name", e.target.value)} placeholder="Boulangerie Dupont" /></Field>
        <Field label="Email"><Input value={f.client_email} onChange={(e) => set("client_email", e.target.value)} placeholder="contact@client.fr" /></Field>
        <Field label="Adresse"><Input value={f.client_address} onChange={(e) => set("client_address", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Code postal"><Input value={f.client_postal_code} onChange={(e) => set("client_postal_code", e.target.value)} /></Field>
          <Field label="Ville"><Input value={f.client_city} onChange={(e) => set("client_city", e.target.value)} /></Field>
        </div>
        <Field label="SIRET client"><Input value={f.client_siret} onChange={(e) => set("client_siret", e.target.value)} /></Field>
        <Field label="Ville du tribunal"><Input value={f.jurisdiction_city} onChange={(e) => set("jurisdiction_city", e.target.value)} placeholder={settings?.city || "Toulouse"} /></Field>
      </div>

      <Field label="Objet / périmètre de la prestation">
        <Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)}
          placeholder={kind === "creation" ? "Site vitrine 5 pages, formulaire de contact, référencement local…" : "Suivi SEO mensuel, mises à jour, 1 modification/mois, reporting…"} />
      </Field>

      {kind === "creation" ? (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Prix total HT (€)"><Input type="number" value={f.price_ht} onChange={(e) => set("price_ht", e.target.value)} placeholder="1500" /></Field>
          <Field label="Acompte (%)"><Input type="number" value={f.deposit_pct} onChange={(e) => set("deposit_pct", e.target.value)} /></Field>
          <Field label="Délai (jours)"><Input type="number" value={f.delay_days} onChange={(e) => set("delay_days", e.target.value)} /></Field>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Prix mensuel HT (€)"><Input type="number" value={f.monthly_ht} onChange={(e) => set("monthly_ht", e.target.value)} placeholder="90" /></Field>
          <Field label="Engagement (mois)"><Input type="number" value={f.commitment_months} onChange={(e) => set("commitment_months", e.target.value)} /></Field>
          <Field label="Préavis (jours)"><Input type="number" value={f.notice_days} onChange={(e) => set("notice_days", e.target.value)} /></Field>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.withdrawal} onChange={(e) => set("withdrawal", e.target.checked)} />
        Inclure le droit de rétractation 14 jours (client pro ≤ 5 salariés — recommandé)
      </label>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button onClick={create} disabled={busy}>{busy ? "Création…" : "Générer le contrat"}</Button>
      </div>
    </CardContent></Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}


/** Les contrats : gestion de l'agence — pas le métier d'un collaborateur. */
function PageProtegee() {
  return <AdminSeul quoi="Les contrats"><ContractsPage /></AdminSeul>;
}
