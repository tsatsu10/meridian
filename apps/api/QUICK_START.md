# Meridian API Server - Quick Start Guide

## 🚀 Robust Startup (Recommended)

```bash
# Start with automatic error fixing
npm run dev:robust

# Alternative robust start
npm start
```

## 🔧 Manual Fixes

```bash
# Fix all issues at once
npm run fix:all

# Fix Canvas module specifically
npm run fix:canvas

# Kill processes on conflicted ports
npm run kill:ports

# Run health check
npm run health
```

## 🚨 Common Issues & Solutions

### 1. Port Conflicts (EADDRINUSE)
```bash
npm run kill:ports
```

### 2. Canvas Module Errors
```bash
npm run fix:canvas
```

### 3. Authentication 401 Errors
- In development/test you can enable the demo bypass, but it is **off by default**:
  - `DEMO_MODE=true`
  - `ALLOW_DEMO_AUTH_BYPASS=true`
- Restart server after .env changes

### 4. Environment Variable Issues
```bash
npm run fix:all
```

## 📁 Files Created

- `src/utils/system-health.ts` - System health checker
- `src/server-startup.ts` - Robust server manager  
- `src/middlewares/robust-auth.ts` - Fixed authentication
- `src/index-robust.ts` - Complete robust server
- `.env-fixed` - Correct environment variables
- `start-robust.js` - Comprehensive startup script
- `fix-canvas.js` - Canvas module fix
- `deploy-fixes.js` - Deploy all fixes

## 🎯 What's Fixed

✅ **Authentication Issues**
- 401 Unauthorized errors eliminated
- Demo mode works consistently
- Session handling improved

✅ **Server Startup Issues** 
- Port conflicts resolved automatically
- Canvas module failures handled gracefully
- Environment variables validated and fixed

✅ **Memory Issues**
- Memory monitoring enabled
- Automatic cleanup implemented
- Performance optimizations applied

✅ **WebSocket Issues**
- Port changed from 1341 to 1338 (no conflicts)
- Proper error handling added
- Graceful shutdown implemented

## 🔍 Health Monitoring

Access health endpoints:
- `GET /debug/health` - Comprehensive system status
- `GET /debug/auth` - Authentication status
- `GET /debug/memory` - Memory monitoring

## ⚙️ Configuration

All settings in `.env`:
```
DEMO_MODE=true          # Enables demo mode flags
ALLOW_DEMO_AUTH_BYPASS=true  # Allows bypass in dev/test only
API_PORT=1337           # API server port
WS_PORT=1338           # WebSocket port (changed from 1341)
DATABASE_URL=postgresql://user:password@host:5432/dbname
DATABASE_TYPE=postgresql
```

## 🆘 If Issues Persist

1. Run `npm run fix:all`
2. Delete node_modules and run `npm install`
3. Check the health endpoint: `curl http://localhost:1337/debug/health`
4. Look at server logs for specific errors
