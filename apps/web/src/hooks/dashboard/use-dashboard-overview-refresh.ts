import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { rateLimiter } from "@/lib/security";
import { logger } from "@/lib/logger";

const REFRESH_KEY = "dashboard-refresh";
const REFRESH_LIMIT = 5;
const REFRESH_WINDOW_MS = 60_000;

export function useDashboardOverviewRefresh(refetch: () => Promise<unknown>) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastDataFetch, setLastDataFetch] = useState(() => new Date());
  const [refreshCooldownSeconds, setRefreshCooldownSeconds] = useState(0);

  const syncCooldownFromLimiter = useCallback(() => {
    const remaining = rateLimiter.getRemainingAttempts(REFRESH_KEY, REFRESH_LIMIT, REFRESH_WINDOW_MS);
    if (remaining > 0) {
      setRefreshCooldownSeconds(0);
      return;
    }
    const ms = rateLimiter.getTimeUntilNextAttempt(REFRESH_KEY, REFRESH_WINDOW_MS);
    if (ms > 0) {
      setRefreshCooldownSeconds(Math.ceil(ms / 1000));
    }
  }, []);

  useEffect(() => {
    syncCooldownFromLimiter();
  }, [syncCooldownFromLimiter]);

  useEffect(() => {
    if (refreshCooldownSeconds <= 0) return;
    const id = window.setInterval(() => {
      setRefreshCooldownSeconds((s) => {
        if (s <= 1) {
          syncCooldownFromLimiter();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [refreshCooldownSeconds, syncCooldownFromLimiter]);

  const resetDashboardErrorState = useCallback(() => {
    void queryClient.resetQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "dashboard",
    });
  }, [queryClient]);

  const softRefreshDashboard = useCallback(async () => {
    await queryClient.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "dashboard",
    });
  }, [queryClient]);

  const handleRefresh = async () => {
    if (!rateLimiter.isAllowed(REFRESH_KEY, REFRESH_LIMIT, REFRESH_WINDOW_MS)) {
      const timeUntilNext = rateLimiter.getTimeUntilNextAttempt(REFRESH_KEY, REFRESH_WINDOW_MS);
      const secondsLeft = Math.ceil(timeUntilNext / 1000);
      setRefreshCooldownSeconds(secondsLeft);
      toast.error(`Too many refresh attempts. Please wait ${secondsLeft} seconds.`);
      return;
    }

    setRefreshCooldownSeconds(0);

    setIsRefreshing(true);
    try {
      await refetch();
      setLastDataFetch(new Date());
      toast.success("Dashboard refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh dashboard");
      logger.error(
        "Dashboard refresh failed",
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    handleRefresh,
    resetDashboardErrorState,
    softRefreshDashboard,
    isRefreshing,
    lastDataFetch,
    refreshCooldownSeconds,
  };
}
