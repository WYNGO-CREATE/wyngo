/**
 * ─── Carte de conquête ────────────────────────────────────────────────
 *
 * Une seule chose à l'écran : la carte. La mission du moment se lit dans la
 * chasse, là où l'on travaille — ici on veut voir le territoire, et rien
 * d'autre.
 *
 * Elle montre le travail réel, pas seulement les missions : quelqu'un qui
 * chasse librement à Bayonne y apparaît au même titre que celui qui suit sa
 * mission. Sinon la carte raconterait une fausse histoire.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTEMENTS, CARTE, projeter } from "@/lib/france-departements";

export const Route = createFileRoute("/_authenticated/conquete")({
  component: Conquete,
  head: () => ({ meta: [{ title: "Carte de conquête — Group Arsène" }] }),
});

type Point = {
  commune: string; lat: number; lng: number;
  par: string; genre: "conquise" | "en_cours" | "activite";
  metier: string | null; n: number;
};

const TEINTES = ["#1B4BE3", "#0F766E", "#B45309", "#7C3AED", "#BE123C",
                 "#0369A1", "#4D7C0F", "#9D174D"];

/** Une couleur par personne, distribuée dans l'ordre — jamais deux fois la même. */
const palette = (noms: string[]) => {
  const u = [...new Set(noms)].sort((a, b) => a.localeCompare(b, "fr"));
  const m = new Map(u.map((n, i) => [n, TEINTES[i % TEINTES.length]] as const));
  return (n: string) => m.get(n) ?? TEINTES[0];
};

function Conquete() {
  const { data, isLoading } = useQuery({
    queryKey: ["carte-activite"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("carte_activite");
      if (error) throw new Error(error.message);
      return (data || []) as Point[];
    },
  });

  const pts = data ?? [];
  const teinte = palette(pts.map((p) => p.par));
  const gens = [...new Set(pts.map((p) => p.par))].sort((a, b) => a.localeCompare(b, "fr"));

  // Les activités libres se dessinent d'abord, les conquêtes par-dessus : un
  // territoire gagné ne doit pas être masqué par une simple visite.
  const ordre = { activite: 0, en_cours: 1, conquise: 2 } as const;
  const dessin = [...pts].sort((a, b) => ordre[a.genre] - ordre[b.genre]);

  // Un point d'activité grossit avec le volume travaillé, mais en logarithme :
  // 360 entreprises ne doivent pas faire une tache dix fois plus large que 36.
  const rayon = (p: Point) =>
    p.genre === "conquise" ? 1.6
      : p.genre === "en_cours" ? 1.2
        : Math.min(2.4, 0.7 + Math.log10(Math.max(p.n, 1)) * 0.8);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Carte de conquête</h1>

      <div className="relative rounded-xl border bg-card overflow-hidden">
        {/* La France est presque carrée : à pleine largeur elle dépassait
            l'écran et rejetait la légende hors du champ. */}
        <svg viewBox={`0 0 ${CARTE.largeur} ${CARTE.hauteur}`}
          className="w-full h-auto block max-h-[72vh] mx-auto">
          <defs>
            {/* Un peu de relief : la France se détache du fond au lieu d'être
                un aplat gris. */}
            <linearGradient id="terre" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor="#f2f5f9" />
              <stop offset="100%" stopColor="#dde3ec" />
            </linearGradient>
            <filter id="ombre" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0.35" dy="0.6" stdDeviation="0.55"
                floodColor="#0b1b33" floodOpacity="0.28" />
            </filter>
          </defs>

          <g filter="url(#ombre)">
            {DEPARTEMENTS.map((d) => (
              <path key={d.c} d={d.d} fill="url(#terre)" stroke="#aab4c4" strokeWidth={0.16}>
                <title>{d.n}</title>
              </path>
            ))}
          </g>

          {dessin.map((p, i) => {
            const { x, y } = projeter(p.lat, p.lng);
            const c = teinte(p.par);
            return (
              <circle
                key={`${p.commune}-${p.par}-${p.genre}-${i}`}
                cx={x} cy={y} r={rayon(p)}
                fill={p.genre === "en_cours" ? "transparent" : c}
                stroke={c}
                strokeWidth={0.45}
                opacity={p.genre === "activite" ? 0.42 : 1}
              >
                <title>
                  {p.genre === "conquise"
                    ? `${p.metier} à ${p.commune} — conquis par ${p.par}`
                    : p.genre === "en_cours"
                      ? `${p.metier} à ${p.commune} — en cours, ${p.par}`
                      : `${p.commune} — ${p.n} entreprise${p.n > 1 ? "s" : ""} travaillée${p.n > 1 ? "s" : ""} par ${p.par}`}
                </title>
              </circle>
            );
          })}
        </svg>

        {!isLoading && pts.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            La carte se remplira dès la première chasse.
          </div>
        )}
      </div>

      {/* Sans les prénoms, les couleurs ne veulent rien dire : c'est la seule
          chose qu'on garde à côté de la carte. */}
      {gens.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {gens.map((n) => (
            <span key={n} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: teinte(n) }} />
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
