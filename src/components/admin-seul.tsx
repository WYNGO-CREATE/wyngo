/**
 * ─── Les pages réservées à l'administrateur ───────────────────────────
 *
 * Masquer un lien dans le menu ne protège rien : l'URL reste tapable, et le
 * navigateur d'un collaborateur curieux la retrouve dans son historique.
 *
 * Ce garde-fou est la deuxième des trois couches. La première est le menu
 * (on ne propose pas ce qui ne concerne pas), la troisième — la seule qui
 * protège vraiment — est le cloisonnement des données en base. Celle-ci
 * existe pour que l'expérience soit honnête : on dit clairement « ce n'est
 * pas pour vous » au lieu d'afficher un écran vide qui ressemble à un bug.
 */

import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from "lucide-react";

export function AdminSeul({ children, quoi }: { children: React.ReactNode; quoi: string }) {
  const { role, loading } = useAuth() as { role: string | null; loading?: boolean };

  // Tant que le rôle n'est pas connu, on n'affiche ni le contenu ni le refus :
  // faire clignoter « accès refusé » à l'administrateur à chaque chargement
  // serait insupportable.
  if (loading || role === null) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  }

  if (role !== "admin") {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h1 className="text-lg font-semibold">{quoi} — réservé à la direction</h1>
            <p className="text-sm text-muted-foreground">
              Cette page concerne la gestion de l'agence. Votre espace, lui,
              regroupe vos prospects, vos rendez-vous et ce que vous gagnez.
            </p>
            <Button asChild size="sm" className="gap-1.5 mt-1">
              <Link to="/revenus"><ArrowLeft className="h-4 w-4" /> Retour à mon espace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
