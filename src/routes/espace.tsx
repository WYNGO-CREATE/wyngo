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
import { supabase, MARQUE_MDP } from "@/integrations/supabase/client";
import { Audience } from "@/components/espace/audience";
import "@/components/espace/theme.css";
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
    <div className="ga-espace grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm ga-monte">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="h-11 w-11 rounded-xl grid place-items-center font-bold text-lg text-white"
            style={{ background: "linear-gradient(145deg,hsl(222 47% 11%),hsl(222 40% 20%))",
                     boxShadow: "0 6px 20px -8px hsl(222 47% 11% / .6)" }}>A</div>
          <div className="leading-none">
            <div className="font-bold tracking-[0.08em] text-[15px]">GROUP ARSÈNE</div>
            <div className="text-[10px] uppercase tracking-[0.22em] ga-doux mt-1.5">Espace client</div>
          </div>
        </div>

        <form onSubmit={entrer} className="ga-carte p-7 space-y-4">
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
    <div className="space-y-5">
      {site.url_publique && (
        <a href={site.url_publique} target="_blank" rel="noreferrer"
          className="ga-carte inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-accent/40">
          Voir mon site <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {site.echeance && site.etape !== "live" && site.etape !== "care" && (
        <p className="text-sm ga-doux">
          Livraison prévue le {new Date(site.echeance).toLocaleDateString("fr-FR",
            { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      )}

      {site.etape === "review" && !site.maquette_validee_le && (
        <div className="ga-carte ga-monte p-5 space-y-3 ring-1 ring-primary/30"
          style={{ background: "linear-gradient(135deg,hsl(226 79% 50% / .05),transparent 70%)" }}>
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

      <ol className="space-y-2.5">
        {ETAPES.map((e, i) => {
          const fait = i < idx, encours = i === idx;
          return (
            <li key={e.cle} className={cn(
              "ga-carte ga-monte flex gap-4 p-4",
              `ga-d${Math.min(i + 1, 6)}`,
              encours && "ring-1 ring-primary/25",
              fait && "opacity-60",
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
      <div className="ga-carte p-5 min-h-[260px] space-y-3">
        {msgs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Une question, une photo à envoyer, un texte à corriger ? Écrivez-nous ici.
          </p>
        )}
        {msgs.map((m) => {
          const client = m.author === "client";
          return (
            <div key={m.id} className={cn("flex", client ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ga-monte",
                client
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md")}>
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
      <div className="ga-carte ga-monte p-5">
        <h3 className="font-semibold mb-3">Mon compte</h3>
        <dl className="text-sm">
          <dt className="text-muted-foreground">Email de connexion</dt>
          <dd className="font-medium mt-0.5">{email}</dd>
        </dl>
      </div>

      <form onSubmit={changer} className="ga-carte ga-monte ga-d2 p-5 space-y-3">
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

/** Premier passage : le client choisit son mot de passe lui-même. */
function ChoisirMotDePasse({ onFini }: { onFini: () => void }) {
  const [mdp, setMdp] = useState("");
  const [encore, setEncore] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mdp.length < 8) { toast.error("Choisissez au moins 8 caractères."); return; }
    if (mdp !== encore) { toast.error("Les deux mots de passe ne correspondent pas."); return; }
    setEnvoi(true);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnvoi(false);
    if (error) { toast.error(error.message); return; }
    // On nettoie le jeton resté dans l'adresse : il ne doit pas traîner.
    try { sessionStorage.removeItem(MARQUE_MDP); } catch { /* mode privé */ }
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    toast.success("C'est enregistré — bienvenue.");
    onFini();
  };

  return (
    <div className="ga-espace grid place-items-center px-4 py-12">
      <form onSubmit={valider} className="w-full max-w-sm space-y-4 ga-monte">
        <div className="flex items-center gap-3 justify-center mb-2">
          <div className="h-11 w-11 rounded-xl grid place-items-center font-bold text-lg text-white"
            style={{ background: "linear-gradient(145deg,hsl(222 47% 11%),hsl(222 40% 20%))" }}>A</div>
          <div className="leading-none">
            <div className="font-bold tracking-wide">GROUP ARSÈNE</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Espace client</div>
          </div>
        </div>
        <div className="ga-carte p-7 space-y-4">
          <div>
            <h1 className="text-lg font-semibold">Choisissez votre mot de passe</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Il vous servira à revenir sur votre espace. Personne chez Group Arsène ne le connaîtra.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mot de passe</label>
            <input type="password" required value={mdp} onChange={(e) => setMdp(e.target.value)}
              autoComplete="new-password" className="w-full h-10 rounded-lg border bg-background px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirmer</label>
            <input type="password" required value={encore} onChange={(e) => setEncore(e.target.value)}
              autoComplete="new-password" className="w-full h-10 rounded-lg border bg-background px-3 text-sm" />
          </div>
          <button type="submit" disabled={envoi}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {envoi && <Loader2 className="h-4 w-4 animate-spin" />} Entrer dans mon espace
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────── L'espace ───────────────────────────

function Espace() {
  const [session, setSession] = useState<any>(undefined);
  const [onglet, setOnglet] = useState<"projet" | "audience" | "messages" | "compte">("projet");
  // Arrivée par le lien d'invitation : le client est connecté, mais il n'a
  // encore aucun mot de passe. Sans cet écran il ne pourrait jamais revenir.
  const [aDefinir, setADefinir] = useState(false);

  useEffect(() => {
    // Le drapeau est posé par le module supabase, avant toute redirection.
    try { if (sessionStorage.getItem(MARQUE_MDP)) setADefinir(true); } catch { /* mode privé */ }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      setSession(s);
      if (e === "PASSWORD_RECOVERY") setADefinir(true);
    });
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

  if (aDefinir) return <ChoisirMotDePasse onFini={() => setADefinir(false)} />;

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
    <div className="ga-espace">
      {/* Le bandeau d'encre : c'est lui qui donne le ton dès l'ouverture. */}
      <header className="ga-entete">
        <div className="max-w-5xl mx-auto px-5 pt-6 pb-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl grid place-items-center font-bold text-lg flex-shrink-0"
                style={{ background: "rgba(255,255,255,.10)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.16)" }}>
                A
              </div>
              <div className="leading-none min-w-0">
                <div className="font-bold tracking-[0.08em] text-[13px]">GROUP ARSÈNE</div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/45 mt-1.5">Espace client</div>
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut()}
              className="inline-flex items-center gap-1.5 text-[13px] text-white/55 hover:text-white transition-colors">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Se déconnecter</span>
            </button>
          </div>

          <div className="mt-7 mb-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">
              {s.nom_client ? `Bonjour ${s.nom_client}` : "Votre projet"}
            </p>
            <h1 className="text-[26px] sm:text-[30px] font-semibold mt-1.5 tracking-[-0.02em]">
              {s.titre || "Votre site"}
            </h1>
            <p className="text-sm text-white/50 mt-1.5">
              {enLigne ? "En ligne et suivi par Group Arsène."
                : "Votre site est en cours de fabrication."}
            </p>
          </div>

          <nav className="flex gap-6 overflow-x-auto border-t border-white/10 pt-3 -mb-px">
            {onglets.map((o) => (
              <button key={o.cle} onClick={() => setOnglet(o.cle)} data-actif={onglet === o.cle}
                className="ga-onglet inline-flex items-center gap-1.5 pb-3 text-[13.5px]">
                <o.icone className="h-4 w-4" /> {o.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="ga-monte">
          {onglet === "projet" && <Projet site={s} />}
          {onglet === "audience" && enLigne && <Audience siteId={s.site_id} />}
          {onglet === "messages" && <Messages siteId={s.site_id} />}
          {onglet === "compte" && <Compte email={session.user?.email ?? ""} />}
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-5 pb-12 pt-2 text-center text-[11px] ga-doux">
        Group Arsène · contact@grouparsene.fr
      </footer>
    </div>
  );
}
