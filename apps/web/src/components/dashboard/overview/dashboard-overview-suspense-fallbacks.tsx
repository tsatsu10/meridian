/** Accessible fallbacks for lazy-loaded dashboard chunks (modals, motion wrappers). */

export function ModalChunkFallback() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="sr-only">
      Loading…
    </div>
  );
}

export function RiskSectionChunkFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading risk section"
      className="h-28 rounded-lg border border-border bg-muted/40 animate-pulse"
    />
  );
}
