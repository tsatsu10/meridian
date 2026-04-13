# Architecture Improvements

## Issues Addressed

### 1. Dual Server Setup → Unified Server
**Problem**: Running separate HTTP (3001) and WebSocket (3002) servers
**Solution**: Unified server on single port using HTTP upgrade for WebSocket

### 2. Mock Database Fallback → Simplified Connection
**Problem**: Complex mock system that mimics real DB operations
**Solution**: Fail fast with clear error messages, no silent fallbacks

### 3. Mixed Build Strategy → Consistent Externals
**Problem**: Inconsistent dependency externalization 
**Solution**: Clear external strategy with documentation

## Implementation Plan

### Phase 1: Unified Server Architecture
```typescript
// Single server handling both HTTP and WebSocket
const httpServer = createServer();
const wsServer = new UnifiedWebSocketServer(httpServer);

// Attach Hono app to same server
httpServer.on('request', (req, res) => {
  // Handle through Hono
});

httpServer.listen(port); // Single port
```

### Phase 2: Database Connection Simplification
```typescript
// Remove mock fallback, fail fast
try {
  const sqlite = new Database(dbPath);
  db = drizzle(sqlite, { schema });
} catch (error) {
  console.error("❌ Database connection failed:", error);
  console.error("💡 Fix: Check DATABASE_URL and file permissions");
  process.exit(1); // Fail fast, no silent fallbacks
}
```

### Phase 3: Build Strategy Standardization
```json
{
  "build": "esbuild src/index.ts --bundle --platform=node --outdir=dist --format=cjs --external:bcrypt --external:pg --external:postgres --external:canvas --external:sharp",
  "externals": {
    "native": ["bcrypt", "pg", "postgres", "canvas", "sharp"],
    "large": ["aws-sdk"],
    "testing": ["mock-aws-s3", "nock"]
  }
}
```

## Benefits

1. **Simplified Deployment**: Single port, easier reverse proxy setup
2. **Better Error Handling**: Clear failures instead of silent fallbacks  
3. **Consistent Build**: Predictable external dependency handling
4. **Reduced Complexity**: Fewer moving parts, easier debugging
5. **Production Ready**: Standard architecture patterns

## Migration Steps

1. ✅ Identify current dual server setup
2. ✅ Analyze mock database complexity  
3. ✅ Review build externals strategy
4. ✅ Implement unified server
5. ✅ Simplify database connection
6. ✅ Standardize build configuration
7. ✅ Update documentation
8. ✅ Test in development
9. ✅ Validate production readiness