/**
 * ─── SitePhotosPanel — Photos & logo du site ──────────────────────────
 *
 * • Déposer le LOGO (en haut à gauche, remplaçable).
 * • Chaque emplacement photo du site est listé (dans l'ordre, avec son
 *   libellé) → "Ajouter/Remplacer" dépose l'image AU BON ENDROIT (par
 *   position dans le DOM, pas par URL → zéro confusion entre photos).
 * • Suppression intelligente (retire l'image + le conteneur devenu vide).
 */

import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, ImageOff, Trash2, BadgePlus, ImagePlus } from "lucide-react";
import { toast } from "sonner";

const STORAGE_BASE = "https://mwkkgubvdswmdaiswepl.supabase.co/storage/v1/object/public/site-assets";

type Slot = { idx: number; src: string; alt: string; placeholder: boolean };

function isPlaceholder(src: string, cls: string) {
  return /^data:image\/svg/.test(src) || /\bwy-photo\b/.test(cls);
}
function listSlots(html: string): Slot[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("img")).map((im, idx) => ({
    idx,
    src: im.getAttribute("src") || "",
    alt: (im.getAttribute("alt") || "").trim(),
    placeholder: isPlaceholder(im.getAttribute("src") || "", im.getAttribute("class") || ""),
  }));
}

export function SitePhotosPanel({
  html, siteId, onChange,
}: {
  html: string;
  siteId: string;
  onChange: (newHtml: string) => Promise<void> | void;
}) {
  const slots = useMemo(() => listSlots(html), [html]);
  const [busy, setBusy] = useState<number | string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const logoRef = useRef<HTMLInputElement | null>(null);
  const targetIdx = useRef<number | null>(null); // null = ajout d'une nouvelle photo

  const pickReplace = (idx: number) => { targetIdx.current = idx; fileRef.current?.click(); };
  const pickAdd = () => { targetIdx.current = null; fileRef.current?.click(); };

  const validImage = (file?: File | null) => {
    if (!file) return false;
    if (!file.type.startsWith("image/")) { toast.error("Choisis un fichier image."); return false; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image trop lourde (max 8 Mo)."); return false; }
    return true;
  };
  const upload = async (file: File): Promise<string> => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${siteId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return `${STORAGE_BASE}/${path}`;
  };

  // Remplace l'image n°idx (par position DOM) — ou ajoute en bas si idx null
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!validImage(file)) return;
    const idx = targetIdx.current;
    setBusy(idx === null ? "__add__" : idx);
    try {
      const url = await upload(file!);
      const doc = new DOMParser().parseFromString(html, "text/html");
      const imgs = Array.from(doc.querySelectorAll("img"));
      if (idx !== null && imgs[idx]) {
        imgs[idx].setAttribute("src", url);
        imgs[idx].classList.remove("wy-photo");
        await onChange("<!doctype html>\n" + doc.documentElement.outerHTML);
        toast.success("Photo placée ✓");
      } else {
        const img = `\n<img src="${url}" alt="" style="display:block;max-width:100%;height:auto;margin:16px auto;border-radius:12px" />\n`;
        const i = html.toLowerCase().lastIndexOf("</body>");
        await onChange(i !== -1 ? html.slice(0, i) + img + html.slice(i) : html + img);
        toast.success("Photo ajoutée 👇");
      }
    } catch (err) { toast.error("Échec : " + (err as Error).message); }
    setBusy(null);
  };

  const removeAt = async (idx: number) => {
    setBusy(idx);
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const imgs = Array.from(doc.querySelectorAll("img"));
      const img = imgs[idx];
      if (img) {
        let parent = img.parentElement;
        img.remove();
        while (parent && parent !== doc.body && parent.tagName !== "SECTION" && parent.id !== "wy-logo") {
          const meaningful = (parent.textContent || "").trim().length > 0 ||
            parent.querySelector("img,svg,iframe,video,picture,a,button,input,form,h1,h2,h3,h4,p,ul,ol,table");
          if (!meaningful) { const up = parent.parentElement; parent.remove(); parent = up; } else break;
        }
        await onChange("<!doctype html>\n" + doc.documentElement.outerHTML);
        toast.success("Photo supprimée — mise en page réajustée");
      }
    } catch (err) { toast.error("Échec : " + (err as Error).message); }
    setBusy(null);
  };

  // Logo
  const hasLogo = /id="wy-logo"/.test(html);
  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!validImage(file)) return;
    setBusy("__logo__");
    try {
      const url = await upload(file!);
      const chip = `<a id="wy-logo" href="#" style="position:absolute;top:18px;left:22px;z-index:60;background:#fff;border-radius:12px;padding:6px 12px;box-shadow:0 6px 18px rgba(0,0,0,.18);display:inline-block"><img src="${url}" alt="logo" style="height:36px;width:auto;max-width:150px;object-fit:contain;display:block" /></a>`;
      let newHtml: string;
      if (hasLogo) newHtml = html.replace(/<a id="wy-logo"[\s\S]*?<\/a>/i, chip);
      else if (/<body[^>]*>/i.test(html)) newHtml = html.replace(/(<body[^>]*>)/i, `$1\n${chip}`);
      else newHtml = chip + html;
      await onChange(newHtml);
      toast.success("Logo déposé ✓");
    } catch (err) { toast.error("Échec : " + (err as Error).message); }
    setBusy(null);
  };
  const removeLogo = async () => {
    setBusy("__logo__");
    try { await onChange(html.replace(/<a id="wy-logo"[\s\S]*?<\/a>/i, "")); toast.success("Logo retiré"); }
    catch (err) { toast.error("Échec : " + (err as Error).message); }
    setBusy(null);
  };

  const slotLabel = (s: Slot) => s.alt ? `Photo : ${s.alt}` : s.placeholder ? "Emplacement photo" : `Image ${s.idx + 1}`;

  return (
    <div className="p-4 space-y-3 overflow-y-auto">
      <div>
        <p className="text-sm font-semibold flex items-center gap-1.5">🖼️ Photos & logo</p>
        <p className="text-xs text-muted-foreground mt-0.5">Chaque emplacement se remplit à sa place. Dépose ton logo en haut.</p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />

      {/* Logo */}
      <div className="rounded-lg border bg-muted/20 p-2.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium">Logo {hasLogo && <span className="text-emerald-600">· en place</span>}</span>
        <div className="flex gap-1.5">
          {hasLogo && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground hover:text-rose-500" disabled={busy === "__logo__"} onClick={removeLogo}>
              <Trash2 className="h-3 w-3" /> Retirer
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={busy === "__logo__"} onClick={() => logoRef.current?.click()}>
            {busy === "__logo__" ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgePlus className="h-3 w-3" />}
            {hasLogo ? "Changer" : "Déposer le logo"}
          </Button>
        </div>
      </div>

      <Button size="sm" className="w-full gap-1.5" disabled={busy === "__add__"} onClick={pickAdd}>
        {busy === "__add__" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
        Ajouter une photo libre
      </Button>

      {slots.length === 0 ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2 py-6 justify-center border border-dashed rounded-lg">
          <ImageOff className="h-4 w-4" /> Aucun emplacement photo.
        </div>
      ) : (
        <div className="space-y-2.5">
          {slots.map((s) => (
            <div key={s.idx} className={"rounded-lg border overflow-hidden " + (s.placeholder ? "border-dashed border-primary/40" : "")}>
              <div className="aspect-video bg-muted/40 flex items-center justify-center overflow-hidden">
                <img src={s.src} alt="" className="w-full h-full object-cover" loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }} />
              </div>
              <div className="p-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground truncate max-w-[110px]" title={slotLabel(s)}>{slotLabel(s)}</span>
                <div className="flex gap-1.5">
                  <Button size="sm" variant={s.placeholder ? "default" : "outline"} className="h-7 text-xs gap-1" disabled={busy === s.idx} onClick={() => pickReplace(s.idx)}>
                    {busy === s.idx ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {s.placeholder ? "Ajouter" : "Remplacer"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground hover:text-rose-500" disabled={busy === s.idx}
                    onClick={() => { if (confirm("Supprimer cet emplacement ?")) removeAt(s.idx); }} title="Supprimer">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground pt-1">
        💡 Les cases en pointillé sont des <b>emplacements à remplir</b> (ex. photos produits) — chacun reçoit sa photo au bon endroit.
      </p>
    </div>
  );
}
