# Meridian API Documentation

Comprehensive REST API documentation for the Meridian project management and team collaboration platform.

## 🚀 Quick Start

### Base URL
```
Development: http://localhost:3008
Production:  https://api.meridian.com
```

### Authentication
The API uses session-based authentication with Bearer tokens:

```bash
# Sign in to get a token
curl -X POST http://localhost:3008/api/user/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Use the token for authenticated requests
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3008/api/me
```

## 📚 Documentation Formats

### Interactive Documentation
- **[Swagger UI](http://localhost:3008/api/docs/swagger)** - Interactive API testing
- **[ReDoc](http://localhost:3008/api/docs/redoc)** - Clean, readable documentation

### Specifications
- **[OpenAPI JSON](http://localhost:3008/api/docs/openapi.json)** - Machine-readable API spec
- **[OpenAPI YAML](http://localhost:3008/api/docs/openapi.yaml)** - Human-readable API spec

### Collections
- **[Postman Collection](http://localhost:3008/api/docs/postman.json)** - Ready-to-import collection

## 🎯 API Endpoints Overview

### System & Health
- `GET /health` - System health check
- `GET /` - API information and available endpoints

### Authentication
- `POST /api/user/sign-up` - Register new user
- `POST /api/user/sign-in` - User authentication
- `POST /api/user/sign-out` - Sign out and invalidate session

### User Management
- `GET /api/me` - Get current user information

### Database Management
- `GET /api/db/metrics` - Database performance metrics
- `GET /api/db/queries` - Query performance analysis
- `GET /api/db/cache` - Cache statistics and management
- `DELETE /api/db/cache` - Clear cache entries
- `GET /api/db/connections` - Connection pool status
- `GET /api/db/optimization-report` - Comprehensive optimization report

### Logging & Monitoring
- `GET /api/logs/analytics` - Log analytics and insights
- `GET /api/logs/export` - Export logs (JSON/CSV)
- `GET /api/logs/config` - Logging configuration
- `POST /api/logs/level` - Update log level
- `GET /api/logs/search` - Advanced log search
- `GET /api/logs/stats` - Log statistics and trends

### Documentation
- `GET /api/docs` - Documentation portal
- `GET /api/docs/swagger` - Swagger UI
- `GET /api/docs/redoc` - ReDoc documentation
- `GET /api/docs/info` - API specification info

## 🔧 Features

### Comprehensive API Coverage
- **25+ endpoints** across 6 feature categories
- **Full OpenAPI 3.0 specification** with detailed schemas
- **Interactive testing** with Swagger UI
- **Clean documentation** with ReDoc

### Security & Authentication
- **Session-based authentication** with secure tokens
- **CSRF protection** and security headers
- **Rate limiting** and request validation
- **Security event logging** and monitoring

### Performance & Monitoring
- **Real-time performance metrics** and analytics
- **Database query optimization** and caching
- **Structured logging** with advanced filtering
- **Health monitoring** and system diagnostics

### Developer Experience
- **Multiple documentation formats** (Swagger, ReDoc, Postman)
- **Comprehensive examples** and code samples
- **Type-safe schemas** and validation
- **Error handling** with detailed error responses

## 📊 API Statistics

- **Endpoints**: 25+
- **Categories**: 6 (System, Auth, Users, Database, Logging, Docs)
- **Schemas**: 40+ comprehensive data models
- **Examples**: Complete request/response examples
- **Authentication**: Session-based with Bearer tokens
- **Rate Limiting**: Built-in protection against abuse

## 🛡️ Security Features

### Authentication & Authorization
- **JWT-based sessions** with secure token management
- **Role-based access control** (RBAC)
- **Session validation** and automatic expiration
- **Multi-level authorization** for different endpoints

### Security Monitoring
- **Failed login tracking** and alerting
- **Suspicious request detection** with pattern matching
- **Rate limiting** with configurable thresholds
- **Security event logging** with detailed context

### Data Protection
- **Input validation** with Zod schemas
- **SQL injection prevention** with parameterized queries
- **XSS protection** with output sanitization
- **CSRF protection** with double-submit cookies

## 📈 Performance Features

### Database Optimization
- **Query performance analysis** with execution time tracking
- **Intelligent caching** with LRU eviction and tag-based invalidation
- **Connection pooling** with health monitoring
- **Slow query detection** and optimization recommendations

### Monitoring & Analytics
- **Real-time performance metrics** with alerting
- **Request/response time tracking** with percentile analysis
- **Error rate monitoring** with trend analysis
- **System health indicators** with predictive alerts

## 🚀 Getting Started

### 1. Start the Server
```bash
cd apps/api
npm run dev:full
```

### 2. Check Health
```bash
curl http://localhost:3008/health
```

### 3. View Documentation
Visit: http://localhost:3008/api/docs

### 4. Test with Swagger UI
Visit: http://localhost:3008/api/docs/swagger

## 🔍 Testing Examples

### Health Check
```bash
curl http://localhost:3008/health
```

### User Registration
```bash
curl -X POST http://localhost:3008/api/user/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'
```

### Get Database Metrics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3008/api/db/metrics
```

### Search Logs
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3008/api/logs/search?q=error&level=error,warn&limit=50"
```

## 📝 Response Formats

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

## 🔗 Related Documentation

- **[API OpenAPI Spec](./openapi.yaml)** - Complete API specification
- **[Database Schema](../src/database/schema.ts)** - Database structure
- **[Logging Guide](../src/config/logging.ts)** - Logging configuration
- **[Security Guide](../src/config/security.ts)** - Security settings

## 💬 Support

- **Email**: support@meridian.app
- **Issues**: [GitHub Issues](https://github.com/meridian-project/issues)
- **Documentation**: [docs.meridian.com](https://docs.meridian.com)

---

*Generated with ❤️ by the Meridian Development Team*