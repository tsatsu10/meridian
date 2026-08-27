import { cn } from "@/lib/utils";

export type MeridianMarkLoadingProps = {
  className?: string;
};

/**
 * Animated loading variant of the Meridian mark:
 * 1. a light travels once around the ring (the meridian great-circle), then
 * 2. the whole mark topples over and falls onto its side, settling before
 *    rising back upright and looping.
 *
 * Styling and @keyframes live in index.html so the boot splash and this
 * component share ONE definition. Injecting a copy from here redefined the
 * keyframes on mount/unmount, which restarted the splash's running animation
 * and showed up as a flicker. Reduced-motion is handled there too.
 */
export function MeridianMarkLoading({ className }: MeridianMarkLoadingProps) {
  return (
    <span
      className={cn("meridian-mark", className)}
      role="img"
      aria-label="Loading"
    >
      <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
        {/* Ring (the meridian great-circle) */}
        <circle
          className="meridian-ring"
          cx="50"
          cy="50"
          r="31"
          strokeWidth="8.5"
        />
        {/* Meridian line */}
        <line
          x1="50"
          y1="7"
          x2="50"
          y2="93"
          stroke="#2DD4BF"
          strokeWidth="8.5"
          strokeLinecap="round"
        />
        {/* Light travelling around the ring */}
        <circle
          className="meridian-flash"
          cx="50"
          cy="50"
          r="31"
          stroke="#EAFEFF"
          strokeWidth="8.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="16 100"
        />
      </svg>
    </span>
  );
}
