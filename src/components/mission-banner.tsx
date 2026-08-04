/**
 * ─── La mission du moment, rappelée dans la chasse ────────────────────
 *
 * L'écran Missions montre la carte et l'avancement. Mais c'est ici, au moment
 * de lancer une recherche, qu'on a besoin de savoir où aller — et de pouvoir
 * pré-remplir le formulaire d'un clic plutôt que de retaper métier et ville.
 *
 * C'est une proposition, jamais une contrainte : la chasse libre reste
 * accessible, on peut ignorer le bandeau.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

type Mission = {
  id: string; metier: string; commune: string; total_connu: number | null;
  verifies: number; cibles: number; appelees: number; etat: string;
};

export function MissionBanner({
  onPrendre,
}: {
  /** Pré-remplit la chasse avec le métier et la ville de la mission. */
  onPrendre?: (m: { metier: string; commune: string }) => void;
}) {
  const { data: m } = useQuery({
    queryKey: ["mission-courante"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("mission_courante");
      if (error) throw new Error(error.message);
      return ((data || [])[0] ?? null) as Mission | null;
    },
  });

  if (!m) return null;

  const reste = Math.max(0, Number(m.cibles) - Number(m.appelees));
  const aVerifier = Math.max(0, (m.total_connu ?? 0) - Number(m.verifies));

  return (
    <div className="flex items-center gap-3 flex-wrap rounded-lg border border-primary/40 bg-primary/5 px-4 py-2.5">
      <Compass className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="text-sm min-w-0">
        <span className="text-muted-foreground">Ta mission — </span>
        <b>{m.metier} à {m.commune}</b>
        <span className="text-muted-foreground">
          {aVerifier > 0 && <> · {aVerifier} à vérifier</>}
          {reste > 0 && <> · {reste} à appeler</>}
        </span>
      </div>
      {onPrendre && (
        <Button size="sm" variant="outline" className="ml-auto h-8 text-xs"
          onClick={() => onPrendre({ metier: m.metier, commune: m.commune })}>
          Chasser ce secteur
        </Button>
      )}
    </div>
  );
}
