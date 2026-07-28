/**
 * ─── CallFiche — Fiche d'appel à arguments chiffrés ───────────────────────
 *
 * Affiche la fiche générée par `market-script` sous forme scannable (pas un
 * script à lire) : accroche, arguments CHIFFRÉS (vraies stats de marché),
 * ligne concurrents, atouts Wyngo, phrase de close. Les variables {{prospect}}
 * et {{expediteur}} sont remplacées avec le prénom du prospect et celui de
 * l'appelant.
 */

import { Copy, Phone, TrendingUp, Zap, Users, Sparkles, Target, HelpCircle, Receipt, PlusCircle, ShieldCheck, Gift, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type Fiche = {
  accroche: string;
  chiffres: { stat: string; punch: string }[];
  concurrents: string;
  atouts: string[];
  close: string;
  questions?: string[];
  valeur?: { axe: string; detail: string }[];
  paliers?: { nom: string; prix: string; heures: string; inclus: string; pour: string; detail?: { poste: string; h: number }[] }[];
  cout_dev?: string;
  options?: { option: string; h: number }[];
  garanties?: string[];
  inclus_offert?: string[];
  cout_inaction?: string;
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
    if (fiche.questions?.length) { lines.push("\nAUDIT RAPIDE (à lui poser)"); fiche.questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`)); }
    if (fiche.valeur?.length) { lines.push("\nLA VALEUR RÉELLE"); for (const v of fiche.valeur) lines.push(`[${v.axe}] ${v.detail}`); }
    if (fiche.paliers?.length) {
      lines.push("\nJUSTIFICATION DU PRIX");
      for (const t of fiche.paliers) {
        lines.push(`• ${t.nom} — ${t.prix} (${t.heures})\n  ${t.inclus}`);
        if (t.detail?.length) for (const d of t.detail) lines.push(`    - ${d.poste} : ${d.h} h`);
      }
      if (fiche.cout_dev) lines.push(fiche.cout_dev);
    }
    if (fiche.options?.length) { lines.push("\nOPTIONS À LA CARTE (× 21 €/h)"); for (const o of fiche.options) lines.push(`• ${o.option} : ${o.h} h · +${o.h * 21} €`); }
    if (fiche.inclus_offert?.length) { lines.push("\nTOUJOURS INCLUS, SANS SUPPLÉMENT"); for (const x of fiche.inclus_offert) lines.push(`✓ ${x}`); }
    if (fiche.garanties?.length) { lines.push("\nNOS ENGAGEMENTS"); for (const g of fiche.garanties) lines.push(`• ${g}`); }
    if (fiche.cout_inaction) lines.push("\nLE COÛT DE NE RIEN FAIRE\n" + fill(fiche.cout_inaction, p, e));
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

      {/* Audit rapide — 5 questions à poser */}
      {fiche.questions && fiche.questions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 inline-flex items-center gap-1">
            <HelpCircle className="size-3" /> Audit rapide — à lui poser
          </p>
          <ol className="space-y-1.5">
            {fiche.questions.map((q, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-snug">
                <span className="shrink-0 size-4 rounded-full bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <span>{fill(q, p, e)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* La valeur réelle — temps / argent / visibilité */}
      {fiche.valeur && fiche.valeur.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 inline-flex items-center gap-1">
            <TrendingUp className="size-3" /> La valeur réelle
          </p>
          <div className="space-y-1.5">
            {fiche.valeur.map((v, i) => (
              <div key={i} className="rounded-md border bg-background/70 px-2.5 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{v.axe}</span>
                <p className="text-[12.5px] leading-snug text-foreground mt-0.5">{v.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Justification du prix — paliers (base 21 €/h) */}
      {fiche.paliers && fiche.paliers.length > 0 && (
        <div className="rounded-lg border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 p-2.5">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-violet-700 dark:text-violet-400 mb-2 inline-flex items-center gap-1">
            <Receipt className="size-3" /> Justification du prix
          </p>
          <div className="space-y-2">
            {fiche.paliers.map((t, i) => (
              <div key={i} className="rounded-md border bg-background/70 px-2.5 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold">{t.nom}</span>
                  <span className="text-[13px] font-bold text-violet-700 dark:text-violet-300 shrink-0">{t.prix}</span>
                </div>
                <p className="text-[10.5px] text-muted-foreground">{t.heures}</p>
                <p className="text-[11.5px] leading-snug mt-1">{t.inclus}</p>
                <p className="text-[11px] italic text-muted-foreground mt-1">Pour : {t.pour}</p>
                {t.detail && t.detail.length > 0 && (
                  <details className="mt-1.5 group">
                    <summary className="cursor-pointer text-[10.5px] font-semibold text-violet-700 dark:text-violet-400 list-none select-none">
                      Détail technique ({t.detail.reduce((s, d) => s + d.h, 0)} h) <span className="text-muted-foreground/60 group-open:hidden">· déplier</span>
                    </summary>
                    <ul className="mt-1 space-y-0.5">
                      {t.detail.map((d, k) => (
                        <li key={k} className="flex justify-between gap-2 text-[10.5px] leading-snug text-muted-foreground">
                          <span>{d.poste}</span>
                          <span className="shrink-0 tabular-nums font-medium text-foreground">{d.h} h</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
          {fiche.cout_dev && (
            <p className="text-[10.5px] leading-snug text-violet-800/80 dark:text-violet-300/80 mt-2 border-t border-violet-200/60 dark:border-violet-900/40 pt-1.5">{fiche.cout_dev}</p>
          )}
        </div>
      )}

      {/* Catalogue d'options — chiffrées à l'heure (× 21 €/h) */}
      {fiche.options && fiche.options.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-[10px] uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1">
            <PlusCircle className="size-3" /> Options à la carte <span className="text-muted-foreground/60 group-open:hidden">· déplier</span>
          </summary>
          <div className="mt-1.5 rounded-md border bg-background/70 divide-y">
            {fiche.options.map((o, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                <span className="text-[11.5px] leading-snug">{o.option}</span>
                <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">{o.h} h · <span className="font-semibold text-foreground">+{(o.h * 21).toLocaleString("fr-FR")} €</span></span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Chaque option = heures × 21 €/h. Le devis monte sans jamais être arbitraire.</p>
        </details>
      )}

      {/* Toujours inclus, sans supplément */}
      {fiche.inclus_offert && fiche.inclus_offert.length > 0 && (
        <div className="rounded-md bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400 mb-1 inline-flex items-center gap-1">
            <Gift className="size-3" /> Toujours inclus, sans supplément
          </p>
          <ul className="space-y-0.5">
            {fiche.inclus_offert.map((x, i) => (
              <li key={i} className="text-[11.5px] leading-snug flex gap-1.5"><span className="text-emerald-600 mt-[3px]">✓</span><span>{x}</span></li>
            ))}
          </ul>
        </div>
      )}

      {/* Garanties / engagements */}
      {fiche.garanties && fiche.garanties.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 inline-flex items-center gap-1">
            <ShieldCheck className="size-3" /> Nos engagements
          </p>
          <ul className="space-y-1">
            {fiche.garanties.map((g, i) => (
              <li key={i} className="flex gap-1.5 text-[12.5px] leading-snug"><ShieldCheck className="size-3 shrink-0 mt-0.5 text-sky-600" /><span>{g}</span></li>
            ))}
          </ul>
        </div>
      )}

      {/* Coût de l'inaction */}
      {fiche.cout_inaction?.trim() && (
        <div className="rounded-md bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-700 dark:text-rose-400 mb-0.5 inline-flex items-center gap-1">
            <AlertTriangle className="size-3" /> Le coût de ne rien faire
          </p>
          <p className="text-[12.5px] leading-snug">{fill(fiche.cout_inaction, p, e)}</p>
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
