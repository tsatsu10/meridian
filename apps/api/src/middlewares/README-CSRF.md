# CSRF Protection Middleware

## Overview

This middleware implements **Double Submit Cookie** pattern for CSRF (Cross-Site Request Forgery) protection.

## How It Works

1. **Token Generation**: Server generates a cryptographically secure random token
2. **Cookie Storage**: Token is stored in a cookie accessible by JavaScript
3. **Header Validation**: Client includes token in a custom header for state-changing requests
4. **Server Verification**: Server validates that cookie token matches header token

## Installation

### Backend (API)

```typescript
// apps/api/src/index.ts
import { csrfProtection } from "./middlewares/csrf";

// Apply CSRF protection to all API routes
app.use("/api/*", csrfProtection({
  cookieName: "XSRF-TOKEN",
  headerName: "X-XSRF-TOKEN",
  excludePaths: [
    "/api/auth/login",
    "/api/auth/register",
    "/api/health"
  ],
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict"
}));
```

### Frontend (React)

Create a CSRF interceptor for API requests:

```typescript
// apps/web/src/utils/csrf.ts
import Cookies from "js-cookie";

export function getCSRFToken(): string | undefined {
  return Cookies.get("XSRF-TOKEN");
}

export function addCSRFHeader(headers: Headers): Headers {
  const token = getCSRFToken();
  if (token) {
    headers.set("X-XSRF-TOKEN", token);
  }
  return headers;
}

// Example fetch wrapper
export async function secureFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  addCSRFHeader(headers);
  
  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Important for cookies
  });
}
```

### Usage in Components

```typescript
import { secureFetch } from "@/utils/csrf";

// POST request with CSRF protection
const createTask = async (taskData: TaskData) => {
  const response = await secureFetch("/api/task/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(taskData),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create task");
  }
  
  return response.json();
};
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cookieName` | string | `"XSRF-TOKEN"` | Name of the cookie storing the CSRF token |
| `headerName` | string | `"X-XSRF-TOKEN"` | Name of the header to check for the token |
| `excludePaths` | string[] | `[]` | Paths to exclude from CSRF protection |
| `tokenExpiry` | number | `3600` (1 hour) | Token expiry time in seconds |
| `secure` | boolean | `true` (production) | Use secure cookies (HTTPS only) |
| `sameSite` | "strict" \| "lax" \| "none" | `"strict"` | SameSite cookie attribute |

## Security Features

### 1. Cryptographically Secure Tokens
- Uses `crypto.getRandomValues()` for token generation
- 32-byte tokens (64 hex characters)
- Unpredictable and unique per session

### 2. Constant-Time Comparison
- Prevents timing attacks
- Uses bitwise XOR for comparison
- Equal execution time regardless of input

### 3. HTTP Method Awareness
- Safe methods (GET, HEAD, OPTIONS) generate tokens
- Unsafe methods (POST, PUT, DELETE, PATCH) validate tokens
- Follows REST best practices

### 4. Cookie Security
- `HttpOnly: false` (must be accessible by JavaScript)
- `Secure: true` (HTTPS only in production)
- `SameSite: strict` (prevents cross-site requests)
- Scoped to path `/`

## Error Responses

### Missing Cookie Token
```json
{
  "error": "CSRF token missing",
  "message": "Please refresh the page and try again"
}
```
**Status:** 403 Forbidden

### Missing Header Token
```json
{
  "error": "CSRF token missing in request",
  "message": "Please include the CSRF token in your request"
}
```
**Status:** 403 Forbidden

### Invalid Token
```json
{
  "error": "Invalid CSRF token",
  "message": "CSRF token validation failed. Please refresh and try again."
}
```
**Status:** 403 Forbidden

## Testing

### Manual Testing

1. **GET Request** (should receive token):
```bash
curl -v -X GET http://localhost:3005/api/profile \
  --cookie-jar cookies.txt
```

2. **POST Request** (without token - should fail):
```bash
curl -v -X POST http://localhost:3005/api/task/create \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task"}' \
  --cookie cookies.txt
```

3. **POST Request** (with token - should succeed):
```bash
TOKEN=$(cat cookies.txt | grep XSRF-TOKEN | awk '{print $7}')
curl -v -X POST http://localhost:3005/api/task/create \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $TOKEN" \
  -d '{"title":"Test Task"}' \
  --cookie cookies.txt
```

### Automated Testing

```typescript
import { csrfProtection } from "./csrf";
import { Hono } from "hono";

describe("CSRF Protection", () => {
  it("should allow GET requests without token", async () => {
    const app = new Hono();
    app.use("*", csrfProtection());
    app.get("/test", (c) => c.json({ success: true }));
    
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("should reject POST requests without token", async () => {
    const app = new Hono();
    app.use("*", csrfProtection());
    app.post("/test", (c) => c.json({ success: true }));
    
    const res = await app.request("/test", { method: "POST" });
    expect(res.status).toBe(403);
  });

  it("should allow POST requests with valid token", async () => {
    const app = new Hono();
    app.use("*", csrfProtection());
    app.post("/test", (c) => c.json({ success: true }));
    
    // First get token
    const getRes = await app.request("/test");
    const cookies = getRes.headers.get("Set-Cookie");
    const token = cookies?.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    
    // Then use token in POST
    const postRes = await app.request("/test", {
      method: "POST",
      headers: {
        "Cookie": `XSRF-TOKEN=${token}`,
        "X-XSRF-TOKEN": token || "",
      },
    });
    
    expect(postRes.status).toBe(200);
  });
});
```

## Best Practices

1. **Always Use HTTPS in Production**
   - CSRF tokens in cookies require secure transport
   - Set `secure: true` in production

2. **Exclude Authentication Endpoints**
   - Login and registration don't need CSRF protection
   - They have their own security measures

3. **Token Rotation**
   - Tokens expire after 1 hour by default
   - New tokens generated automatically

4. **Frontend Integration**
   - Use a global fetch wrapper
   - Include CSRF token in all state-changing requests
   - Handle 403 errors gracefully (refresh and retry)

5. **Logging**
   - CSRF failures are logged to console
   - Monitor for potential attacks

## Limitations

1. **Not a Complete Solution**
   - CSRF protection is ONE layer of security
   - Must be combined with:
     - Authentication (sessions/JWT)
     - Authorization (RBAC)
     - Input validation
     - Rate limiting

2. **JavaScript Required**
   - Relies on JavaScript to read cookie
   - Won't work for server-rendered forms

3. **Same-Origin Limitation**
   - Works best with same-origin requests
   - SameSite cookies provide additional protection

## Migration Guide

### Step 1: Backend Integration
```bash
cd apps/api
# Middleware is already created in src/middlewares/csrf.ts
```

### Step 2: Apply to Routes
```typescript
// apps/api/src/index.ts
import { csrfProtection } from "./middlewares/csrf";

app.use("/api/*", csrfProtection({
  excludePaths: [
    "/api/auth/login",
    "/api/auth/register",
  ]
}));
```

### Step 3: Frontend Utilities
```bash
cd apps/web
npm install js-cookie
npm install --save-dev @types/js-cookie
```

Create `apps/web/src/utils/csrf.ts` (see code above)

### Step 4: Update API Calls
Replace all `fetch()` calls with `secureFetch()` for state-changing operations.

### Step 5: Test
Run manual and automated tests to verify protection.

## Support

For questions or issues, contact the security team or open an issue in the project repository.

---

**Status:** ✅ Production-Ready  
**Last Updated:** January 2025  
**Maintainer:** Meridian Security Team

