/**
 * 📚 OpenAPI Documentation Generator
 * Automatically generates comprehensive API documentation from route definitions
 */

import swaggerJSDoc from 'swagger-jsdoc';
import { swaggerUI } from '@hono/swagger-ui';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

// OpenAPI configuration
const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Meridian Project Management API',
    version: '1.0.0',
    description: `
# Meridian API Documentation

Welcome to the comprehensive API documentation for Meridian, a modern project management and team collaboration platform.

## Features

- 🔐 **Authentication & Authorization**: Secure session-based authentication with RBAC
- 🏢 **Multi-tenant Workspaces**: Complete workspace isolation and management
- 📋 **Project Management**: Full project lifecycle with tasks, milestones, and dependencies
- 💬 **Real-time Communication**: WebSocket-powered messaging and collaboration
- 📊 **Analytics & Reporting**: Comprehensive dashboard and insights
- 🔧 **Workflow Automation**: Custom workflows and integrations
- 👥 **Team Collaboration**: Teams, roles, and permissions management

## Authentication

This API uses session-based authentication. Include your session token in the \`Authorization\` header:

\`\`\`
Authorization: Bearer your-session-token
\`\`\`

## Rate Limiting

All endpoints are rate-limited to ensure fair usage:
- **Public endpoints**: 100 requests per minute
- **Authenticated endpoints**: 1000 requests per minute
- **Upload endpoints**: 10 requests per minute

## Error Handling

All errors follow a consistent structure:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* Additional error context */ }
  },
  "meta": {
    "timestamp": "2024-08-06T12:00:00Z",
    "requestId": "req_123456789",
    "version": "1.0.0"
  }
}
\`\`\`

## Response Format

All successful responses follow this structure:

\`\`\`json
{
  "success": true,
  "data": { /* Response data */ },
  "meta": {
    "timestamp": "2024-08-06T12:00:00Z",
    "requestId": "req_123456789",
    "version": "1.0.0",
    "pagination": { /* Pagination info for list endpoints */ }
  }
}
\`\`\`
    `,
    contact: {
      name: 'Meridian Support',
      email: 'support@meridian.app',
      url: 'https://meridian.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3005',
      description: 'Development server'
    },
    {
      url: 'https://api.meridian.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Session token obtained from sign-in endpoint'
      }
    },
    schemas: {
      // Base Response Schema
      BaseResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              requestId: { type: 'string' },
              version: { type: 'string' }
            }
          }
        }
      },
      
      // Error Response Schema
      ErrorResponse: {
        allOf: [
          { $ref: '#/components/schemas/BaseResponse' },
          {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'VALIDATION_ERROR' },
                  message: { type: 'string', example: 'Invalid input data' },
                  details: { type: 'object' }
                }
              }
            }
          }
        ]
      },

      // Success Response Schema
      SuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/BaseResponse' },
          {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' }
            }
          }
        ]
      },

      // Pagination Schema
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          total: { type: 'integer', minimum: 0 },
          totalPages: { type: 'integer', minimum: 0 },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] }
        }
      },

      // User Schema
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'user_123456789' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          role: { 
            type: 'string', 
            enum: ['workspace-manager', 'project-manager', 'team-lead', 'team-member', 'guest'],
            example: 'team-member'
          },
          workspaceId: { type: 'string', example: 'workspace_123456789' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      // Workspace Schema
      Workspace: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'workspace_123456789' },
          name: { type: 'string', example: 'My Company' },
          description: { type: 'string', example: 'Main workspace for the company' },
          settings: { type: 'object' },
          ownerId: { type: 'string', example: 'user_123456789' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      // Project Schema
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'project_123456789' },
          name: { type: 'string', example: 'Website Redesign' },
          description: { type: 'string', example: 'Complete redesign of company website' },
          workspaceId: { type: 'string', example: 'workspace_123456789' },
          startDate: { type: 'string', format: 'date', example: '2024-01-01' },
          endDate: { type: 'string', format: 'date', example: '2024-12-31' },
          status: { 
            type: 'string', 
            enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
            example: 'active'
          },
          priority: { 
            type: 'string', 
            enum: ['low', 'medium', 'high', 'critical'],
            example: 'high'
          },
          createdBy: { type: 'string', example: 'user_123456789' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      // Task Schema
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'task_123456789' },
          title: { type: 'string', example: 'Create homepage mockup' },
          description: { type: 'string', example: 'Design and create mockup for new homepage' },
          projectId: { type: 'string', example: 'project_123456789' },
          assigneeId: { type: 'string', example: 'user_123456789' },
          priority: { 
            type: 'string', 
            enum: ['low', 'medium', 'high', 'critical'],
            example: 'medium'
          },
          status: { 
            type: 'string', 
            enum: ['todo', 'in-progress', 'review', 'done'],
            example: 'in-progress'
          },
          dueDate: { type: 'string', format: 'date', example: '2024-08-15' },
          estimatedHours: { type: 'number', minimum: 0, example: 8 },
          actualHours: { type: 'number', minimum: 0, example: 6 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      // Message Schema
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'message_123456789' },
          content: { type: 'string', example: 'Hello team! How is the project going?' },
          channelId: { type: 'string', example: 'channel_123456789' },
          userId: { type: 'string', example: 'user_123456789' },
          threadId: { type: 'string', nullable: true, example: 'thread_123456789' },
          attachments: { 
            type: 'array', 
            items: { type: 'string' },
            example: ['attachment_123456789']
          },
          reactions: { type: 'object', example: { '👍': 3, '❤️': 1 } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management'
    },
    {
      name: 'Users',
      description: 'User management and profiles'
    },
    {
      name: 'Workspaces',
      description: 'Workspace management and settings'
    },
    {
      name: 'Projects',
      description: 'Project lifecycle management'
    },
    {
      name: 'Tasks',
      description: 'Task management and tracking'
    },
    {
      name: 'Messages',
      description: 'Real-time messaging and communication'
    },
    {
      name: 'Teams',
      description: 'Team collaboration and management'
    },
    {
      name: 'Analytics',
      description: 'Dashboard analytics and reporting'
    },
    {
      name: 'Integrations',
      description: 'Third-party integrations and webhooks'
    }
  ]
};

// Swagger JSDoc options
const options = {
  definition: swaggerDefinition,
  apis: [
    './src/user/index.ts',
    './src/workspace/index.ts',
    './src/project/index.ts',
    './src/task/index.ts',
    './src/message/index.ts',
    './src/team/index.ts',
    './src/analytics/index.ts',
    './src/integrations/index.ts',
    './src/**/*.ts'
  ],
};

/**
 * Generate OpenAPI specification
 */
export function generateOpenAPISpec() {
  try {
    const specs = swaggerJSDoc(options);
    logger.info('📚 OpenAPI specification generated successfully');
    return specs;
  } catch (error) {
    logger.error('Failed to generate OpenAPI specification', { error });
    throw error;
  }
}

/**
 * Save OpenAPI specification to file
 */
export async function saveOpenAPISpec(outputPath: string = './docs/openapi.json') {
  try {
    const specs = generateOpenAPISpec();
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write specification to file
    await fs.writeFile(outputPath, JSON.stringify(specs, null, 2));
    
    logger.success(`OpenAPI specification saved to ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Failed to save OpenAPI specification', { error });
    throw error;
  }
}

/**
 * Create Swagger UI middleware for Hono
 */
export function createSwaggerUIMiddleware() {
  return swaggerUI({
    url: '/api/docs/openapi.json',
    options: {
      deepLinking: true,
      displayOperationId: false,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      defaultModelRendering: 'example',
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    }
  });
}

/**
 * Generate comprehensive API documentation
 */
export async function generateAPIDocs() {
  try {
    logger.info('🚀 Starting API documentation generation...');
    
    // Generate OpenAPI spec
    const specs = generateOpenAPISpec();
    
    // Create docs directory
    const docsDir = './docs';
    await fs.mkdir(docsDir, { recursive: true });
    
    // Save OpenAPI JSON
    await fs.writeFile(`${docsDir}/openapi.json`, JSON.stringify(specs, null, 2));
    
    // Generate HTML documentation
    const htmlDoc = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meridian API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@latest/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { color: #3b82f6; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: './openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tryItOutEnabled: true,
                filter: true,
                displayRequestDuration: true
            });
        };
    </script>
</body>
</html>
    `;
    
    await fs.writeFile(`${docsDir}/index.html`, htmlDoc);
    
    // Generate README for docs
    const readme = `
# Meridian API Documentation

This directory contains the complete API documentation for the Meridian project management platform.

## Files

- \`openapi.json\` - OpenAPI 3.0 specification in JSON format
- \`index.html\` - Interactive Swagger UI documentation
- \`README.md\` - This file

## Viewing Documentation

### Local Development
1. Start the API server: \`npm run dev\`
2. Visit: http://localhost:3005/api/docs

### Static Files
1. Open \`index.html\` in your browser
2. Or serve the docs directory with any static server

## API Overview

The Meridian API provides comprehensive project management functionality including:

- **Authentication & Authorization**: Secure session-based auth with RBAC
- **Multi-tenant Workspaces**: Complete workspace isolation
- **Project Management**: Full project lifecycle management
- **Real-time Communication**: WebSocket-powered messaging
- **Analytics & Reporting**: Comprehensive insights
- **Workflow Automation**: Custom workflows and integrations
- **Team Collaboration**: Teams, roles, and permissions

## Rate Limits

- Public endpoints: 100 requests/minute
- Authenticated endpoints: 1000 requests/minute
- Upload endpoints: 10 requests/minute

## Authentication

Include your session token in the Authorization header:
\`\`\`
Authorization: Bearer your-session-token
\`\`\`

## Error Handling

All errors follow a consistent structure with appropriate HTTP status codes and detailed error information.

## Support

For API support, contact: support@meridian.app
    `;
    
    await fs.writeFile(`${docsDir}/README.md`, readme);
    
    logger.success('✅ API documentation generated successfully!');
    logger.info(`📄 Files created:
    - ${docsDir}/openapi.json
    - ${docsDir}/index.html
    - ${docsDir}/README.md`);
    
    return {
      openapi: `${docsDir}/openapi.json`,
      html: `${docsDir}/index.html`,
      readme: `${docsDir}/README.md`
    };
    
  } catch (error) {
    logger.error('Failed to generate API documentation', { error });
    throw error;
  }
}

export default {
  generateOpenAPISpec,
  saveOpenAPISpec,
  createSwaggerUIMiddleware,
  generateAPIDocs
};

