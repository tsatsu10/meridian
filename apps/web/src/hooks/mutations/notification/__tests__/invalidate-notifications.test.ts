import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { invalidateNotificationQueries } from "../invalidate-notifications";

describe("invalidateNotificationQueries", () => {
  it("invalidates both the bell's and the full page's notification queries", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["notifications"], []);
    queryClient.setQueryData(["notifications-infinite", false], []);
    queryClient.setQueryData(["notifications-infinite", true], []);

    invalidateNotificationQueries(queryClient);

    expect(queryClient.getQueryState(["notifications"])?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(["notifications-infinite", false])
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(["notifications-infinite", true])
        ?.isInvalidated,
    ).toBe(true);
  });

  it("does not touch unrelated queries", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["tasks", "project-1"], []);

    invalidateNotificationQueries(queryClient);

    expect(
      queryClient.getQueryState(["tasks", "project-1"])?.isInvalidated,
    ).toBe(false);
  });
});
