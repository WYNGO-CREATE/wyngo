import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RadiographiePanel } from "@/components/radiographie-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Phone, Copy, Check, Search, Loader2, Wand2, ExternalLink } from "lucide-react";
import { CallFiche, type Fiche } from "@/components/call-fiche";
import { toast } from "sonner";

/**
 * Drawer latéral "Mode appel" affiché depuis la fiche d'un prospect.
 * Affiche les scripts d'ouverture + la banque d'objections, avec les variables
 * remplacées par les vraies infos du prospect (prénom, entreprise…).
 */


type Prospect = {
  id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone?: string | null;
  website?: string | null;
  title?: string | null;
  location?: string | null;
};

export function CallModeDrawer({
  prospect, open, onOpenChange,
}: {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto p-0"
      >
        <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Mode appel
          </SheetTitle>
          <SheetDescription>
            {prospect
              ? <>Fiche d'arguments pour <strong>{prospect.first_name} {prospect.last_name}</strong>{prospect.company ? ` · ${prospect.company}` : ""}.</>
              : "Sélectionnez un prospect pour générer sa fiche d'appel."}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-5 space-y-6">
          {/* LA FICHE — le cœur : analyse marché + arguments chiffrés */}
          {/* La radiographie d'abord : elle ne coûte rien et ne dépend d'aucune
              donnée payante. L'analyse concurrentielle vient après, quand on
              veut nommer ceux qui dominent déjà le web. */}
          {prospect && (
            <RadiographiePanel
              prospectId={prospect.id}
              ville={prospect.location}
            />
          )}
          {prospect && <MarketPanel prospectId={prospect.id} prospectName={prospect.first_name} />}

          {/* Les trames d'ouverture ont été retirées du Mode appel : Hugo ne
              s'en servait pas. La radiographie donne déjà l'angle et les
              vingt premières secondes, taillés pour CE prospect — une trame
              générique à côté n'ajoutait qu'un pli à déplier.
              Les scripts restent accessibles depuis l'écran « Scripts
              d'appel », qui est leur place. */}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Analyse marché (concurrents réels vérifiés) + script sur-mesure, dans le Mode appel.
function MarketPanel({ prospectId, prospectName }: { prospectId: string; prospectName?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{
    competitors?: { name: string; website: string; reviews: number }[];
    fiche?: Fiche | null;
    warning?: string;
    query?: string;
    error?: string;
  } | null>(null);
  const run = async () => {
    setLoading(true);
    setRes(null);
    const { data, error } = await supabase.functions.invoke("market-script", { body: { prospect_id: prospectId } });
    setLoading(false);
    if (error) { setRes({ error: error.message || "Analyse impossible (erreur serveur)" }); toast.error("Analyse impossible", { description: error.message }); return; }
    setRes(data);
    if (data?.warning) toast.info(data.warning);
  };
  const comps = res?.competitors || [];
  return (
    <div className="rounded-lg border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 p-4 mb-5 space-y-2.5">
      <p className="text-xs uppercase tracking-wide font-semibold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
        <Search className="h-3.5 w-3.5" /> Analyse marché + script sur-mesure
      </p>
      <Button onClick={run} disabled={loading}
        className="w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        {loading ? "Analyse du marché en cours…" : res ? "Relancer l'analyse" : "Analyser le marché & générer le script"}
      </Button>
      {res?.error && (
        <p className="text-sm text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-md px-3 py-2">
          Erreur : {res.error}
        </p>
      )}
      {res && !res.error && comps.length === 0 && (
        <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-md px-3 py-2">
          {res.warning || "Aucun concurrent vérifié trouvé pour cette recherche."}
        </p>
      )}
      {res?.query && (
        <p className="text-[11px] text-muted-foreground">Recherche effectuée : « {res.query} »</p>
      )}
      {comps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Concurrents dominants — réels, sites vérifiés en direct :</p>
          {comps.map((c) => (
            <a key={c.website} href={c.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 text-sm rounded border bg-background/60 px-3 py-2 hover:border-violet-300">
              <span className="font-medium truncate">{c.name}</span>
              <span className="text-muted-foreground shrink-0 inline-flex items-center gap-1 text-xs">{c.reviews} avis <ExternalLink className="h-3 w-3" /></span>
            </a>
          ))}
        </div>
      )}
      {res?.fiche && (
        <div className="rounded border bg-background/60 p-3">
          <CallFiche fiche={res.fiche} prospectName={prospectName} />
        </div>
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="text-center py-12">
      <Phone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium">Aucun script enregistré</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Allez sur <strong>/scripts</strong> et cliquez « Importer le script de référence » pour démarrer.
      </p>
    </div>
  );
}
