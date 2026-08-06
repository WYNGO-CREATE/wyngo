/**
 * ─── Tout ce qui concerne l'espace d'un client, au même endroit ───────
 *
 * Deux choses que l'on cherchait ailleurs sans les trouver :
 *
 *   1. OÙ METTRE L'ADRESSE DU SITE. Quand on fabrique le site dans le Studio,
 *      la mesure s'installe toute seule à la publication. Mais si le client a
 *      déjà un site ailleurs, il faut coller un petit code dans ses pages — et
 *      il n'y avait nulle part où saisir son adresse.
 *
 *   2. COMMENT INVITER LE CLIENT. Le bouton existait, enfoui dans un onglet de
 *      la page d'édition. Personne ne le trouvait. Il est ici, sur la carte.
 *
 * On affiche aussi si la mesure remonte vraiment : sans ce voyant, on croit
 * avoir installé quelque chose qui ne tourne pas.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Copy, CheckCircle2, UserPlus, Activity, Globe } from "lucide-react";

const COLLECTEUR = `${import.meta.env.VITE_SUPABASE_URL ?? "https://mwkkgubvdswmdaiswepl.supabase.co"}/functions/v1/mesure`;

/** Le code à coller dans un site qu'on n'héberge pas. */
function codeMesure(siteId: string) {
  return `<!-- Mesure Group Arsène — à coller juste avant </body> -->
<script src="${COLLECTEUR.replace("/functions/v1/mesure", "")}/functions/v1/mesure-js?s=${siteId}" defer></script>`;
}

export function EspaceClientDialog({ site, clientEmail, onClose }: {
  site: { id: string; title: string | null; slug: string | null; site_externe_url?: string | null };
  clientEmail: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState(clientEmail ?? "");
  const [url, setUrl] = useState(site.site_externe_url ?? "");
  const [lien, setLien] = useState<string | null>(null);

  const compte = useQuery({
    queryKey: ["compte-client", site.id],
    queryFn: async () => {
      const { data } = await supabase.from("client_comptes" as any)
        .select("user_id, nom, premiere_connexion").eq("site_id", site.id).maybeSingle();
      return data as any;
    },
  });

  const etat = useQuery({
    queryKey: ["mesure-etat", site.id],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("mesure_etat", { p_site: site.id });
      return (data ?? [])[0] ?? null;
    },
  });

  const enregistrerUrl = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_sites")
        .update({ site_externe_url: url.trim() || null } as any).eq("id", site.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Adresse enregistrée."); qc.invalidateQueries({ queryKey: ["sites"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const inviter = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("client-inviter", {
        body: { site_id: site.id, email: email.trim(), nom: site.title,
                base_url: window.location.origin },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { lien: string | null };
    },
    onSuccess: (d) => {
      setLien(d.lien ?? null);
      toast.success("Espace ouvert", {
        description: "Le client reçoit un email pour choisir son mot de passe.",
      });
      qc.invalidateQueries({ queryKey: ["compte-client", site.id] });
    },
    onError: (e: Error) => toast.error("Invitation impossible", { description: e.message }),
  });

  const code = codeMesure(site.id);
  const mesureOk = etat.data?.actif;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Espace client — {site.title || "site"}</DialogTitle>
          <DialogDescription>
            L'adresse du site à mesurer, et l'accès du client à son espace.
          </DialogDescription>
        </DialogHeader>

        {/* ── 1. La mesure ── */}
        <section className="space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Activity className="size-4 text-primary" /> Mesure d'audience
          </p>

          <div className={`rounded-lg border p-3 text-sm ${
            mesureOk ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
            {mesureOk ? (
              <>
                <b className="text-emerald-700 dark:text-emerald-500">La mesure fonctionne.</b>{" "}
                {Number(etat.data?.signaux_7j ?? 0)} signaux ces 7 derniers jours.
              </>
            ) : (
              <>
                <b className="text-amber-700 dark:text-amber-500">Aucune mesure reçue.</b>{" "}
                {site.slug
                  ? "Si le site est fabriqué ici, republie-le : la mesure s'installe à la publication."
                  : "Colle le code ci-dessous dans les pages du site."}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Globe className="size-3" /> Adresse du site du client
            </Label>
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://boulangerie-martin.fr" className="h-9 text-sm" />
              <Button size="sm" variant="outline" className="h-9"
                disabled={enregistrerUrl.isPending} onClick={() => enregistrerUrl.mutate()}>
                Enregistrer
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              À renseigner si le site n'est pas fabriqué ici. Sinon, l'adresse est déjà connue.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Code à coller dans ses pages</Label>
            <textarea readOnly value={code} rows={3}
              className="w-full rounded-md border bg-muted/40 p-2 text-[11px] font-mono resize-none" />
            <Button size="sm" variant="outline" className="h-8 gap-1.5"
              onClick={() => { navigator.clipboard.writeText(code); toast.success("Code copié"); }}>
              <Copy className="size-3.5" /> Copier le code
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Une seule ligne, à placer juste avant <code>&lt;/body&gt;</code>. Sans cookie —
              le site du client n'a donc toujours pas besoin de bandeau.
            </p>
          </div>
        </section>

        <hr className="border-border" />

        {/* ── 2. L'accès du client ── */}
        <section className="space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <UserPlus className="size-4 text-primary" /> Accès à l'espace
          </p>

          {compte.data ? (
            <p className="text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="text-muted-foreground">
                Espace actif — {compte.data.premiere_connexion ? "le client s'est déjà connecté" : "en attente de sa première connexion"}
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Le client recevra un email pour choisir lui-même son mot de passe. Vous ne le
              connaîtrez jamais.
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Email du client</Label>
            <div className="flex gap-2">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@boulangerie-martin.fr" className="h-9 text-sm" />
              <Button size="sm" className="h-9 gap-1.5"
                disabled={!email.trim() || inviter.isPending} onClick={() => inviter.mutate()}>
                {inviter.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                {compte.data ? "Renvoyer" : "Inviter"}
              </Button>
            </div>
          </div>

          {lien && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Lien de première connexion, si l'email n'arrive pas. Personnel, à usage unique.
              </p>
              <div className="flex gap-2">
                <input readOnly value={lien}
                  className="flex-1 h-8 rounded border bg-background px-2 text-[11px] font-mono" />
                <Button size="sm" variant="outline" className="h-8"
                  onClick={() => { navigator.clipboard.writeText(lien); toast.success("Copié"); }}>
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
