/**
 * ─── La plaque d'ouverture de l'espace client ─────────────────────────
 *
 * Première version : trois boîtes blanches de même poids, des icônes de cinq
 * couleurs, et l'œil qui ne savait pas où se poser. C'était propre et ça ne
 * disait rien.
 *
 * Ici, une seule chose compte et elle occupe la place : le nombre de gens qui
 * ont voulu joindre le commerçant. Tout le reste est plus petit, plus gris,
 * et se lit après. Un commerçant doit comprendre sa situation en une seconde,
 * sans lire.
 *
 * La plaque remonte dans le bandeau d'encre : elle appartient à l'en-tête
 * plutôt qu'au corps de page, et le regard est happé vers le haut.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Phone, Mail, MapPin, MessageSquare, FileText, Eye } from "lucide-react";

type Direct = {
  maintenant: number; aujourdhui: number; contacts_aujourdhui: number;
  derniers: { genre: string; chemin: string; titre: string | null;
              appareil: string | null; il_y_a_s: number }[];
};

const GESTES: Record<string, { texte: string; icone: typeof Phone }> = {
  telephone:  { texte: "a cliqué sur votre numéro",  icone: Phone },
  formulaire: { texte: "a envoyé le formulaire",     icone: FileText },
  email:      { texte: "a cliqué sur votre email",   icone: Mail },
  itineraire: { texte: "a demandé l'itinéraire",     icone: MapPin },
  whatsapp:   { texte: "vous a écrit sur WhatsApp",  icone: MessageSquare },
  page:       { texte: "a consulté votre site",      icone: Eye },
};

function depuis(s: number): string {
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return h < 48 ? "hier" : `il y a ${Math.floor(h / 24)} j`;
}

export function Direct({ siteId, contacts30, visiteurs30 }: {
  siteId: string; contacts30: number; visiteurs30: number;
}) {
  const d = useQuery({
    queryKey: ["mesure-direct", siteId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("mesure_direct", { p_site: siteId });
      if (error) throw new Error(error.message);
      return (data ?? {}) as Direct;
    },
  });

  const fait = useQuery({
    queryKey: ["fait-marquant", siteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("mesure_fait_marquant", { p_site: siteId, p_jours: 30 });
      if (error) throw new Error(error.message);
      return (data ?? null) as string | null;
    },
  });

  const v = d.data;
  const derniers = (v?.derniers ?? []).filter((x) => GESTES[x.genre]).slice(0, 6);
  const maintenant = Number(v?.maintenant ?? 0);

  return (
    <section className="ga-plaque ga-monte overflow-hidden">
      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        {/* ── Le chiffre qui compte ── */}
        <div className="p-7 sm:p-9 flex flex-col">
          <p className="ga-etiquette">Ces 30 derniers jours</p>

          <div className="mt-5 flex items-end gap-4">
            <span className="ga-geant ga-compte">{contacts30}</span>
            <span className="pb-2 text-[15px] leading-snug ga-doux max-w-[190px]">
              personnes ont voulu<br />vous joindre
            </span>
          </div>

          {fait.data && (
            <p className="mt-6 mb-7 text-[14.5px] leading-relaxed max-w-[420px]">{fait.data}</p>
          )}

          <div className="mt-auto pt-6 ga-filet grid grid-cols-3 gap-4">
            <div>
              <div className="ga-stat">{visiteurs30}</div>
              <p className="ga-etiquette mt-1.5">Visiteurs</p>
            </div>
            <div>
              <div className="ga-stat">{Number(v?.aujourdhui ?? 0)}</div>
              <p className="ga-etiquette mt-1.5">Aujourd'hui</p>
            </div>
            <div>
              <div className="ga-stat flex items-center gap-2">
                {maintenant}
                {maintenant > 0 && (
                  <span className="ga-pouls">
                    <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                )}
              </div>
              <p className="ga-etiquette mt-1.5">En ce moment</p>
            </div>
          </div>
        </div>

        {/* ── Le fil, sur un rail ── */}
        <div className="p-7 sm:p-9 lg:ga-filet-v ga-filet lg:border-t-0 bg-[hsl(var(--ga-fond))]/40">
          <p className="ga-etiquette">En direct</p>

          {derniers.length === 0 ? (
            <p className="mt-5 text-sm ga-doux leading-relaxed">
              Rien depuis deux jours. Dès qu'une personne visitera votre site,
              vous la verrez apparaître ici.
            </p>
          ) : (
            <ul className="mt-5 ga-rail space-y-3.5">
              {derniers.map((x, i) => {
                const g = GESTES[x.genre];
                const fort = x.genre !== "page";
                return (
                  <li key={i} data-fort={fort} className="ga-jalon text-[13.5px] leading-snug">
                    <span className={cn(fort ? "font-medium" : "ga-doux")}>
                      Quelqu'un {g.texte}
                    </span>
                    <span className="ga-doux">
                      {x.appareil ? ` depuis un ${x.appareil}` : ""}
                    </span>
                    <span className="block text-[11.5px] ga-doux mt-0.5">
                      {depuis(Number(x.il_y_a_s))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
