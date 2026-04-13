import { cn } from "@/lib/utils";

const MERIDIAN_LOGO_SRC = "/meridian-logomark.png";

export type MeridianMarkProps = {
  className?: string;
  /** Subtle light plate so the mark reads on dark sidebars / gradients */
  onDarkSurface?: boolean;
};

export function MeridianMark({ className, onDarkSurface }: MeridianMarkProps) {
  return (
    <img
      src={MERIDIAN_LOGO_SRC}
      alt="Meridian"
      width={256}
      height={256}
      decoding="async"
      className={cn(
        "shrink-0 object-contain select-none",
        onDarkSurface &&
          "rounded-lg bg-white/95 p-1 shadow-sm ring-1 ring-white/15 dark:ring-white/10",
        className
      )}
    />
  );
}
