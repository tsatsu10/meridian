import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { usePerformanceMonitor } from "../use-performance-monitor";

function mockPerformanceMemory(memory: {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}) {
  Object.defineProperty(performance, "memory", {
    value: memory,
    configurable: true,
  });
}

function renderWithQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePerformanceMonitor(), { wrapper });
}

describe("usePerformanceMonitor memory tracking", () => {
  afterEach(() => {
    Object.defineProperty(performance, "memory", {
      value: undefined,
      configurable: true,
    });
  });

  it("computes memoryUsage against the heap size limit, not the currently-allocated heap", () => {
    // Allocated heap (totalJSHeapSize) is nearly full, but that's normal V8
    // behavior. The real ceiling is jsHeapSizeLimit, and usage against it is
    // low here — the hook must not report the misleading 90% figure.
    mockPerformanceMemory({
      usedJSHeapSize: 90 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 2000 * 1024 * 1024,
    });

    const { result } = renderWithQueryClient();

    expect(result.current.metrics.memoryUsage).toBeCloseTo(0.045, 3);
  });
});
