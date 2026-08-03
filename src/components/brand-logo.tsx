import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

export function BrandLogo({
  size = 36,
  showWordmark = true,
  className,
  wordmarkClassName,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Monogramme typographique : l'ancien logo portait « WYNGO » en dur.
          À remplacer par le vrai logo Group Arsène quand il existera. */}
      <div
        aria-label="Group Arsène"
        className="flex items-center justify-center rounded-md bg-foreground text-background font-bold shadow-sm ring-1 ring-border/40"
        style={{ width: size, height: size, fontSize: size * 0.48 }}
      >
        A
      </div>
      {showWordmark && (
        <div className={cn("flex flex-col leading-none", wordmarkClassName)}>
          <span className="font-bold tracking-wide text-foreground">GROUP ARSÈNE</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary">
            Workspace
          </span>
        </div>
      )}
    </div>
  );
}
