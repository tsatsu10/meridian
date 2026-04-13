# 🔒 Security Testing Checklist

**Target Application:** Meridian Project Management Platform  
**Environment:** Staging (https://staging.meridian.app)  
**Last Updated:** October 30, 2025

---

## 🎯 Testing Categories

- [x] Authentication & Authorization (20 tests)
- [x] Input Validation & Injection (15 tests)
- [x] Session Management (8 tests)
- [x] API Security (10 tests)
- [x] Business Logic (8 tests)
- [x] Data Exposure (10 tests)
- [x] Infrastructure (8 tests)

**Total Test Cases:** 79

---

## 🔐 1. Authentication & Authorization Tests

### Authentication Bypass Attempts

- [ ] **SQL Injection in Login**
  - Payload: `admin' OR '1'='1' --`
  - Expected: Login rejected, sanitized input

- [ ] **NoSQL Injection in Login**
  - Payload: `{"email": {"$ne": null}, "password": {"$ne": null}}`
  - Expected: Invalid request format

- [ ] **JWT Token Manipulation**
  - Test: Change `alg` to `none`
  - Expected: Token rejected, 401 response

- [ ] **JWT Token Expiry**
  - Test: Use expired token
  - Expected: 401 with "Token expired" message

- [ ] **Session Token Prediction**
  - Test: Analyze token randomness
  - Expected: High entropy, unpredictable

- [ ] **Null Byte Injection**
  - Payload: `admin\x00@meridian.app`
  - Expected: Properly sanitized

- [ ] **Password Reset Token Prediction**
  - Test: Request multiple reset tokens
  - Expected: Unique, non-sequential tokens

- [ ] **2FA Bypass Attempts**
  - Test: Skip 2FA verification page
  - Expected: Redirect back to 2FA verification

### Authorization Bypass

- [ ] **Vertical Privilege Escalation**
  - Test: Member tries to access admin endpoints
  - Expected: 403 Forbidden

- [ ] **Horizontal Privilege Escalation**
  - Test: User A accesses User B's data
  - Expected: 403 or 404 (not 200)

- [ ] **IDOR on Projects**
  - Test: `GET /api/projects/{other-user-project-id}`
  - Expected: 403 or 404, not project data

- [ ] **IDOR on Tasks**
  - Test: `GET /api/tasks/{other-user-task-id}`
  - Expected: 403 or 404

- [ ] **IDOR on Files**
  - Test: `GET /api/files/{other-user-file-id}`
  - Expected: 403 or 404, file not served

- [ ] **Forced Browsing to Admin Pages**
  - Test: Navigate to `/dashboard/admin` as member
  - Expected: Redirect or 403

- [ ] **API Endpoint Authorization**
  - Test: Call protected endpoints without auth
  - Expected: 401 Unauthorized

- [ ] **WebSocket Authorization**
  - Test: Connect to WebSocket without credentials
  - Expected: Connection rejected

- [ ] **Role Manipulation**
  - Test: Change role in request payload
  - Expected: Server validates from session, not request

- [ ] **Permission Boundary Testing**
  - Test: Team lead tries workspace-manager actions
  - Expected: 403 Forbidden

- [ ] **Cross-Workspace Access**
  - Test: Access workspace without membership
  - Expected: 403 or 404

- [ ] **Deleted User Access**
  - Test: Use token of deleted user
  - Expected: 401 Invalid session

---

## 💉 2. Input Validation & Injection Tests

### SQL Injection

- [ ] **Login Form**
  - Payloads: `' OR 1=1--`, `admin'--`, `' UNION SELECT * FROM users--`
  - Expected: Parameterized queries prevent injection

- [ ] **Search Functionality**
  - Payload: `'; DROP TABLE users; --`
  - Expected: Sanitized input, no SQL executed

- [ ] **Task Title/Description**
  - Payload: `<script>'; DROP TABLE tasks; --</script>`
  - Expected: Properly escaped

- [ ] **Project Name**
  - Payload: `Test' OR '1'='1`
  - Expected: Stored safely, no injection

### XSS (Cross-Site Scripting)

- [ ] **Reflected XSS in Search**
  - Payload: `<script>alert('XSS')</script>`
  - Expected: HTML encoded, no execution

- [ ] **Stored XSS in Task Title**
  - Payload: `<img src=x onerror=alert('XSS')>`
  - Expected: Sanitized before storage

- [ ] **Stored XSS in Comments**
  - Payload: `<svg onload=alert('XSS')>`
  - Expected: Content Security Policy blocks

- [ ] **DOM-based XSS**
  - Test: Manipulate URL parameters
  - Expected: Parameters sanitized before DOM insertion

- [ ] **XSS in File Names**
  - Filename: `<script>alert('XSS')</script>.jpg`
  - Expected: Filename sanitized

### Command Injection

- [ ] **File Upload Filename**
  - Filename: `; rm -rf / ;.jpg`
  - Expected: Filename sanitized, no execution

- [ ] **Export/Download Parameters**
  - Payload: `../../etc/passwd`
  - Expected: Path traversal prevented

### Path Traversal

- [ ] **File Download**
  - Test: `GET /api/files/../../../etc/passwd`
  - Expected: 400 Bad Request or 403

- [ ] **Static File Serving**
  - Test: `/uploads/../../database/meridian.db`
  - Expected: Access denied

### SSRF (Server-Side Request Forgery)

- [ ] **Webhook URLs**
  - Payload: `http://localhost:22` or `http://169.254.169.254/latest/meta-data/`
  - Expected: Internal IPs blocked

- [ ] **Integration URLs**
  - Payload: Internal network addresses
  - Expected: Whitelist validation

---

## 🔐 3. Session Management Tests

- [ ] **Session Fixation**
  - Test: Pre-set session ID before login
  - Expected: New session ID after login

- [ ] **Session Token in URL**
  - Test: Session token passed as query parameter
  - Expected: Only in HTTP-only cookie

- [ ] **Concurrent Sessions**
  - Test: Login from multiple devices
  - Expected: All sessions valid (unless limit configured)

- [ ] **Session Timeout**
  - Test: Inactive session for configured timeout
  - Expected: Session expires, requires re-login

- [ ] **Logout Functionality**
  - Test: Logout and try to use old token
  - Expected: Token invalidated, 401 response

- [ ] **Remember Me Security**
  - Test: Remember me cookie security
  - Expected: Separate long-lived token, revocable

- [ ] **Session Token Randomness**
  - Test: Generate 100 session tokens
  - Expected: High entropy, no patterns

- [ ] **Session Hijacking Protection**
  - Test: Use session from different IP/User-Agent
  - Expected: Additional verification or rejection

---

## 🌐 4. API Security Tests

- [ ] **Rate Limiting - Auth Endpoints**
  - Test: 100 rapid login attempts
  - Expected: Rate limited after 5 attempts

- [ ] **Rate Limiting - API Endpoints**
  - Test: 1000 rapid API calls
  - Expected: Rate limited after 100 requests

- [ ] **Mass Assignment**
  - Test: Send `{"role": "admin"}` in user update
  - Expected: Role field ignored or rejected

- [ ] **API Parameter Pollution**
  - Test: `?userId=1&userId=2`
  - Expected: Only first or last parameter used consistently

- [ ] **Excessive Data Exposure**
  - Test: Check API responses for sensitive fields
  - Expected: No passwords, secrets, tokens in responses

- [ ] **API Authentication Bypass**
  - Test: Call endpoints without Authorization header
  - Expected: 401 Unauthorized

- [ ] **Content-Type Validation**
  - Test: Send XML to JSON endpoint
  - Expected: 415 Unsupported Media Type

- [ ] **Request Size Limits**
  - Test: Send 100MB request body
  - Expected: 413 Payload Too Large (limit: 10MB)

- [ ] **GraphQL Introspection** (if applicable)
  - Test: Query `__schema`
  - Expected: Disabled in production

- [ ] **API Versioning**
  - Test: Use deprecated API version
  - Expected: Graceful handling or deprecation notice

---

## 🧠 5. Business Logic Tests

- [ ] **Workflow Bypass**
  - Test: Move task to 'done' without completing required steps
  - Expected: Validation prevents invalid transitions

- [ ] **Race Conditions**
  - Test: Submit same form twice simultaneously
  - Expected: Idempotency or proper locking

- [ ] **Negative Values**
  - Test: Set time entry duration to -10 hours
  - Expected: Validation rejects negative values

- [ ] **Integer Overflow**
  - Test: Set extremely large values
  - Expected: Range validation

- [ ] **Time-Based Attacks**
  - Test: Manipulate timestamps
  - Expected: Server validates dates

- [ ] **Logic Flaws in Permissions**
  - Test: Assign task to user not in project
  - Expected: Validation prevents

- [ ] **Calculation Manipulation**
  - Test: Tamper with client-side calculations
  - Expected: Server recalculates, ignores client values

- [ ] **State Manipulation**
  - Test: Change order of operations
  - Expected: State machine enforces proper flow

---

## 📊 6. Data Exposure Tests

- [ ] **Sensitive Data in Responses**
  - Check: Password hashes, secrets, tokens
  - Expected: Never in API responses

- [ ] **Error Messages**
  - Test: Trigger errors (e.g., wrong password)
  - Expected: Generic messages, no stack traces

- [ ] **Backup Files Exposure**
  - Test: `GET /backup.sql`, `/.git/config`
  - Expected: 404 Not Found

- [ ] **Source Code Exposure**
  - Test: `GET /src/index.ts`, `/.env`
  - Expected: 404 Not Found

- [ ] **Directory Listing**
  - Test: `GET /uploads/`, `GET /api/`
  - Expected: No directory listing

- [ ] **Sensitive Data in Client-Side Code**
  - Check: View page source, check bundle.js
  - Expected: No API keys, secrets

- [ ] **Sensitive Data in Logs**
  - Check: Application logs for passwords, tokens
  - Expected: Sensitive data redacted

- [ ] **Database Dumps**
  - Test: Request database exports
  - Expected: Passwords hashed, tokens excluded

- [ ] **User Enumeration**
  - Test: Different error messages for valid/invalid emails
  - Expected: Same generic message

- [ ] **Information Disclosure in Headers**
  - Check: X-Powered-By, Server headers
  - Expected: Minimal information

---

## 🏗️ 7. Infrastructure Tests

- [ ] **Outdated Software**
  - Check: Node.js, PostgreSQL, Redis versions
  - Expected: Latest stable versions

- [ ] **Default Credentials**
  - Test: Try admin/admin, postgres/postgres
  - Expected: No default credentials

- [ ] **CORS Misconfiguration**
  - Test: Request from evil.com
  - Expected: CORS blocks or proper whitelist

- [ ] **Security Headers**
  - Check: All responses have proper headers
  - Expected: X-Frame-Options, CSP, HSTS, etc.

- [ ] **SSL/TLS Configuration**
  - Test: SSLLabs.com scan
  - Expected: A or A+ rating

- [ ] **HTTP Methods**
  - Test: TRACE, OPTIONS on endpoints
  - Expected: Disabled or properly configured

- [ ] **File Upload Restrictions**
  - Test: Upload .exe, .php, .jsp files
  - Expected: Blocked by MIME type validation

- [ ] **Subdomain Takeover**
  - Check: Dangling DNS records
  - Expected: No unclaimed subdomains

---

## 🧪 Testing Tools Required

### Automated Tools:
- ✅ OWASP ZAP (configured in `.github/workflows/security-scan.yml`)
- ✅ Snyk (dependency scanning)
- ✅ Semgrep (SAST)
- ✅ Trivy (container scanning)

### Manual Tools:
- [ ] Burp Suite Community/Pro
- [ ] Postman/Insomnia (API testing)
- [ ] Browser DevTools
- [ ] curl/httpie (CLI testing)

### Optional Tools:
- [ ] SQLMap (SQL injection testing)
- [ ] Nikto (web server scanning)
- [ ] Nmap (port scanning)

---

## 📝 Test Execution Log

| Date | Tester | Test | Result | Notes |
|------|--------|------|--------|-------|
| | | | | |

---

## 🚨 Vulnerability Severity Classification

### Critical (Fix Immediately)
- Remote code execution
- Authentication bypass
- SQL injection allowing data access
- Exposed credentials/secrets

### High (Fix Within 48 Hours)
- Privilege escalation
- XSS allowing session theft
- CSRF on critical actions
- Sensitive data exposure

### Medium (Fix Within 1 Week)
- Information disclosure
- Missing security headers
- CSRF on non-critical actions
- Rate limiting issues

### Low (Fix Next Sprint)
- Verbose error messages
- Missing HttpOnly on non-critical cookies
- Directory listing on non-sensitive paths

---

## ✅ Sign-off

- [ ] All critical vulnerabilities fixed
- [ ] All high vulnerabilities fixed or accepted risk documented
- [ ] Medium vulnerabilities have remediation plan
- [ ] Low vulnerabilities documented for future sprints
- [ ] Penetration test report completed
- [ ] Security team approval received

**Tested by:** _________________  
**Date:** _________________  
**Approved by:** _________________  
**Date:** _________________

