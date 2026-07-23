/**
 * ─── Chasse Premium ───────────────────────────────────────────────────────
 * Chasse dissociée de la chasse classique. Cible : entreprises ÉTABLIES
 * (qui tournent, ont du budget) dont le SITE WEB est FAIBLE → grosse marge.
 * Moteur : edge function `premium-hunt` (Places + audit site + Pappers +
 * score d'opportunité). Aucune invention.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Crown, Loader2, Search, Plus, ExternalLink, Check, X, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TRADES } from "@/lib/trades-catalog";

export const Route = createFileRoute("/_authenticated/chasse-premium")({
  component: ChassePremium,
});

type Candidate = {
  nom: string; secteur: string; adresse: string | null; telephone: string | null;
  website: string | null; avis: number | null; note: number | null;
  effectif: number; anciennete: number | null; siren: string | null;
  dirigeant: { prenom: string; nom: string; qualite: string } | null;
  site_score: number; load_ms: number | null; etablissement: number; faiblesse: number; opportunite: number; b2b: boolean;
  raisons: string[]; problemes: string[];
};

// Terme de recherche propre pour Google, à partir d'un métier du catalogue.
const cleanQuery = (label: string) => label.split(/[-–/]/)[0].trim();

function ChassePremium() {
  const [sectorInput, setSectorInput] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{ candidates?: Candidate[]; warning?: string; scanned?: number; city?: string } | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const addSector = (s: string) => {
    const v = cleanQuery(s).toLowerCase();
    if (v && !sectors.includes(v)) setSectors((p) => [...p, v]);
    setSectorInput("");
  };
  const removeSector = (s: string) => setSectors((p) => p.filter((x) => x !== s));

  // Suggestions issues du catalogue des 257 métiers (recherche live).
  const q = sectorInput.trim().toLowerCase();
  const matches = q.length >= 2
    ? TRADES.filter((t) => t.label.toLowerCase().includes(q) || t.sector.toLowerCase().includes(q))
        .filter((t) => !sectors.includes(cleanQuery(t.label).toLowerCase()))
        .slice(0, 10)
    : [];

  const run = async () => {
    if (sectors.length === 0) { toast.error("Ajoute au moins un secteur."); return; }
    if (!location.trim()) { toast.error("Indique une ville (ou ville + code postal)."); return; }
    setLoading(true); setRes(null); setAdded(new Set());
    const { data, error } = await supabase.functions.invoke("premium-hunt", {
      body: { sectors, location: location.trim(), limit: 20 },
    });
    setLoading(false);
    if (error) { toast.error("Chasse impossible", { description: error.message }); return; }
    setRes(data);
    if (data?.warning) toast.info(data.warning);
  };

  const addProspect = async (c: Candidate) => {
    const payload = {
      company: c.nom,
      first_name: c.dirigeant?.prenom || "Contact",
      last_name: c.dirigeant?.nom || c.nom.slice(0, 60),
      location: c.adresse || res?.city || location,
      brief_activity: c.secteur,
      industry: c.secteur,
      phone: c.telephone || null,
      website: c.website || null,
      custom_status: "premium",
    };
    const { error } = await supabase.from("prospects").insert(payload as never);
    if (error) { toast.error("Ajout impossible", { description: error.message }); return; }
    setAdded((p) => new Set(p).add(c.nom));
    toast.success(`${c.nom} ajouté à tes prospects (premium)`);
  };

  const oppTone = (o: number) =>
    o >= 60 ? "bg-emerald-600 text-white" : o >= 35 ? "bg-amber-500 text-white" : o >= 15 ? "bg-sky-500 text-white" : "bg-muted text-muted-foreground";

  const candidates = res?.candidates || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-500" /> Chasse Premium
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trouve les entreprises qui <strong>tournent déjà</strong> (donc ont du budget) mais dont le <strong>site web sous-performe</strong> — le meilleur profil pour une refonte. Analyse réelle : Google + audit du site + Pappers.
        </p>
      </div>

      {/* Formulaire */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="relative">
            <label className="text-sm font-medium">Secteurs à cibler <span className="text-xs font-normal text-muted-foreground">· {TRADES.length} métiers dans le catalogue</span></label>
            <div className="flex gap-2 mt-1.5">
              <Input value={sectorInput} onChange={(e) => setSectorInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSector(sectorInput); } }}
                placeholder="Tape un métier : notaire, cuisiniste, garage, PME industrie…" />
              <Button variant="outline" onClick={() => addSector(sectorInput)} disabled={!sectorInput.trim()}>Ajouter</Button>
            </div>
            {/* Suggestions live du catalogue */}
            {matches.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-md">
                {matches.map((t) => (
                  <button key={t.id} onClick={() => addSector(t.label)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent">
                    <span className="truncate">{t.label}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{t.category}</span>
                  </button>
                ))}
              </div>
            )}
            {sectors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {sectors.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeSector(s)}>
                    {s} <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              Astuce : ajoute plusieurs métiers pour ratisser large — la chasse les scanne tous et classe par opportunité. Tu peux aussi taper un métier libre non listé.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Ville (ou ville + code postal)</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") run(); }}
              placeholder="Ex : Toulouse  ·  31000 Toulouse" className="mt-1.5" />
          </div>
          <Button onClick={run} disabled={loading} className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Analyse du marché en cours… (~20 s)" : "Lancer la chasse premium"}
          </Button>
        </CardContent>
      </Card>

      {/* Résultats */}
      {res?.warning && candidates.length === 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{res.warning}</p>
      )}
      {candidates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {res?.scanned} établissements scannés · {candidates.length} analysés · classés par opportunité (établi × site faible).
          </p>
          {candidates.map((c) => (
            <Card key={c.nom} className={cn(c.opportunite >= 35 && "border-amber-300")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded", oppTone(c.opportunite))}>
                        Opportunité {c.opportunite}
                      </span>
                      {c.b2b && <Badge variant="outline" className="text-[10px]">B2B</Badge>}
                    </div>
                    <h3 className="font-semibold mt-1.5 leading-tight">{c.nom}</h3>
                    <p className="text-xs text-muted-foreground">{c.secteur}{c.adresse ? ` · ${c.adresse}` : ""}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.raisons.map((r, i) => (
                        <span key={i} className="text-[11px] rounded bg-muted px-1.5 py-0.5">{r}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      {c.note != null && <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {c.note}</span>}
                      <span className={cn(c.site_score < 50 && "text-rose-600 font-medium", c.site_score >= 80 && "text-emerald-600")}>Site : {c.site_score}/100</span>
                      {c.load_ms != null && <span className={cn(c.load_ms > 2500 && "text-rose-600")}>{(c.load_ms / 1000).toFixed(1)} s de chargement</span>}
                      {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-sky-600 hover:underline">site <ExternalLink className="h-3 w-3" /></a>}
                      {c.telephone && <span>{c.telephone}</span>}
                    </div>

                    {/* Audit critique du site — le vrai retour actionnable, ton adapté au score (honnête) */}
                    {c.problemes.length > 0 ? (
                      (() => {
                        const strong = c.site_score < 60;   // vrai levier de refonte
                        const box = strong ? "border-rose-200 bg-rose-50/60" : "border-amber-200 bg-amber-50/60";
                        const head = strong ? "text-rose-700" : "text-amber-700";
                        const dot = strong ? "bg-rose-500" : "bg-amber-500";
                        const txt = strong ? "text-rose-900/90" : "text-amber-900/90";
                        const n = c.problemes.length;
                        return (
                          <div className={cn("mt-3 rounded-md border p-2.5", box)}>
                            <p className={cn("text-[11px] font-semibold mb-1.5", head)}>
                              {strong
                                ? `${n} point${n > 1 ? "s" : ""} faible${n > 1 ? "s" : ""} du site — angle d'attaque`
                                : `Site déjà correct · ${n} détail${n > 1 ? "s" : ""} à peaufiner`}
                            </p>
                            <ul className="space-y-1">
                              {c.problemes.map((p, i) => (
                                <li key={i} className={cn("flex gap-1.5 text-[11px] leading-snug", txt)}>
                                  <span className={cn("mt-[3px] h-1 w-1 shrink-0 rounded-full", dot)} />
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5">
                        Site déjà solide — peu de leviers techniques. Classé en bas volontairement.
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant={added.has(c.nom) ? "outline" : "default"} disabled={added.has(c.nom)}
                    onClick={() => addProspect(c)} className="shrink-0 gap-1">
                    {added.has(c.nom) ? <><Check className="h-3.5 w-3.5" /> Ajouté</> : <><Plus className="h-3.5 w-3.5" /> Prospect</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
