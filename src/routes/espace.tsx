/**
 * ─── L'espace client Group Arsène ─────────────────────────────────────
 *
 * Publique par son adresse, privée par son contenu : on arrive sur une
 * connexion, et l'on ne voit ensuite que son propre site.
 *
 * Quatre sections, dans l'ordre où elles servent au fil de la relation :
 *   1. Mon projet   — où en est la fabrication du site
 *   2. Mon audience — une fois livré, qui vient et qui vous contacte
 *   3. Messages     — le fil avec l'agence
 *   4. Mon compte   — son email, son mot de passe
 *
 * L'audience n'apparaît qu'une fois le site en ligne : montrer un tableau de
 * bord vide pendant la fabrication ne ferait qu'inquiéter.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Audience } from "@/components/espace/audience";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Loader2, BarChart3, MessageSquare, UserCog, Rocket, Check,
  ExternalLink, LogOut, Send, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/espace")({
  component: Espace,
  head: () => ({ meta: [{ title: "Espace client — Group Arsène" }] }),
});

type MonSite = {
  site_id: string; titre: string | null; slug: string | null; domaine: string | null;
  url_publique: string | null; etape: string; echeance: string | null;
  publie_le: string | null; statut: string; nom_client: string | null;
  maquette_validee_le: string | null;
};

const ETAPES = [
  { cle: "brief",  titre: "Brief",       texte: "On rassemble vos informations, vos photos et vos textes." },
  { cle: "design", titre: "Conception",  texte: "Votre site prend forme : mise en page, couleurs, contenu." },
  { cle: "review", titre: "Validation",  texte: "Vous relisez, vous demandez vos ajustements." },
  { cle: "live",   titre: "En ligne",    texte: "Votre site est publié et visible de tous." },
  { cle: "care",   titre: "Suivi",       texte: "On veille, on met à jour, on améliore." },
];

// ─────────────────────────── Connexion ───────────────────────────

function Connexion({ onEntre }: { onEntre: () => void }) {
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [oubli, setOubli] = useState(false);

  const entrer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp });
    setEnvoi(false);
    if (error) {
      // On ne dit jamais si c'est l'email ou le mot de passe qui est faux :
      // ce serait dire à un inconnu quelles adresses existent.
      toast.error("Connexion impossible", { description: "Vérifiez votre email et votre mot de passe." });
      return;
    }
    onEntre();
  };

  const reinitialiser = async () => {
    if (!email.trim()) { toast.error("Indiquez d'abord votre email."); return; }
    setEnvoi(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/espace`,
    });
    setEnvoi(false);
    // Réponse identique dans les deux cas, pour la même raison.
    toast.success("C'est envoyé", {
      description: "Si un compte existe pour cette adresse, vous recevrez un lien dans quelques instants.",
    });
    if (error) console.warn(error.message);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="h-10 w-10 rounded-lg bg-foreground text-background grid place-items-center font-bold text-lg">A</div>
          <div className="leading-none">
            <div className="font-bold tracking-wide">GROUP ARSÈNE</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Espace client</div>
          </div>
        </div>

        <form onSubmit={entrer} className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h1 className="text-lg font-semibold">Bonjour</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Retrouvez votre projet et la fréquentation de votre site.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Votre email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mot de passe</label>
            <input type="password" required={!oubli} value={mdp} onChange={(e) => setMdp(e.target.value)}
              autoComplete="current-password"
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm" />
          </div>
          <button type="submit" disabled={envoi}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Entrer
          </button>
          <button type="button" onClick={reinitialiser}
            className="w-full text-xs text-muted-foreground hover:text-foreground">
            J'ai oublié mon mot de passe
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Un souci pour vous connecter ? Écrivez-nous à contact@grouparsene.fr
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────── Sections ───────────────────────────

function Projet({ site }: { site: MonSite }) {
  const qc = useQueryClient();
  const idx = Math.max(0, ETAPES.findIndex((e) => e.cle === site.etape));

  // La validation de maquette venait de l'ancien portail. C'est un jalon du
  // chantier : sans elle, l'agence ne sait pas si le client a dit oui.
  const valider = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("espace_valider_maquette");
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Merci — votre validation est enregistrée.");
      qc.invalidateQueries({ queryKey: ["mon-site"] });
      qc.invalidateQueries({ queryKey: ["espace-messages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold">{site.titre || "Votre site"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {site.etape === "live" || site.etape === "care"
                ? "Votre site est en ligne."
                : `Étape en cours : ${ETAPES[idx]?.titre.toLowerCase()}.`}
              {site.echeance && site.etape !== "live" && site.etape !== "care" && (
                <> Livraison prévue le {new Date(site.echeance).toLocaleDateString("fr-FR",
                  { day: "numeric", month: "long", year: "numeric" })}.</>
              )}
            </p>
          </div>
          {site.url_publique && (
            <a href={site.url_publique} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm hover:bg-accent">
              Voir mon site <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {site.etape === "review" && !site.maquette_validee_le && (
        <div className="rounded-2xl border border-primary bg-primary/[0.04] p-5 space-y-3">
          <div>
            <p className="font-semibold">Votre maquette vous attend</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Regardez-la tranquillement. Si quelque chose ne va pas, dites-le dans
              Messages — on ajuste. Sinon, validez et on met en ligne.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {site.url_publique && (
              <a href={site.url_publique} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border text-sm hover:bg-accent">
                Voir la maquette <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button onClick={() => valider.mutate()} disabled={valider.isPending}
              className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">
              {valider.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Je valide cette maquette
            </button>
          </div>
        </div>
      )}

      {site.maquette_validee_le && (
        <p className="text-sm text-emerald-700 dark:text-emerald-500 flex items-center gap-2">
          <Check className="h-4 w-4" />
          Vous avez validé la maquette le{" "}
          {new Date(site.maquette_validee_le).toLocaleDateString("fr-FR",
            { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      )}

      <ol className="space-y-3">
        {ETAPES.map((e, i) => {
          const fait = i < idx, encours = i === idx;
          return (
            <li key={e.cle} className={cn(
              "flex gap-4 rounded-xl border p-4 transition",
              encours && "border-primary ring-1 ring-primary/20 bg-primary/[0.03]",
              fait && "opacity-70",
            )}>
              <span className={cn(
                "h-7 w-7 rounded-full grid place-items-center flex-shrink-0 text-xs font-semibold",
                fait ? "bg-emerald-500 text-white"
                  : encours ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
              )}>
                {fait ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  {e.titre}
                  {encours && <span className="ml-2 text-xs font-normal text-primary">en cours</span>}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{e.texte}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Messages({ siteId }: { siteId: string }) {
  const qc = useQueryClient();
  const [texte, setTexte] = useState("");

  const fil = useQuery({
    queryKey: ["espace-messages", siteId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("espace_messages");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const envoyer = useMutation({
    mutationFn: async () => {
      const t = texte.trim();
      if (!t) return;
      const { error } = await (supabase as any).rpc("espace_ecrire", { p_texte: t });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setTexte(""); qc.invalidateQueries({ queryKey: ["espace-messages", siteId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const msgs = (fil.data ?? []) as any[];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 min-h-[240px] space-y-3">
        {msgs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Une question, une photo à envoyer, un texte à corriger ? Écrivez-nous ici.
          </p>
        )}
        {msgs.map((m) => {
          const client = m.author === "client";
          return (
            <div key={m.id} className={cn("flex", client ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                client ? "bg-primary text-primary-foreground" : "bg-muted")}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={cn("text-[10px] mt-1", client ? "opacity-70" : "text-muted-foreground")}>
                  {new Date(m.created_at).toLocaleString("fr-FR",
                    { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); envoyer.mutate(); }} className="flex gap-2">
        <input value={texte} onChange={(e) => setTexte(e.target.value)}
          placeholder="Votre message…"
          className="flex-1 h-11 rounded-lg border bg-background px-3.5 text-sm" />
        <button type="submit" disabled={!texte.trim() || envoyer.isPending}
          className="h-11 px-4 rounded-lg bg-primary text-primary-foreground inline-flex items-center gap-2 disabled:opacity-50">
          {envoyer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Envoyer
        </button>
      </form>
    </div>
  );
}

function Compte({ email }: { email: string }) {
  const [mdp, setMdp] = useState("");
  const [encore, setEncore] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const changer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mdp.length < 8) { toast.error("Choisissez au moins 8 caractères."); return; }
    if (mdp !== encore) { toast.error("Les deux mots de passe ne correspondent pas."); return; }
    setEnvoi(true);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnvoi(false);
    if (error) { toast.error(error.message); return; }
    setMdp(""); setEncore("");
    toast.success("Mot de passe modifié.");
  };

  return (
    <div className="space-y-5 max-w-md">
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-semibold mb-3">Mon compte</h3>
        <dl className="text-sm">
          <dt className="text-muted-foreground">Email de connexion</dt>
          <dd className="font-medium mt-0.5">{email}</dd>
        </dl>
      </div>

      <form onSubmit={changer} className="rounded-2xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold">Changer mon mot de passe</h3>
        <div className="space-y-1.5">
          <label className="text-sm">Nouveau mot de passe</label>
          <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)}
            autoComplete="new-password"
            className="w-full h-10 rounded-lg border bg-background px-3 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm">Confirmer</label>
          <input type="password" value={encore} onChange={(e) => setEncore(e.target.value)}
            autoComplete="new-password"
            className="w-full h-10 rounded-lg border bg-background px-3 text-sm" />
        </div>
        <button type="submit" disabled={envoi}
          className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">
          {envoi && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
        </button>
      </form>

      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
        Votre site ne dépose aucun cookie de mesure et ne conserve aucune adresse IP :
        vos visiteurs ne voient donc aucun bandeau à accepter.
      </p>
    </div>
  );
}

// ─────────────────────────── L'espace ───────────────────────────

function Espace() {
  const [session, setSession] = useState<any>(undefined);
  const [onglet, setOnglet] = useState<"projet" | "audience" | "messages" | "compte">("projet");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const site = useQuery({
    queryKey: ["mon-site"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("mon_site");
      if (error) throw new Error(error.message);
      return ((data || [])[0] ?? null) as MonSite | null;
    },
  });

  if (session === undefined) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!session) return <Connexion onEntre={() => site.refetch()} />;

  if (site.isLoading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // Connecté, mais ce compte n'est pas un client — un collaborateur qui se
  // trompe d'adresse, par exemple.
  if (!site.data) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-center">
        <div className="max-w-sm space-y-3">
          <h1 className="text-lg font-semibold">Aucun espace rattaché à ce compte</h1>
          <p className="text-sm text-muted-foreground">
            Cette adresse n'est associée à aucun site. Si vous êtes client de Group Arsène,
            écrivez-nous à contact@grouparsene.fr.
          </p>
          <button onClick={() => supabase.auth.signOut()}
            className="text-sm underline text-muted-foreground">Se déconnecter</button>
        </div>
      </div>
    );
  }

  const s = site.data;
  const enLigne = s.etape === "live" || s.etape === "care" || s.statut === "published";

  const onglets = [
    { cle: "projet" as const, label: "Mon projet", icone: Rocket, actif: true },
    { cle: "audience" as const, label: "Mon audience", icone: BarChart3, actif: enLigne },
    { cle: "messages" as const, label: "Messages", icone: MessageSquare, actif: true },
    { cle: "compte" as const, label: "Mon compte", icone: UserCog, actif: true },
  ].filter((o) => o.actif);

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-foreground text-background grid place-items-center font-bold">A</div>
          <div className="leading-none min-w-0">
            <div className="font-bold tracking-wide text-sm">GROUP ARSÈNE</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1 truncate">
              {s.nom_client || s.titre || "Espace client"}
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Se déconnecter</span>
          </button>
        </div>
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {onglets.map((o) => (
            <button key={o.cle} onClick={() => setOnglet(o.cle)}
              className={cn("inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap transition",
                onglet === o.cle
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground")}>
              <o.icone className="h-4 w-4" /> {o.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {onglet === "projet" && <Projet site={s} />}
        {onglet === "audience" && enLigne && <Audience siteId={s.site_id} />}
        {onglet === "messages" && <Messages siteId={s.site_id} />}
        {onglet === "compte" && <Compte email={session.user?.email ?? ""} />}
      </main>

      <footer className="max-w-5xl mx-auto px-4 pb-10 pt-4 text-center text-xs text-muted-foreground">
        Group Arsène · contact@grouparsene.fr
      </footer>
    </div>
  );
}
