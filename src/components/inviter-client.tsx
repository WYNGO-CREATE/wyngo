/**
 * ─── Ouvrir l'espace client depuis le Studio ──────────────────────────
 *
 * Le lien de portail public existe toujours pour un suivi rapide, mais
 * l'espace client est autre chose : le client s'y connecte, et il y trouve
 * l'audience réelle de son site.
 *
 * On n'invente jamais son mot de passe. Supabase lui envoie un lien pour le
 * choisir — et l'on récupère ce lien pour pouvoir le lui transmettre
 * autrement si l'email n'arrive pas. Un client bloqué dehors ne réessaie pas,
 * il appelle.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserPlus, Copy, CheckCircle2 } from "lucide-react";

export function InviterClient({ siteId, defautEmail, defautNom }: {
  siteId: string; defautEmail?: string | null; defautNom?: string | null;
}) {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [email, setEmail] = useState(defautEmail ?? "");
  const [nom, setNom] = useState(defautNom ?? "");
  const [lien, setLien] = useState<string | null>(null);

  const compte = useQuery({
    queryKey: ["compte-client", siteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_comptes" as any)
        .select("user_id, nom, premiere_connexion, actif").eq("site_id", siteId).maybeSingle();
      if (error) return null;
      return data as any;
    },
  });

  const inviter = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("client-inviter", {
        body: { site_id: siteId, email: email.trim(), nom: nom.trim() || null,
                base_url: window.location.origin },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { lien: string | null };
    },
    onSuccess: (d) => {
      setLien(d.lien ?? null);
      toast.success("Espace client ouvert", {
        description: "Le client reçoit un email pour choisir son mot de passe.",
      });
      qc.invalidateQueries({ queryKey: ["compte-client", siteId] });
    },
    onError: (e: Error) => toast.error("Invitation impossible", { description: e.message }),
  });

  if (compte.data && !ouvert) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span className="text-muted-foreground">
          Espace client actif
          {compte.data.premiere_connexion
            ? " — déjà connecté"
            : " — en attente de première connexion"}
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-xs"
          onClick={() => setOuvert(true)}>Renvoyer l'accès</Button>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOuvert(true)}>
        <UserPlus className="h-4 w-4" /> Ouvrir l'espace client
      </Button>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
      <p className="text-sm font-medium">Ouvrir l'espace client</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Email du client</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@boulangerie-martin.fr" className="text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Son prénom (facultatif)</Label>
          <Input value={nom} onChange={(e) => setNom(e.target.value)}
            placeholder="Sylvain" className="text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!email.trim() || inviter.isPending}
          onClick={() => inviter.mutate()} className="gap-1.5">
          {inviter.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Envoyer l'invitation
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setOuvert(false); setLien(null); }}>
          Annuler
        </Button>
      </div>

      {lien && (
        <div className="rounded-md border bg-background p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Lien de première connexion, au cas où l'email n'arriverait pas. Il est
            personnel et à usage unique — ne le publiez pas.
          </p>
          <div className="flex gap-2">
            <input readOnly value={lien}
              className="flex-1 h-8 rounded border bg-muted/50 px-2 text-xs font-mono" />
            <Button size="sm" variant="outline" className="h-8 gap-1.5"
              onClick={() => { navigator.clipboard.writeText(lien); toast.success("Lien copié"); }}>
              <Copy className="h-3.5 w-3.5" /> Copier
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
