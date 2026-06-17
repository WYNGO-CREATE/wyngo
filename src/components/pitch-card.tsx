/**
 * ─── Carte « Présentation de vente » (fiche prospect) ─────────────────
 * Génère un deck de 4 diapos pour le 2e RDV (chiffres réels sourcés +
 * mockup du futur site). Présentation plein écran + export PDF.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Presentation, Loader2, Sparkles, Play, RefreshCw, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { renderPitchHtml, type PitchDeck } from "@/lib/pitch-html";

type Prospect = { id: string; company: string | null; first_name: string | null; last_name: string | null; email?: string | null; brief_activity?: string | null; industry?: string | null; location?: string | null };
type DeckRow = { id: string; headline: string | null; slides: unknown; preview_slug: string | null; created_at: string; sent_at: string | null };

export function PitchCard({ prospect }: { prospect: Prospect }) {
  const qc = useQueryClient();
  const clientName = prospect.company || `${prospect.first_name || ""} ${prospect.last_name || ""}`.trim() || "Client";

  const { data: deck } = useQuery({
    queryKey: ["pitch-deck", prospect.id],
    queryFn: async () => (await supabase.from("pitch_decks").select("id, headline, slides, preview_slug, created_at, sent_at").eq("prospect_id", prospect.id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data as DeckRow | null,
  });

  // Dernier aperçu de site (mockup le plus à jour)
  const { data: preview } = useQuery({
    queryKey: ["latest-preview-slug", prospect.id],
    queryFn: async () => (await supabase.from("prospect_previews").select("slug").eq("prospect_id", prospect.id).order("generated_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const gen = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pitch-deck", { body: { prospect_id: prospect.id } });
      if (error) throw new Error(error.message);
      const res = data as { ok?: boolean; error?: string; message?: string };
      if (res?.error) throw new Error(res.message || "Génération impossible.");
      return res;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pitch-deck", prospect.id] }); toast.success("Présentation générée"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const buildHtml = (): string | null => {
    if (!deck) return null;
    const slug = preview?.slug || deck.preview_slug;
    const previewUrl = slug ? `${window.location.origin}/p/${slug}` : null;
    const d: PitchDeck = { headline: deck.headline || clientName, slides: (Array.isArray(deck.slides) ? deck.slides : []) as PitchDeck["slides"] };
    return renderPitchHtml(d, { clientName, sector: prospect.brief_activity || prospect.industry, city: prospect.location, previewUrl });
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

  return (
    <Card className="border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Presentation className="h-4 w-4 text-violet-600" /> Présentation de vente <span className="text-[10px] font-normal text-muted-foreground">(2e RDV)</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!deck ? (
          <>
            <p className="text-sm text-muted-foreground">Génère une présentation de 4 diapos taillée pour ce client : son constat, des <b>chiffres réels sourcés</b> de son marché, son <b>futur site</b>, et ton offre. À présenter pendant le 2e appel.</p>
            <Button size="sm" className="gap-1.5" disabled={gen.isPending} onClick={() => gen.mutate()}>
              {gen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Générer la présentation
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium truncate">« {deck.headline || clientName} »</p>
            <p className="text-xs text-muted-foreground">Générée le {format(new Date(deck.created_at), "PP 'à' HH'h'mm", { locale: fr })}{!(preview?.slug || deck.preview_slug) ? " · (génère l'Aperçu du site pour l'inclure)" : ""}</p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" className="gap-1.5" onClick={present}><Play className="h-3.5 w-3.5" /> Présenter / PDF</Button>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={send.isPending} onClick={() => send.mutate()}>
                {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Envoyer au prospect
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5" disabled={gen.isPending} onClick={() => gen.mutate()}>
                {gen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Régénérer
              </Button>
            </div>
            {deck.sent_at && <p className="text-[11px] text-emerald-600">✓ Envoyée au prospect le {format(new Date(deck.sent_at), "PP 'à' HH'h'mm", { locale: fr })}</p>}
            <p className="text-[11px] text-muted-foreground border-t pt-2">Chiffres issus de sources reconnues (Google, BrightLocal, France Num…). Vérifie ceux que tu cites si besoin.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
