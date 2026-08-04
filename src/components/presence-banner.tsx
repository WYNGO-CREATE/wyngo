/**
 * ─── Qui travaille cette fiche en ce moment ───────────────────────────
 *
 * La mémoire de prospection empêche deux collaborateurs de travailler la même
 * entreprise à des jours différents. Elle n'empêche pas qu'ils ouvrent la même
 * fiche à la même minute — et à quatre, ça arrivera.
 *
 * On signale sa présence toutes les 45 secondes. Le serveur périme toute
 * présence de plus de 2 minutes : fermer brutalement son onglet ne laisse donc
 * pas un verrou fantôme derrière soi.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

type Occupation = { occupe_par: string; depuis: string };

export function PresenceBanner({ prospectId }: { prospectId: string }) {
  const [occupe, setOccupe] = useState<Occupation | null>(null);

  useEffect(() => {
    let vivant = true;

    const signaler = async () => {
      const { data } = await (supabase as any).rpc("presence_signaler", { p_prospect: prospectId });
      if (!vivant) return;
      setOccupe(Array.isArray(data) && data.length > 0 ? data[0] : null);
    };

    signaler();
    const t = setInterval(signaler, 45_000);
    return () => {
      vivant = false;
      clearInterval(t);
      // On libère tout de suite en quittant, sans attendre la péremption.
      (supabase as any).from("presences").delete().eq("prospect_id", prospectId).then(() => {});
    };
  }, [prospectId]);

  if (!occupe) return null;

  const depuisMin = Math.max(1, Math.round((Date.now() - new Date(occupe.depuis).getTime()) / 60000));

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <Users className="h-4 w-4 flex-shrink-0" />
      <span>
        <b>{occupe.occupe_par}</b> est sur cette fiche depuis {depuisMin} min — évitez de l'appeler en même temps.
      </span>
    </div>
  );
}
