/**
 * ─── Carte « Rendez-vous » (fiche prospect) ───────────────────────────
 * Liste les RDV à venir du prospect + bouton « Planifier » (formulaire
 * partagé AppointmentForm : Google Agenda, invitation client, visio).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarClock, Plus, Video, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AppointmentForm } from "@/components/appointment-form";

type Prospect = { id: string; company: string | null; first_name: string | null; last_name: string | null; email: string | null };
type Appt = { id: string; title: string; scheduled_at: string; duration_min: number; is_video: boolean; meet_link: string | null; google_event_link: string | null; client_email: string | null };

export function AppointmentCard({ prospect }: { prospect: Prospect }) {
  const [open, setOpen] = useState(false);

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
            <AppointmentForm prospect={prospect} onCreated={() => setOpen(false)} />
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
