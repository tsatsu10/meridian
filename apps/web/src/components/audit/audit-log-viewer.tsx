import { useState, useEffect } from "react";
import {
  AuditAPI,
  type AuditLogEntry,
  type AuditStats,
} from "@/lib/api/audit-server";
import { userMessage } from "@/lib/user-message";
import useWorkspaceStore from "@/store/workspace";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import {
  Calendar,
  Download,
  Filter,
  Search,
  Shield,
  User,
  Activity,
} from "lucide-react";
import { format } from "date-fns";

// AuditLogEntry / AuditStats now come from lib/api/audit-server, so the
// component and the client cannot drift apart on nullability again.

export function AuditLogViewer() {
  // The audit trail is workspace-scoped on the server, so the viewer cannot
  // ask for anything without knowing which workspace it is in. It previously
  // called an unscoped /api/audit/logs that did not exist.
  const workspaceId = useWorkspaceStore((state) => state.workspace?.id);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    severity: "",
    category: "",
    action: "",
    startDate: "",
    endDate: "",
    actorId: "",
  });
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 50,
    total: 0,
    hasMore: false,
  });

  // audit_log.severity is a free-text column, so it carries values beyond this
  // set (the seed data alone contains "medium"). Indexed by string with a
  // fallback rather than typed to five literals that the data does not honour.
  const severityColors: Record<string, string> = {
    debug: "bg-gray-100 text-gray-800",
    info: "bg-blue-100 text-blue-800",
    warn: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    critical: "bg-red-200 text-red-900",
  };

  const fetchAuditLogs = async (resetPagination = false) => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const offset = resetPagination ? 0 : pagination.offset;
      const page = await AuditAPI.listLogs(workspaceId, {
        limit: pagination.limit,
        offset,
        severity: filters.severity || undefined,
        action: filters.action || undefined,
      });

      setLogs(resetPagination ? page.logs : [...logs, ...page.logs]);
      setPagination({
        ...pagination,
        offset: resetPagination ? 0 : offset + pagination.limit,
        total: page.total,
        hasMore: page.hasMore,
      });
      setLoadError(null);
    } catch (error) {
      // Previously this only ran `if (data.success)`, so a 404 left the list
      // empty and the page looked like a workspace with no audit activity.
      // A failure to load must never be indistinguishable from "nothing here".
      setLoadError(userMessage(error, "load the audit log"));
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditStats = async () => {
    if (!workspaceId) return;
    try {
      setStats(await AuditAPI.getStats(workspaceId, 7));
    } catch (error) {
      setLoadError(userMessage(error, "load the audit summary"));
    }
  };

  const exportLogs = async (format: "json" | "csv") => {
    if (!workspaceId) return;
    try {
      const blob = await AuditAPI.exportLogs(workspaceId, format, 30);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      // The old version swallowed failures entirely — `if (response.ok)` with
      // no else, so a failed export was indistinguishable from a successful
      // one that produced no file.
      toast.error(userMessage(error, "export the audit log"));
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch logs/stats when filters or workspace change; fetch fns intentionally not deps
  useEffect(() => {
    fetchAuditLogs(true);
    fetchAuditStats();
  }, [filters, workspaceId]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const renderLogEntry = (log: AuditLogEntry) => (
    <div key={log.id} className="border rounded-lg p-4 mb-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              className={
                severityColors[log.severity] ?? "bg-gray-100 text-gray-800"
              }
            >
              {log.severity.toUpperCase()}
            </Badge>
            <span className="font-medium">{log.action}</span>
            <span className="text-gray-500">on</span>
            <span className="font-medium">{log.resourceType}</span>
            {log.resourceId && (
              <>
                <span className="text-gray-500">:</span>
                <span className="text-sm font-mono">{log.resourceId}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{log.actorName || log.actorEmail}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {/* timestamp is epoch milliseconds; the previous `* 1000`
                 * treated it as seconds and dated every entry to ~year 58000. */}
                {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
              </span>
            </div>
            {log.ipAddress && (
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                <span>{log.ipAddress}</span>
              </div>
            )}
          </div>

          {log.description && (
            <p className="text-sm text-gray-700 mb-2">{log.description}</p>
          )}

          {!!log.changes && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                View Changes
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(log.changes, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                Last {stats.timeRange.days} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Critical Events
              </CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.severityBreakdown.critical || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Security Failures
              </CardTitle>
              <Shield className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.recentSecurityFailures.length}
              </div>
              <p className="text-xs text-muted-foreground">Recent failures</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Action</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {stats.topActions[0]?.action || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.topActions[0]?.count || 0} times
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.severity}
              onValueChange={(value) => handleFilterChange("severity", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Severities</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.category}
              onValueChange={(value) => handleFilterChange("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="authentication">Authentication</SelectItem>
                <SelectItem value="authorization">Authorization</SelectItem>
                <SelectItem value="data_access">Data Access</SelectItem>
                <SelectItem value="administration">Administration</SelectItem>
                <SelectItem value="api_access">API Access</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLogs("json")}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLogs("csv")}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Input
              type="datetime-local"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
            <Input
              type="datetime-local"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <p className="text-sm text-gray-600">
            Showing {logs.length} of {pagination.total} entries
          </p>
        </CardHeader>
        <CardContent>
          {/* A failed load must not render as "no audit logs found". That
           * conflation is what hid this page being broken: every request
           * 404'd, the error was swallowed, and the result read as a
           * workspace with nothing to audit. */}
          {loadError ? (
            <div className="py-8 text-center">
              <p className="text-red-600 dark:text-red-400">{loadError}</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  fetchAuditLogs(true);
                  fetchAuditStats();
                }}
              >
                Try again
              </Button>
            </div>
          ) : loading && logs.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-2 text-gray-600">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                No audit logs found matching your criteria.
              </p>
            </div>
          ) : (
            <div>
              {logs.map(renderLogEntry)}

              {pagination.hasMore && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchAuditLogs(false)}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
