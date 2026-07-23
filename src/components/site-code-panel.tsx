/**
 * ─── SiteCodePanel — Injecter / éditer du code dans le site ───────────
 *
 * Deux modes :
 *   • "Insérer" : on colle un bout de code (HTML/CSS/JS) et on le place où
 *     on veut (début ou fin de page, ou dans le <head> pour du CSS/meta).
 *   • "HTML complet" : on édite tout le document à la main (avancé).
 *
 * Aucune IA ici → ce qui est collé est intégré tel quel, à la virgule près.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Code2, CornerDownLeft } from "lucide-react";
import { toast } from "sonner";

type Where = "body-end" | "body-start" | "head";

export function SiteCodePanel({
  html, onChange,
}: {
  html: string;
  onChange: (newHtml: string) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"insert" | "full">("insert");
  const [snippet, setSnippet] = useState("");
  const [where, setWhere] = useState<Where>("body-end");
  const [fullHtml, setFullHtml] = useState(html);
  const [busy, setBusy] = useState(false);

  const insert = async () => {
    const code = snippet.trim();
    if (!code) return;
    setBusy(true);
    try {
      let out = html;
      const insertInto = (tagClose: string, atStart: boolean, openTagRe: RegExp) => {
        if (atStart) {
          const m = out.match(openTagRe);
          if (m && m.index != null) {
            const pos = m.index + m[0].length;
            return out.slice(0, pos) + "\n" + code + "\n" + out.slice(pos);
          }
        } else {
          const idx = out.toLowerCase().lastIndexOf(tagClose);
          if (idx !== -1) return out.slice(0, idx) + "\n" + code + "\n" + out.slice(idx);
        }
        return out + "\n" + code;
      };
      if (where === "head") out = insertInto("</head>", false, /<head[^>]*>/i);
      else if (where === "body-start") out = insertInto("</body>", true, /<body[^>]*>/i);
      else out = insertInto("</body>", false, /<body[^>]*>/i);
      await onChange(out);
      setSnippet("");
      toast.success("Code inséré dans la page ✓");
    } catch (e) {
      toast.error("Échec : " + (e as Error).message);
    }
    setBusy(false);
  };

  const saveFull = async () => {
    const v = fullHtml.trim();
    if (!v) { toast.error("Le HTML est vide."); return; }
    if (!/<html[\s>]/i.test(v) || !/<\/html>/i.test(v)) {
      if (!confirm("Ce code ne ressemble pas à un document HTML complet (<html>…</html>). L'enregistrer quand même ?")) return;
    }
    setBusy(true);
    try { await onChange(v); toast.success("HTML enregistré ✓"); }
    catch (e) { toast.error("Échec : " + (e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="p-4 space-y-3 overflow-y-auto">
      <div>
        <p className="text-sm font-semibold flex items-center gap-1.5"><Code2 className="h-4 w-4 text-primary" /> Code</p>
        <p className="text-xs text-muted-foreground mt-0.5">Ajoute ton propre code (HTML, CSS, script, widget…). Inséré tel quel.</p>
      </div>

      <div className="grid grid-cols-2 gap-1 p-0.5 bg-muted rounded-md">
        <button onClick={() => setMode("insert")} className={"rounded py-1 text-xs font-semibold transition " + (mode === "insert" ? "bg-background shadow-sm" : "text-muted-foreground")}>Insérer un bout</button>
        <button onClick={() => { setFullHtml(html); setMode("full"); }} className={"rounded py-1 text-xs font-semibold transition " + (mode === "full" ? "bg-background shadow-sm" : "text-muted-foreground")}>HTML complet</button>
      </div>

      {mode === "insert" ? (
        <>
          <Textarea value={snippet} onChange={(e) => setSnippet(e.target.value)} rows={8}
            placeholder={`Colle ton code ici, ex :\n<section style="padding:40px;text-align:center">\n  <h2>Notre carte</h2>\n  <a href="menu.pdf">Voir le menu</a>\n</section>`}
            className="resize-none text-xs font-mono" spellCheck={false} disabled={busy} />
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Où l'insérer ?</p>
            <select value={where} onChange={(e) => setWhere(e.target.value as Where)}
              className="w-full h-9 rounded-md border bg-transparent px-2 text-sm">
              <option value="body-end">À la fin de la page (avant la fermeture)</option>
              <option value="body-start">Tout en haut de la page</option>
              <option value="head">Dans le &lt;head&gt; (CSS, balises meta, scripts)</option>
            </select>
          </div>
          <Button className="w-full gap-1.5" onClick={insert} disabled={busy || !snippet.trim()}>
            <CornerDownLeft className="h-4 w-4" /> Insérer dans la page
          </Button>
          <p className="text-[11px] text-muted-foreground">
            💡 Après insertion, tu peux demander à l'IA de « déplace ce bloc » ou « rends-le plus joli ».
          </p>
        </>
      ) : (
        <>
          <Textarea value={fullHtml} onChange={(e) => setFullHtml(e.target.value)} rows={16}
            className="resize-none text-xs font-mono" spellCheck={false} disabled={busy} />
          <Button className="w-full" onClick={saveFull} disabled={busy}>Enregistrer le HTML</Button>
          <p className="text-[11px] text-muted-foreground">⚠️ Mode avancé : tu remplaces tout le document. Utilise « Annuler » en haut si besoin.</p>
        </>
      )}
    </div>
  );
}
