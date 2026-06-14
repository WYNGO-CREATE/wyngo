/**
 * ─── Carte « Rendez-vous » (fiche prospect) ───────────────────────────
 *
 * Planifie un 2e RDV : crée un événement Google Agenda, invite le client
 * par email (il l'ajoute en 1 clic), option visio (Google Meet), et pose
 * un rappel dans le cockpit. Si le scope Agenda n'est pas accordé → propose
 * la reconnexion Google.
 */

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { CalendarClock, Plus, Loader2, Video, MapPin, ExternalLink, Link2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function startGoogleOAuth() {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) { toast.error("Configuration Google manquante."); return; }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/auth/gmail-callback`,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "select_account consent",  // toujours proposer le choix du compte Google
    state: "gmail_oauth",
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

type Prospect = { id: string; company: string | null; first_name: string | null; last_name: string | null; email: string | null };
type Appt = { id: string; title: string; scheduled_at: string; duration_min: number; is_video: boolean; meet_link: string | null; google_event_link: string | null; client_email: string | null };

export function AppointmentCard({ prospect }: { prospect: Prospect }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: account } = useQuery({
    queryKey: ["my-gmail-account"],
    queryFn: async () => (await supabase.from("gmail_accounts").select("email, scope").maybeSingle()).data,
  });
  const hasCalendar = !!account?.scope?.includes("calendar.events");

  const { data: appts = [] } = useQuery({
    queryKey: ["appointments", prospect.id],
    queryFn: async (): Promise<Appt[]> => {
      const { data } = await supabase.from("appointments")
        .select("id, title, scheduled_at, duration_min, is_video, meet_link, google_event_link, client_email")
        .eq("prospect_id", prospect.id).eq("status", "planifie")
        .gte("scheduled_at", new Date(Date.now() - 3600_000).toISOString())
        .order("scheduled_at", { ascending: true });
      return (data as Appt[]) || [];
    },
  });

  const prospectName = prospect.company || `${prospect.first_name || ""} ${prospect.last_name || ""}`.trim();

  // État du formulaire
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState("30");
  const [customDur, setCustomDur] = useState("");
  const [title, setTitle] = useState(`Rendez-vous — ${prospectName || "Wyngo"}`);
  const [email, setEmail] = useState(prospect.email || "");
  const [isVideo, setIsVideo] = useState(true);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!when) throw new Error("Choisis une date et une heure.");
      const start = new Date(when);
      if (isNaN(start.getTime())) throw new Error("Date invalide.");
      if (start.getTime() < Date.now()) throw new Error("La date est déjà passée.");
      const durMin = duration === "custom" ? Math.round(Number(customDur)) : Number(duration);
      if (!durMin || durMin < 5) throw new Error("Indique une durée valide (au moins 5 minutes).");
      const end = new Date(start.getTime() + durMin * 60000);

      const { data, error } = await supabase.functions.invoke("calendar-create-event", {
        body: {
          prospect_id: prospect.id, title: title.trim() || `Rendez-vous — ${prospectName}`,
          client_email: email.trim() || null, start_iso: start.toISOString(), end_iso: end.toISOString(),
          notes: notes.trim() || null, is_video: isVideo, location: location.trim() || null,
        },
      });
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
      toast.success("Rendez-vous créé — invitation envoyée au client" + (res?.meet_link ? " (avec lien visio)" : ""));
      qc.invalidateQueries({ queryKey: ["appointments", prospect.id] });
      qc.invalidateQueries({ queryKey: ["due-followups"] });
      setOpen(false);
      setWhen(""); setNotes("");
    },
    onError: (e: Error & { code?: string }) => {
      if (e.code === "no_google" || e.code === "no_calendar_scope") {
        toast.error("Connecte/reconnecte Google Agenda d'abord.");
      } else if (e.code === "api_disabled") {
        toast.error("Active l'API Google Calendar dans ton projet Google Cloud.");
      } else {
        toast.error(e.message || "Création impossible.");
      }
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Rendez-vous</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Planifier</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Planifier un rendez-vous</DialogTitle></DialogHeader>

            {account && !hasCalendar ? (
              <ReconnectPrompt connected />
            ) : !account ? (
              <ReconnectPrompt connected={false} />
            ) : (
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
                    Créer le RDV et inviter le client
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {appts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun rendez-vous planifié. Clique « Planifier » pour proposer un créneau au client (il reçoit l'invitation dans son agenda).</p>
        ) : (
          <ul className="space-y-2">
            {appts.map((a) => (
              <li key={a.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.scheduled_at), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })} · {a.duration_min} min
                      {a.is_video ? " · visio" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.meet_link && (
                      <a href={a.meet_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><Video className="h-3 w-3" /> Meet</a>
                    )}
                    {a.google_event_link && (
                      <a href={a.google_event_link} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Agenda</a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
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
