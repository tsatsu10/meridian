import { Hono } from "hono";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { auditLogTable, userTable } from "../database/schema";
import { requireWorkspacePermission } from "../middlewares/rbac";
import { getErrorMessage, statusCodeOf } from "../utils/error-utils";
import logger from "../utils/logger";

/**
 * Workspace audit trail.
 *
 * The Audit and Security pages have always called `/api/audit/*`, but no such
 * router existed — every request 404'd, and because the components gate on
 * `if (data.success)` the failure was swallowed and the page rendered an empty
 * log indistinguishable from "no activity". Meanwhile `audit_log` holds a real
 * populated trail (2,299 rows locally) written by utils/audit-logger.ts, and
 * `/api/settings/audit/:workspaceId/*` served something else entirely: task
 * activity joined out of the activity table, which has no severity, outcome or
 * resource type. So the page was not merely mis-pointed, it was pointed at a
 * feature that did not exist while the real one had no route at all.
 *
 * Scoped by path param so the existing `requireWorkspacePermission` guard
 * applies unchanged. Note that audit-logger's own `getStatistics()` is
 * deliberately NOT reused: it aggregates across every workspace, so returning
 * it here would leak another tenant's event counts. Stats below are computed
 * against the same workspace filter as the log query.
 */
const app = new Hono<{ Variables: { userEmail: string } }>();

const guard = requireWorkspacePermission("canViewAuditLogs", "workspaceId");
app.use("/:workspaceId", guard);
app.use("/:workspaceId/*", guard);

/** Severities that the Security dashboard treats as security-relevant. */
const SECURITY_SEVERITIES = ["high", "critical", "error", "warn"];

const MAX_PAGE_SIZE = 200;

function parseLimit(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, MAX_PAGE_SIZE);
}

function parseOffset(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function sinceForDays(raw: string | undefined): Date | null {
  const days = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(days) || days <= 0) return null;
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since;
}

/**
 * Every read here is filtered by workspaceId. `audit_log.workspace_id` is
 * nullable — instance-wide events (a sign-in, say) carry no workspace — and
 * those are deliberately excluded rather than shown to everyone, since a row
 * with no workspace cannot be shown to one tenant without being shown to all.
 */
function workspaceScope(workspaceId: string) {
  return eq(auditLogTable.workspaceId, workspaceId);
}

// GET /api/audit/:workspaceId/logs
app.get("/:workspaceId/logs", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const q = c.req.query();

  try {
    const db = getDatabase();
    const limit = parseLimit(q.limit, 50);
    const offset = parseOffset(q.offset);

    const conditions = [workspaceScope(workspaceId)];
    if (q.severity) conditions.push(eq(auditLogTable.severity, q.severity));
    if (q.action) conditions.push(eq(auditLogTable.action, q.action));
    if (q.actorEmail)
      conditions.push(eq(auditLogTable.actorEmail, q.actorEmail));
    if (q.resourceType)
      conditions.push(eq(auditLogTable.resourceType, q.resourceType));
    const since = sinceForDays(q.days);
    if (since) conditions.push(gte(auditLogTable.timestamp, since));

    const where = and(...conditions);

    const [totalRow] = await db
      .select({ n: count() })
      .from(auditLogTable)
      .where(where);
    const total = Number(totalRow?.n ?? 0);

    const rows = await db
      .select({
        id: auditLogTable.id,
        action: auditLogTable.action,
        resourceType: auditLogTable.resourceType,
        resourceId: auditLogTable.resourceId,
        actorEmail: auditLogTable.actorEmail,
        actorName: userTable.name,
        severity: auditLogTable.severity,
        category: auditLogTable.category,
        description: auditLogTable.description,
        ipAddress: auditLogTable.ipAddress,
        userAgent: auditLogTable.userAgent,
        changes: auditLogTable.changes,
        metadata: auditLogTable.metadata,
        timestamp: auditLogTable.timestamp,
      })
      .from(auditLogTable)
      .leftJoin(userTable, eq(auditLogTable.actorEmail, userTable.email))
      .where(where)
      .orderBy(desc(auditLogTable.timestamp))
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        severity: r.severity ?? "info",
        timestamp: r.timestamp.getTime(),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + rows.length < total,
      },
    });
  } catch (error) {
    logger.error("Failed to get audit logs:", error);
    return c.json({ error: getErrorMessage(error) }, statusCodeOf(error));
  }
});

// GET /api/audit/:workspaceId/stats
app.get("/:workspaceId/stats", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const days = Number.parseInt(c.req.query("days") ?? "7", 10);
  const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 7;

  try {
    const db = getDatabase();
    const since = new Date();
    since.setDate(since.getDate() - safeDays);
    const where = and(
      workspaceScope(workspaceId),
      gte(auditLogTable.timestamp, since),
    );

    const [totalRow] = await db
      .select({ n: count() })
      .from(auditLogTable)
      .where(where);

    const bySeverity = await db
      .select({ severity: auditLogTable.severity, n: count() })
      .from(auditLogTable)
      .where(where)
      .groupBy(auditLogTable.severity);

    const byAction = await db
      .select({ action: auditLogTable.action, n: count() })
      .from(auditLogTable)
      .where(where)
      .groupBy(auditLogTable.action)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const recentFailures = await db
      .select({
        id: auditLogTable.id,
        action: auditLogTable.action,
        actorEmail: auditLogTable.actorEmail,
        severity: auditLogTable.severity,
        description: auditLogTable.description,
        ipAddress: auditLogTable.ipAddress,
        timestamp: auditLogTable.timestamp,
      })
      .from(auditLogTable)
      .where(and(where, inArray(auditLogTable.severity, SECURITY_SEVERITIES)))
      .orderBy(desc(auditLogTable.timestamp))
      .limit(10);

    const severityBreakdown: Record<string, number> = {};
    for (const row of bySeverity) {
      severityBreakdown[row.severity ?? "info"] = Number(row.n);
    }

    return c.json({
      success: true,
      data: {
        totalEvents: Number(totalRow?.n ?? 0),
        severityBreakdown,
        topActions: byAction.map((r) => ({
          action: r.action,
          count: Number(r.n),
        })),
        recentSecurityFailures: recentFailures.map((r) => ({
          ...r,
          timestamp: r.timestamp.getTime(),
        })),
        timeRange: { since: since.toISOString(), days: safeDays },
      },
    });
  } catch (error) {
    logger.error("Failed to get audit stats:", error);
    return c.json({ error: getErrorMessage(error) }, statusCodeOf(error));
  }
});

// GET /api/audit/:workspaceId/security-logs
app.get("/:workspaceId/security-logs", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const limit = parseLimit(c.req.query("limit"), 20);
  // Honour the same window as /stats: the Security dashboard shows these
  // events beside range-filtered metric cards, and an unfiltered list next to
  // "last 24h" counts reads as a contradiction.
  const since = sinceForDays(c.req.query("days"));

  try {
    const db = getDatabase();
    const rows = await db
      .select({
        id: auditLogTable.id,
        action: auditLogTable.action,
        resourceType: auditLogTable.resourceType,
        actorEmail: auditLogTable.actorEmail,
        severity: auditLogTable.severity,
        category: auditLogTable.category,
        description: auditLogTable.description,
        ipAddress: auditLogTable.ipAddress,
        timestamp: auditLogTable.timestamp,
      })
      .from(auditLogTable)
      .where(
        and(
          workspaceScope(workspaceId),
          inArray(auditLogTable.severity, SECURITY_SEVERITIES),
          ...(since ? [gte(auditLogTable.timestamp, since)] : []),
        ),
      )
      .orderBy(desc(auditLogTable.timestamp))
      .limit(limit);

    return c.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        severity: r.severity ?? "info",
        timestamp: r.timestamp.getTime(),
      })),
    });
  } catch (error) {
    logger.error("Failed to get security logs:", error);
    return c.json({ error: getErrorMessage(error) }, statusCodeOf(error));
  }
});

// GET /api/audit/:workspaceId/export
app.get("/:workspaceId/export", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const format = c.req.query("format") === "csv" ? "csv" : "json";

  try {
    const db = getDatabase();
    const conditions = [workspaceScope(workspaceId)];
    const since = sinceForDays(c.req.query("days"));
    if (since) conditions.push(gte(auditLogTable.timestamp, since));

    const rows = await db
      .select()
      .from(auditLogTable)
      .where(and(...conditions))
      .orderBy(desc(auditLogTable.timestamp))
      .limit(10000);

    if (format === "csv") {
      const columns = [
        "timestamp",
        "severity",
        "action",
        "resourceType",
        "resourceId",
        "actorEmail",
        "ipAddress",
        "description",
      ] as const;
      const toCsvCell = (v: unknown) => {
        let s = v === null || v === undefined ? "" : String(v);
        // Neutralise formula injection BEFORE quoting. Quoting alone does not
        // help: the quotes are CSV delimiters and the spreadsheet strips them
        // on parse, so `"=cmd|'/c calc'!A1"` is still evaluated on open. These
        // fields carry attacker-influenceable text — description and
        // actorEmail among them — and the export is opened in Excel by the
        // people investigating an incident, which is precisely the wrong
        // audience to hand a live formula to.
        if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
        // Quote always: audit descriptions routinely contain commas.
        return `"${s.replace(/"/g, '""')}"`;
      };
      const body = [
        columns.join(","),
        ...rows.map((r) =>
          columns
            .map((col) =>
              toCsvCell(
                col === "timestamp"
                  ? r.timestamp.toISOString()
                  : (r as Record<string, unknown>)[col],
              ),
            )
            .join(","),
        ),
      ].join("\n");

      return c.body(body, 200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${workspaceId}.csv"`,
      });
    }

    return c.json({ success: true, data: rows });
  } catch (error) {
    logger.error("Failed to export audit logs:", error);
    return c.json({ error: getErrorMessage(error) }, statusCodeOf(error));
  }
});

export default app;
