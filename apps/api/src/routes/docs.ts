/**
 * API Documentation Routes
 * 
 * Serves OpenAPI specification and interactive documentation:
 * - OpenAPI 3.0 YAML/JSON specification
 * - Swagger UI for interactive testing
 * - ReDoc for clean documentation view
 * - Postman collection export
 */

import { Hono } from 'hono'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { load } from 'js-yaml'
import logger from '../utils/logger';
import { DEFAULT_API_PORT } from '../config/default-api-port';

const app = new Hono()

const localApiBase = `http://localhost:${DEFAULT_API_PORT}`;

/**
 * Serve OpenAPI specification in YAML format
 */
app.get('/openapi.yaml', async (c) => {
  try {
    const yamlPath = join(__dirname, '../docs/openapi.yaml')
    const yamlContent = await readFile(yamlPath, 'utf-8')
    
    c.header('Content-Type', 'application/x-yaml')
    c.header('Cache-Control', 'public, max-age=300') // Cache for 5 minutes
    
    return c.text(yamlContent)
    
  } catch (error) {
    logger.error('❌ Failed to serve OpenAPI YAML:', error)
    return c.json({ error: 'Failed to load API specification' }, 500)
  }
})

/**
 * Serve OpenAPI specification in JSON format
 */
app.get('/openapi.json', async (c) => {
  try {
    const yamlPath = join(__dirname, '../docs/openapi.yaml')
    const yamlContent = await readFile(yamlPath, 'utf-8')
    const jsonSpec = load(yamlContent)
    
    c.header('Content-Type', 'application/json')
    c.header('Cache-Control', 'public, max-age=300') // Cache for 5 minutes
    
    return c.json(jsonSpec)
    
  } catch (error) {
    logger.error('❌ Failed to serve OpenAPI JSON:', error)
    return c.json({ error: 'Failed to load API specification' }, 500)
  }
})

/**
 * Serve Swagger UI for interactive API documentation
 */
app.get('/swagger', async (c) => {
  const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meridian API Documentation - Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar {
      background-color: #2c3e50;
    }
    .swagger-ui .topbar .download-url-wrapper {
      display: none;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js"></script>
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
        requestInterceptor: (request) => {
          // Add any default headers or modifications here
          logger.info("Request:");
          return request;
        },
        responseInterceptor: (response) => {
          logger.info("Response:");
          return response;
        },
        onComplete: () => {
          logger.info("Swagger UI loaded successfully");
        },
        validatorUrl: null, // Disable validator
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
        showCommonExtensions: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2
      });
      window.ui = ui;
    }
  </script>
</body>
</html>`

  c.header('Content-Type', 'text/html')
  c.header('Cache-Control', 'public, max-age=300')
  
  return c.html(swaggerHtml)
})

/**
 * Serve ReDoc for clean documentation view
 */
app.get('/redoc', async (c) => {
  const redocHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Meridian API Documentation - ReDoc</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <redoc spec-url='./openapi.json' theme='{
    "colors": {
      "primary": {
        "main": "#2c3e50"
      },
      "success": {
        "main": "#27ae60"
      },
      "warning": {
        "main": "#f39c12"
      },
      "error": {
        "main": "#e74c3c"
      }
    },
    "typography": {
      "fontSize": "14px",
      "lineHeight": "1.5em",
      "code": {
        "fontSize": "13px",
        "fontFamily": "Courier, monospace"
      },
      "headings": {
        "fontFamily": "Montserrat, sans-serif",
        "fontWeight": "400"
      }
    },
    "sidebar": {
      "backgroundColor": "#fafafa"
    },
    "rightPanel": {
      "backgroundColor": "#263238"
    }
  }'>
  </redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`

  c.header('Content-Type', 'text/html')
  c.header('Cache-Control', 'public, max-age=300')
  
  return c.html(redocHtml)
})

/**
 * Export Postman collection
 */
app.get('/postman.json', async (c) => {
  try {
    const yamlPath = join(__dirname, '../docs/openapi.yaml')
    const yamlContent = await readFile(yamlPath, 'utf-8')
    const spec = load(yamlContent) as any
    
    // Convert OpenAPI to Postman collection format
    const postmanCollection = {
      info: {
        name: spec.info?.title || 'Meridian API',
        description: spec.info?.description || 'API collection for Meridian',
        version: spec.info?.version || '1.0.0',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{bearerToken}}',
            type: 'string'
          }
        ]
      },
      variable: [
        {
          key: 'baseUrl',
          value: spec.servers?.[0]?.url || localApiBase,
          type: 'string'
        },
        {
          key: 'bearerToken',
          value: '',
          type: 'string'
        }
      ],
      item: [] as any[]
    }
    
    // Group endpoints by tags
    const groupedItems: Record<string, any[]> = {}
    
    Object.entries(spec.paths || {}).forEach(([path, pathItem]: [string, any]) => {
      Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
        if (typeof operation !== 'object' || !operation.operationId) return
        
        const tag = operation.tags?.[0] || 'General'
        
        if (!groupedItems[tag]) {
          groupedItems[tag] = []
        }
        
        // Build request
        const request: any = {
          name: operation.summary || operation.operationId,
          request: {
            method: method.toUpperCase(),
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
                type: 'text'
              }
            ],
            url: {
              raw: '{{baseUrl}}' + path,
              host: ['{{baseUrl}}'],
              path: path.split('/').filter(Boolean)
            }
          },
          response: []
        }
        
        // Add query parameters
        if (operation.parameters) {
          const queryParams = operation.parameters
            .filter((param: any) => param.in === 'query')
            .map((param: any) => ({
              key: param.name,
              value: param.example || '',
              description: param.description,
              disabled: !param.required
            }))
          
          if (queryParams.length > 0) {
            request.request.url.query = queryParams
          }
        }
        
        // Add request body for POST/PUT/PATCH
        if (operation.requestBody && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
          const jsonContent = operation.requestBody.content?.['application/json']
          if (jsonContent?.example) {
            request.request.body = {
              mode: 'raw',
              raw: JSON.stringify(jsonContent.example, null, 2),
              options: {
                raw: {
                  language: 'json'
                }
              }
            }
          }
        }
        
        // Add auth if endpoint requires it
        if (operation.security && operation.security.length > 0) {
          request.request.auth = {
            type: 'bearer',
            bearer: [
              {
                key: 'token',
                value: '{{bearerToken}}',
                type: 'string'
              }
            ]
          }
        } else {
          request.request.auth = {
            type: 'noauth'
          }
        }
        
        groupedItems[tag].push(request)
      })
    })
    
    // Create folder structure
    Object.entries(groupedItems).forEach(([tag, items]) => {
      postmanCollection.item.push({
        name: tag,
        item: items
      })
    })
    
    c.header('Content-Type', 'application/json')
    c.header('Content-Disposition', 'attachment; filename="meridian-api.postman_collection.json"')
    
    return c.json(postmanCollection)
    
  } catch (error) {
    logger.error('❌ Failed to generate Postman collection:', error)
    return c.json({ error: 'Failed to generate Postman collection' }, 500)
  }
})

/**
 * API documentation index page
 */
app.get('/', async (c) => {
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meridian API Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 0.5rem;
    }
    .section {
      margin: 2rem 0;
    }
    .card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 1rem;
      margin: 1rem 0;
    }
    .card h3 {
      margin-top: 0;
      color: #2c3e50;
    }
    .btn {
      display: inline-block;
      padding: 8px 16px;
      margin: 4px 8px 4px 0;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    .btn-primary {
      background-color: #3498db;
      color: white;
    }
    .btn-primary:hover {
      background-color: #2980b9;
    }
    .btn-secondary {
      background-color: #95a5a6;
      color: white;
    }
    .btn-secondary:hover {
      background-color: #7f8c8d;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      padding: 1rem;
      border-radius: 4px;
      text-align: center;
    }
    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .code {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 1rem;
      border-radius: 4px;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 14px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Meridian API Documentation</h1>
    
    <div class="section">
      <p>
        Welcome to the Meridian API documentation. This comprehensive REST API provides 
        endpoints for project management, team collaboration, real-time communication, 
        and system monitoring.
      </p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">25+</div>
        <div>API Endpoints</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">6</div>
        <div>Feature Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">100%</div>
        <div>OpenAPI 3.0</div>
      </div>
    </div>

    <div class="section">
      <h2>📚 Documentation Formats</h2>
      
      <div class="card">
        <h3>Interactive Documentation</h3>
        <p>Try out the API directly from your browser with our interactive documentation tools.</p>
        <a href="./swagger" class="btn btn-primary">Swagger UI</a>
        <a href="./redoc" class="btn btn-secondary">ReDoc</a>
      </div>

      <div class="card">
        <h3>API Specifications</h3>
        <p>Download the OpenAPI specification in your preferred format.</p>
        <a href="./openapi.json" class="btn btn-primary">OpenAPI JSON</a>
        <a href="./openapi.yaml" class="btn btn-secondary">OpenAPI YAML</a>
      </div>

      <div class="card">
        <h3>Collections</h3>
        <p>Import ready-to-use API collections into your favorite testing tools.</p>
        <a href="./postman.json" class="btn btn-primary">Postman Collection</a>
      </div>
    </div>

    <div class="section">
      <h2>🔑 Authentication</h2>
      <p>The API uses session-based authentication with Bearer tokens. Include your token in the Authorization header:</p>
      <div class="code">Authorization: Bearer your-session-token-here</div>
    </div>

    <div class="section">
      <h2>🎯 Quick Start</h2>
      <div class="card">
        <h3>1. Health Check</h3>
        <div class="code">GET /health</div>
        <p>Check if the API is running and healthy.</p>
      </div>

      <div class="card">
        <h3>2. User Authentication</h3>
        <div class="code">POST /api/user/sign-in</div>
        <p>Sign in to get your session token.</p>
      </div>

      <div class="card">
        <h3>3. Get Current User</h3>
        <div class="code">GET /api/me</div>
        <p>Get your user information (requires authentication).</p>
      </div>
    </div>

    <div class="section">
      <h2>📊 Feature Categories</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-number">🔐</div>
          <div>Authentication</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">👥</div>
          <div>Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">🗄️</div>
          <div>Database</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">📝</div>
          <div>Logging</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">⚡</div>
          <div>Performance</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">🛠️</div>
          <div>System</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🚀 Base URL</h2>
      <div class="code">${localApiBase}</div>
      <p>All API endpoints are relative to the base URL above.</p>
    </div>

    <div class="section">
      <h2>💬 Support</h2>
      <p>
        For questions, issues, or feedback about the API:
      </p>
      <ul>
        <li>📧 Email: <a href="mailto:support@meridian.app">support@meridian.app</a></li>
        <li>🐛 Issues: <a href="https://github.com/meridian-project/issues">GitHub Issues</a></li>
        <li>📖 Documentation: <a href="https://docs.meridian.com">docs.meridian.com</a></li>
      </ul>
    </div>
  </div>
</body>
</html>`

  c.header('Content-Type', 'text/html')
  c.header('Cache-Control', 'public, max-age=300')
  
  return c.html(indexHtml)
})

/**
 * API specification info endpoint
 */
app.get('/info', async (c) => {
  try {
    const yamlPath = join(__dirname, '../docs/openapi.yaml')
    const yamlContent = await readFile(yamlPath, 'utf-8')
    const spec = load(yamlContent) as any
    
    const pathCount = Object.keys(spec.paths || {}).length
    const operationCount = Object.values(spec.paths || {}).reduce((count, pathItem: any) => {
      return count + Object.keys(pathItem).filter(key => 
        ['get', 'post', 'put', 'patch', 'delete'].includes(key)
      ).length
    }, 0)
    
    const tagCount = (spec.tags || []).length
    const schemaCount = Object.keys(spec.components?.schemas || {}).length
    
    return c.json({
      info: spec.info,
      servers: spec.servers,
      statistics: {
        paths: pathCount,
        operations: operationCount,
        tags: tagCount,
        schemas: schemaCount
      },
      formats: {
        openapi_json: '/api/docs/openapi.json',
        openapi_yaml: '/api/docs/openapi.yaml',
        swagger_ui: '/api/docs/swagger',
        redoc: '/api/docs/redoc',
        postman: '/api/docs/postman.json'
      }
    })
    
  } catch (error) {
    logger.error('❌ Failed to get API info:', error)
    return c.json({ error: 'Failed to get API information' }, 500)
  }
})

export default app

