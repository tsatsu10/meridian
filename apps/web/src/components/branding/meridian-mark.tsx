import { cn } from "@/lib/utils";

export type MeridianMarkProps = {
  className?: string;
  /** Subtle light plate so the mark reads on dark sidebars / gradients */
  onDarkSurface?: boolean;
};

/**
 * Meridian logomark — a globe ring pierced by its meridian line
 * (navy #1B2559 ring, teal #2DD4BF pole-to-pole line).
 */
export function MeridianMark({ className, onDarkSurface }: MeridianMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="Meridian"
      className={cn(
        "shrink-0 select-none",
        onDarkSurface &&
          "rounded-lg bg-white/95 p-1.5 shadow-sm ring-1 ring-white/15 dark:ring-white/10",
        className,
      )}
    >
      <circle
        cx="50"
        cy="50"
        r="31"
        fill="none"
        stroke="#1B2559"
        strokeWidth="8.5"
      />
      <line
        x1="50"
        y1="7"
        x2="50"
        y2="93"
        stroke="#2DD4BF"
        strokeWidth="8.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
