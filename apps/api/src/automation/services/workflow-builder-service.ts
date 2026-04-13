/**
 * 🛠️ Workflow Builder Service
 * 
 * Service for managing visual workflows including CRUD operations,
 * validation, compilation, and template management.
 * 
 * @epic-3.2.3-visual-workflows
 */

import { createId } from "@paralleldrive/cuid2";
import { eq, and, desc, like, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { 
  visualWorkflowTable,
  visualWorkflowTemplateTable,
  workflowNodeTypeTable 
} from "../../database/schema";
import { VisualWorkflow, WorkflowNode } from "./visual-workflow-engine";
import logger from '../../utils/logger';

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  category?: string;
  nodes: WorkflowNode[];
  connections: Array<{
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
  variables?: Record<string, any>;
  settings?: {
    errorHandling: "stop" | "continue" | "retry";
    retryCount?: number;
    timeout?: number;
  };
  tags?: string[];
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

type VisualWorkflowRow = typeof visualWorkflowTable.$inferSelect;

function enrichVisualWorkflowRow(row: VisualWorkflowRow) {
  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const nodes = (row.nodes as WorkflowNode[]) ?? [];
  const connections =
    (row.edges as CreateWorkflowRequest["connections"]) ?? [];
  return {
    ...row,
    category: (meta.category as string) ?? "automation",
    version: row.version ?? 1,
    tags: (meta.tags as string[]) ?? [],
    visualDefinition: {
      nodes,
      connections,
      variables: meta.variables,
      settings: meta.settings as CreateWorkflowRequest["settings"],
    },
    executionDefinition:
      (meta.executionDefinition as Record<string, unknown>) ?? {
        nodes,
        connections,
        variables: meta.variables ?? {},
        settings: meta.settings ?? { errorHandling: "stop" },
      },
  };
}

export class WorkflowBuilderService {

  /**
   * Create a new visual workflow
   */
  async createWorkflow(
    workspaceId: string,
    userId: string,
    workflowData: CreateWorkflowRequest
  ): Promise<{ success: boolean; workflow?: any; error?: string }> {
    const db = getDatabase();
    
    try {
      // Validate workflow
      const validation = await this.validateWorkflow(workflowData);
      if (!validation.isValid) {
        return { 
          success: false, 
          error: `Workflow validation failed: ${validation.errors.join(", ")}` 
        };
      }

      // Compile workflow into execution format
      const executionDefinition = await this.compileWorkflow(workflowData);

      // Create workflow record
      const workflowId = createId();
      const workflow = await db.insert(visualWorkflowTable).values({
        id: workflowId,
        workspaceId,
        name: workflowData.name,
        description: workflowData.description ?? null,
        nodes: workflowData.nodes,
        edges: workflowData.connections,
        metadata: {
          category: workflowData.category || "automation",
          variables: workflowData.variables,
          settings: workflowData.settings,
          tags: workflowData.tags || [],
          executionDefinition,
        },
        isActive: false,
        createdBy: userId,
      }).returning();

      const inserted = workflow[0];
      if (!inserted) {
        return { success: false, error: "Insert returned no row" };
      }

      return {
        success: true,
        workflow: enrichVisualWorkflowRow(inserted),
      };

    } catch (error) {
      logger.error("Failed to create workflow:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Get workflows for workspace
   */
  async getWorkflows(
    workspaceId: string,
    filters?: {
      category?: string;
      isActive?: boolean;
      search?: string;
    }
  ): Promise<any[]> {
    const db = getDatabase();
    
    try {
      const conditions = [eq(visualWorkflowTable.workspaceId, workspaceId)];

      if (filters?.category) {
        conditions.push(
          sql`${visualWorkflowTable.metadata}->>'category' = ${filters.category}`,
        );
      }

      if (filters?.isActive !== undefined) {
        conditions.push(eq(visualWorkflowTable.isActive, filters.isActive));
      }

      if (filters?.search) {
        conditions.push(like(visualWorkflowTable.name, `%${filters.search}%`));
      }

      const workflows = await db
        .select()
        .from(visualWorkflowTable)
        .where(and(...conditions))
        .orderBy(desc(visualWorkflowTable.updatedAt));

      return workflows.map((row) => enrichVisualWorkflowRow(row));

    } catch (error) {
      logger.error("Failed to get workflows:", error);
      return [];
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string, workspaceId?: string): Promise<any | null> {
    const db = getDatabase();
    
    try {
      const conditions = [eq(visualWorkflowTable.id, workflowId)];
      if (workspaceId) {
        conditions.push(eq(visualWorkflowTable.workspaceId, workspaceId));
      }

      const workflows = await db
        .select()
        .from(visualWorkflowTable)
        .where(and(...conditions));

      const workflow = workflows[0];
      return workflow ? enrichVisualWorkflowRow(workflow) : null;

    } catch (error) {
      logger.error("Failed to get workflow:", error);
      return null;
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    workflowId: string,
    workspaceId: string,
    updates: Partial<CreateWorkflowRequest>
  ): Promise<{ success: boolean; workflow?: any; error?: string }> {
    const db = getDatabase();
    
    try {
      const existingWorkflow = await this.getWorkflow(workflowId, workspaceId);
      if (!existingWorkflow) {
        return { success: false, error: "Workflow not found" };
      }

      const [currentRow] = await db
        .select()
        .from(visualWorkflowTable)
        .where(
          and(
            eq(visualWorkflowTable.id, workflowId),
            eq(visualWorkflowTable.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!currentRow) {
        return { success: false, error: "Workflow not found" };
      }

      const prevMeta =
        currentRow.metadata &&
        typeof currentRow.metadata === "object" &&
        !Array.isArray(currentRow.metadata)
          ? (currentRow.metadata as Record<string, unknown>)
          : {};

      const updatedWorkflowData: CreateWorkflowRequest = {
        name: updates.name || existingWorkflow.name,
        description: updates.description ?? existingWorkflow.description,
        category: updates.category || existingWorkflow.category,
        nodes: updates.nodes || existingWorkflow.visualDefinition.nodes,
        connections:
          updates.connections || existingWorkflow.visualDefinition.connections,
        variables:
          updates.variables ?? existingWorkflow.visualDefinition.variables,
        settings:
          updates.settings ?? existingWorkflow.visualDefinition.settings,
        tags: updates.tags ?? existingWorkflow.tags ?? [],
      };

      if (updates.nodes || updates.connections) {
        const validation = await this.validateWorkflow(updatedWorkflowData);
        if (!validation.isValid) {
          return {
            success: false,
            error: `Workflow validation failed: ${validation.errors.join(", ")}`,
          };
        }
      }

      const executionDefinition = await this.compileWorkflow(updatedWorkflowData);

      const nextMeta = {
        ...prevMeta,
        category: updatedWorkflowData.category,
        variables: updatedWorkflowData.variables,
        settings: updatedWorkflowData.settings,
        tags: updatedWorkflowData.tags,
        executionDefinition,
      };

      const updatedWorkflow = await db
        .update(visualWorkflowTable)
        .set({
          name: updatedWorkflowData.name,
          description: updatedWorkflowData.description ?? null,
          nodes: updatedWorkflowData.nodes,
          edges: updatedWorkflowData.connections,
          metadata: nextMeta,
          updatedAt: new Date(),
          version: (existingWorkflow.version ?? 1) + 1,
        })
        .where(
          and(
            eq(visualWorkflowTable.id, workflowId),
            eq(visualWorkflowTable.workspaceId, workspaceId),
          ),
        )
        .returning();

      const row = updatedWorkflow[0];
      if (!row) {
        return { success: false, error: "Failed to update workflow" };
      }

      return {
        success: true,
        workflow: enrichVisualWorkflowRow(row),
      };

    } catch (error) {
      logger.error("Failed to update workflow:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(
    workflowId: string,
    workspaceId: string
  ): Promise<{ success: boolean; error?: string }> {
    const db = getDatabase();
    
    try {
      const result = await db.delete(visualWorkflowTable)
        .where(and(
          eq(visualWorkflowTable.id, workflowId),
          eq(visualWorkflowTable.workspaceId, workspaceId)
        ))
        .returning();

      if (!result.length) {
        return { success: false, error: "Workflow not found" };
      }

      return { success: true };

    } catch (error) {
      logger.error("Failed to delete workflow:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Clone workflow
   */
  async cloneWorkflow(
    workflowId: string,
    workspaceId: string,
    newName: string
  ): Promise<{ success: boolean; workflow?: any; error?: string }> {
    try {
      const originalWorkflow = await this.getWorkflow(workflowId, workspaceId);
      if (!originalWorkflow) {
        return { success: false, error: "Original workflow not found" };
      }

      // Create cloned workflow data
      const clonedData: CreateWorkflowRequest = {
        name: newName,
        description: `Copy of ${originalWorkflow.description || originalWorkflow.name}`,
        category: originalWorkflow.category,
        nodes: originalWorkflow.visualDefinition.nodes.map((node: any) => ({
          ...node,
          id: createId() // Generate new IDs for cloned nodes
        })),
        connections: originalWorkflow.visualDefinition.connections,
        variables: originalWorkflow.visualDefinition.variables,
        settings: originalWorkflow.visualDefinition.settings,
        tags: originalWorkflow.tags ?? [],
      };

      // Update connection IDs to match new node IDs
      const nodeIdMap = new Map();
      originalWorkflow.visualDefinition.nodes.forEach((originalNode: any, index: number) => {
        const clonedNode = clonedData.nodes[index];
        if (clonedNode) {
          nodeIdMap.set(originalNode.id, clonedNode.id);
        }
      });

      clonedData.connections = clonedData.connections.map((conn: any) => ({
        ...conn,
        source: nodeIdMap.get(conn.source) || conn.source,
        target: nodeIdMap.get(conn.target) || conn.target
      }));

      return await this.createWorkflow(workspaceId, originalWorkflow.createdBy, clonedData);

    } catch (error) {
      logger.error("Failed to clone workflow:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Activate/deactivate workflow
   */
  async toggleWorkflowStatus(
    workflowId: string,
    workspaceId: string,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const db = getDatabase();
    
    try {
      const result = await db.update(visualWorkflowTable)
        .set({ 
          isActive,
          updatedAt: new Date()
        })
        .where(and(
          eq(visualWorkflowTable.id, workflowId),
          eq(visualWorkflowTable.workspaceId, workspaceId)
        ))
        .returning();

      if (!result.length) {
        return { success: false, error: "Workflow not found" };
      }

      return { success: true };

    } catch (error) {
      logger.error("Failed to toggle workflow status:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Validate workflow structure
   */
  async validateWorkflow(workflowData: CreateWorkflowRequest): Promise<WorkflowValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for trigger nodes
      const triggerNodes = workflowData.nodes.filter(node => node.category === "trigger");
      if (!triggerNodes.length) {
        errors.push("Workflow must have at least one trigger node");
      }

      // Check for orphaned nodes
      const connectedNodeIds = new Set([
        ...workflowData.connections.map(conn => conn.source),
        ...workflowData.connections.map(conn => conn.target)
      ]);

      const orphanedNodes = workflowData.nodes.filter(node => 
        node.category !== "trigger" && !connectedNodeIds.has(node.id)
      );

      if (orphanedNodes.length > 0) {
        warnings.push(`${orphanedNodes.length} nodes are not connected`);
      }

      // Check for circular dependencies
      if (this.hasCircularDependencies(workflowData.nodes, workflowData.connections)) {
        errors.push("Workflow contains circular dependencies");
      }

      // Validate node configurations
      for (const node of workflowData.nodes) {
        const nodeValidation = await this.validateNode(node);
        if (!nodeValidation.isValid) {
          errors.push(`Node ${node.id}: ${nodeValidation.error}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ["Validation failed: " + (error instanceof Error ? error.message : "Unknown error")],
        warnings
      };
    }
  }

  /**
   * Validate individual node
   */
  private async validateNode(node: WorkflowNode): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check required fields
      if (!node.id || !node.type || !node.category) {
        return { isValid: false, error: "Missing required fields (id, type, category)" };
      }

      // Validate node configuration based on type
      switch (node.category) {
        case "trigger":
          return this.validateTriggerNode(node);
        case "action":
          return this.validateActionNode(node);
        case "logic":
          return this.validateLogicNode(node);
        case "integration":
          return this.validateIntegrationNode(node);
        default:
          return { isValid: false, error: `Unknown node category: ${node.category}` };
      }

    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Validate trigger node
   */
  private validateTriggerNode(node: WorkflowNode): { isValid: boolean; error?: string } {
    switch (node.type) {
      case "task_created":
      case "task_updated":
      case "task_completed":
        return { isValid: true };
      case "schedule":
        if (!node.config.cron) {
          return { isValid: false, error: "Schedule trigger requires cron expression" };
        }
        return { isValid: true };
      case "webhook":
        if (!node.config.path) {
          return { isValid: false, error: "Webhook trigger requires path" };
        }
        return { isValid: true };
      default:
        return { isValid: false, error: `Unknown trigger type: ${node.type}` };
    }
  }

  /**
   * Validate action node
   */
  private validateActionNode(node: WorkflowNode): { isValid: boolean; error?: string } {
    // Check if action type is supported
    const supportedActions = [
      "task_create", "task_update", "task_assign",
      "github_create_issue", "github_update_issue",
      "slack_send_message", "slack_notify_channel",
      "email_send", "email_notify_user"
    ];

    if (!supportedActions.includes(node.type)) {
      return { isValid: false, error: `Unsupported action type: ${node.type}` };
    }

    return { isValid: true };
  }

  /**
   * Validate logic node
   */
  private validateLogicNode(node: WorkflowNode): { isValid: boolean; error?: string } {
    switch (node.type) {
      case "conditional":
        if (!node.config.condition) {
          return { isValid: false, error: "Conditional node requires condition" };
        }
        return { isValid: true };
      case "delay":
        if (!node.config.delay || isNaN(Number(node.config.delay))) {
          return { isValid: false, error: "Delay node requires numeric delay value" };
        }
        return { isValid: true };
      case "loop":
        if (!node.config.iterateOver) {
          return { isValid: false, error: "Loop node requires iterateOver field" };
        }
        return { isValid: true };
      default:
        return { isValid: true };
    }
  }

  /**
   * Validate integration node
   */
  private validateIntegrationNode(node: WorkflowNode): { isValid: boolean; error?: string } {
    if (!node.config.integrationId) {
      return { isValid: false, error: "Integration node requires integrationId" };
    }
    return { isValid: true };
  }

  /**
   * Check for circular dependencies
   */
  private hasCircularDependencies(
    nodes: WorkflowNode[], 
    connections: Array<{ source: string; target: string }>
  ): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Found cycle
      }

      if (visited.has(nodeId)) {
        return false; // Already processed
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      // Get outgoing connections
      const outgoingConnections = connections.filter(conn => conn.source === nodeId);
      for (const connection of outgoingConnections) {
        if (hasCycle(connection.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check each node
    for (const node of nodes) {
      if (hasCycle(node.id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Compile workflow into execution format
   */
  private async compileWorkflow(workflowData: CreateWorkflowRequest): Promise<any> {
    // For now, return the workflow data as-is
    // In the future, this could optimize the execution path,
    // pre-compile conditions, validate integrations, etc.
    return {
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      variables: workflowData.variables || {},
      settings: workflowData.settings || { errorHandling: "stop" },
      compiledAt: new Date().toISOString()
    };
  }

  /**
   * Load a visual workflow template by id (canonical `visual_workflow_template` row).
   */
  async getTemplate(templateId: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    category: string;
    nodes: unknown;
    edges: unknown;
    metadata: Record<string, unknown>;
  } | null> {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(visualWorkflowTemplateTable)
      .where(eq(visualWorkflowTemplateTable.id, templateId))
      .limit(1);
    const t = rows[0];
    if (!t) {
      return null;
    }
    const meta =
      t.metadata &&
      typeof t.metadata === "object" &&
      !Array.isArray(t.metadata)
        ? (t.metadata as Record<string, unknown>)
        : {};
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      nodes: t.nodes,
      edges: t.edges,
      metadata: meta,
    };
  }

  /**
   * Get workflow templates
   */
  async getWorkflowTemplates(category?: string): Promise<any[]> {
    try {
      const db = getDatabase();
      const base = db.select().from(visualWorkflowTemplateTable);
      const templates = category
        ? await base
            .where(eq(visualWorkflowTemplateTable.category, category))
            .orderBy(desc(visualWorkflowTemplateTable.usageCount))
        : await base.orderBy(desc(visualWorkflowTemplateTable.usageCount));

      return templates.map((template) => {
        const meta =
          template.metadata &&
          typeof template.metadata === "object" &&
          !Array.isArray(template.metadata)
            ? (template.metadata as Record<string, unknown>)
            : {};
        return {
          ...template,
          visualDefinition: {
            nodes: template.nodes,
            connections: template.edges,
            variables: meta.variables,
            settings: meta.settings,
          },
          requiredIntegrations: meta.requiredIntegrations ?? [],
          tags: meta.tags ?? [],
        };
      });
    } catch (error) {
      logger.error("Failed to get workflow templates:", error);
      return [];
    }
  }

  /**
   * Create workflow from template
   */
  async createFromTemplate(
    templateId: string,
    workspaceId: string,
    userId: string,
    customizations?: {
      name?: string;
      description?: string;
    },
  ): Promise<{ success: boolean; workflow?: any; error?: string }> {
    try {
      const db = getDatabase();
      const template = await db
        .select()
        .from(visualWorkflowTemplateTable)
        .where(eq(visualWorkflowTemplateTable.id, templateId));

      if (!template.length) {
        return { success: false, error: "Template not found" };
      }

      const templateData = template[0];
      if (!templateData) {
        return { success: false, error: "Template not found" };
      }

      const originalNodes = (templateData.nodes as WorkflowNode[]) ?? [];
      const originalEdges =
        (templateData.edges as CreateWorkflowRequest["connections"]) ?? [];
      const meta =
        templateData.metadata &&
        typeof templateData.metadata === "object" &&
        !Array.isArray(templateData.metadata)
          ? (templateData.metadata as Record<string, unknown>)
          : {};

      const workflowData: CreateWorkflowRequest = {
        name: customizations?.name || templateData.name,
        description:
          customizations?.description ?? templateData.description ?? undefined,
        category: templateData.category,
        nodes: originalNodes.map((node) => ({
          ...node,
          id: createId(),
        })),
        connections: [...originalEdges],
        variables: meta.variables as Record<string, unknown> | undefined,
        settings: meta.settings as CreateWorkflowRequest["settings"],
        tags: (meta.tags as string[]) ?? [],
      };

      const nodeIdMap = new Map<string, string>();
      originalNodes.forEach((originalNode, index) => {
        const mapped = workflowData.nodes[index];
        if (mapped) {
          nodeIdMap.set(originalNode.id, mapped.id);
        }
      });

      workflowData.connections = workflowData.connections.map((conn) => ({
        ...conn,
        source: nodeIdMap.get(conn.source) || conn.source,
        target: nodeIdMap.get(conn.target) || conn.target,
      }));

      await db
        .update(visualWorkflowTemplateTable)
        .set({ usageCount: (templateData.usageCount ?? 0) + 1 })
        .where(eq(visualWorkflowTemplateTable.id, templateId));

      return await this.createWorkflow(workspaceId, userId, workflowData);
    } catch (error) {
      logger.error("Failed to create workflow from template:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
} 
