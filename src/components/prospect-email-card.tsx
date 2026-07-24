/**
 * ─── ProspectEmailCard — Carte Email de la fiche prospect ────────────────
 *
 * Trois capacités :
 *   1. AFFICHER l'email + sa pastille de vérification (ou le bouton "Trouver").
 *   2. SAISIR / MODIFIER l'email à la main (crayon → champ → enregistre dans
 *      la colonne `prospects.email`).
 *   3. ENVOYER un email directement depuis l'outil (fenêtre de rédaction →
 *      edge function `gmail-send`, via le compte Gmail connecté de l'utilisateur).
 *
 * Sans email : bouton "Trouver" (recherche auto) + saisie manuelle possible.
 * Sans Gmail connecté : l'envoi renvoie un message clair + lien vers l'Inbox
 * pour connecter le compte.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Ban, Pencil, Check, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { EmailVerifyBadge } from "@/components/email-verify-badge";
import { EmailFinderButton } from "@/components/email-finder-button";

type VerifStatus = "valid" | "risky" | "invalid" | "unknown";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ProspectEmailCard({
  prospect,
}: {
  prospect: {
    id: string;
    email: string | null;
    company: string | null;
    website: string | null;
    first_name: string;
    last_name: string;
    city?: string | null;
  };
}) {
  const qc = useQueryClient();
  const email = (prospect.email || "").trim().toLowerCase();

  // ── Édition manuelle de l'adresse ──
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(prospect.email || "");

  const saveEmail = useMutation({
    mutationFn: async (value: string) => {
      const clean = value.trim().toLowerCase();
      if (clean && !EMAIL_RE.test(clean)) throw new Error("Adresse email invalide.");
      const { error } = await supabase
        .from("prospects")
        .update({ email: clean || null } as never)
        .eq("id", prospect.id);
      if (error) throw new Error(error.message);
      return clean;
    },
    onSuccess: (clean) => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["prospect", prospect.id] });
      qc.invalidateQueries({ queryKey: ["prospects"] });
      toast.success(clean ? "Email enregistré" : "Email retiré");
    },
    onError: (e: Error) => toast.error("Enregistrement impossible", { description: e.message }),
  });

  // ── Statut de vérification (décide si l'adresse est sûre) ──
  const { data: verification } = useQuery({
    queryKey: ["email-verification", email],
    enabled: !!email,
    queryFn: async () => {
      const { data } = await supabase
        .from("email_verifications")
        .select("email, status, verified_at, expires_at, raw_result, provider")
        .eq("email", email)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      return data || null;
    },
  });
  const status = (verification?.status as VerifStatus | undefined) ?? null;
  const isUnsafe = status === "invalid";

  // ── Rédaction + envoi direct ──
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [noGmail, setNoGmail] = useState(false);

  const send = useMutation({
    mutationFn: async () => {
      if (!prospect.email) throw new Error("Renseigne d'abord l'email du prospect.");
      if (!subject.trim() || !body.trim()) throw new Error("Objet et message requis.");
      const { data, error } = await supabase.functions.invoke("gmail-send", {
        body: { prospect_id: prospect.id, to: prospect.email, subject: subject.trim(), body: body.trim() },
      });
      if (error) throw new Error(error.message);
      const errMsg = (data as { error?: string })?.error;
      if (errMsg) {
        if (/gmail/i.test(errMsg)) setNoGmail(true);
        throw new Error(errMsg);
      }
      return data;
    },
    onSuccess: () => {
      setComposeOpen(false);
      setSubject(""); setBody(""); setNoGmail(false);
      qc.invalidateQueries({ queryKey: ["prospect-messages", prospect.id] });
      toast.success(`Email envoyé à ${prospect.email}`);
    },
    onError: (e: Error) => toast.error("Envoi impossible", { description: e.message }),
  });

  const baseClass = "flex items-center gap-3 p-3 rounded-lg border";

  // ─── Mode édition inline ───
  if (editing) {
    return (
      <div className={cn(baseClass, "flex-wrap")}>
        <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
          <Mail className="h-5 w-5 text-blue-700 dark:text-blue-300" />
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <Input
            autoFocus
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEmail.mutate(draft);
              if (e.key === "Escape") { setEditing(false); setDraft(prospect.email || ""); }
            }}
            placeholder="prenom@entreprise.fr"
            className="h-9"
          />
          <Button size="icon" className="h-9 w-9 shrink-0" disabled={saveEmail.isPending}
            onClick={() => saveEmail.mutate(draft)} title="Enregistrer">
            {saveEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0"
            onClick={() => { setEditing(false); setDraft(prospect.email || ""); }} title="Annuler">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── Mode affichage ───
  return (
    <>
      <div className={cn(baseClass, !email && "opacity-70")}>
        <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
          <Mail className="h-5 w-5 text-blue-700 dark:text-blue-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Email</p>
          {email ? (
            <a href={`mailto:${prospect.email}`} className="font-semibold truncate block hover:underline">
              {prospect.email}
            </a>
          ) : (
            <p className="font-semibold text-muted-foreground">Non renseigné</p>
          )}
          {isUnsafe && (
            <p className="text-[10px] text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 mt-0.5">
              <Ban className="h-2.5 w-2.5" /> Adresse invalide — ne pas écrire
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Pastille de vérif si email, sinon bouton de recherche auto */}
          {email ? (
            <EmailVerifyBadge email={prospect.email!} />
          ) : (
            <EmailFinderButton
              prospectId={prospect.id}
              companyName={prospect.company}
              city={prospect.city}
              websiteUrl={prospect.website}
              dirigeantFirstName={prospect.first_name}
              dirigeantLastName={prospect.last_name}
            />
          )}
          {/* Saisir / modifier à la main */}
          <Button size="icon" variant="ghost" className="h-8 w-8"
            onClick={() => { setDraft(prospect.email || ""); setEditing(true); }}
            title={email ? "Modifier l'email" : "Saisir l'email"}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Bouton d'envoi direct — visible seulement si une adresse sûre existe */}
      {email && !isUnsafe && (
        <Button variant="outline" size="sm" className="w-full gap-1.5"
          onClick={() => { setNoGmail(false); setComposeOpen(true); }}>
          <Send className="h-3.5 w-3.5" /> Envoyer un email
        </Button>
      )}

      {/* Fenêtre de rédaction */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Envoyer un email</DialogTitle>
            <DialogDescription>
              Envoyé depuis ton compte Gmail connecté, et enregistré dans le suivi du prospect.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Destinataire</Label>
              <Input value={prospect.email || ""} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mail-subject">Objet</Label>
              <Input id="mail-subject" value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex : Votre présence en ligne" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mail-body">Message</Label>
              <Textarea id="mail-body" value={body} onChange={(e) => setBody(e.target.value)}
                rows={9} placeholder={`Bonjour ${prospect.first_name || ""},\n\n…`} />
            </div>

            {noGmail && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900">
                Aucun compte Gmail connecté. Connecte-le depuis l'{" "}
                <Link to="/inbox" className="font-semibold underline">Inbox</Link>{" "}
                pour envoyer directement depuis l'outil.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setComposeOpen(false)}>Annuler</Button>
            <Button className="gap-1.5" disabled={send.isPending || !subject.trim() || !body.trim()}
              onClick={() => send.mutate()}>
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
