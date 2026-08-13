/**
 * ─── Actualités du site — relire et publier ───────────────────────────
 *
 * Un brouillon est écrit chaque matin par la tâche planifiée. Il ne part
 * jamais en ligne tout seul : une bêtise sur le site de l'agence coûte plus
 * cher que sur un média.
 *
 * Cet écran existe parce que la première version ne proposait, pour publier,
 * qu'une requête SQL et trois commandes dans un terminal. Un geste quotidien
 * qui demande un terminal n'est pas un geste quotidien : il ne se fait pas.
 *
 * ── Ce que « publier » veut dire ici ──
 * Le site est statique : ses pages sont écrites sur disque, pas calculées à
 * la volée. Publier fait donc DEUX choses, et l'écran doit le dire
 * franchement, sinon Hugo attend devant une page qui n'a pas changé :
 *   1. l'article passe en `publie` — immédiat ;
 *   2. les pages sont regénérées et mises en ligne — à la prochaine course
 *      de la tâche planifiée, ou tout de suite via son bouton « Run now ».
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminSeul } from "@/components/admin-seul";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Newspaper, Eye, Check, Undo2, ExternalLink, Clock, Info, Loader2, Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/actualites")({
  component: PageProtegee,
  head: () => ({ meta: [{ title: "Actualités du site — Group Arsène" }] }),
});

type Article = {
  id: string; slug: string; titre: string; chapo: string; corps: string;
  categorie: string; seo_desc: string | null;
  faq: { q: string; r: string }[];
  statut: "brouillon" | "publie" | "retire";
  publie_le: string | null; cree_le: string;
};

const RUBRIQUES: Record<string, string> = {
  methode: "La méthode", metier: "Le métier",
  coulisses: "Coulisses", reperes: "Repères",
};
const ETATS: Record<string, { texte: string; classe: string }> = {
  brouillon: { texte: "À relire", classe: "bg-amber-500/12 text-amber-700 dark:text-amber-400" },
  publie:    { texte: "En ligne", classe: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  retire:    { texte: "Retiré", classe: "bg-muted text-muted-foreground" },
};
const SITE = "https://grouparsene.fr";
const jour = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

function ActualitesPage() {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState<string | null>(null);

  const articles = useQuery({
    queryKey: ["site-articles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_articles" as any)
        .select("*").order("cree_le", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Article[];
    },
  });

  const changer = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: Article["statut"] }) => {
      const { error } = await supabase.from("site_articles" as any).update({ statut }).eq("id", id);
      if (error) throw new Error(error.message);
      return statut;
    },
    onSuccess: (statut) => {
      qc.invalidateQueries({ queryKey: ["site-articles"] });
      if (statut === "publie") {
        toast.success("Article publié", {
          description: "Il apparaîtra sur le site à la prochaine mise en ligne — demain matin, ou tout de suite via « Run now » sur la tâche planifiée.",
          duration: 9000,
        });
      } else {
        toast.success(statut === "retire" ? "Article retiré" : "Repassé en brouillon");
      }
    },
    onError: (e: Error) => toast.error("Impossible", { description: e.message }),
  });

  const supprimer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_articles" as any).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Brouillon supprimé"); qc.invalidateQueries({ queryKey: ["site-articles"] }); },
    onError: (e: Error) => toast.error("Impossible", { description: e.message }),
  });

  const liste = articles.data ?? [];
  const brouillons = liste.filter((a) => a.statut === "brouillon");
  const enLigne = liste.filter((a) => a.statut === "publie");

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Newspaper className="h-5 w-5" /> Actualités du site
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Un brouillon est écrit chaque matin. Rien ne part en ligne sans votre relecture.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex items-start gap-2.5 text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            Le site est statique : ses pages sont écrites sur disque. Publier met l'article
            en ligne <b>à la prochaine mise à jour du site</b> — demain matin automatiquement,
            ou immédiatement en lançant la tâche <b>grouparsene-article-quotidien</b> depuis
            la section « Scheduled ».
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[["À relire", brouillons.length], ["En ligne", enLigne.length], ["Total", liste.length]].map(([l, n]) => (
          <Card key={l as string}><CardContent className="p-4">
            <p className="text-2xl font-semibold tabular-nums leading-none">{n as number}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{l as string}</p>
          </CardContent></Card>
        ))}
      </div>

      {articles.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!articles.isLoading && liste.length === 0 && (
        <Card><CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun article. Le premier brouillon arrivera demain matin.
          </p>
        </CardContent></Card>
      )}

      {liste.map((a) => (
        <Card key={a.id} className={cn(a.statut === "brouillon" && "border-amber-500/30")}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", ETATS[a.statut].classe)}>
                    {ETATS[a.statut].texte}
                  </span>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    {RUBRIQUES[a.categorie] ?? a.categorie}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {a.statut === "publie" ? jour(a.publie_le) : `écrit le ${jour(a.cree_le)}`}
                  </span>
                </div>
                <h2 className="font-semibold mt-1.5 leading-snug">{a.titre}</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.chapo}</p>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              <Button size="sm" variant="outline" className="h-8 gap-1.5"
                onClick={() => setOuvert(ouvert === a.id ? null : a.id)}>
                <Eye className="h-3.5 w-3.5" /> {ouvert === a.id ? "Replier" : "Lire en entier"}
              </Button>

              {a.statut === "brouillon" && (
                <>
                  <Button size="sm" className="h-8 gap-1.5" disabled={changer.isPending}
                    onClick={() => changer.mutate({ id: a.id, statut: "publie" })}>
                    {changer.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Publier
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground"
                    onClick={() => {
                      if (window.confirm(`Supprimer définitivement « ${a.titre} » ?`)) supprimer.mutate(a.id);
                    }}>
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </Button>
                </>
              )}

              {a.statut === "publie" && (
                <>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                    <a href={`${SITE}/actualites/${a.slug}`} target="_blank" rel="noopener">
                      <ExternalLink className="h-3.5 w-3.5" /> Voir en ligne
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground"
                    disabled={changer.isPending}
                    onClick={() => changer.mutate({ id: a.id, statut: "retire" })}>
                    <Undo2 className="h-3.5 w-3.5" /> Retirer du site
                  </Button>
                </>
              )}

              {a.statut === "retire" && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={changer.isPending}
                  onClick={() => changer.mutate({ id: a.id, statut: "publie" })}>
                  <Check className="h-3.5 w-3.5" /> Remettre en ligne
                </Button>
              )}
            </div>

            {ouvert === a.id && (
              <div className="border-t pt-4 mt-1">
                {/* Le corps est du HTML écrit par la tâche, relu ici avant publication.
                    On l'affiche tel qu'il sera rendu : c'est le seul moyen de repérer
                    une balise oubliée ou un encadré mal fermé. */}
                <article
                  className="prose prose-sm dark:prose-invert max-w-none
                             prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-6
                             prose-h3:text-base prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: a.corps }}
                />
                {a.faq?.length > 0 && (
                  <div className="mt-6 border-t pt-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                      Questions fréquentes
                    </p>
                    <div className="space-y-3">
                      {a.faq.map((f, i) => (
                        <div key={i}>
                          <p className="text-sm font-medium">{f.q}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{f.r}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-5 pt-3 border-t">
                  Adresse : {SITE}/actualites/{a.slug}
                  {a.seo_desc && <> · Description : {a.seo_desc}</>}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Les actualités du site : gestion de l'agence, pas le métier d'un collaborateur. */
function PageProtegee() {
  return <AdminSeul quoi="Les actualités du site"><ActualitesPage /></AdminSeul>;
}
