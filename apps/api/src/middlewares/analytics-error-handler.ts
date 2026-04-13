// @epic-3.1-analytics: Comprehensive error handling for analytics endpoints
// @performance: Graceful degradation and error recovery

import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import cacheService from "../services/cache";
import logger from "../utils/logger";

interface AnalyticsError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  endpoint: string;
  workspaceId?: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  recentErrors: AnalyticsError[];
  avgResolutionTime: number;
}

class AnalyticsErrorTracker {
  private errors: AnalyticsError[] = [];
  private maxErrors = 1000; // Keep last 1000 errors
  
  addError(error: AnalyticsError) {
    this.errors.push(error);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
    
    // Log based on severity
    switch (error.severity) {
      case "critical":
        logger.failure(`🚨 CRITICAL Analytics Error: ${error.code} - ${error.message}`);
        break;
      case "high":
        logger.error(`❌ High Severity Analytics Error: ${error.code} - ${error.message}`);
        break;
      case "medium":
        logger.warn(`⚠️ Medium Severity Analytics Error: ${error.code} - ${error.message}`);
        break;
      case "low":
        logger.debug(`ℹ️ Low Severity Analytics Error: ${error.code} - ${error.message}`);
        break;
    }
  }
  
  getMetrics(): ErrorMetrics {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentErrors = this.errors.filter(
      e => new Date(e.timestamp).getTime() > oneHourAgo
    );
    
    const errorsByType: Record<string, number> = {};
    recentErrors.forEach(error => {
      errorsByType[error.code] = (errorsByType[error.code] || 0) + 1;
    });
    
    return {
      totalErrors: this.errors.length,
      errorRate: recentErrors.length, // Errors per hour
      errorsByType,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
      avgResolutionTime: 0, // Would need to track resolutions
    };
  }
  
  clearErrors() {
    this.errors = [];
  }
}

const errorTracker = new AnalyticsErrorTracker();

export async function analyticsErrorHandler(c: Context, next: Next) {
  const startTime = Date.now();
  const endpoint = c.req.path;
  const workspaceId = c.req.param("workspaceId");
  
  try {
    await next();
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Categorize the error
    const analyticsError = categorizeError(error, endpoint, workspaceId, processingTime);
    
    // Track the error
    errorTracker.addError(analyticsError);
    
    // Try to provide fallback data
    const fallbackResponse = await tryFallbackResponse(c, analyticsError);
    
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    // Return appropriate error response
    return handleErrorResponse(c, analyticsError);
  }
}

function categorizeError(
  error: any, 
  endpoint: string, 
  workspaceId?: string, 
  processingTime?: number
): AnalyticsError {
  const timestamp = new Date().toISOString();
  
  // Database connection errors
  if (error.message?.includes("database") || error.code === "ECONNREFUSED") {
    return {
      code: "DB_CONNECTION_ERROR",
      message: "Database connection failed",
      details: { originalError: error.message, processingTime },
      timestamp,
      endpoint,
      workspaceId,
      severity: "critical",
    };
  }
  
  // Permission errors
  if (error instanceof HTTPException && error.status === 403) {
    return {
      code: "PERMISSION_DENIED",
      message: "Insufficient permissions for analytics access",
      details: { originalError: error.message },
      timestamp,
      endpoint,
      workspaceId,
      severity: "medium",
    };
  }
  
  // Validation errors
  if (error.message?.includes("validation") || error.message?.includes("invalid")) {
    return {
      code: "VALIDATION_ERROR",
      message: "Invalid request parameters",
      details: { originalError: error.message },
      timestamp,
      endpoint,
      workspaceId,
      severity: "low",
    };
  }
  
  // Timeout errors
  if (error.message?.includes("timeout") || processingTime && processingTime > 30000) {
    return {
      code: "TIMEOUT_ERROR",
      message: "Analytics query timed out",
      details: { originalError: error.message, processingTime },
      timestamp,
      endpoint,
      workspaceId,
      severity: "high",
    };
  }
  
  // Memory/Resource errors
  if (error.message?.includes("memory") || error.message?.includes("heap")) {
    return {
      code: "RESOURCE_ERROR",
      message: "Insufficient resources for analytics processing",
      details: { originalError: error.message, processingTime },
      timestamp,
      endpoint,
      workspaceId,
      severity: "critical",
    };
  }
  
  // Data quality errors
  if (error.message?.includes("data") || error.message?.includes("null")) {
    return {
      code: "DATA_QUALITY_ERROR",
      message: "Data quality issues detected",
      details: { originalError: error.message },
      timestamp,
      endpoint,
      workspaceId,
      severity: "medium",
    };
  }
  
  // Generic errors
  return {
    code: "UNKNOWN_ERROR",
    message: error.message || "An unknown error occurred",
    details: { originalError: error.message, processingTime, stack: error.stack },
    timestamp,
    endpoint,
    workspaceId,
    severity: "high",
  };
}

async function tryFallbackResponse(c: Context, error: AnalyticsError) {
  const endpoint = error.endpoint;
  const workspaceId = error.workspaceId;
  
  // Don't provide fallback for critical errors
  if (error.severity === "critical") {
    return null;
  }
  
  try {
    // Try to get cached data as fallback
    if (workspaceId) {
      const cacheKey = cacheService.generateKey("analytics-fallback", { 
        workspaceId, 
        endpoint 
      });
      
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        logger.warn(`🔄 Using cached fallback data for ${endpoint}`);
        
        return c.json({
          ...cachedData,
          _metadata: {
            source: "cache_fallback",
            error: {
              code: error.code,
              message: "Primary data source unavailable, using cached data",
            },
            dataQuality: 75, // Reduced quality for fallback
            lastUpdated: error.timestamp,
          },
        });
      }
    }
    
    // Try to generate minimal analytics
    if (endpoint.includes("/analytics/")) {
      const minimalAnalytics = generateMinimalAnalytics(workspaceId);
      
      // Cache this minimal data for future fallbacks
      if (workspaceId) {
        const cacheKey = cacheService.generateKey("analytics-fallback", { 
          workspaceId, 
          endpoint 
        });
        await cacheService.set(cacheKey, minimalAnalytics, 3600); // 1 hour
      }
      
      return c.json({
        ...minimalAnalytics,
        _metadata: {
          source: "minimal_fallback",
          error: {
            code: error.code,
            message: "Showing minimal analytics due to processing error",
          },
          dataQuality: 25, // Very low quality for minimal data
          lastUpdated: error.timestamp,
        },
      });
    }
    
  } catch (fallbackError) {
    logger.error("Failed to generate fallback response:", fallbackError);
  }
  
  return null;
}

function generateMinimalAnalytics(workspaceId?: string) {
  return {
    projectMetrics: {
      totalProjects: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      activeProjects: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      completedProjects: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      projectsAtRisk: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      avgHealthScore: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
    },
    taskMetrics: {
      totalTasks: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      completedTasks: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      inProgressTasks: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      overdueTasks: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      avgCycleTime: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      throughput: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
    },
    teamMetrics: {
      totalMembers: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      activeMembers: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      avgProductivity: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      teamEfficiency: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      collaborationIndex: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
    },
    timeMetrics: {
      totalHours: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      billableHours: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      avgTimePerTask: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      timeUtilization: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
    },
    projectHealth: [],
    resourceUtilization: [],
    performanceBenchmarks: {
      avgProjectCompletion: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      avgTaskCycleTime: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      teamVelocity: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      qualityScore: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
      onTimeDelivery: { current: 0, comparison: null, change: { absolute: 0, percentage: 0, trend: "stable" } },
    },
    timeSeriesData: [],
    summary: {
      timeRange: "No data available",
      generatedAt: new Date().toISOString(),
      dataQuality: 0,
      recommendations: ["System is recovering from an error. Please try again later."],
      alerts: [
        {
          type: "warning" as const,
          message: "Analytics system is experiencing issues. Showing minimal data.",
          actionRequired: false,
        },
      ],
    },
  };
}

function handleErrorResponse(c: Context, error: AnalyticsError) {
  const statusCode = getStatusCodeForError(error);
  
  const errorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      endpoint: error.endpoint,
    },
    support: {
      message: "If this error persists, please contact support",
      actions: getSuggestedActions(error),
    },
    _metadata: {
      severity: error.severity,
      trackingId: generateTrackingId(error),
    },
  };
  
  return c.json(errorResponse, statusCode);
}

function getStatusCodeForError(error: AnalyticsError): number {
  switch (error.code) {
    case "PERMISSION_DENIED":
      return 403;
    case "VALIDATION_ERROR":
      return 400;
    case "TIMEOUT_ERROR":
      return 408;
    case "DB_CONNECTION_ERROR":
    case "RESOURCE_ERROR":
      return 503;
    case "DATA_QUALITY_ERROR":
      return 422;
    default:
      return 500;
  }
}

function getSuggestedActions(error: AnalyticsError): string[] {
  const actions: string[] = [];
  
  switch (error.code) {
    case "DB_CONNECTION_ERROR":
      actions.push("Check database connectivity");
      actions.push("Verify database credentials");
      break;
    case "PERMISSION_DENIED":
      actions.push("Check user permissions");
      actions.push("Contact administrator for access");
      break;
    case "VALIDATION_ERROR":
      actions.push("Verify request parameters");
      actions.push("Check API documentation");
      break;
    case "TIMEOUT_ERROR":
      actions.push("Reduce time range");
      actions.push("Simplify filters");
      actions.push("Try again later");
      break;
    case "RESOURCE_ERROR":
      actions.push("Reduce query complexity");
      actions.push("Contact system administrator");
      break;
    case "DATA_QUALITY_ERROR":
      actions.push("Check data integrity");
      actions.push("Report data quality issues");
      break;
    default:
      actions.push("Try again later");
      actions.push("Contact support if issue persists");
  }
  
  return actions;
}

function generateTrackingId(error: AnalyticsError): string {
  const timestamp = new Date(error.timestamp).getTime();
  const hash = error.code + error.endpoint + timestamp;
  return Buffer.from(hash).toString('base64').substring(0, 12);
}

// Error metrics endpoint
export function getErrorMetrics() {
  return errorTracker.getMetrics();
}

// Clear errors (for maintenance)
export function clearErrorHistory() {
  errorTracker.clearErrors();
}

export default analyticsErrorHandler;
export { AnalyticsError, ErrorMetrics, errorTracker };

