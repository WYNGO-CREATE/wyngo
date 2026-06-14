/**
 * ─── Agenda — 4e univers (calendrier mensuel) ─────────────────────────
 * Calendrier visuel : navigation par mois, jours colorés selon les RDV,
 * clic sur un jour → détail des rendez-vous. Synchronisé Google Agenda,
 * relié aux fiches prospects. Création directe (recherche prospect).
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Video, MapPin, ExternalLink, User, Plus, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
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

const prospectName = (p: Appt["prospects"]) => {
  const x = Array.isArray(p) ? p[0] : p;
  if (!x) return null;
  return x.company || `${x.first_name || ""} ${x.last_name || ""}`.trim() || null;
};

function AgendaPage() {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [open, setOpen] = useState(false);

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart.getTime(), gridEnd.getTime()]);

  const { data: appts = [] } = useQuery({
    queryKey: ["agenda-month", format(viewMonth, "yyyy-MM")],
    queryFn: async (): Promise<Appt[]> => {
      const { data } = await supabase.from("appointments")
        .select("id, title, scheduled_at, duration_min, is_video, location, meet_link, google_event_link, client_email, prospect_id, prospects(company, first_name, last_name)")
        .neq("status", "annule")
        .gte("scheduled_at", gridStart.toISOString())
        .lte("scheduled_at", gridEnd.toISOString())
        .order("scheduled_at", { ascending: true });
      return (data as Appt[]) || [];
    },
  });

  const byDay = useMemo(() => {
    const m: Record<string, Appt[]> = {};
    for (const a of appts) (m[a.scheduled_at.slice(0, 10)] ||= []).push(a);
    return m;
  }, [appts]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const dayAppts = byDay[selectedKey] || [];
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" /> Agenda</h1>
          <p className="text-sm text-muted-foreground">Tes rendez-vous, synchronisés Google Agenda — reliés à tes prospects.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Nouveau rendez-vous</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nouveau rendez-vous</DialogTitle></DialogHeader>
            <NewAppointment defaultDay={selectedDay} onCreated={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-[1.4fr_1fr] gap-5 items-start">
        {/* ── Calendrier ── */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold capitalize">{format(viewMonth, "MMMM yyyy", { locale: fr })}</div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewMonth((m) => addMonths(m, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setViewMonth(startOfMonth(new Date())); setSelectedDay(new Date()); }}>Aujourd'hui</Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewMonth((m) => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              {weekDays.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const list = byDay[key] || [];
                const inMonth = isSameMonth(day, viewMonth);
                const selected = isSameDay(day, selectedDay);
                return (
                  <button key={key} onClick={() => setSelectedDay(day)}
                    className={cn(
                      "aspect-square rounded-lg border flex flex-col items-center justify-start pt-1.5 gap-1 transition relative",
                      !inMonth && "opacity-35",
                      selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-transparent hover:bg-muted",
                      isToday(day) && !selected && "bg-muted/60",
                    )}>
                    <span className={cn("text-xs tabular-nums", isToday(day) && "font-bold text-primary")}>{format(day, "d")}</span>
                    {list.length > 0 && (
                      <span className="flex items-center gap-0.5 flex-wrap justify-center px-1">
                        {list.slice(0, 3).map((a) => (
                          <span key={a.id} className={cn("h-1.5 w-1.5 rounded-full", a.is_video ? "bg-violet-500" : "bg-emerald-500")} />
                        ))}
                        {list.length > 3 && <span className="text-[9px] text-muted-foreground font-medium">+{list.length - 3}</span>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Visio</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Présentiel</span>
            </div>
          </CardContent>
        </Card>

        {/* ── Détail du jour sélectionné ── */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold capitalize px-1">
            {isToday(selectedDay) ? "Aujourd'hui" : format(selectedDay, "EEEE d MMMM", { locale: fr })}
          </h2>
          {dayAppts.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Aucun rendez-vous ce jour.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {dayAppts.map((a) => {
                const name = prospectName(a.prospects);
                return (
                  <Card key={a.id} className={cn("border-l-4", a.is_video ? "border-l-violet-500" : "border-l-emerald-500")}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tabular-nums">{format(new Date(a.scheduled_at), "HH'h'mm")} · <span className="font-normal text-muted-foreground">{a.duration_min} min</span></p>
                          <p className="text-sm truncate">{a.title}</p>
                          <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-muted-foreground mt-1">
                            {a.prospect_id && name && (
                              <Link to="/prospects/$id" params={{ id: a.prospect_id }} className="flex items-center gap-1 hover:underline hover:text-foreground"><User className="h-3 w-3" /> {name}</Link>
                            )}
                            {a.is_video ? <span className="flex items-center gap-1 text-violet-600"><Video className="h-3 w-3" /> Visio</span>
                              : a.location ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</span> : null}
                          </div>
                        </div>
                      </div>
                      {(a.meet_link || a.google_event_link) && (
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t">
                          {a.meet_link && <a href={a.meet_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><Video className="h-3 w-3" /> Rejoindre</a>}
                          {a.google_event_link && <a href={a.google_event_link} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Google Agenda</a>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dialog : recherche d'un prospect (optionnelle) puis formulaire de RDV
function NewAppointment({ onCreated, defaultDay }: { onCreated: () => void; defaultDay?: Date }) {
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

      <AppointmentForm key={picked?.id || "none"} prospect={picked} defaultDay={defaultDay} onCreated={onCreated} />
    </div>
  );
}
