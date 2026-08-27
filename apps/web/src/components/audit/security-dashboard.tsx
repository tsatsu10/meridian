import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { AlertTriangle, Shield, Activity, Globe } from "lucide-react";
import { format } from "date-fns";
import {
  AuditAPI,
  type AuditLogEntry,
  type AuditStats,
} from "@/lib/api/audit-server";
import { userMessage } from "@/lib/user-message";
import useWorkspaceStore from "@/store/workspace";

/**
 * Recent security-relevant activity for the current workspace.
 *
 * This component used to fetch `/api/audit/security-logs` and `/api/audit/stats`
 * — neither route existed, and both failures were swallowed by `if (data.success)`.
 * It also displayed fabricated numbers: `successfulLogins` and `failedLogins`
 * were assigned the SAME value (`recentSecurityFailures.length`), so the
 * headline "Login Success Rate" card rendered exactly 50% permanently, no
 * matter what had happened. `riskScore`, `riskFactors`, `authMethod` and
 * `success` were read off every event, and no such fields exist anywhere in
 * this codebase — there is no risk-scoring subsystem.
 *
 * It now reads the real `audit_log` trail and shows only what that data
 * actually supports. Anything that cannot be derived from it is absent rather
 * than invented.
 */

const SECURITY_SEVERITIES = new Set(["high", "critical", "error", "warn"]);

const severityStyles: Record<string, string> = {
  critical: "bg-red-200 text-red-900",
  high: "bg-red-100 text-red-800",
  error: "bg-red-100 text-red-800",
  warn: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
  debug: "bg-gray-100 text-gray-800",
};

const RANGE_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30 };

export function SecurityDashboard() {
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id);
  const [events, setEvents] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<keyof typeof RANGE_DAYS>("24h");

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [securityEvents, summary] = await Promise.all([
          AuditAPI.listSecurityLogs(
            workspaceId,
            20,
            RANGE_DAYS[timeRange] ?? 1,
          ),
          AuditAPI.getStats(workspaceId, RANGE_DAYS[timeRange] ?? 1),
        ]);
        if (cancelled) return;
        setEvents(securityEvents);
        setStats(summary);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        setLoadError(userMessage(error, "load security activity"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    // Security monitoring refreshes on a timer; the cancelled flag keeps a
    // late response from a previous range/workspace out of current state.
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [timeRange, workspaceId]);

  const derived = useMemo(() => {
    const uniqueIPs = new Set(
      events.map((e) => e.ipAddress).filter((ip): ip is string => Boolean(ip)),
    );
    const uniqueActors = new Set(
      events
        .map((e) => e.actorEmail)
        .filter((email): email is string => Boolean(email)),
    );
    const securityEventCount = Object.entries(
      stats?.severityBreakdown ?? {},
    ).reduce(
      (sum, [severity, n]) =>
        SECURITY_SEVERITIES.has(severity) ? sum + n : sum,
      0,
    );
    return {
      uniqueIPs: uniqueIPs.size,
      uniqueActors: uniqueActors.size,
      securityEventCount,
    };
  }, [events, stats]);

  if (!workspaceId) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Select a workspace to see its security activity.
      </p>
    );
  }

  if (loadError) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600 dark:text-red-400">{loadError}</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => setTimeRange(timeRange)}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (loading && !events.length && !stats) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="mt-2 text-gray-600">Loading security activity...</p>
      </div>
    );
  }

  const metrics = [
    {
      label: "Audited events",
      value: stats?.totalEvents ?? 0,
      icon: Activity,
      tone: "text-blue-600",
      hint: `Last ${timeRange}`,
    },
    {
      label: "Security events",
      value: derived.securityEventCount,
      icon: AlertTriangle,
      tone: "text-red-600",
      hint: "Severity warn and above",
    },
    {
      label: "Distinct actors",
      value: derived.uniqueActors,
      icon: Shield,
      tone: "text-emerald-600",
      hint: "In recent security events",
    },
    {
      label: "Distinct IPs",
      value: derived.uniqueIPs,
      icon: Globe,
      tone: "text-indigo-600",
      hint: "In recent security events",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        {(Object.keys(RANGE_DAYS) as Array<keyof typeof RANGE_DAYS>).map(
          (range) => (
            <Button
              key={range}
              size="sm"
              variant={range === timeRange ? "default" : "outline"}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ),
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.label}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.tone}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metric.tone}`}>
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground">{metric.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats && stats.topActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Most frequent actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topActions.map((entry) => (
              <div
                key={entry.action}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-mono">{entry.action}</span>
                <span className="text-muted-foreground">{entry.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent security events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No security events recorded for this workspace.
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="mb-3 rounded-lg border p-4 hover:bg-muted/40"
              >
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium">
                    {event.action.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <Badge
                    className={severityStyles[event.severity] ?? "bg-gray-100"}
                  >
                    {event.severity}
                  </Badge>
                  {event.category && (
                    <Badge variant="outline" className="text-xs">
                      {event.category}
                    </Badge>
                  )}
                </div>

                <div className="mb-2 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Actor: </span>
                    {event.actorEmail || "System"}
                  </div>
                  <div>
                    <span className="font-medium">IP: </span>
                    <span className="font-mono">{event.ipAddress || "—"}</span>
                  </div>
                  <div>
                    <span className="font-medium">Time: </span>
                    {/* The API sends epoch milliseconds. The old component did
                     * `new Date(event.timestamp * 1000)`, treating them as
                     * seconds, which would have dated every event to the year
                     * 58000-odd had the request ever succeeded. */}
                    {format(new Date(event.timestamp), "MMM dd, HH:mm:ss")}
                  </div>
                  <div>
                    <span className="font-medium">Resource: </span>
                    {event.resourceType || "—"}
                  </div>
                </div>

                {event.description && (
                  <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {event.description}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SecurityDashboard;
