/**
 * Base Webhook Handler
 * Eliminates duplication in webhook handling across integrations
 */

import { Context } from 'hono';
import logger from './logger';

export interface WebhookValidationOptions {
  requireWorkspaceId?: boolean;
  requireSignature?: boolean;
  requireTimestamp?: boolean;
  customHeaders?: string[];
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  challenge?: string;
  error?: string;
  details?: string;
}

export abstract class BaseWebhookHandler {
  protected validationOptions: WebhookValidationOptions;

  constructor(validationOptions: WebhookValidationOptions = {}) {
    this.validationOptions = {
      requireWorkspaceId: true,
      requireSignature: false,
      requireTimestamp: false,
      ...validationOptions
    };
  }

  /**
   * Main webhook handling method
   */
  async handleWebhook(c: Context): Promise<Response> {
    try {
      // Extract and validate headers
      const headers = this.extractHeaders(c);
      const validationResult = this.validateHeaders(headers);
      
      if (!validationResult.isValid) {
        return c.json({
          success: false,
          error: validationResult.error
        }, 400);
      }

      // Parse payload
      const payload = await this.parsePayload(c);
      
      // Process webhook
      const result = await this.processWebhook(
        headers.workspaceId!,
        payload,
        headers
      );

      // Handle URL verification challenges
      if (result.challenge) {
        return c.text(result.challenge);
      }

      return c.json({
        success: true,
        message: result.message || "Webhook processed successfully",
        ...(result.data && { data: result.data })
      });

    } catch (error) {
      logger.error(`Webhook processing error:`, error);
      return this.handleWebhookError(c, error);
    }
  }

  /**
   * Extract common headers
   */
  protected extractHeaders(c: Context) {
    return {
      workspaceId: c.req.header("x-workspace-id"),
      signature: c.req.header("x-slack-signature") || c.req.header("x-github-signature"),
      timestamp: c.req.header("x-slack-request-timestamp") || c.req.header("x-github-timestamp"),
      contentType: c.req.header("content-type"),
      userAgent: c.req.header("user-agent"),
      // Extract any custom headers defined in options
      ...this.extractCustomHeaders(c)
    };
  }

  /**
   * Extract custom headers based on validation options
   */
  protected extractCustomHeaders(c: Context): Record<string, string | undefined> {
    const customHeaders: Record<string, string | undefined> = {};
    
    if (this.validationOptions.customHeaders) {
      for (const headerName of this.validationOptions.customHeaders) {
        customHeaders[headerName] = c.req.header(headerName);
      }
    }
    
    return customHeaders;
  }

  /**
   * Validate required headers
   */
  protected validateHeaders(headers: any): { isValid: boolean; error?: string } {
    if (this.validationOptions.requireWorkspaceId && !headers.workspaceId) {
      return { isValid: false, error: "Workspace ID required" };
    }

    if (this.validationOptions.requireSignature && !headers.signature) {
      return { isValid: false, error: "Signature required" };
    }

    if (this.validationOptions.requireTimestamp && !headers.timestamp) {
      return { isValid: false, error: "Timestamp required" };
    }

    return { isValid: true };
  }

  /**
   * Parse request payload
   */
  protected async parsePayload(c: Context): Promise<any> {
    const contentType = c.req.header("content-type");
    
    if (contentType?.includes("application/json")) {
      return await c.req.json();
    } else if (contentType?.includes("application/x-www-form-urlencoded")) {
      return await c.req.parseBody();
    } else {
      return await c.req.text();
    }
  }

  /**
   * Handle webhook processing errors
   */
  protected handleWebhookError(c: Context, error: unknown): Response {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return c.json({
      success: false,
      error: `Failed to process webhook`,
      details: errorMessage
    }, 500);
  }

  /**
   * Abstract method to be implemented by specific webhook handlers
   */
  abstract processWebhook(
    workspaceId: string,
    payload: any,
    headers: any
  ): Promise<WebhookResponse>;
}

/**
 * Utility function to create a webhook handler
 */
export function createWebhookHandler(
  handler: BaseWebhookHandler
) {
  return async (c: Context) => {
    return await handler.handleWebhook(c);
  };
}

