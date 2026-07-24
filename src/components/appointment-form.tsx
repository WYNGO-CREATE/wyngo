/**
 * ─── Formulaire de planification de RDV (partagé) ─────────────────────
 * Utilisé sur la fiche prospect ET dans l'Agenda. Crée l'événement Google
 * Agenda, invite le client, option visio (Meet). Gère la reconnexion Google
 * si le scope Agenda manque.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { CalendarClock, Loader2, Video, MapPin, Link2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export type ApptProspect = { id: string; company: string | null; first_name: string | null; last_name: string | null; email: string | null } | null;
export type ExistingAppt = { id: string; title: string; scheduled_at: string; duration_min: number; is_video: boolean; location: string | null; notes: string | null; client_email: string | null };

const PRESET_DURATIONS = ["15", "30", "45", "60", "90", "120"];

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function startGoogleOAuth() {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) { toast.error("Configuration Google manquante."); return; }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/auth/gmail-callback`,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "select_account consent",
    login_hint: "contact@wyngo.fr",
    state: "gmail_oauth",
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function AppointmentForm({ prospect, onCreated, defaultDay, existing }: { prospect: ApptProspect; onCreated?: () => void; defaultDay?: Date; existing?: ExistingAppt }) {
  const qc = useQueryClient();

  const { data: account, isLoading } = useQuery({
    queryKey: ["my-gmail-account"],
    queryFn: async () => (await supabase.from("gmail_accounts").select("email, scope").maybeSingle()).data,
  });
  const hasCalendar = !!account?.scope?.includes("calendar.events");

  const prospectName = prospect ? (prospect.company || `${prospect.first_name || ""} ${prospect.last_name || ""}`.trim()) : "";

  const presetDur = existing && PRESET_DURATIONS.includes(String(existing.duration_min));
  const [when, setWhen] = useState(
    existing ? format(new Date(existing.scheduled_at), "yyyy-MM-dd'T'HH:mm")
      : defaultDay ? `${format(defaultDay, "yyyy-MM-dd")}T10:00` : "");
  const [duration, setDuration] = useState(existing ? (presetDur ? String(existing.duration_min) : "custom") : "30");
  const [customDur, setCustomDur] = useState(existing && !presetDur ? String(existing.duration_min) : "");
  const [title, setTitle] = useState(existing ? existing.title : (prospectName ? `Rendez-vous — ${prospectName}` : "Rendez-vous"));
  const [email, setEmail] = useState(existing ? (existing.client_email || "") : (prospect?.email || ""));
  const [isVideo, setIsVideo] = useState(existing ? existing.is_video : true);
  const [location, setLocation] = useState(existing ? (existing.location || "") : "");
  const [notes, setNotes] = useState(existing ? (existing.notes || "") : "");

  const create = useMutation({
    mutationFn: async () => {
      if (!when) throw new Error("Choisis une date et une heure.");
      const start = new Date(when);
      if (isNaN(start.getTime())) throw new Error("Date invalide.");
      if (start.getTime() < Date.now()) throw new Error("La date est déjà passée.");
      const durMin = duration === "custom" ? Math.round(Number(customDur)) : Number(duration);
      if (!durMin || durMin < 5) throw new Error("Indique une durée valide (au moins 5 minutes).");
      const end = new Date(start.getTime() + durMin * 60000);

      const common = {
        title: title.trim() || "Rendez-vous", client_email: email.trim() || null,
        start_iso: start.toISOString(), end_iso: end.toISOString(),
        notes: notes.trim() || null, is_video: isVideo, location: location.trim() || null,
      };
      const { data, error } = existing
        ? await supabase.functions.invoke("calendar-update-event", { body: { appointment_id: existing.id, ...common } })
        : await supabase.functions.invoke("calendar-create-event", { body: { prospect_id: prospect?.id || null, ...common } });
      if (error) throw new Error(error.message);
      const res = data as { ok?: boolean; error?: string; message?: string; meet_link?: string };
      if (res?.error) {
        const e = new Error(res.message || "Erreur") as Error & { code?: string };
        e.code = res.error;
        throw e;
      }
      return res;
    },
    onSuccess: (res) => {
      toast.success(existing ? "Rendez-vous modifié — le client est prévenu" : "Rendez-vous créé — invitation envoyée au client" + (res?.meet_link ? " (avec lien visio)" : ""));
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["all-appointments"] });
      qc.invalidateQueries({ queryKey: ["agenda-month"] });
      qc.invalidateQueries({ queryKey: ["due-followups"] });
      onCreated?.();
    },
    onError: (e: Error & { code?: string }) => {
      if (e.code === "no_google" || e.code === "no_calendar_scope") toast.error("Connecte/reconnecte Google Agenda d'abord.");
      else if (e.code === "api_disabled") toast.error("Active l'API Google Calendar dans ton projet Google Cloud.");
      else toast.error(e.message || "Création impossible.");
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Chargement…</p>;
  if (!account) return <ReconnectPrompt connected={false} />;
  if (!hasCalendar) return <ReconnectPrompt connected />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label className="text-xs">Date et heure *</Label>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label className="text-xs">Durée</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="45">45 min</SelectItem>
              <SelectItem value="60">1 heure</SelectItem>
              <SelectItem value="90">1 h 30</SelectItem>
              <SelectItem value="120">2 heures</SelectItem>
              <SelectItem value="custom">Personnalisé…</SelectItem>
            </SelectContent>
          </Select>
          {duration === "custom" && (
            <Input type="number" min={5} step={5} value={customDur} onChange={(e) => setCustomDur(e.target.value)}
              placeholder="Durée en minutes (ex : 75)" className="mt-1.5" autoFocus />
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Intitulé</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Email du client (il recevra l'invitation)</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@exemple.fr" />
        {!email && <p className="text-[11px] text-amber-600">Sans email, le client ne recevra pas l'invitation.</p>}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setIsVideo(true)}
          className={"flex-1 flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm transition " + (isVideo ? "border-primary bg-primary/10 text-primary font-medium" : "text-muted-foreground")}>
          <Video className="h-4 w-4" /> Visio (Meet)
        </button>
        <button type="button" onClick={() => setIsVideo(false)}
          className={"flex-1 flex items-center justify-center gap-1.5 rounded-md border py-2 text-sm transition " + (!isVideo ? "border-primary bg-primary/10 text-primary font-medium" : "text-muted-foreground")}>
          <MapPin className="h-4 w-4" /> Présentiel
        </button>
      </div>
      {!isVideo && (
        <div className="space-y-1.5">
          <Label className="text-xs">Lieu</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Adresse du rendez-vous" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Note (optionnel)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ordre du jour, contexte…" />
      </div>
      <DialogFooter>
        <Button onClick={() => create.mutate()} disabled={create.isPending} className="gap-1.5 w-full">
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
          {existing ? "Enregistrer les modifications" : "Créer le RDV et inviter le client"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ReconnectPrompt({ connected }: { connected: boolean }) {
  return (
    <div className="space-y-3 py-2">
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm">
          {connected
            ? "Ta connexion Google ne couvre pas encore l'Agenda. Reconnecte-toi pour autoriser la création de rendez-vous."
            : "Connecte ton compte Google pour créer des rendez-vous et inviter tes clients automatiquement."}
        </p>
      </div>
      <Button onClick={startGoogleOAuth} className="w-full gap-1.5">
        <Link2 className="h-4 w-4" /> {connected ? "Reconnecter Google (Agenda)" : "Connecter Google"}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">Tu reviendras ici juste après l'autorisation.</p>
    </div>
  );
}
