/**
 * 🔒 Security Audit Middleware
 * 
 * Comprehensive security auditing for RBAC enforcement.
 * Logs all permission checks and validates security compliance.
 */

import { createMiddleware } from "hono/factory";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { roleAssignmentTable, roleHistoryTable, userTable } from "../database/schema";
import type { UserRole, PermissionAction } from "../types/rbac";
import { createId } from "@paralleldrive/cuid2";
import logger from '../utils/logger';

interface SecurityAuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: string;
  endpoint: string;
  method: string;
  permission?: PermissionAction;
  allowed: boolean;
  reason?: string;
  context?: {
    workspaceId?: string;
    projectId?: string;
    departmentId?: string;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  responseStatus?: number;
}

/**
 * Security audit logging middleware
 */
export function securityAuditLogger() {
  return createMiddleware(async (c, next) => {
    const startTime = Date.now();
    const userEmail = c.get("userEmail") || "anonymous";
    const userRole = c.get("userRole") || "guest";
    const userId = c.get("userId") || "unknown";
    
    const auditLog: SecurityAuditLog = {
      id: createId(),
      userId,
      userEmail,
      userRole: userRole as UserRole,
      action: `${c.req.method} ${c.req.path}`,
      endpoint: c.req.path,
      method: c.req.method,
      allowed: false, // Will be updated based on response
      ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
      userAgent: c.req.header("user-agent") || "unknown",
      timestamp: new Date(),
    };

    try {
      await next();
      
      // Mark as allowed if no error was thrown
      auditLog.allowed = true;
      auditLog.responseStatus = 200;
      
    } catch (error) {
      auditLog.allowed = false;
      auditLog.reason = error instanceof Error ? error.message : "Unknown error";
      auditLog.responseStatus = 500;
      
      logger.warn("🚨 Security audit: Action failed", {
        user: userEmail,
        role: userRole,
        action: auditLog.action,
        error: auditLog.reason
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log security-sensitive actions
    if (isSecuritySensitiveAction(auditLog.endpoint, auditLog.method)) {
      logger.debug("🔒 Security audit log:", {
        ...auditLog,
        duration: `${duration}ms`
      });
      
      // Store in database for persistent auditing
      await storeAuditLog(auditLog);
    }
  });
}

/**
 * Check if an action is security-sensitive and should be audited
 */
function isSecuritySensitiveAction(endpoint: string, method: string): boolean {
  const sensitivePatterns = [
    "/rbac/",
    "/roles/",
    "/permissions/",
    "/workspace/",
    "/admin/",
    "/users/",
    "/billing/",
    "/settings/"
  ];
  
  const sensitiveMethods = ["POST", "PUT", "DELETE", "PATCH"];
  
  return (
    sensitivePatterns.some(pattern => endpoint.includes(pattern)) ||
    sensitiveMethods.includes(method) ||
    endpoint.includes("delete") ||
    endpoint.includes("remove") ||
    endpoint.includes("assign") ||
    endpoint.includes("revoke")
  );
}

/**
 * Store audit log in database
 */
async function storeAuditLog(auditLog: SecurityAuditLog): Promise<void> {
  try {
    const db = getDatabase();
    // Only store audit logs if we have a valid user ID
    if (!auditLog.userId || auditLog.userId === 'unknown') {
      logger.warn("Skipping audit log storage - no valid user ID");
      return;
    }

    // Verify user exists before inserting audit log
    const userExists = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.id, auditLog.userId))
      .limit(1);

    if (userExists.length === 0) {
      logger.warn(`Skipping audit log storage - user ${auditLog.userId} not found`);
      return;
    }

    // For now, we'll use the role_history table to store security events
    // In a production system, you'd want a dedicated audit_log table
    await db.insert(roleHistoryTable).values({
      id: auditLog.id,
      userId: auditLog.userId,
      action: "security_audit",
      newRole: auditLog.userRole,
      changedBy: auditLog.userId,
      reason: `Security audit: ${auditLog.action} - ${auditLog.allowed ? 'ALLOWED' : 'DENIED'}`,
      workspaceId: auditLog.context?.workspaceId || null,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      changedAt: auditLog.timestamp,
    });
  } catch (error) {
    logger.error("Failed to store audit log:", error);
    // Don't throw - audit logging failure shouldn't break the request
  }
}

/**
 * Validate RBAC compliance for critical operations
 */
export function validateRBACCompliance() {
  return createMiddleware(async (c, next) => {
    const userRole = c.get("userRole") as UserRole;
    const endpoint = c.req.path;
    const method = c.req.method;
    
    // Extract IDs from URL path for context validation
    const workspaceIdFromPath = endpoint.match(/\/workspace\/([^\/]+)/)?.[1];
    const projectIdFromPath = endpoint.match(/\/project\/([^\/]+)/)?.[1];
    
    // Check for potential security bypasses
    const securityViolations = [];
    
    // 1. Check for admin operations without proper role
    if (isAdminOperation(endpoint, method) && !hasAdminRole(userRole)) {
      securityViolations.push("Admin operation attempted without admin role");
    }
    
    // 2. Check for workspace operations without workspace context
    // Skip collection routes (/api/workspace, /api/workspaces) — create/list have no id in path
    if (
      isWorkspaceOperation(endpoint) &&
      !isWorkspaceCollectionPath(endpoint) &&
      !c.get("workspaceId") &&
      !workspaceIdFromPath &&
      !endpoint.includes("/workspace/list")
    ) {
      // Only flag as violation if it's not a GET operation that might be listing workspaces
      if (method !== "GET" || !endpoint.endsWith("/workspace")) {
        securityViolations.push("Workspace operation without workspace context");
      }
    }
    
    // 3. Check for project operations without project context  
    // Skip this check if we can extract project ID from path or it's a list operation
    if (isProjectOperation(endpoint) && !c.get("projectId") && !projectIdFromPath && !endpoint.includes("/project/list")) {
      // Only flag as violation if it's not a GET operation that might be listing projects
      if (method !== "GET" || !endpoint.endsWith("/project")) {
        securityViolations.push("Project operation without project context");
      }
    }
    
    // 4. Check for guest/external user restrictions
    if (isExternalUser(userRole) && hasInternalRestrictions(endpoint)) {
      securityViolations.push("External user accessing internal resources");
    }
    
    if (securityViolations.length > 0) {
      logger.warn("🚨 RBAC COMPLIANCE VIOLATION:", {
        user: c.get("userEmail"),
        role: userRole,
        endpoint,
        method,
        violations: securityViolations
      });
      
      // In demo mode, only warn instead of blocking
      const { isDemoMode } = require("../utils/get-settings").default();
      if (isDemoMode) {
        logger.warn("⚠️ Demo mode: Allowing operation despite compliance violations");
      } else {
        return c.json({
          error: "Security policy violation",
          violations: securityViolations,
          message: "This action violates security policies"
        }, 403);
      }
    }
    
    await next();
  });
}

// Helper functions for compliance checking
function isAdminOperation(endpoint: string, method: string): boolean {
  return (
    endpoint.includes("/admin/") ||
    endpoint.includes("/roles/assign") ||
    endpoint.includes("/workspace") && method === "DELETE" ||
    endpoint.includes("/billing/")
  );
}

function hasAdminRole(role: UserRole): boolean {
  return ["workspace-manager", "department-head"].includes(role);
}

function isWorkspaceOperation(endpoint: string): boolean {
  return endpoint.includes("/workspace/") && !endpoint.includes("/workspace/list");
}

/** Paths for listing/creating workspaces (no :id segment). */
function isWorkspaceCollectionPath(endpoint: string): boolean {
  return /^\/api\/workspaces\/?$/.test(endpoint) || /^\/api\/workspace\/?$/.test(endpoint);
}

function isProjectOperation(endpoint: string): boolean {
  return endpoint.includes("/project/") && !endpoint.includes("/project/list");
}

function isExternalUser(role: UserRole): boolean {
  return ["guest", "client", "contractor", "stakeholder"].includes(role);
}

function hasInternalRestrictions(endpoint: string): boolean {
  return (
    endpoint.includes("/internal/") ||
    endpoint.includes("/employee/") ||
    endpoint.includes("/admin/") ||
    endpoint.includes("/analytics/") ||
    endpoint.includes("/billing/")
  );
}

/**
 * Demo mode detection and warning
 */
export function detectDemoMode() {
  return createMiddleware(async (c, next) => {
    const userEmail = c.get("userEmail") || "";
    
    // Detect demo users
    const isDemoUser = (
      userEmail.endsWith('@meridian.app') || 
      userEmail.includes('demo') || 
      userEmail === 'demo@example.com' ||
      userEmail.includes('test@')
    );
    
    if (isDemoUser) {
      logger.warn("⚠️ DEMO MODE DETECTED:", {
        user: userEmail,
        endpoint: c.req.path,
        message: "Demo user bypassing normal security restrictions"
      });
      
      // In production, you might want to add additional restrictions for demo users
      c.set("isDemoUser", true);
    }
    
    await next();
  });
}

export default {
  securityAuditLogger,
  validateRBACCompliance,
  detectDemoMode,
}; 
