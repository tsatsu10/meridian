/**
 * 🎨 Visual Workflow Engine
 * 
 * Advanced workflow execution engine for visual workflows with support for:
 * - Complex conditional logic and branching
 * - Parallel execution paths
 * - Loop operations and data iteration
 * - Real-time execution monitoring
 * - Error handling and retry mechanisms
 * 
 * @epic-3.2.3-visual-workflows
 */

import { createId } from "@paralleldrive/cuid2";
import { eq, and, desc } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { 
  visualWorkflowTable,
  visualWorkflowExecutionTable,
  integrationConnectionTable 
} from "../../database/schema";
import {
  WorkflowEngine as CoreWorkflowEngine,
  type ExecutionContext as CoreExecutionContext,
} from "./workflow-engine";
import logger from '../../utils/logger';

// Visual workflow node types
export interface WorkflowNode {
  id: string;
  type: string;
  category: "trigger" | "action" | "logic" | "integration";
  config: Record<string, any>;
  position: { x: number; y: number };
  connections?: {
    input?: string[];
    output?: string[];
  };
}

export interface VisualWorkflow {
  id: string;
  name: string;
  description?: string;
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
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, any>;
  nodeResults: Map<string, any>;
  currentStep: number;
  totalSteps: number;
  startTime: Date;
  debugMode: boolean;
}

export class VisualWorkflowEngine {
  /**
   * Execute a visual workflow
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, any> = {},
    debugMode: boolean = false
  ): Promise<{ success: boolean; executionId: string; error?: string }> {
    let executionId: string | null = null;

    try {
      // Get workflow definition
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error("Workflow not found");
      }

      // Create execution record
      executionId = await this.createExecutionRecord(workflowId, triggerData);

      // Create execution context
      const context: ExecutionContext = {
        workflowId,
        executionId,
        variables: { ...triggerData },
        nodeResults: new Map(),
        currentStep: 0,
        totalSteps: workflow.nodes.length,
        startTime: new Date(),
        debugMode
      };

      // Execute workflow
      await this.executeWorkflowNodes(workflow, context);

      // Mark as completed
      await this.updateExecutionStatus(executionId, "completed", context);

      return { success: true, executionId };

    } catch (error) {
      logger.error("Workflow execution failed:", error);

      if (executionId) {
        await this.updateExecutionStatus(executionId, "failed", null, error);
      }

      return { 
        success: false, 
        executionId: executionId || "", 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Execute workflow nodes in order
   */
  private async executeWorkflowNodes(
    workflow: VisualWorkflow,
    context: ExecutionContext
  ): Promise<void> {
    // Find entry points (trigger nodes)
    const triggerNodes = workflow.nodes.filter(node => node.category === "trigger");
    
    if (!triggerNodes.length) {
      throw new Error("No trigger nodes found in workflow");
    }

    // Start execution from each trigger node
    for (const triggerNode of triggerNodes) {
      await this.executeNodeAndFollowPath(workflow, triggerNode, context);
    }
  }

  /**
   * Execute a node and follow its connections
   */
  private async executeNodeAndFollowPath(
    workflow: VisualWorkflow,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<void> {
    try {
      // Execute current node
      const result = await this.executeNode(node, context);
      
      // Store result
      context.nodeResults.set(node.id, result);
      context.currentStep++;

      // Update execution progress
      await this.updateExecutionProgress(context);

      // Handle different node types
      switch (node.type) {
        case "conditional":
          await this.handleConditionalNode(workflow, node, result, context);
          break;
        case "parallel":
          await this.handleParallelNode(workflow, node, context);
          break;
        case "loop":
          await this.handleLoopNode(workflow, node, context);
          break;
        default:
          // Continue to next connected nodes
          await this.executeConnectedNodes(workflow, node, context);
      }

    } catch (error) {
      logger.error(`Node execution failed: ${node.id}`, error);
      
      // Handle error based on workflow settings
      if (workflow.settings?.errorHandling === "stop") {
        throw error;
      } else if (workflow.settings?.errorHandling === "retry") {
        await this.retryNode(workflow, node, context);
      }
      // Continue for "continue" mode
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<any> {
    const nodeConfig = {
      ...node.config,
      variables: context.variables
    };

    switch (node.category) {
      case "trigger":
        return this.executeTriggerNode(node, context);
      case "action":
        return this.executeActionNode(node, context);
      case "logic":
        return this.executeLogicNode(node, context);
      case "integration":
        return this.executeIntegrationNode(node, context);
      default:
        throw new Error(`Unknown node category: ${node.category}`);
    }
  }

  /**
   * Execute trigger node
   */
  private async executeTriggerNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<any> {
    // Trigger nodes typically just pass through the trigger data
    return {
      type: "trigger",
      nodeId: node.id,
      triggered: true,
      data: context.variables
    };
  }

  /**
   * Execute action node
   */
  private async executeActionNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<any> {
    // Use existing workflow engine for action execution
    const coreCtx: CoreExecutionContext = {
      workspaceId: String(context.variables.workspaceId ?? ""),
      userId: String(context.variables.userId ?? "system"),
      triggerData: context.variables,
      instanceId: context.executionId,
    };
    const actionResult = await CoreWorkflowEngine.dispatchVisualAction(
      node.type,
      this.replaceVariables(node.config, context.variables) as Record<
        string,
        unknown
      >,
      context.variables,
      coreCtx,
    );

    return {
      type: "action",
      nodeId: node.id,
      actionType: node.type,
      result: actionResult
    };
  }

  /**
   * Execute logic node
   */
  private async executeLogicNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<any> {
    switch (node.type) {
      case "delay":
        const delayMs = this.replaceVariables(node.config.delay, context.variables);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return { type: "delay", delayed: delayMs };

      case "variable_set":
        const variable = node.config.variable;
        const value = this.replaceVariables(node.config.value, context.variables);
        context.variables[variable] = value;
        return { type: "variable_set", variable, value };

      case "data_transform":
        return this.executeDataTransform(node, context);

      default:
        throw new Error(`Unknown logic node type: ${node.type}`);
    }
  }

  /**
   * Execute integration node
   */
  private async executeIntegrationNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<any> {
    // Get integration connection
    const integrationId = node.config.integrationId;
    if (!integrationId) {
      throw new Error("Integration ID required for integration node");
    }

    // Execute integration-specific logic
    return this.executeActionNode(node, context);
  }

  /**
   * Handle conditional node branching
   */
  private async handleConditionalNode(
    workflow: VisualWorkflow,
    node: WorkflowNode,
    result: any,
    context: ExecutionContext
  ): Promise<void> {
    const condition = node.config.condition;
    const conditionResult = this.evaluateCondition(condition, context.variables);

    // Get true/false branch connections
    const trueBranch = workflow.connections
      .filter(conn => conn.source === node.id && conn.sourceHandle === "true")
      .map(conn => workflow.nodes.find(n => n.id === conn.target))
      .filter(Boolean);

    const falseBranch = workflow.connections
      .filter(conn => conn.source === node.id && conn.sourceHandle === "false")
      .map(conn => workflow.nodes.find(n => n.id === conn.target))
      .filter(Boolean);

    // Execute appropriate branch
    const branch = conditionResult ? trueBranch : falseBranch;
    for (const branchNode of branch) {
      if (branchNode) {
        await this.executeNodeAndFollowPath(workflow, branchNode, context);
      }
    }
  }

  /**
   * Handle parallel execution node
   */
  private async handleParallelNode(
    workflow: VisualWorkflow,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<void> {
    // Get all connected nodes
    const connectedNodes = workflow.connections
      .filter(conn => conn.source === node.id)
      .map(conn => workflow.nodes.find(n => n.id === conn.target))
      .filter(Boolean);

    // Execute in parallel
    const parallelPromises = connectedNodes.map(async (connectedNode) => {
      if (connectedNode) {
        // Create separate context for each parallel branch
        const branchContext = {
          ...context,
          nodeResults: new Map(context.nodeResults)
        };
        return this.executeNodeAndFollowPath(workflow, connectedNode, branchContext);
      }
    });

    // Wait based on merge strategy
    const mergeStrategy = node.config.mergeStrategy || "wait_all";
    
    if (mergeStrategy === "wait_all") {
      await Promise.all(parallelPromises);
    } else if (mergeStrategy === "wait_any") {
      await Promise.race(parallelPromises);
    }
    // "no_wait" continues immediately
  }

  /**
   * Handle loop node execution
   */
  private async handleLoopNode(
    workflow: VisualWorkflow,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<void> {
    const iterateOver = this.replaceVariables(node.config.iterateOver, context.variables);
    const maxIterations = node.config.maxIterations || 100;

    if (!Array.isArray(iterateOver)) {
      throw new Error("Loop node requires an array to iterate over");
    }

    // Get loop body nodes
    const loopBodyNodes = workflow.connections
      .filter(conn => conn.source === node.id)
      .map(conn => workflow.nodes.find(n => n.id === conn.target))
      .filter(Boolean);

    // Execute loop
    for (let i = 0; i < Math.min(iterateOver.length, maxIterations); i++) {
      // Set loop variables
      context.variables.$item = iterateOver[i];
      context.variables.$index = i;

      // Execute loop body
      for (const bodyNode of loopBodyNodes) {
        if (bodyNode) {
          await this.executeNodeAndFollowPath(workflow, bodyNode, context);
        }
      }

      // Check break condition if exists
      if (node.config.breakCondition) {
        const shouldBreak = this.evaluateCondition(
          node.config.breakCondition,
          context.variables
        );
        if (shouldBreak) break;
      }
    }
  }

  /**
   * Execute connected nodes
   */
  private async executeConnectedNodes(
    workflow: VisualWorkflow,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<void> {
    const connectedNodes = workflow.connections
      .filter(conn => conn.source === node.id)
      .map(conn => workflow.nodes.find(n => n.id === conn.target))
      .filter(Boolean);

    for (const connectedNode of connectedNodes) {
      if (connectedNode) {
        await this.executeNodeAndFollowPath(workflow, connectedNode, context);
      }
    }
  }

  /**
   * Get workflow by ID
   */
  private async getWorkflow(workflowId: string): Promise<VisualWorkflow | null> {
    const db = getDatabase();
    
    try {
      const workflow = await db.select()
        .from(visualWorkflowTable)
        .where(eq(visualWorkflowTable.id, workflowId));

      if (!workflow.length) {
        return null;
      }

      const workflowData = workflow[0];
      if (!workflowData) {
        return null;
      }
      const nodes = (workflowData.nodes as WorkflowNode[]) ?? [];
      const connections =
        (workflowData.edges as VisualWorkflow["connections"]) ?? [];
      const meta =
        (workflowData.metadata as Record<string, unknown> | null) ?? {};
      return {
        id: workflowData.id,
        name: workflowData.name,
        description: workflowData.description ?? undefined,
        nodes,
        connections,
        variables: meta.variables as Record<string, unknown> | undefined,
        settings: meta.settings as VisualWorkflow["settings"],
      };
    } catch (error) {
      logger.error("Failed to get workflow:", error);
      return null;
    }
  }

  /**
   * Create execution record
   */
  private async createExecutionRecord(
    workflowId: string,
    triggerData: Record<string, any>
  ): Promise<string> {
    const db = getDatabase();
    const executionId = createId();
    
    const wfRow = await db
      .select()
      .from(visualWorkflowTable)
      .where(eq(visualWorkflowTable.id, workflowId))
      .limit(1);
    const row = wfRow[0];
    if (!row) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    const visual = await this.getWorkflow(workflowId);
    const totalSteps = visual?.nodes.length ?? 0;

    await db.insert(visualWorkflowExecutionTable).values({
      id: executionId,
      workflowId,
      workspaceId: row.workspaceId,
      status: "running",
      startedAt: new Date(),
      metadata: { triggerData, totalSteps },
    });

    return executionId;
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(
    executionId: string,
    status: string,
    context: ExecutionContext | null,
    error?: any
  ): Promise<void> {
    const db = getDatabase();
    const patch: {
      status: string;
      completedAt: Date;
      duration?: number;
      metadata?: unknown;
      error?: string;
    } = {
      status,
      completedAt: new Date(),
    };

    if (context) {
      patch.duration = Date.now() - context.startTime.getTime();
      patch.metadata = {
        stepsCompleted: context.currentStep,
        nodeResults: Array.from(context.nodeResults.entries()),
        finalVariables: context.variables,
      };
    }

    if (error) {
      patch.error =
        error instanceof Error ? error.message : String(error);
    }

    await db
      .update(visualWorkflowExecutionTable)
      .set(patch)
      .where(eq(visualWorkflowExecutionTable.id, executionId));
  }

  /**
   * Update execution progress
   */
  private async updateExecutionProgress(context: ExecutionContext): Promise<void> {
    const db = getDatabase();
    await db
      .update(visualWorkflowExecutionTable)
      .set({
        results: {
          currentStep: context.currentStep,
          ...(context.debugMode
            ? {
                debug: {
                  nodeResults: Array.from(context.nodeResults.entries()),
                  variables: context.variables,
                },
              }
            : {}),
        },
      })
      .where(eq(visualWorkflowExecutionTable.id, context.executionId));
  }

  /**
   * Retry node execution
   */
  private async retryNode(
    workflow: VisualWorkflow,
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<void> {
    const retryCount = workflow.settings?.retryCount || 3;
    
    for (let i = 0; i < retryCount; i++) {
      try {
        await this.executeNode(node, context);
        return; // Success, exit retry loop
      } catch (error) {
        if (i === retryCount - 1) {
          throw error; // Last retry failed
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(
    condition: any,
    variables: Record<string, any>
  ): boolean {
    const field = this.replaceVariables(condition.field, variables);
    const value = this.replaceVariables(condition.value, variables);

    switch (condition.operator) {
      case "equals":
        return field === value;
      case "not_equals":
        return field !== value;
      case "contains":
        return String(field).includes(String(value));
      case "greater_than":
        return Number(field) > Number(value);
      case "less_than":
        return Number(field) < Number(value);
      case "greater_equal":
        return Number(field) >= Number(value);
      case "less_equal":
        return Number(field) <= Number(value);
      default:
        return false;
    }
  }

  /**
   * Execute data transformation
   */
  private executeDataTransform(
    node: WorkflowNode,
    context: ExecutionContext
  ): any {
    const transformType = node.config.transformType;
    const inputData = this.replaceVariables(node.config.input, context.variables);

    switch (transformType) {
      case "map":
        if (Array.isArray(inputData)) {
          return inputData.map(item => 
            this.replaceVariables(node.config.mapFunction, { ...context.variables, $item: item })
          );
        }
        break;
      case "filter":
        if (Array.isArray(inputData)) {
          return inputData.filter(item =>
            this.evaluateCondition(node.config.filterCondition, { ...context.variables, $item: item })
          );
        }
        break;
      case "reduce":
        if (Array.isArray(inputData)) {
          return inputData.reduce((acc, item) => {
            return this.replaceVariables(node.config.reduceFunction, {
              ...context.variables,
              $accumulator: acc,
              $item: item
            });
          }, node.config.initialValue);
        }
        break;
      default:
        return inputData;
    }

    return inputData;
  }

  /**
   * Replace variables in text/object
   */
  private replaceVariables(template: any, variables: Record<string, any>): any {
    if (typeof template === "string") {
      return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] ?? match;
      });
    } else if (typeof template === "object" && template !== null) {
      if (Array.isArray(template)) {
        return template.map(item => this.replaceVariables(item, variables));
      } else {
        const result: any = {};
        for (const [key, value] of Object.entries(template)) {
          result[key] = this.replaceVariables(value, variables);
        }
        return result;
      }
    }
    return template;
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(
    workflowId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const db = getDatabase();
      const executions = await db.select()
        .from(visualWorkflowExecutionTable)
        .where(eq(visualWorkflowExecutionTable.workflowId, workflowId))
        .orderBy(desc(visualWorkflowExecutionTable.startedAt))
        .limit(limit);

      return executions;
    } catch (error) {
      logger.error("Failed to get execution history:", error);
      return [];
    }
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(workflowId: string): Promise<any> {
    try {
      const executions = await this.getExecutionHistory(workflowId, 1000);
      
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.executionStatus === "completed").length;
      const failedExecutions = executions.filter(e => e.executionStatus === "failed").length;
      const avgExecutionTime = executions
        .filter(e => e.executionTimeMs)
        .reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) / totalExecutions;

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
        avgExecutionTime: Math.round(avgExecutionTime),
        recentExecutions: executions.slice(0, 10)
      };
    } catch (error) {
      logger.error("Failed to get workflow analytics:", error);
      return null;
    }
  }
} 
