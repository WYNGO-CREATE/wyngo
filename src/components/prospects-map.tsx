/**
 * ─── Carte des prospects & clients ────────────────────────────────────
 * Carte de France (l'Hexagone) avec un point par ville, coloré selon le
 * statut dominant et dimensionné selon le nombre. Coordonnées réelles des
 * principales villes (aucune géolocalisation externe).
 */

type P = { status: string; location: string | null };

// Coordonnées (lat, lng) des principales villes françaises
const CITIES: Record<string, [number, number]> = {
  paris: [48.857, 2.352], marseille: [43.296, 5.37], lyon: [45.764, 4.835], toulouse: [43.605, 1.444],
  nice: [43.7, 7.265], nantes: [47.218, -1.554], montpellier: [43.611, 3.877], strasbourg: [48.573, 7.752],
  bordeaux: [44.838, -0.579], lille: [50.629, 3.057], rennes: [48.117, -1.677], reims: [49.258, 4.032],
  "le havre": [49.494, 0.108], "saint-etienne": [45.439, 4.387], toulon: [43.124, 5.928], grenoble: [45.188, 5.724],
  dijon: [47.322, 5.041], angers: [47.478, -0.563], nimes: [43.837, 4.36], villeurbanne: [45.766, 4.88],
  "clermont-ferrand": [45.777, 3.087], "le mans": [48.006, 0.199], "aix-en-provence": [43.529, 5.447],
  brest: [48.39, -4.486], tours: [47.394, 0.685], amiens: [49.894, 2.296], limoges: [45.833, 1.261],
  annecy: [45.899, 6.129], perpignan: [42.698, 2.896], besancon: [47.238, 6.024], metz: [49.119, 6.176],
  orleans: [47.902, 1.909], rouen: [49.443, 1.099], mulhouse: [47.75, 7.34], caen: [49.183, -0.37],
  nancy: [48.692, 6.184], avignon: [43.949, 4.806], poitiers: [46.58, 0.34], "la rochelle": [46.16, -1.151],
  pau: [43.295, -0.37], calais: [50.951, 1.858], bayonne: [43.493, -1.475], cannes: [43.553, 7.018],
  colmar: [48.079, 7.358], quimper: [47.996, -4.097], valence: [44.933, 4.892], chambery: [45.564, 5.917],
  troyes: [48.297, 4.074], lorient: [47.748, -3.366], beziers: [43.343, 3.216], versailles: [48.804, 2.13],
};

const STATUS_COLOR: Record<string, string> = {
  converti: "#10b981", interesse: "#8b5cf6", a_relancer: "#f59e0b", en_cours: "#0ea5e9", nouveau: "#94a3b8", perdu: "#fb7185",
};
const PRIORITY = ["converti", "interesse", "a_relancer", "en_cours", "nouveau", "perdu"];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Projection lat/lng → boîte 0..100 (x) / 0..110 (y)
const proj = (lat: number, lng: number) => ({ x: ((lng + 5.2) / 13.5) * 100, y: ((51.4 - lat) / 9.1) * 110 });

// Contour simplifié de la France (mêmes coords → aligné avec les villes)
const BORDER: [number, number][] = [
  [51.0, 2.5], [50.4, 4.2], [49.5, 5.9], [48.6, 7.9], [47.5, 7.2], [46.2, 6.1],
  [45.1, 6.8], [43.8, 7.5], [43.1, 6.0], [43.0, 3.0], [42.5, 3.1], [43.3, -1.6],
  [45.5, -1.2], [46.5, -1.9], [47.3, -2.5], [48.7, -4.8], [48.6, -3.0], [49.7, -1.9], [49.9, 0.2], [50.9, 1.6],
];

export function ProspectsMap({ prospects }: { prospects: P[] }) {
  const cityAgg: Record<string, { count: number; statuses: Set<string>; coord: [number, number] }> = {};
  let unplaced = 0;
  for (const p of prospects) {
    const loc = norm(p.location || "");
    if (!loc) { unplaced++; continue; }
    const match = Object.keys(CITIES).find((c) => loc.includes(c));
    if (!match) { unplaced++; continue; }
    (cityAgg[match] ||= { count: 0, statuses: new Set(), coord: CITIES[match] });
    cityAgg[match].count++;
    cityAgg[match].statuses.add(p.status);
  }
  const cities = Object.values(cityAgg);
  const placed = cities.reduce((s, c) => s + c.count, 0);
  const path = "M" + BORDER.map(([la, ln]) => { const q = proj(la, ln); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" L") + " Z";

  const legend = [
    { k: "converti", l: "Clients" }, { k: "interesse", l: "Intéressés" }, { k: "a_relancer", l: "À relancer" },
    { k: "en_cours", l: "En cours" }, { k: "nouveau", l: "Nouveaux" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <svg viewBox="0 0 100 112" className="w-full max-w-[340px] mx-auto" style={{ aspectRatio: "100/112" }}>
          <path d={path} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.6" opacity="0.55" />
          {cities.map((c, i) => {
            const q = proj(c.coord[0], c.coord[1]);
            const status = PRIORITY.find((s) => c.statuses.has(s)) || "nouveau";
            const r = Math.min(5.5, 2 + Math.sqrt(c.count) * 0.9);
            return <g key={i}>
              <circle cx={q.x} cy={q.y} r={r} fill={STATUS_COLOR[status]} opacity="0.85" stroke="#fff" strokeWidth="0.5" />
              {c.count > 1 && <text x={q.x} y={q.y + 1.1} textAnchor="middle" fontSize="3.2" fill="#fff" fontWeight="700">{c.count}</text>}
            </g>;
          })}
        </svg>
        <div className="flex flex-row sm:flex-col flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {legend.map((x) => (
            <span key={x.k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[x.k] }} /> {x.l}</span>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-2">
        {placed} prospect{placed > 1 ? "s" : ""} localisé{placed > 1 ? "s" : ""} sur {cities.length} ville{cities.length > 1 ? "s" : ""}{unplaced > 0 ? ` · ${unplaced} sans ville reconnue` : ""}
      </p>
    </div>
  );
}
