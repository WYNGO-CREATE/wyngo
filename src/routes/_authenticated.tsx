import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
    // Un client n'a rien à faire dans le CRM. Il y atterrit pourtant après
    // avoir choisi son mot de passe : Supabase renvoie vers la racine du site,
    // et n'accepte pas toujours une adresse plus précise. Plutôt que de
    // dépendre d'un réglage de tableau de bord, on le renvoie ici — il ne peut
    // de toute façon rien voir, les politiques de sécurité l'en empêchent.
    const { data: estClient } = await (supabase as any).rpc("est_client");
    if (estClient) {
      throw redirect({ to: "/espace" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, session } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  }
  if (!session) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b px-2 gap-2">
            <SidebarTrigger />
            <GlobalSearch />
          </header>
          <main className="flex-1 p-6 bg-muted/20">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
