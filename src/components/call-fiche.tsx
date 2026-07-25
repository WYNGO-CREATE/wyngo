/**
 * ─── CallFiche — Fiche d'appel à arguments chiffrés ───────────────────────
 *
 * Affiche la fiche générée par `market-script` sous forme scannable (pas un
 * script à lire) : accroche, arguments CHIFFRÉS (vraies stats de marché),
 * ligne concurrents, atouts Wyngo, phrase de close. Les variables {{prospect}}
 * et {{expediteur}} sont remplacées avec le prénom du prospect et celui de
 * l'appelant.
 */

import { Copy, Phone, TrendingUp, Zap, Users, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type Fiche = {
  accroche: string;
  chiffres: { stat: string; punch: string }[];
  concurrents: string;
  atouts: string[];
  close: string;
};

function fill(text: string, prospect: string, expediteur: string): string {
  return (text || "")
    .replace(/\{\{\s*prospect\s*\}\}/gi, prospect || "")
    .replace(/\{\{\s*prenom\s*\}\}/gi, prospect || "")
    .replace(/\{\{\s*expediteur\s*\}\}/gi, expediteur || "")
    .replace(/\b(Bonjour|Bonsoir)\s+,/gi, "$1,")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}

export function CallFiche({
  fiche,
  prospectName,
  callerName,
}: {
  fiche: Fiche;
  prospectName?: string | null;
  callerName?: string | null;
}) {
  const p = (prospectName || "").trim();
  const e = (callerName || "").trim() || "Hugo";

  const plainText = () => {
    const lines: string[] = [];
    lines.push("ACCROCHE\n" + fill(fiche.accroche, p, e));
    if (fiche.chiffres?.length) {
      lines.push("\nARGUMENTS CHIFFRÉS");
      for (const c of fiche.chiffres) lines.push(`• ${fill(c.stat, p, e)} → ${fill(c.punch, p, e)}`);
    }
    if (fiche.concurrents) lines.push("\nCONCURRENTS\n" + fill(fiche.concurrents, p, e));
    if (fiche.atouts?.length) { lines.push("\nCE QU'ON A D'UNIQUE"); for (const a of fiche.atouts) lines.push(`• ${fill(a, p, e)}`); }
    if (fiche.close) lines.push("\nCLOSE\n" + fill(fiche.close, p, e));
    return lines.join("\n");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1">
          <Target className="size-3" /> Fiche d'appel
        </p>
        <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1"
          onClick={() => navigator.clipboard.writeText(plainText()).then(() => toast.success("Fiche copiée")).catch(() => toast.error("Copie impossible"))}>
          <Copy className="size-3" /> Copier
        </Button>
      </div>

      {/* Accroche */}
      <div className="rounded-lg border-l-4 border-violet-500 bg-violet-50/50 dark:bg-violet-950/20 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-violet-700 dark:text-violet-400 mb-1 inline-flex items-center gap-1">
          <Phone className="size-3" /> Accroche
        </p>
        <p className="text-[13px] leading-relaxed">{fill(fiche.accroche, p, e)}</p>
      </div>

      {/* Arguments chiffrés — le cœur */}
      {fiche.chiffres?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 inline-flex items-center gap-1">
            <TrendingUp className="size-3" /> Arguments chiffrés
          </p>
          <div className="space-y-1.5">
            {fiche.chiffres.map((c, i) => (
              <div key={i} className="rounded-md border bg-background/70 px-2.5 py-2">
                <p className="text-[13px] font-semibold text-foreground leading-snug">{fill(c.stat, p, e)}</p>
                <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">→ {fill(c.punch, p, e)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concurrents */}
      {fiche.concurrents?.trim() && (
        <div className="rounded-md bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400 mb-0.5 inline-flex items-center gap-1">
            <Users className="size-3" /> Ils captent déjà cette demande
          </p>
          <p className="text-[12.5px] leading-snug">{fill(fiche.concurrents, p, e)}</p>
        </div>
      )}

      {/* Atouts Wyngo */}
      {fiche.atouts?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 inline-flex items-center gap-1">
            <Sparkles className="size-3" /> Ce qu'on a d'unique
          </p>
          <ul className="space-y-1">
            {fiche.atouts.map((a, i) => (
              <li key={i} className="flex gap-1.5 text-[12.5px] leading-snug">
                <Zap className="size-3 shrink-0 mt-0.5 text-violet-500" />
                <span>{fill(a, p, e)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Close */}
      {fiche.close?.trim() && (
        <div className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Close</p>
          <p className="text-[13px] leading-relaxed font-medium">{fill(fiche.close, p, e)}</p>
        </div>
      )}
    </div>
  );
}
