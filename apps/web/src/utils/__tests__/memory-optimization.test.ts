import { afterEach, describe, expect, it } from "vitest";
import { MemoryMonitor } from "../memory-optimization";

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

describe("MemoryMonitor.getCurrentUsage", () => {
  afterEach(() => {
    Object.defineProperty(performance, "memory", {
      value: undefined,
      configurable: true,
    });
  });

  it("computes usage against the heap size limit, not the currently-allocated heap", () => {
    // Allocated heap (totalJSHeapSize) is nearly full, but that's normal V8
    // behavior — it grows to meet demand. The real ceiling is
    // jsHeapSizeLimit, and usage against it is low here.
    mockPerformanceMemory({
      usedJSHeapSize: 90 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 2000 * 1024 * 1024,
    });

    const usage = MemoryMonitor.getInstance().getCurrentUsage();

    expect(usage).toBeCloseTo(0.045, 3);
  });
});
