/**
 * 🧩 Node Type Service
 * 
 * Manages workflow node type definitions, schemas, and configurations
 * for the visual workflow builder drag-and-drop interface.
 * 
 * @epic-3.2.3-visual-workflows
 */

import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workflowNodeTypeTable } from "../../database/schema";
import logger from '../../utils/logger';

export interface NodeTypeDefinition {
  id: string;
  name: string;
  category: "trigger" | "action" | "logic" | "integration";
  description: string;
  icon: string;
  color: string;
  configSchema: any;
  outputSchema?: any;
  requiredIntegrations?: string[];
  isBuiltIn: boolean;
  isActive: boolean;
}

export class NodeTypeService {

  /**
   * Initialize built-in node types
   */
  async initializeBuiltInNodeTypes(): Promise<void> {
    const db = getDatabase();
    const builtInNodes = this.getBuiltInNodeDefinitions();

    for (const nodeType of builtInNodes) {
      try {
        // Check if node type already exists
        const existing = await db.select()
          .from(workflowNodeTypeTable)
          .where(and(
            eq(workflowNodeTypeTable.name, nodeType.name),
            eq(workflowNodeTypeTable.isBuiltIn, true)
          ));

        if (!existing.length) {
          await db.insert(workflowNodeTypeTable).values({
            id: createId(),
            name: nodeType.name,
            category: nodeType.category,
            description: nodeType.description,
            icon: nodeType.icon,
            color: nodeType.color,
            configSchema: JSON.stringify(nodeType.configSchema),
            outputSchema: nodeType.outputSchema ? JSON.stringify(nodeType.outputSchema) : null,
            requiredIntegrations: nodeType.requiredIntegrations ? JSON.stringify(nodeType.requiredIntegrations) : null,
            isBuiltIn: true,
            isActive: true
          });
        }
      } catch (error) {
        logger.error(`Failed to initialize node type: ${nodeType.name}`, error);
      }
    }
  }

  /**
   * Get all available node types
   */
  async getNodeTypes(category?: string): Promise<NodeTypeDefinition[]> {
    const db = getDatabase();
    
    try {
      const conditions = [eq(workflowNodeTypeTable.isActive, true)];
      if (category) {
        conditions.push(eq(workflowNodeTypeTable.category, category));
      }

      const nodeTypes = await db
        .select()
        .from(workflowNodeTypeTable)
        .where(and(...conditions));

      return nodeTypes.map((node) => ({
        id: node.id,
        name: node.name,
        category: node.category as NodeTypeDefinition["category"],
        description: node.description,
        icon: node.icon || "cube",
        color: node.color || "#6B7280",
        configSchema: JSON.parse(node.configSchema),
        outputSchema: node.outputSchema
          ? JSON.parse(node.outputSchema)
          : undefined,
        requiredIntegrations: node.requiredIntegrations
          ? JSON.parse(node.requiredIntegrations)
          : undefined,
        isBuiltIn: Boolean(node.isBuiltIn),
        isActive: Boolean(node.isActive),
      }));

    } catch (error) {
      logger.error("Failed to get node types:", error);
      return [];
    }
  }

  /**
   * Get node types grouped by category
   */
  async getNodeTypesByCategory(): Promise<Record<string, NodeTypeDefinition[]>> {
    const nodeTypes = await this.getNodeTypes();
    
    return nodeTypes.reduce((acc, nodeType) => {
      const category = nodeType.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(nodeType);
      return acc;
    }, {} as Record<string, NodeTypeDefinition[]>);
  }

  /**
   * Built-in node type definitions
   */
  private getBuiltInNodeDefinitions(): Omit<NodeTypeDefinition, "id" | "isBuiltIn" | "isActive">[] {
    return [
      // 🎯 TRIGGER NODES
      {
        name: "Task Created",
        category: "trigger",
        description: "Triggers when a new task is created",
        icon: "plus-circle",
        color: "#10B981",
        configSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              title: "Project",
              description: "Filter by specific project (optional)"
            },
            assigneeId: {
              type: "string", 
              title: "Assignee",
              description: "Filter by specific assignee (optional)"
            }
          }
        },
        outputSchema: {
          task: { type: "object", description: "Created task data" },
          project: { type: "object", description: "Associated project data" },
          assignee: { type: "object", description: "Assigned user data" }
        }
      },
      {
        name: "Task Updated",
        category: "trigger",
        description: "Triggers when a task is updated",
        icon: "edit",
        color: "#3B82F6",
        configSchema: {
          type: "object",
          properties: {
            fields: {
              type: "array",
              title: "Watch Fields",
              description: "Specific fields to watch for changes",
              items: { 
                type: "string",
                enum: ["status", "priority", "assignee", "dueDate", "title", "description"]
              }
            }
          }
        },
        outputSchema: {
          task: { type: "object", description: "Updated task data" },
          changes: { type: "object", description: "Fields that changed" },
          previousValues: { type: "object", description: "Previous field values" }
        }
      },
      {
        name: "Task Completed",
        category: "trigger",
        description: "Triggers when a task is marked as completed",
        icon: "check-circle",
        color: "#059669",
        configSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              title: "Project",
              description: "Filter by specific project (optional)"
            }
          }
        },
        outputSchema: {
          task: { type: "object", description: "Completed task data" },
          completedBy: { type: "object", description: "User who completed the task" },
          completedAt: { type: "string", description: "Completion timestamp" }
        }
      },
      {
        name: "Schedule",
        category: "trigger",
        description: "Triggers on a schedule using cron expressions",
        icon: "clock",
        color: "#8B5CF6",
        configSchema: {
          type: "object",
          required: ["cron"],
          properties: {
            cron: {
              type: "string",
              title: "Cron Expression",
              description: "Schedule in cron format (e.g., '0 9 * * 1-5' for weekdays at 9am)",
              pattern: "^[0-9*,-/]+ [0-9*,-/]+ [0-9*,-/]+ [0-9*,-/]+ [0-9*,-/]+$"
            },
            timezone: {
              type: "string",
              title: "Timezone",
              description: "Timezone for schedule execution",
              default: "UTC"
            }
          }
        },
        outputSchema: {
          scheduledTime: { type: "string", description: "Scheduled execution time" },
          timezone: { type: "string", description: "Execution timezone" }
        }
      },
      {
        name: "Webhook",
        category: "trigger",
        description: "Triggers when a webhook is received",
        icon: "link",
        color: "#F59E0B",
        configSchema: {
          type: "object",
          required: ["path"],
          properties: {
            path: {
              type: "string",
              title: "Webhook Path",
              description: "Unique path for this webhook (e.g., '/webhook/task-updates')"
            },
            method: {
              type: "string",
              title: "HTTP Method",
              enum: ["POST", "PUT", "PATCH"],
              default: "POST"
            },
            secret: {
              type: "string",
              title: "Secret Key",
              description: "Optional secret key for webhook verification"
            }
          }
        },
        outputSchema: {
          headers: { type: "object", description: "HTTP headers" },
          body: { type: "object", description: "Request body" },
          query: { type: "object", description: "Query parameters" }
        }
      },

      // ⚡ ACTION NODES
      {
        name: "Create Task",
        category: "action",
        description: "Creates a new task",
        icon: "plus",
        color: "#10B981",
        configSchema: {
          type: "object",
          required: ["title", "projectId"],
          properties: {
            title: {
              type: "string",
              title: "Task Title",
              description: "Title for the new task"
            },
            description: {
              type: "string",
              title: "Description",
              description: "Task description (optional)"
            },
            projectId: {
              type: "string",
              title: "Project",
              description: "Project to create task in"
            },
            assigneeId: {
              type: "string",
              title: "Assignee",
              description: "User to assign task to (optional)"
            },
            priority: {
              type: "string",
              title: "Priority",
              enum: ["low", "medium", "high", "urgent"],
              default: "medium"
            },
            dueDate: {
              type: "string",
              title: "Due Date",
              format: "date-time",
              description: "Task due date (optional)"
            }
          }
        },
        outputSchema: {
          task: { type: "object", description: "Created task data" },
          taskId: { type: "string", description: "Created task ID" }
        }
      },
      {
        name: "Update Task",
        category: "action",
        description: "Updates an existing task",
        icon: "edit",
        color: "#3B82F6",
        configSchema: {
          type: "object",
          required: ["taskId"],
          properties: {
            taskId: {
              type: "string",
              title: "Task ID",
              description: "ID of task to update"
            },
            title: {
              type: "string",
              title: "New Title",
              description: "Updated task title (optional)"
            },
            description: {
              type: "string",
              title: "New Description",
              description: "Updated description (optional)"
            },
            status: {
              type: "string",
              title: "Status",
              enum: ["todo", "in_progress", "review", "done"],
              description: "Updated status (optional)"
            },
            priority: {
              type: "string",
              title: "Priority",
              enum: ["low", "medium", "high", "urgent"],
              description: "Updated priority (optional)"
            }
          }
        },
        outputSchema: {
          task: { type: "object", description: "Updated task data" },
          changes: { type: "object", description: "Fields that were changed" }
        }
      },
      {
        name: "Assign Task",
        category: "action",
        description: "Assigns a task to a user",
        icon: "user-plus",
        color: "#8B5CF6",
        configSchema: {
          type: "object",
          required: ["taskId", "assigneeId"],
          properties: {
            taskId: {
              type: "string",
              title: "Task ID",
              description: "ID of task to assign"
            },
            assigneeId: {
              type: "string",
              title: "Assignee",
              description: "User to assign task to"
            },
            notify: {
              type: "boolean",
              title: "Send Notification",
              description: "Send notification to assignee",
              default: true
            }
          }
        },
        outputSchema: {
          task: { type: "object", description: "Assigned task data" },
          assignee: { type: "object", description: "Assigned user data" }
        }
      },

      // 🧠 LOGIC NODES
      {
        name: "Condition",
        category: "logic",
        description: "Conditional branching based on data evaluation",
        icon: "git-branch",
        color: "#F59E0B",
        configSchema: {
          type: "object",
          required: ["condition"],
          properties: {
            condition: {
              type: "object",
              title: "Condition",
              properties: {
                field: {
                  type: "string",
                  title: "Field",
                  description: "Field to evaluate (supports variables like {{task.status}})"
                },
                operator: {
                  type: "string",
                  title: "Operator",
                  enum: ["equals", "not_equals", "contains", "greater_than", "less_than", "greater_equal", "less_equal"]
                },
                value: {
                  type: "string",
                  title: "Value",
                  description: "Value to compare against"
                }
              }
            }
          }
        },
        outputSchema: {
          conditionResult: { type: "boolean", description: "Result of condition evaluation" },
          evaluatedField: { type: "any", description: "Value of evaluated field" }
        }
      },
      {
        name: "Delay",
        category: "logic",
        description: "Pauses workflow execution for specified duration",
        icon: "pause",
        color: "#6B7280",
        configSchema: {
          type: "object",
          required: ["delay"],
          properties: {
            delay: {
              type: "number",
              title: "Delay (milliseconds)",
              description: "Duration to pause execution",
              minimum: 1000,
              maximum: 3600000
            }
          }
        },
        outputSchema: {
          delayDuration: { type: "number", description: "Delay duration in milliseconds" }
        }
      },
      {
        name: "Loop",
        category: "logic",
        description: "Iterates over a collection of items",
        icon: "refresh",
        color: "#EC4899",
        configSchema: {
          type: "object",
          required: ["iterateOver"],
          properties: {
            iterateOver: {
              type: "string",
              title: "Collection",
              description: "Array to iterate over (supports variables like {{tasks}})"
            },
            maxIterations: {
              type: "number",
              title: "Max Iterations",
              description: "Maximum number of iterations",
              default: 100,
              minimum: 1,
              maximum: 1000
            },
            breakCondition: {
              type: "object",
              title: "Break Condition",
              description: "Optional condition to break the loop early",
              properties: {
                field: { type: "string" },
                operator: { type: "string" },
                value: { type: "string" }
              }
            }
          }
        },
        outputSchema: {
          currentItem: { type: "any", description: "Current iteration item" },
          currentIndex: { type: "number", description: "Current iteration index" },
          totalItems: { type: "number", description: "Total items in collection" }
        }
      },
      {
        name: "Variable Set",
        category: "logic",
        description: "Sets a workflow variable to a specific value",
        icon: "variable",
        color: "#14B8A6",
        configSchema: {
          type: "object",
          required: ["variable", "value"],
          properties: {
            variable: {
              type: "string",
              title: "Variable Name",
              description: "Name of variable to set"
            },
            value: {
              type: "string",
              title: "Value",
              description: "Value to assign (supports variable references)"
            }
          }
        },
        outputSchema: {
          variableName: { type: "string", description: "Name of set variable" },
          variableValue: { type: "any", description: "Value that was set" }
        }
      },
      {
        name: "Data Transform",
        category: "logic",
        description: "Transforms data using map, filter, or reduce operations",
        icon: "code",
        color: "#7C3AED",
        configSchema: {
          type: "object",
          required: ["transformType", "input"],
          properties: {
            transformType: {
              type: "string",
              title: "Transform Type",
              enum: ["map", "filter", "reduce"]
            },
            input: {
              type: "string",
              title: "Input Data",
              description: "Data to transform (supports variables)"
            },
            mapFunction: {
              type: "string",
              title: "Map Function",
              description: "Transform function for map operations"
            },
            filterCondition: {
              type: "object",
              title: "Filter Condition",
              description: "Condition for filter operations"
            },
            reduceFunction: {
              type: "string",
              title: "Reduce Function",
              description: "Reduce function for reduce operations"
            },
            initialValue: {
              type: "any",
              title: "Initial Value",
              description: "Initial value for reduce operations"
            }
          }
        },
        outputSchema: {
          transformedData: { type: "any", description: "Result of data transformation" }
        }
      },

      // 🔌 INTEGRATION NODES
      {
        name: "GitHub Create Issue",
        category: "integration",
        description: "Creates an issue in GitHub repository",
        icon: "github",
        color: "#000000",
        configSchema: {
          type: "object",
          required: ["integrationId", "title"],
          properties: {
            integrationId: {
              type: "string",
              title: "GitHub Integration",
              description: "Connected GitHub integration"
            },
            title: {
              type: "string",
              title: "Issue Title",
              description: "Title for the GitHub issue"
            },
            body: {
              type: "string",
              title: "Issue Body",
              description: "Description/body for the issue"
            },
            labels: {
              type: "array",
              title: "Labels",
              description: "Labels to apply to the issue",
              items: { type: "string" }
            },
            assignees: {
              type: "array",
              title: "Assignees",
              description: "GitHub usernames to assign",
              items: { type: "string" }
            }
          }
        },
        requiredIntegrations: ["github"],
        outputSchema: {
          issue: { type: "object", description: "Created GitHub issue data" },
          issueUrl: { type: "string", description: "URL to the created issue" }
        }
      },
      {
        name: "Slack Send Message",
        category: "integration",
        description: "Sends a message to a Slack channel",
        icon: "slack",
        color: "#4A154B",
        configSchema: {
          type: "object",
          required: ["integrationId", "channel", "message"],
          properties: {
            integrationId: {
              type: "string",
              title: "Slack Integration",
              description: "Connected Slack integration"
            },
            channel: {
              type: "string",
              title: "Channel",
              description: "Slack channel to send message to"
            },
            message: {
              type: "string",
              title: "Message",
              description: "Message content (supports variables)"
            },
            mentions: {
              type: "array",
              title: "Mentions",
              description: "Users to mention in the message",
              items: { type: "string" }
            }
          }
        },
        requiredIntegrations: ["slack"],
        outputSchema: {
          messageId: { type: "string", description: "Sent message ID" },
          channel: { type: "string", description: "Channel where message was sent" }
        }
      },
      {
        name: "Send Email",
        category: "integration",
        description: "Sends an email notification",
        icon: "mail",
        color: "#DC2626",
        configSchema: {
          type: "object",
          required: ["integrationId", "to", "subject", "body"],
          properties: {
            integrationId: {
              type: "string",
              title: "Email Integration",
              description: "Connected email integration"
            },
            to: {
              type: "string",
              title: "Recipient",
              description: "Email recipient (supports variables)"
            },
            subject: {
              type: "string",
              title: "Subject",
              description: "Email subject line"
            },
            body: {
              type: "string",
              title: "Body",
              description: "Email body content"
            },
            cc: {
              type: "string",
              title: "CC Recipients",
              description: "CC recipients (optional)"
            },
            templateId: {
              type: "string",
              title: "Email Template",
              description: "Pre-defined email template (optional)"
            }
          }
        },
        requiredIntegrations: ["email"],
        outputSchema: {
          messageId: { type: "string", description: "Sent email ID" },
          recipient: { type: "string", description: "Email recipient" }
        }
      }
    ];
  }

  /**
   * Validate node configuration against its schema
   */
  async validateNodeConfig(nodeType: string, config: any): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const db = getDatabase();
      // Get node type definition
      const nodeTypes = await db.select()
        .from(workflowNodeTypeTable)
        .where(eq(workflowNodeTypeTable.name, nodeType));

      if (!nodeTypes.length) {
        return { isValid: false, errors: [`Unknown node type: ${nodeType}`] };
      }

      const nodeTypeDefinition = nodeTypes[0];
      if (!nodeTypeDefinition) {
        return { isValid: false, errors: [`Unknown node type: ${nodeType}`] };
      }
      const schema = JSON.parse(nodeTypeDefinition.configSchema);

      // Simple validation (in a real app, you'd use a JSON schema validator)
      const errors: string[] = [];

      if (schema.required) {
        for (const requiredField of schema.required) {
          if (!config[requiredField]) {
            errors.push(`Missing required field: ${requiredField}`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ["Failed to validate node configuration"]
      };
    }
  }
} 
