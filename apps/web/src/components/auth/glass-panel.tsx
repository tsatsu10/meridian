import { useCallback, useEffect, useRef, useState } from "react";

const MAX_TILT_DEGREES = 2;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const node = ref.current;
      if (!node || reduced) {
        return;
      }
      const rect = node.getBoundingClientRect();
      // Guard against a zero-sized rect (jsdom reports 0x0), which would make
      // the ratios NaN and produce "rotateX(NaNdeg)".
      const width = rect.width || 1;
      const height = rect.height || 1;
      const x = (event.clientX - rect.left) / width - 0.5;
      const y = (event.clientY - rect.top) / height - 0.5;
      node.style.transform = `perspective(1200px) rotateY(${(x * MAX_TILT_DEGREES * 2).toFixed(2)}deg) rotateX(${(-y * MAX_TILT_DEGREES * 2).toFixed(2)}deg)`;
    },
    [reduced],
  );

  const onMouseLeave = useCallback(() => {
    if (ref.current) {
      ref.current.style.transform = "";
    }
  }, []);

  return (
    <div
      ref={ref}
      data-glass-panel=""
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`relative rounded-3xl p-8 transition-transform duration-200 ease-out ${className}`}
      style={{
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        backgroundColor: "rgb(255 255 255 / 0.07)",
        border: "1px solid rgb(255 255 255 / 0.12)",
        boxShadow:
          "inset 0 1px 0 rgb(255 255 255 / 0.10), 0 32px 64px -16px rgb(0 0 0 / 0.55)",
      }}
    >
      {children}
    </div>
  );
}
