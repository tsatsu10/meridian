# 🔌 WebSocket Port Strategy - Zero Stress Setup

## Port Allocation (Never Change These!)

| Service | Port | Rule |
|---------|------|------|
| **Web App** | `5173` | Vite default |
| **API Server** | `1337` | Current setup |
| **WebSocket** | `1338` | API port + 1 |

## Quick Setup

### Development
```bash
# Already configured in .env.local
VITE_WS_URL=ws://localhost:1338
```

### Production
```bash
# Use same domain as API
VITE_WS_URL=wss://api.yourapp.com/ws
# OR use port 1338
VITE_WS_URL=wss://api.yourapp.com:1338
```

## Why This Works
- ✅ **Predictable**: WebSocket is always API port + 1
- ✅ **No conflicts**: Avoids common ports (8080, 3000, etc.)
- ✅ **Easy to remember**: Simple math (1337 + 1 = 1338)
- ✅ **Team-friendly**: Anyone can guess the ports

## ✅ Server Configuration Complete
Both client and server are now configured to use port **1338**.

**Next Steps:**
1. Restart your API server: `npm run dev` (in apps/api)
2. Restart your web app: `npm run dev` (in apps/web)
3. WebSocket connections should now work! 🎉

---
*Set once, forget forever! 🎉* 