import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDockScrollFade } from "../use-dock-scroll-fade";

describe("useDockScrollFade", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts false", () => {
    const { result } = renderHook(() => useDockScrollFade());
    expect(result.current).toBe(false);
  });

  it("becomes true on scroll and clears after the debounce with no further scrolling", () => {
    const { result } = renderHook(() => useDockScrollFade(400));

    act(() => {
      document.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it("stays true while scroll events keep arriving, and resets the debounce window each time", () => {
    const { result } = renderHook(() => useDockScrollFade(400));

    act(() => {
      document.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(300);
      document.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(300);
    });
    // 600ms elapsed total, but each scroll reset the 400ms window.
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(false);
  });

  it("catches scroll events dispatched on a nested element (capture phase)", () => {
    const scroller = document.createElement("div");
    document.body.appendChild(scroller);

    const { result } = renderHook(() => useDockScrollFade(400));

    act(() => {
      scroller.dispatchEvent(new Event("scroll", { bubbles: false }));
    });
    expect(result.current).toBe(true);

    document.body.removeChild(scroller);
  });

  it("cleans up its listener and pending timeout on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useDockScrollFade());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function), {
      capture: true,
    });
  });
});
