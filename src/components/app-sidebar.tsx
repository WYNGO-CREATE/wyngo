import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Euro,
  Users,
  CalendarClock,
  CalendarDays,
  BarChart3,
  UserCog,
  LogOut,
  Kanban,
  User,
  Inbox,
  Sparkles,
  Headphones,
  Target,
  Rocket,
  Receipt,
  FileBarChart,
  FileSignature,
  Radar,
  Crown,
  Crosshair,
  Map,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { role, user, signOut } = useAuth();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  // Badge: relances dues aujourd'hui ou en retard, pour l'utilisateur courant
  const { data: dueCount = 0 } = useQuery({
    queryKey: ["due-followups", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const { count } = await supabase
        .from("follow_ups")
        .select("*", { count: "exact", head: true })
        .eq("completed", false)
        .lte("scheduled_at", end.toISOString());
      return count ?? 0;
    },
  });

  // Badge: messages non lus dans l'inbox
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["inbox-unread", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false)
        .eq("is_archived", false);
      return count ?? 0;
    },
  });

  // La page "Prospects froids" a été supprimée du menu : les prospects froids
  // (>30j sans interaction) sont désormais intégrés au cockpit /relances et
  // visibles via le smart-tag "Froid" sur la fiche prospect.

  type NavItem = { title: string; url: string; icon: typeof Users; badge: number };

  // ── Ce que chacun voit ────────────────────────────────────────────
  //
  // Le CRM sert deux métiers différents. Hugo PILOTE l'entreprise : la
  // trésorerie, les contrats, la production, ce qu'il doit à ses
  // prestataires. Les collaborateurs PROSPECTENT et facturent leur
  // commission : le reste ne les concerne pas, et leur montrer le chiffre
  // d'affaires de la maison n'a aucun sens.
  //
  // On ne masque pas seulement les liens : chaque page réservée refuse aussi
  // l'accès direct par l'URL (cf. `AdminSeul`), et les données sont
  // cloisonnées par les politiques de sécurité en base. Trois couches, parce
  // qu'un menu caché n'a jamais protégé personne.
  const estAdmin = role === "admin";

  const activeWorkspace: "prospection" | "chasse" | "studio" | "facturation" | "agenda" | "pilotage" | "revenus" =
    currentPath.startsWith("/chasse") || currentPath.startsWith("/conquete") ? "chasse"
    : currentPath.startsWith("/studio") ? "studio"
    : currentPath.startsWith("/facturation") ? "facturation"
    : currentPath.startsWith("/agenda") ? "agenda"
    : currentPath.startsWith("/pilotage") ? "pilotage"
    : currentPath.startsWith("/revenus") ? "revenus"
    : "prospection";

  const pilotageItems: NavItem[] = [
    { title: "Vue d'ensemble", url: "/pilotage", icon: BarChart3, badge: 0 },
  ];

  const revenusItems: NavItem[] = [
    { title: "Ce que je gagne", url: "/revenus", icon: Euro, badge: 0 },
  ];

  const prospectionItems: NavItem[] = [
    { title: "Tableau de bord", url: "/tableau", icon: LayoutDashboard, badge: 0 },
    { title: "Inbox", url: "/inbox", icon: Inbox, badge: unreadCount },
    { title: "Prospects", url: "/prospects", icon: Users, badge: 0 },
    { title: "Statut prospect", url: "/pipeline", icon: Kanban, badge: 0 },
    { title: "À faire aujourd'hui", url: "/relances", icon: CalendarClock, badge: dueCount },
    { title: "Génération d'emails", url: "/templates", icon: Sparkles, badge: 0 },
    { title: "Scripts d'appel", url: "/scripts", icon: Headphones, badge: 0 },
  ];

  // Univers « Chasse » : les deux moteurs de prospection à froid.
  const chasseItems: NavItem[] = [
    { title: "Chasse aux prospects", url: "/chasse", icon: Target, badge: 0 },
    { title: "Chasse Premium", url: "/chasse-premium", icon: Crown, badge: 0 },
    { title: "Carte de conquête", url: "/conquete", icon: Map, badge: 0 },
  ];

  const studioItems: NavItem[] = [
    { title: "Production", url: "/studio", icon: Rocket, badge: 0 },
  ];

  // Un collaborateur facture aussi — Group Arsène, ou n'importe quel autre
  // client. Il garde donc devis, factures, déclarations et sa propre identité
  // de facturation. Ce qu'il n'a pas : les contrats de l'agence et les
  // factures des autres prestataires.
  const facturationItems: NavItem[] = [
    { title: "Tableau de bord", url: "/facturation", icon: LayoutDashboard, badge: 0 },
    ...(estAdmin
      ? [{ title: "Contrats", url: "/facturation/contrats", icon: FileSignature, badge: 0 }]
      : []),
    { title: "Déclarations", url: "/facturation/declarations", icon: FileBarChart, badge: 0 },
    // Les factures que Group Arsène établit AU NOM de ses prestataires
    // (autofacturation) — à ne pas confondre avec les factures clients.
    ...(estAdmin
      ? [{ title: "Prestataires", url: "/facturation/prestataires", icon: Users, badge: 0 }]
      : []),
    { title: "Mon identité", url: "/facturation/reglages", icon: UserCog, badge: 0 },
  ];

  const agendaItems: NavItem[] = [
    { title: "Mes rendez-vous", url: "/agenda", icon: CalendarDays, badge: 0 },
  ];

  const mainItems = activeWorkspace === "chasse" ? chasseItems
    : activeWorkspace === "studio" ? studioItems
    : activeWorkspace === "facturation" ? facturationItems
    : activeWorkspace === "agenda" ? agendaItems
    : activeWorkspace === "pilotage" ? pilotageItems
    : activeWorkspace === "revenus" ? revenusItems
    : prospectionItems;

  // Items "compte", communs aux deux univers
  const accountItems: NavItem[] = [];
  if (role === "admin") accountItems.push({ title: "Équipe", url: "/equipe", icon: UserCog, badge: 0 });
  accountItems.push({ title: "Le Radar Tech", url: "/redaction", icon: Radar, badge: 0 });
  accountItems.push({ title: "Mon profil", url: "/profil", icon: User, badge: 0 });

  const renderItem = (item: NavItem) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={isActive(item.url)}>
        <Link to={item.url} className="flex items-center gap-2">
          <item.icon className="h-4 w-4" />
          <span className="flex-1">{item.title}</span>
          {item.badge > 0 && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-semibold min-w-[18px] text-center">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="px-2 py-2 space-y-2">
          <BrandLogo size={32} wordmarkClassName="text-sidebar-foreground" />
          <div>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
            {role === "admin" && (
              <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary-foreground font-medium ring-1 ring-primary/40">
                Admin
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* ── Sélecteur d'univers (liste verticale, noms complets) ── */}
        <div className="px-2 pt-1 pb-2">
          <p className="px-1 pb-1 text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/40">Univers</p>
          <div className="flex flex-col gap-1 rounded-lg bg-sidebar-accent/30 p-1">
            {(estAdmin
              ? [
                  { ws: "pilotage", to: "/pilotage", icon: BarChart3, label: "Pilotage" },
                  { ws: "prospection", to: "/tableau", icon: Target, label: "Prospection" },
                  { ws: "chasse", to: "/chasse", icon: Crosshair, label: "Chasse" },
                  { ws: "studio", to: "/studio", icon: Rocket, label: "Studio" },
                  { ws: "facturation", to: "/facturation", icon: Receipt, label: "Facturation" },
                  { ws: "agenda", to: "/agenda", icon: CalendarDays, label: "Agenda" },
                ]
              // Le collaborateur ne pilote pas l'entreprise : il gagne sa vie.
              // « Mes revenus » prend la place du Pilotage, et le Studio
              // disparaît — la production n'est pas son métier.
              : [
                  { ws: "revenus", to: "/revenus", icon: Euro, label: "Mes revenus" },
                  { ws: "prospection", to: "/tableau", icon: Target, label: "Prospection" },
                  { ws: "chasse", to: "/chasse", icon: Crosshair, label: "Chasse" },
                  { ws: "facturation", to: "/facturation", icon: Receipt, label: "Facturation" },
                  { ws: "agenda", to: "/agenda", icon: CalendarDays, label: "Mon agenda" },
                ]
            ).map((w) => (
              <Link key={w.ws} to={w.to} className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-semibold transition",
                activeWorkspace === w.ws
                  ? "bg-sidebar text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar/50")}>
                <w.icon className="h-4 w-4 shrink-0" /> {w.label}
              </Link>
            ))}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{activeWorkspace === "chasse" ? "Chasse"
            : activeWorkspace === "studio" ? "Studio — Production" : activeWorkspace === "facturation" ? "Facturation" : activeWorkspace === "agenda" ? "Agenda" : activeWorkspace === "pilotage" ? "Pilotage" : activeWorkspace === "revenus" ? "Mes revenus" : "Prospection"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Compte</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{accountItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
