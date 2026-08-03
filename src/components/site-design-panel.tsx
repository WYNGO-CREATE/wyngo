/**
 * ─── SiteDesignPanel — Choisir le style & composer par sections ───────
 *
 * Deux blocs :
 *   • Style : applique un pack (typo + palette + motion) → re-skinne tout
 *     le site (sections .wy-*) d'un coup.
 *   • Sections : insère des blocs prêts (hero, spécialités, à-propos…) qui
 *     adoptent automatiquement le style actif.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Palette, LayoutTemplate, Check } from "lucide-react";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PACKS, SECTIONS, applyPack, applyCustomTheme, insertSection, appendCustomSection, removeSectionAt, moveSectionAt, listSections, ensureSectionTags, getCurrentPack, buildFullPage, buildStudioTemplate } from "@/lib/site-design-system";

export function SiteDesignPanel({ html, onChange, siteName, siteId }: { html: string; onChange: (h: string) => Promise<void> | void; siteName?: string; siteId?: string }) {
  const current = getCurrentPack(html);
  const [busy, setBusy] = useState<string | null>(null);

  // Récupère un profil de contenu ADAPTÉ au métier (IA). Repli : profil vide.
  const fetchProfile = async () => {
    if (!siteId) return {};
    try {
      const { data } = await supabase.functions.invoke("studio-adapt", { body: { site_id: siteId } });
      const r = data as { ok?: boolean; profile?: Record<string, unknown> } | null;
      return r?.ok && r.profile ? r.profile : {};
    } catch { return {}; }
  };

  const choosePack = async (id: string) => {
    setBusy("pack:" + id);
    try {
      // Site sans sections Group Arsène → un simple re-skin ne changerait rien de visible.
      // On propose donc d'appliquer le modèle complet dans ce style (vrai changement).
      const isWy = listSections(html).length > 0 || /wy-scope|data-wy-sec/.test(html);
      if (!isWy) {
        const ok = confirm(`Ce site n'utilise pas encore le design Group Arsène — changer juste le style ne se verrait pas.\n\nAppliquer un SITE COMPLET dans le style « ${PACKS.find((p) => p.id === id)?.label} » ? Cela remplace le contenu par un modèle à remplir.`);
        if (!ok) { setBusy(null); return; }
        const full = (id === "artefact" || id === "carbon")
          ? buildStudioTemplate(siteName, id, await fetchProfile())
          : buildFullPage(id, siteName);
        await onChange(full);
        toast.success("Modèle appliqué ✨ — remplace textes et photos.");
      } else {
        await onChange(applyPack(html, id));
        toast.success(`Style « ${PACKS.find((p) => p.id === id)?.label} » appliqué`);
      }
    } catch (e) { toast.error("Échec : " + (e as Error).message); }
    setBusy(null);
  };

  const composeFull = async () => {
    if (!confirm("Composer un MODÈLE VIERGE dans ce style ? ⚠️ Cela remplace tout le contenu actuel de la page par un gabarit à remplir (textes et photos d'exemple). À n'utiliser que pour repartir de zéro.")) return;
    setBusy("compose");
    try { await onChange(buildFullPage(current || "editorial", siteName)); toast.success("Site composé — change de style pour tout transformer ✨"); }
    catch (e) { toast.error("Échec : " + (e as Error).message); }
    setBusy(null);
  };

  const applyStudio = async (variant: "artefact" | "carbon") => {
    if (!confirm("Appliquer le MODÈLE STUDIO PREMIUM ? ⚠️ Cela remplace toute la page par un site complet, animé et haut de gamme (hero aurora, savoir-faire, outils, tarifs, FAQ) — dont le CONTENU est adapté à l'activité par l'IA. Transformation radicale.")) return;
    setBusy("studio:" + variant);
    try {
      const profile = await fetchProfile();
      await onChange(buildStudioTemplate(siteName, variant, profile));
      toast.success(Object.keys(profile).length ? "Modèle premium appliqué ✨ — contenu adapté au métier." : "Modèle premium appliqué ✨ — contenu générique (brief prospect absent).");
    }
    catch (e) { toast.error("Échec : " + (e as Error).message); }
    setBusy(null);
  };

  // Auto-tague les sections des pages composées avant la "mémoire"
  useEffect(() => {
    const fixed = ensureSectionTags(html);
    if (fixed !== html) onChange(fixed);
  }, [html, onChange]);

  const present = listSections(html);
  const label = (id: string) => SECTIONS.find((s) => s.id === id)?.label || (id.startsWith("auto-") ? "Section" : id);

  const addSection = async (id: string) => {
    setBusy("sec:" + id);
    try { await onChange(insertSection(html, id, current || "editorial", siteName)); toast.success(`Section « ${label(id)} » ajoutée`); }
    catch (e) { toast.error("Échec : " + (e as Error).message); }
    setBusy(null);
  };
  const removeAt = async (i: number) => {
    setBusy("rm:" + i);
    try { await onChange(removeSectionAt(html, i)); toast.success("Section retirée"); }
    catch (e) { toast.error("Échec : " + (e as Error).message); }
    setBusy(null);
  };
  const move = async (i: number, dir: -1 | 1) => {
    setBusy("mv:" + i);
    try { await onChange(moveSectionAt(html, i, dir)); }
    catch (e) { toast.error("Échec : " + (e as Error).message); }
    setBusy(null);
  };

  // Thème sur-mesure : l'IA génère une palette depuis une description
  const [themeDesc, setThemeDesc] = useState("");
  const genTheme = async () => {
    const desc = themeDesc.trim();
    if (!desc) return;
    setBusy("theme");
    try {
      const { data, error } = await supabase.functions.invoke("theme-generate", { body: { description: desc } });
      if (error) throw new Error(error.message);
      if (!data?.vars) throw new Error(data?.error || "Génération impossible");
      await onChange(applyCustomTheme(html, data.vars));
      toast.success("Thème sur-mesure appliqué 🎨");
    } catch (e) { toast.error("Échec : " + (e as Error).message); }
    setBusy(null);
  };

  // Section sur-mesure : l'IA génère un bloc au thème du site
  const [customDesc, setCustomDesc] = useState("");
  const genCustom = async () => {
    const desc = customDesc.trim();
    if (!desc) return;
    setBusy("custom");
    try {
      const { data, error } = await supabase.functions.invoke("section-generate", { body: { description: desc } });
      if (error) throw new Error(error.message);
      if (!data?.html) throw new Error(data?.error || "Génération impossible");
      await onChange(appendCustomSection(html, data.html, current || "editorial"));
      setCustomDesc("");
      toast.success("Section sur-mesure ajoutée ✨ — réordonne-la ou édite-la");
    } catch (e) { toast.error("Échec : " + (e as Error).message); }
    setBusy(null);
  };

  return (
    <div className="p-4 space-y-5 overflow-y-auto">
      {/* Styles */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5"><Palette className="h-4 w-4 text-primary" /> Style du site</p>
          <p className="text-xs text-muted-foreground mt-0.5">Change la typo, les couleurs et le motion d'un coup.</p>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {PACKS.map((p) => {
            const active = current === p.id;
            return (
              <button key={p.id} onClick={() => choosePack(p.id)} disabled={!!busy}
                className={"w-full text-left rounded-lg border p-2.5 transition flex items-center gap-2.5 " + (active ? "border-primary ring-1 ring-primary/40 bg-primary/5" : "hover:bg-muted/50 hover:border-primary/30")}>
                <span className="flex gap-1 shrink-0">{swatches(p.id)}</span>
                <span className="min-w-0">
                  <span className="text-xs font-semibold flex items-center gap-1">{p.label}{active && <Check className="h-3 w-3 text-primary" />}</span>
                  <span className="text-[11px] text-muted-foreground block truncate">{p.note}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Style sur-mesure (IA → palette appliquée à tout le site) */}
      <div className="space-y-2 border-t pt-3">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Style sur-mesure</p>
        <Textarea value={themeDesc} onChange={(e) => setThemeDesc(e.target.value)} rows={2}
          placeholder="Décris l'ambiance/les couleurs (ex : « bleu marine et or, chic et sobre », « tons terracotta chaleureux », « noir et vert émeraude, luxe »)…"
          className="text-xs resize-none" disabled={!!busy} />
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={genTheme} disabled={!!busy || !themeDesc.trim()}>
          <Sparkles className="h-3.5 w-3.5" /> {busy === "theme" ? "Création…" : "Générer ce thème"}
        </Button>
        <p className="text-[11px] text-muted-foreground">L'IA crée une palette cohérente et l'applique à tout le site.</p>
      </div>

      {/* Modèle Studio premium — transformation radicale en un clic */}
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
        <p className="text-sm font-semibold">✨ Modèle Studio premium</p>
        <p className="text-[11px] text-muted-foreground">Remplace toute la page par un site complet, animé et haut de gamme (hero aurora, réalisations, tarifs, FAQ). Transformation radicale — à remplir ensuite.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button className="w-full" onClick={() => applyStudio("artefact")} disabled={!!busy}>Ivoire chaud</Button>
          <Button variant="secondary" className="w-full" onClick={() => applyStudio("carbon")} disabled={!!busy}>Carbone (sombre)</Button>
        </div>
      </div>

      {/* Composer un site complet (gabarit basique) */}
      <Button variant="outline" className="w-full gap-1.5" onClick={composeFull} disabled={!!busy}>
        Composer un gabarit simple (ce style)
      </Button>
      <p className="text-[11px] text-muted-foreground -mt-3">
        Astuce : le simple changement de style ne retouche que les sections Group Arsène. Pour tout transformer d'un coup, utilise un modèle complet ci-dessus.
      </p>

      {/* Sections présentes — ordonnées, réordonnables */}
      <div className="space-y-2">
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5"><LayoutTemplate className="h-4 w-4 text-primary" /> Sections de la page</p>
          <p className="text-xs text-muted-foreground mt-0.5">{present.length} présente{present.length > 1 ? "s" : ""} · réordonne avec ↑ ↓.</p>
        </div>
        {present.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Aucune section Group Arsène. Compose un site ou ajoute des blocs ci-dessous.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {present.map((id, i) => (
              <div key={id + "-" + i} className="flex items-center gap-1 rounded-md border bg-primary/5 border-primary/30 pl-2.5 pr-1 py-1.5">
                <Check className="h-3 w-3 text-primary shrink-0" />
                <span className="text-xs font-medium flex-1 truncate">{label(id)}</span>
                <button onClick={() => move(i, -1)} disabled={!!busy || i === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Monter"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => move(i, 1)} disabled={!!busy || i === present.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Descendre"><ChevronDown className="h-3.5 w-3.5" /></button>
                <button onClick={() => removeAt(i)} disabled={!!busy} className="p-0.5 text-muted-foreground/50 hover:text-rose-500" title="Retirer"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ajouter une section absente */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Ajouter une section</p>
        <div className="grid grid-cols-1 gap-1.5">
          {SECTIONS.filter((s) => !present.includes(s.id)).map((s) => (
            <button key={s.id} onClick={() => addSection(s.id)} disabled={!!busy}
              className="w-full text-left text-xs px-2.5 py-2 rounded-md border hover:bg-muted/50 hover:border-primary/40 transition flex items-center justify-between">
              <span>{s.label}</span><span className="text-muted-foreground">＋</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Chaque section est modifiable : demande à l'IA « adapte les tarifs à ce client », ou édite via Code/Photos.</p>
      </div>

      {/* Section sur-mesure (IA, au thème du site) */}
      <div className="space-y-2 border-t pt-4">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Section sur-mesure</p>
        <Textarea value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} rows={2}
          placeholder="Décris la section que tu veux (ex : « nos 4 engagements en colonnes avec icônes », « une bande partenaires », « une section recrutement »)…"
          className="text-xs resize-none" disabled={!!busy} />
        <Button size="sm" className="w-full gap-1.5" onClick={genCustom} disabled={!!busy || !customDesc.trim()}>
          <Sparkles className="h-3.5 w-3.5" /> {busy === "custom" ? "Création…" : "Créer la section (au thème du site)"}
        </Button>
        <p className="text-[11px] text-muted-foreground">L'IA la code avec les couleurs/typo de ton style actuel.</p>
      </div>
    </div>
  );
}

// Pastilles de couleur par pack (aperçu rapide de l'ambiance)
const SW: Record<string, string[]> = {
  editorial: ["#F7F4EC", "#16140f", "#1B4BE3"],
  couture: ["#FBF8F3", "#2b211a", "#b08d4f"],
  brutalist: ["#ffffff", "#111111", "#ff4d2e"],
  magazine: ["#fafafa", "#141414", "#b3261e"],
  darkluxe: ["#0e0e12", "#f3ece0", "#c9a86a"],
  organic: ["#FCF6EF", "#3d2a1d", "#d98d4f"],
  noir: ["#111114", "#f5f3ee", "#e8b04b"],
  tech: ["#fbfbfd", "#16161d", "#5b54e6"],
};
function swatches(id: string) {
  return (SW[id] || []).map((c, i) => (
    <span key={i} style={{ background: c }} className="w-4 h-4 rounded-full border border-black/10" />
  ));
}
