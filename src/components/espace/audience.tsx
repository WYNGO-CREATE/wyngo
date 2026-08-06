/**
 * ─── Le tableau de bord d'audience du client ──────────────────────────
 *
 * Écrit pour un commerçant, pas pour un analyste. Trois principes :
 *
 *   • aucun jargon — « ils ont voulu vous joindre », pas « conversions » ;
 *   • un chiffre n'existe que comparé au mois précédent, sinon il ne dit rien ;
 *   • ce qui rapporte passe avant ce qui flatte : les clics sur le téléphone
 *     sont en haut, le nombre de visites en dessous.
 *
 * Chaque carte n'interroge la base que si elle est affichée.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CARTES, cartesChoisies, enregistrerCartes, type CarteId } from "@/lib/espace-cartes";
import { cn } from "@/lib/utils";
import {
  Phone, Mail, MapPin, MessageSquare, FileText, Eye, Users,
  Clock, TrendingUp, TrendingDown, Minus, SlidersHorizontal, Check, Activity,
} from "lucide-react";

const PERIODES = [
  { j: 7, label: "7 jours" },
  { j: 30, label: "30 jours" },
  { j: 90, label: "3 mois" },
  { j: 365, label: "12 mois" },
];

const nf = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));

/** « +34 % » ou « −12 % », avec la couleur qui va bien. */
function Ecart({ actuel, avant }: { actuel: number; avant: number }) {
  if (!avant) {
    return actuel > 0
      ? <span className="text-xs text-muted-foreground">nouveau</span>
      : null;
  }
  const p = Math.round(((actuel - avant) / avant) * 100);
  if (p === 0) return <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5"><Minus className="h-3 w-3" />stable</span>;
  const monte = p > 0;
  return (
    <span className={cn("text-xs font-medium inline-flex items-center gap-0.5",
      monte ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500")}>
      {monte ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {monte ? "+" : "−"}{Math.abs(p)} %
    </span>
  );
}

function Carte({ titre, aquoi, large, children }: {
  titre: string; aquoi?: string; large?: boolean; children: React.ReactNode;
}) {
  return (
    <section className={cn(
      "rounded-2xl border bg-card p-5 shadow-sm",
      large && "md:col-span-2",
    )}>
      <header className="mb-4">
        <h3 className="font-semibold">{titre}</h3>
        {aquoi && <p className="text-xs text-muted-foreground mt-0.5">{aquoi}</p>}
      </header>
      {children}
    </section>
  );
}

/** Une barre horizontale : lisible sans légende, contrairement à un camembert. */
function Barres({ lignes, unite }: { lignes: { nom: string; n: number }[]; unite: string }) {
  const max = Math.max(1, ...lignes.map((l) => l.n));
  if (!lignes.length) return <p className="text-sm text-muted-foreground">Pas encore de données.</p>;
  return (
    <div className="space-y-2.5">
      {lignes.map((l) => (
        <div key={l.nom}>
          <div className="flex justify-between text-sm mb-1">
            <span className="truncate pr-3">{l.nom}</span>
            <span className="text-muted-foreground tabular-nums flex-shrink-0">
              {nf(l.n)} {unite}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary/80 rounded-full transition-all"
              style={{ width: `${(l.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const CONTACTS_LIB: Record<string, { label: string; icone: typeof Phone; ton: string }> = {
  telephone:  { label: "Appels depuis le site", icone: Phone,         ton: "text-emerald-600" },
  formulaire: { label: "Formulaires envoyés",   icone: FileText,      ton: "text-sky-600" },
  email:      { label: "Emails ouverts",        icone: Mail,          ton: "text-violet-600" },
  itineraire: { label: "Itinéraires demandés",  icone: MapPin,        ton: "text-amber-600" },
  whatsapp:   { label: "Messages WhatsApp",     icone: MessageSquare, ton: "text-teal-600" },
};

export function Audience({ siteId }: { siteId: string }) {
  const [jours, setJours] = useState(30);

  // Un site qui vient d'être mis en ligne n'a encore rien à montrer. Afficher
  // une grille de zéros ferait croire à un site que personne ne visite —
  // exactement le contraire de ce qu'on veut dire à ce moment-là.
  const etat = useQuery({
    queryKey: ["mesure-etat-client", siteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("mesure_etat", { p_site: siteId });
      if (error) throw new Error(error.message);
      return (data ?? [])[0] ?? null;
    },
  });
  const [choix, setChoix] = useState<CarteId[]>(() => cartesChoisies());
  const [reglages, setReglages] = useState(false);

  const jamaisMesure = etat.isSuccess && !etat.data?.dernier_signal;

  const actives = useMemo(
    () => CARTES.filter((c) => c.socle || choix.includes(c.id)),
    [choix],
  );
  const affiche = (id: CarteId) => actives.some((c) => c.id === id);

  // Un hook par jeu de données. `enabled` fait que rien n'est demandé pour une
  // carte masquée.
  const mesure = (nom: string, actif: boolean) => useQuery({
    queryKey: [nom, siteId, jours],
    enabled: actif && !!siteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc(nom, { p_site: siteId, p_jours: jours });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const resume     = mesure("mesure_resume", affiche("resume"));
  const contacts   = mesure("mesure_contacts", affiche("contacts"));
  const courbe     = mesure("mesure_courbe", affiche("courbe"));
  const provenance = mesure("mesure_provenance", affiche("provenance"));
  const pages      = mesure("mesure_pages", affiche("pages"));
  const publics    = mesure("mesure_public", affiche("appareils") || affiche("villes"));
  const rythme     = mesure("mesure_rythme", affiche("rythme"));

  const r = (resume.data ?? [])[0];
  const parCategorie = (cat: string) =>
    ((publics.data ?? []) as any[])
      .filter((x) => x.categorie === cat)
      .map((x) => ({ nom: x.valeur, n: Number(x.visiteurs) }))
      .slice(0, 7);

  const basculer = (id: CarteId) => {
    const l = choix.includes(id) ? choix.filter((x) => x !== id) : [...choix, id];
    setChoix(l); enregistrerCartes(l);
  };

  const courbeData = (courbe.data ?? []) as any[];
  const maxCourbe = Math.max(1, ...courbeData.map((d) => Number(d.visites)));

  if (etat.isLoading) {
    return <p className="text-sm text-muted-foreground py-6">Chargement…</p>;
  }

  if (jamaisMesure) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center max-w-lg mx-auto">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 grid place-items-center">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <h2 className="font-semibold text-lg">La mesure vient d'être installée</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Vos premiers chiffres apparaîtront ici dès qu'une personne visitera votre site —
          souvent dans les heures qui suivent. Revenez demain, il y aura de quoi lire.
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Rien n'est perdu : tout ce qui se passe à partir de maintenant est compté.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Période + réglages ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border overflow-hidden">
          {PERIODES.map((p) => (
            <button key={p.j} onClick={() => setJours(p.j)}
              className={cn("px-3 py-1.5 text-sm transition",
                jours === p.j ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={() => setReglages((v) => !v)}
          className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <SlidersHorizontal className="h-4 w-4" /> Choisir mes indicateurs
        </button>
      </div>

      {reglages && (
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Affichez ce qui vous est utile. Votre choix est retenu sur cet appareil.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CARTES.map((c) => {
              const on = c.socle || choix.includes(c.id);
              return (
                <button key={c.id} disabled={c.socle} onClick={() => basculer(c.id)}
                  className={cn("flex items-start gap-2.5 rounded-lg border p-3 text-left transition",
                    on ? "border-primary/50 bg-primary/5" : "hover:bg-accent",
                    c.socle && "opacity-60 cursor-default")}>
                  <span className={cn("mt-0.5 h-4 w-4 rounded border flex items-center justify-center flex-shrink-0",
                    on ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40")}>
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{c.titre}</span>
                    <span className="block text-xs text-muted-foreground">{c.aquoi}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── L'essentiel ── */}
        {affiche("resume") && (
          <Carte titre="L'essentiel" large
            aquoi={`Sur les ${jours} derniers jours, comparés aux ${jours} précédents.`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icone: Users, label: "Visiteurs", v: Number(r?.visiteurs ?? 0), av: Number(r?.visiteurs_avant ?? 0) },
                { icone: Eye, label: "Pages vues", v: Number(r?.visites ?? 0), av: Number(r?.visites_avant ?? 0) },
                { icone: Phone, label: "Ont voulu vous joindre", v: Number(r?.contacts ?? 0), av: Number(r?.contacts_avant ?? 0) },
              ].map((c) => (
                <div key={c.label}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <c.icone className="h-3.5 w-3.5" /> {c.label}
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{nf(c.v)}</div>
                  <Ecart actuel={c.v} avant={c.av} />
                </div>
              ))}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" /> Temps par visite
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {Number(r?.duree_moyenne_s ?? 0) > 0
                    ? `${Math.floor(Number(r.duree_moyenne_s) / 60)} min ${Math.round(Number(r.duree_moyenne_s) % 60)} s`
                    : "—"}
                </div>
                <span className="text-xs text-muted-foreground">
                  {Number(r?.pages_par_visite ?? 0)} page{Number(r?.pages_par_visite ?? 0) > 1 ? "s" : ""} en moyenne
                </span>
              </div>
            </div>
          </Carte>
        )}

        {/* ── Les intentions de contact : la carte qui compte ── */}
        {affiche("contacts") && (
          <Carte titre="Ils ont voulu vous joindre" large
            aquoi="Ce sont ces gestes qui deviennent des clients — pas le nombre de visites.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {((contacts.data ?? []) as any[])
                .filter((c) => CONTACTS_LIB[c.genre])
                .sort((a, b) => Number(b.nombre) - Number(a.nombre))
                .map((c) => {
                  const m = CONTACTS_LIB[c.genre];
                  return (
                    <div key={c.genre} className="rounded-xl border bg-background p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                        <m.icone className={cn("h-4 w-4", m.ton)} /> {m.label}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold tabular-nums">{nf(Number(c.nombre))}</span>
                        <Ecart actuel={Number(c.nombre)} avant={Number(c.avant)} />
                      </div>
                    </div>
                  );
                })}
            </div>
            {((contacts.data ?? []) as any[]).every((c) => !Number(c.nombre)) && (
              <p className="text-sm text-muted-foreground mt-3">
                Personne n'a encore cliqué sur vos coordonnées sur cette période.
              </p>
            )}
          </Carte>
        )}

        {/* ── La courbe ── */}
        {affiche("courbe") && (
          <Carte titre="Jour après jour" large aquoi="Les barres claires sont les visites, les points les demandes de contact.">
            <div className="flex items-end gap-[2px] h-32">
              {courbeData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end items-center gap-0.5 group relative">
                  {Number(d.contacts) > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  )}
                  <div className="w-full bg-primary/25 hover:bg-primary/50 rounded-t transition-all"
                    style={{ height: `${(Number(d.visites) / maxCourbe) * 100}%`, minHeight: 2 }} />
                  <span className="absolute -top-7 hidden group-hover:block text-[11px] bg-foreground text-background rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                    {new Date(d.jour).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {d.visites}
                  </span>
                </div>
              ))}
            </div>
          </Carte>
        )}

        {affiche("provenance") && (
          <Carte titre="D'où ils viennent" aquoi="La part de Google vous dit si votre référencement travaille.">
            <Barres unite="visiteurs" lignes={((provenance.data ?? []) as any[])
              .map((x) => ({ nom: x.source, n: Number(x.visiteurs) }))} />
          </Carte>
        )}

        {affiche("pages") && (
          <Carte titre="Ce qu'ils regardent" aquoi="Vos pages les plus consultées.">
            <Barres unite="vues" lignes={((pages.data ?? []) as any[])
              .slice(0, 7).map((x) => ({ nom: x.titre || x.chemin, n: Number(x.visites) }))} />
          </Carte>
        )}

        {affiche("appareils") && (
          <Carte titre="Sur quel écran" aquoi="Si le mobile domine, votre site doit être irréprochable dessus.">
            <Barres unite="visiteurs" lignes={parCategorie("appareil")} />
          </Carte>
        )}

        {affiche("villes") && (
          <Carte titre="De quelles villes" aquoi="Jusqu'où porte votre visibilité.">
            <Barres unite="visiteurs" lignes={parCategorie("ville")} />
          </Carte>
        )}

        {affiche("rythme") && (
          <Carte titre="À quelles heures" large
            aquoi="Plus la case est foncée, plus on vous consulte à ce moment-là.">
            <Rythme donnees={(rythme.data ?? []) as any[]} />
          </Carte>
        )}
      </div>
    </div>
  );
}

/** Semaine × heures. Une grille se lit d'un coup d'œil, un tableau non. */
function Rythme({ donnees }: { donnees: any[] }) {
  const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const carte = new Map<string, number>();
  let max = 1;
  for (const d of donnees) {
    const v = Number(d.visites);
    carte.set(`${d.jour_semaine}-${d.heure}`, v);
    if (v > max) max = v;
  }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="flex gap-[3px] mb-1 pl-9">
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="flex-1 text-[9px] text-muted-foreground text-center">
              {h % 3 === 0 ? h : ""}
            </span>
          ))}
        </div>
        {JOURS.map((j, i) => (
          <div key={j} className="flex items-center gap-[3px] mb-[3px]">
            <span className="w-8 text-[11px] text-muted-foreground flex-shrink-0">{j}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const v = carte.get(`${i + 1}-${h}`) ?? 0;
              return (
                <span key={h} title={`${j} ${h}h — ${v} visite${v > 1 ? "s" : ""}`}
                  className="flex-1 aspect-square rounded-[3px] bg-primary transition"
                  style={{ opacity: v ? 0.15 + (v / max) * 0.85 : 0.05 }} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
