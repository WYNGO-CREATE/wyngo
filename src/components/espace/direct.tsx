/**
 * ─── Le bandeau vivant de l'espace client ─────────────────────────────
 *
 * Un bilan mensuel, on le regarde une fois. Ce qui donne envie de revenir,
 * c'est de voir son commerce vivre : quelqu'un est sur le site maintenant,
 * quelqu'un vient de cliquer sur le numéro.
 *
 * Rien n'est inventé — ce sont les mêmes signaux que le tableau de bord, lus
 * sur les dernières minutes. Et quand il n'y a rien à dire, on ne dit rien
 * plutôt que d'afficher un zéro qui décourage.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Phone, Mail, MapPin, MessageSquare, FileText, Eye, Sparkles } from "lucide-react";

type Direct = {
  maintenant: number; aujourdhui: number; contacts_aujourdhui: number;
  derniers: { genre: string; chemin: string; titre: string | null;
              appareil: string | null; il_y_a_s: number }[];
};

const GESTES: Record<string, { texte: string; icone: typeof Phone; ton: string }> = {
  telephone:  { texte: "a cliqué sur votre numéro",   icone: Phone,         ton: "text-emerald-600" },
  formulaire: { texte: "a envoyé le formulaire",      icone: FileText,      ton: "text-sky-600" },
  email:      { texte: "a cliqué sur votre email",    icone: Mail,          ton: "text-violet-600" },
  itineraire: { texte: "a demandé l'itinéraire",      icone: MapPin,        ton: "text-amber-600" },
  whatsapp:   { texte: "vous a écrit sur WhatsApp",   icone: MessageSquare, ton: "text-teal-600" },
  page:       { texte: "a consulté",                  icone: Eye,           ton: "text-muted-foreground" },
};

/** « il y a 3 min », « il y a 2 h », « hier ». */
function depuis(s: number): string {
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return h < 48 ? "hier" : `il y a ${Math.floor(h / 24)} jours`;
}

export function Direct({ siteId }: { siteId: string }) {
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
  const derniers = (v?.derniers ?? []).filter((x) => GESTES[x.genre]);
  const maintenant = Number(v?.maintenant ?? 0);

  return (
    <div className="space-y-4">
      {/* ── Le fait marquant, en une phrase ── */}
      {fait.data && (
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.07] to-transparent p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-[15px] font-medium leading-relaxed">{fait.data}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        {/* ── En ce moment ── */}
        <div className="rounded-2xl border bg-card p-5 sm:min-w-[190px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              {maintenant > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5",
                maintenant > 0 ? "bg-emerald-500" : "bg-muted-foreground/30")} />
            </span>
            <span className="text-xs text-muted-foreground">En ce moment</span>
          </div>
          <div className="text-3xl font-bold tabular-nums leading-none">{maintenant}</div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {maintenant === 0 ? "personne sur votre site"
              : maintenant === 1 ? "personne consulte votre site"
                : "personnes consultent votre site"}
          </p>
          <div className="mt-4 pt-3 border-t text-xs text-muted-foreground space-y-1">
            <div><b className="text-foreground tabular-nums">{Number(v?.aujourdhui ?? 0)}</b> visiteurs aujourd'hui</div>
            <div><b className="text-foreground tabular-nums">{Number(v?.contacts_aujourdhui ?? 0)}</b> ont voulu vous joindre</div>
          </div>
        </div>

        {/* ── Ce qui vient de se passer ── */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold mb-1">Ce qui vient de se passer</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Les derniers gestes de vos visiteurs, en direct.
          </p>
          {derniers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Rien depuis deux jours. Dès qu'une personne visitera votre site, ça apparaîtra ici.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {derniers.map((x, i) => {
                const g = GESTES[x.genre];
                const fort = x.genre !== "page";
                return (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <g.icone className={cn("h-4 w-4 flex-shrink-0 mt-0.5", g.ton)} />
                    <span className={cn("min-w-0", !fort && "text-muted-foreground")}>
                      <span className={cn(fort && "font-medium")}>
                        Quelqu'un {g.texte}
                        {x.genre === "page" && x.titre ? ` « ${x.titre} »` : ""}
                      </span>
                      <span className="text-muted-foreground">
                        {x.appareil ? ` depuis un ${x.appareil}` : ""} · {depuis(Number(x.il_y_a_s))}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
