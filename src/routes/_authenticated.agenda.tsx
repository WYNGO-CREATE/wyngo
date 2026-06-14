/**
 * ─── Agenda — 4e univers ──────────────────────────────────────────────
 * Vue centrale des rendez-vous (synchronisés Google Agenda), groupés par
 * jour. Création directe d'un RDV depuis l'agenda (avec recherche prospect).
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Video, MapPin, ExternalLink, User, Plus, Search, X } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import { AppointmentForm, type ApptProspect } from "@/components/appointment-form";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
  head: () => ({ meta: [{ title: "Agenda — Wyngo" }] }),
});

type Prospect = { company: string | null; first_name: string | null; last_name: string | null };
type Appt = {
  id: string; title: string; scheduled_at: string; duration_min: number; is_video: boolean;
  location: string | null; meet_link: string | null; google_event_link: string | null;
  client_email: string | null; prospect_id: string | null; prospects: Prospect | Prospect[] | null;
};

function AgendaPage() {
  const [open, setOpen] = useState(false);

  const { data: appts = [], isLoading } = useQuery({
    queryKey: ["all-appointments"],
    queryFn: async (): Promise<Appt[]> => {
      const { data } = await supabase.from("appointments")
        .select("id, title, scheduled_at, duration_min, is_video, location, meet_link, google_event_link, client_email, prospect_id, prospects(company, first_name, last_name)")
        .eq("status", "planifie")
        .gte("scheduled_at", new Date(Date.now() - 3600_000).toISOString())
        .order("scheduled_at", { ascending: true });
      return (data as Appt[]) || [];
    },
  });

  const groups = appts.reduce<Record<string, Appt[]>>((acc, a) => {
    const key = a.scheduled_at.slice(0, 10);
    (acc[key] ||= []).push(a);
    return acc;
  }, {});
  const dayKeys = Object.keys(groups).sort();

  const dayLabel = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    if (isToday(d)) return "Aujourd'hui";
    if (isTomorrow(d)) return "Demain";
    return format(d, "EEEE d MMMM", { locale: fr });
  };
  const prospectName = (p: Appt["prospects"]) => {
    const x = Array.isArray(p) ? p[0] : p;
    if (!x) return null;
    return x.company || `${x.first_name || ""} ${x.last_name || ""}`.trim() || null;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" /> Agenda</h1>
          <p className="text-sm text-muted-foreground">Tes rendez-vous, synchronisés avec Google Agenda.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Nouveau rendez-vous</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nouveau rendez-vous</DialogTitle></DialogHeader>
            <NewAppointment onCreated={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : appts.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          Aucun rendez-vous à venir.<br />Clique « Nouveau rendez-vous » pour en planifier un (le client reçoit l'invitation dans son agenda).
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {dayKeys.map((day) => (
            <div key={day}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{dayLabel(day)}</h2>
              <Card><CardContent className="p-0 divide-y">
                {groups[day].map((a) => {
                  const name = prospectName(a.prospects);
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-4">
                      <div className="text-center shrink-0 w-14">
                        <div className="text-lg font-bold tabular-nums leading-none">{format(new Date(a.scheduled_at), "HH:mm")}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{a.duration_min} min</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{a.title}</p>
                        <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-muted-foreground mt-0.5">
                          {a.prospect_id && name && (
                            <Link to="/prospects/$id" params={{ id: a.prospect_id }} className="flex items-center gap-1 hover:underline hover:text-foreground">
                              <User className="h-3 w-3" /> {name}
                            </Link>
                          )}
                          {a.is_video ? (
                            <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Visio</span>
                          ) : a.location ? (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</span>
                          ) : null}
                          {a.client_email && <span className="truncate">{a.client_email}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {a.meet_link && <a href={a.meet_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><Video className="h-3 w-3" /> Rejoindre</a>}
                        {a.google_event_link && <a href={a.google_event_link} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Agenda</a>}
                      </div>
                    </div>
                  );
                })}
              </CardContent></Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Dialog : recherche d'un prospect (optionnelle) puis formulaire de RDV
function NewAppointment({ onCreated }: { onCreated: () => void }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<ApptProspect>(null);

  const { data: results = [] } = useQuery({
    queryKey: ["agenda-picker", q],
    enabled: q.trim().length >= 2 && !picked,
    queryFn: async () => {
      const { data } = await supabase.from("prospects")
        .select("id, first_name, last_name, company, email")
        .or(`company.ilike.%${q}%,last_name.ilike.%${q}%`).limit(6);
      return data || [];
    },
  });

  return (
    <div className="space-y-3">
      {/* Sélection du client */}
      {picked ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 min-w-0 truncate"><User className="h-3.5 w-3.5 shrink-0" /> {picked.company || `${picked.first_name || ""} ${picked.last_name || ""}`.trim()}</span>
          <button onClick={() => { setPicked(null); setQ(""); }} className="text-muted-foreground hover:text-foreground shrink-0"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Associer un prospect (optionnel)…" className="pl-8 h-9" />
          </div>
          {results.length > 0 && (
            <div className="rounded-md border divide-y max-h-40 overflow-auto">
              {results.map((p) => (
                <button key={p.id} className="w-full text-left text-sm px-3 py-1.5 hover:bg-muted"
                  onClick={() => setPicked({ id: p.id, company: p.company, first_name: p.first_name, last_name: p.last_name, email: p.email })}>
                  <span className="font-medium">{p.company || `${p.first_name} ${p.last_name}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Formulaire (remonté quand le prospect change) */}
      <AppointmentForm key={picked?.id || "none"} prospect={picked} onCreated={onCreated} />
    </div>
  );
}
