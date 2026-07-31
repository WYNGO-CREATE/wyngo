/**
 * ─── Carte « Présentation de vente » (fiche prospect) ─────────────────
 * Hugo saisit son récap du 1er RDV (champs guidés + la tranche de prix
 * qu'il a annoncée), l'IA en tire une présentation de 7 diapos pour le 2e
 * RDV en visio, dont un configurateur d'options que le prospect manipule
 * en direct, + une fiche réponses PRIVÉE. Plein écran + export PDF.
 *
 * Le récap est la source des objections : sans lui, l'IA n'a pas le droit
 * d'en inventer une seule.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Presentation, Loader2, Sparkles, Play, RefreshCw, Mail, HelpCircle, ChevronDown, PenLine } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { renderPitchHtml, type PitchDeck } from "@/lib/pitch-html";

type Prospect = { id: string; company: string | null; first_name: string | null; last_name: string | null; email?: string | null; brief_activity?: string | null; industry?: string | null; location?: string | null };
type DeckRow = { id: string; headline: string | null; slides: unknown; preview_slug: string | null; created_at: string; sent_at: string | null; recap: Recap | null };

type QA = { q: string; r: string };
type Recap = { objectif?: string; objections?: string; budget?: string; delai?: string; decideur?: string; contexte?: string; valeur_client?: string; prix_min?: string; prix_max?: string; budget_non_aborde?: string; prix_mode?: string };

const MODES = [
  { v: "tranche", l: "Une fourchette" },
  { v: "apartir", l: "À partir de" },
  { v: "fixe", l: "Prix fixe" },
];

const VIDE: Recap = { objectif: "", objections: "", budget: "", delai: "", decideur: "", contexte: "", valeur_client: "", prix_min: "1800", prix_max: "2400", budget_non_aborde: "", prix_mode: "tranche" };

export function PitchCard({ prospect }: { prospect: Prospect }) {
  const qc = useQueryClient();
  const [qaOpen, setQaOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [recap, setRecap] = useState<Recap>(VIDE);
  const clientName = prospect.company || `${prospect.first_name || ""} ${prospect.last_name || ""}`.trim() || "Client";

  const { data: deck } = useQuery({
    queryKey: ["pitch-deck", prospect.id],
    queryFn: async () => (await supabase.from("pitch_decks").select("id, headline, slides, preview_slug, created_at, sent_at, recap").eq("prospect_id", prospect.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data as DeckRow | null,
  });

  // L'antisèche est stockée avec les diapos sous { kind: "faq" } : on l'en ressort
  // pour l'afficher ici, côté CRM — jamais dans le deck partagé au prospect.
  const qa: QA[] = (() => {
    const arr = Array.isArray(deck?.slides) ? (deck!.slides as Array<{ kind?: string; questions?: QA[] }>) : [];
    const f = arr.find((s) => s?.kind === "faq");
    return Array.isArray(f?.questions) ? f!.questions! : [];
  })();

  // On repart du dernier récap saisi : régénérer ne doit pas obliger à tout retaper.
  const ouvrirFormulaire = () => { setRecap({ ...VIDE, ...(deck?.recap || {}) }); setFormOpen(true); };

  const gen = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pitch-deck", { body: { prospect_id: prospect.id, recap } });
      // « Failed to send a request » = la fonction n'a pas répondu du tout
      // (indisponible ou coupée) : autant le dire clairement plutôt que
      // laisser le message technique brut.
      if (error) throw new Error(/failed to send/i.test(error.message)
        ? "Le service de génération n'a pas répondu. Réessaie dans une minute — si ça persiste, préviens-moi."
        : error.message);
      const res = data as { ok?: boolean; error?: string; message?: string };
      if (res?.error) throw new Error(res.message || "Génération impossible.");
      return res;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pitch-deck", prospect.id] }); setFormOpen(false); toast.success("Présentation générée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const buildHtml = (): string | null => {
    if (!deck) return null;
    const d: PitchDeck = { headline: deck.headline || clientName, slides: (Array.isArray(deck.slides) ? deck.slides : []) as PitchDeck["slides"] };
    return renderPitchHtml(d, { clientName, sector: prospect.brief_activity || prospect.industry, city: prospect.location, origin: window.location.origin });
  };

  const present = () => {
    const html = buildHtml();
    if (!html) return;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    else { const b = new Blob([html], { type: "text/html" }); window.open(URL.createObjectURL(b), "_blank"); }
  };

  const send = useMutation({
    mutationFn: async () => {
      if (!prospect.email) throw new Error("Renseigne l'email du prospect sur sa fiche.");
      const html = buildHtml();
      if (!html || !deck) throw new Error("Génère d'abord la présentation.");
      const { data, error } = await supabase.functions.invoke("pitch-send", { body: { prospect_id: prospect.id, deck_id: deck.id, html, origin: window.location.origin } });
      if (error) throw new Error(error.message);
      const res = data as { ok?: boolean; error?: string; message?: string };
      if (res?.error) throw new Error(res.message || "Envoi impossible.");
      return res;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pitch-deck", prospect.id] }); toast.success(`Présentation envoyée à ${prospect.email}`); },
    onError: (e: Error) => toast.error(e.message),
  });

  const champ = (k: keyof Recap, v: string) => setRecap((r) => ({ ...r, [k]: v }));
  const neuf = recap.budget_non_aborde === "1";
  const mode = recap.prix_mode || "tranche";

  const formulaire = (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">
        Ce que tu écris ici pilote toute la présentation. <b>Les objections viennent d'ici et de nulle part ailleurs</b> — l'IA n'a pas le droit d'en inventer une que le prospect n'a pas dite.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">Ce qu'il veut vraiment</Label>
        <Textarea rows={2} placeholder="Ex : être trouvé sur Google, arrêter de perdre du temps au téléphone à donner ses tarifs…"
          value={recap.objectif} onChange={(e) => champ("objectif", e.target.value)} className="text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Ce qui le freine — ses mots</Label>
        <Textarea rows={2} placeholder="Ex : « j'ai déjà eu une mauvaise expérience avec une agence », « c'est cher », « je n'ai pas le temps »…"
          value={recap.objections} onChange={(e) => champ("objections", e.target.value)} className="text-sm" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Budget évoqué</Label>
          <Input placeholder={neuf ? "—" : "Ex : ~2 000 €"} disabled={neuf} value={neuf ? "" : recap.budget}
            onChange={(e) => champ("budget", e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Échéance</Label>
          <Input placeholder="Ex : avant la rentrée" value={recap.delai} onChange={(e) => champ("delai", e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Qui décide</Label>
          <Input placeholder="Ex : lui + son associé" value={recap.decideur} onChange={(e) => champ("decideur", e.target.value)} className="text-sm" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Ce que lui rapporte un client — en moyenne</Label>
        <Input inputMode="numeric" placeholder="Ex : 1500" value={recap.valeur_client}
          onChange={(e) => champ("valeur_client", e.target.value)} className="text-sm" />
        <p className="text-[11px] text-muted-foreground">Le chiffre le plus utile de tout le récap. Il sert à calculer, avec <b>son</b> argent, ce que lui coûte un client manqué par mois — et en combien de clients le site est remboursé. Laisse vide si tu ne le sais pas.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Ce qu'il t'a raconté (libre)</Label>
        <Textarea rows={3} placeholder="Son métier, ses clients, ce qui l'a fait réagir, une anecdote qu'il a racontée…"
          value={recap.contexte} onChange={(e) => champ("contexte", e.target.value)} className="text-sm" />
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-2.5">
        <Checkbox checked={neuf} onCheckedChange={(v) => champ("budget_non_aborde", v ? "1" : "")} className="mt-0.5" />
        <span className="text-xs leading-relaxed">
          <b>On n'a pas parlé d'argent au 1er appel</b> — j'ouvre le sujet pendant ce rendez-vous.
          <span className="block text-muted-foreground">La présentation installe la valeur avant le chiffre, et la fiche réponses commence par les questions d'argent.</span>
        </span>
      </label>

      <div className="space-y-1.5">
        <Label className="text-xs">Comment tu annonces le prix du site</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {MODES.map((m) => (
            <button key={m.v} type="button" onClick={() => champ("prix_mode", m.v)}
              className={`rounded-md border px-2 py-1.5 text-xs transition ${mode === m.v ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted"}`}>
              {m.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          {mode === "apartir" && <span className="whitespace-nowrap text-xs text-muted-foreground">à partir de</span>}
          <Input inputMode="numeric" placeholder="1800" value={recap.prix_min} onChange={(e) => champ("prix_min", e.target.value)} className="text-sm" />
          {mode === "tranche" && <>
            <span className="text-xs text-muted-foreground">à</span>
            <Input inputMode="numeric" placeholder="2400" value={recap.prix_max} onChange={(e) => champ("prix_max", e.target.value)} className="text-sm" />
          </>}
          <span className="text-xs text-muted-foreground">€</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {mode === "tranche"
            ? "La présentation affiche la fourchette, avec le détail de ce qui fait monter vers le haut."
            : "La présentation affiche ce seul montant — la colonne « ce qui fait monter le prix » disparaît."}
          {" "}Les options s'ajoutent par-dessus, et le prospect les coche lui-même pendant la visio.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" className="gap-1.5" disabled={gen.isPending} onClick={() => gen.mutate()}>
          {gen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {gen.isPending ? "Génération… (environ 1 min)" : "Générer la présentation"}
        </Button>
        {deck && <Button variant="ghost" size="sm" disabled={gen.isPending} onClick={() => setFormOpen(false)}>Annuler</Button>}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Presentation className="h-4 w-4 text-primary" /> Présentation de vente <span className="text-[10px] font-normal text-muted-foreground">(2e RDV)</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!deck && !formOpen && (
          <>
            <p className="text-sm text-muted-foreground">Tu fais le récap de ton 1er rendez-vous, l'IA en tire une présentation de 7 diapos taillée pour ce client — à montrer en visio ou à exporter en PDF. La dernière diapo est un <b>configurateur</b> : le prospect coche les options qu'il veut et voit le total bouger en direct. Plus une <b>fiche réponses privée</b> aux questions qu'il va poser.</p>
            <Button size="sm" className="gap-1.5" onClick={ouvrirFormulaire}><PenLine className="h-3.5 w-3.5" /> Faire le récap du 1er RDV</Button>
          </>
        )}

        {formOpen && formulaire}

        {deck && !formOpen && (
          <>
            <p className="text-sm font-medium truncate">« {deck.headline || clientName} »</p>
            <p className="text-xs text-muted-foreground">Générée le {format(new Date(deck.created_at), "PP 'à' HH'h'mm", { locale: fr })}</p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" className="gap-1.5" onClick={present}><Play className="h-3.5 w-3.5" /> Présenter / PDF</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={ouvrirFormulaire}><RefreshCw className="h-3.5 w-3.5" /> Modifier le récap et régénérer</Button>
              <Button variant="ghost" size="sm" className="gap-1.5" disabled={send.isPending} onClick={() => send.mutate()}>
                {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Envoyer au prospect
              </Button>
            </div>

            {qa.length > 0 && (
              <div className="rounded-md border bg-muted/30">
                <button type="button" onClick={() => setQaOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" />
                  Fiche réponses — {qa.length} questions probables
                  <span className="ml-auto flex items-center gap-1 font-normal text-muted-foreground">
                    pour toi uniquement <ChevronDown className={`h-3.5 w-3.5 transition-transform ${qaOpen ? "rotate-180" : ""}`} />
                  </span>
                </button>
                {qaOpen && (
                  <div className="space-y-2.5 border-t px-3 py-2.5">
                    {qa.map((item, i) => (
                      <div key={i}>
                        <p className="text-xs font-medium">{item.q}</p>
                        <p className="text-xs text-muted-foreground">{item.r}</p>
                      </div>
                    ))}
                    <p className="border-t pt-2 text-[10px] text-muted-foreground">Cette fiche ne s'affiche jamais dans la présentation partagée à l'écran.</p>
                  </div>
                )}
              </div>
            )}

            {deck.sent_at && <p className="text-[11px] text-emerald-600">✓ Envoyée au prospect le {format(new Date(deck.sent_at), "PP 'à' HH'h'mm", { locale: fr })}</p>}
            <p className="text-[11px] text-muted-foreground border-t pt-2">Chiffres issus de sources reconnues (Google, BrightLocal, France Num…). Vérifie ceux que tu cites si besoin.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
