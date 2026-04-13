
# Meridian API Documentation

This directory contains the complete API documentation for the Meridian project management platform.

## Files

- `openapi.json` - OpenAPI 3.0 specification in JSON format
- `index.html` - Interactive Swagger UI documentation
- `README.md` - This file

## Viewing Documentation

### Local Development
1. Start the API server: `npm run dev`
2. Visit: http://localhost:3005/api/docs

### Static Files
1. Open `index.html` in your browser
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
```
Authorization: Bearer your-session-token
```

## Error Handling

All errors follow a consistent structure with appropriate HTTP status codes and detailed error information.

## Database Migration Policy

Meridian API uses a single schema management policy:

- Development/staging schema updates use `drizzle-kit push`.
- Startup does not auto-run migration files.
- Production changes must be applied through reviewed deployment steps before app rollout.
- Every schema change should include an explicit runbook entry in PR notes.

This keeps runtime startup deterministic and prevents unexpected DB changes during server boot.

## Support

For API support, contact: support@meridian.app
    