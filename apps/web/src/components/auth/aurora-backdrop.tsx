import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/** Grain, as inline SVG turbulence — no image request, tiles at any size. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")";

export function AuroraBackdrop() {
  const reduced = usePrefersReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ backgroundColor: "#0B1220" }}
    >
      <div
        data-aurora-bloom="indigo"
        {...(reduced ? {} : { "data-aurora-animated": "true" })}
        className={`absolute -left-[20%] -top-[30%] h-[80vmax] w-[80vmax] rounded-full blur-3xl ${
          reduced ? "" : "animate-[aurora-drift-a_60s_ease-in-out_infinite]"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgb(27 37 89 / 0.40) 0%, transparent 70%)",
        }}
      />
      <div
        data-aurora-bloom="teal"
        {...(reduced ? {} : { "data-aurora-animated": "true" })}
        className={`absolute -bottom-[35%] -right-[15%] h-[70vmax] w-[70vmax] rounded-full blur-3xl ${
          reduced ? "" : "animate-[aurora-drift-b_40s_ease-in-out_infinite]"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgb(45 212 191 / 0.12) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}
