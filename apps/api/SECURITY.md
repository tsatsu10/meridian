# Security Guidelines

## ⚠️ Critical Security Configuration

### 1. Environment Variables

**Never commit real secrets to version control:**

```bash
# ❌ WRONG - Real secrets in .env.example
VAPID_PRIVATE_KEY=real-private-key-here

# ✅ CORRECT - Placeholders in .env.example  
VAPID_PRIVATE_KEY="your-vapid-private-key-here"
```

### 2. Demo Mode

**Demo mode completely bypasses authentication!**

```bash
# ❌ NEVER in production
DEMO_MODE="true"
NODE_ENV="production"

# ✅ Production configuration
DEMO_MODE="false" 
NODE_ENV="production"
```

**Safety measures implemented:**
- Console warnings when demo mode is enabled in production
- Environment validation that prevents startup with demo mode in production
- Clear documentation warnings

### 3. CORS Configuration

**Wildcard origins are dangerous in production:**

```bash
# ❌ WRONG - Allows any domain
CORS_ORIGINS="*"

# ✅ CORRECT - Specific allowed domains
CORS_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"
```

**CORS protection implemented:**
- Production mode requires explicit CORS_ORIGINS configuration
- Development mode allows localhost domains
- Automatic denial if no origins configured in production

### 4. Required Production Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:port/db"

# Security
NODE_ENV="production"
DEMO_MODE="false"
JWT_SECRET="your-secure-32-character-minimum-secret"

# CORS (comma-separated)
CORS_ORIGINS="https://yourdomain.com"

# Push notifications (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:admin@yourdomain.com"

# Admin user
ADMIN_EMAIL="admin@yourdomain.com"
```

### 5. Security Checklist

Before deploying to production:

- [ ] `DEMO_MODE="false"`
- [ ] `NODE_ENV="production"`
- [ ] `CORS_ORIGINS` set to specific domains (no wildcards)
- [ ] `JWT_SECRET` is 32+ characters
- [ ] Real VAPID keys generated and set
- [ ] Admin email configured
- [ ] No real secrets in `.env.example`
- [ ] Database uses secure connection string
- [ ] All environment variables properly configured

### 6. Security Features

**Built-in protections:**
- Environment validation prevents insecure production deployments
- CORS policy restricts cross-origin requests appropriately
- Demo mode warnings and validation
- Session-based authentication with secure token validation
- Admin user role-based access control

**Recommendations:**
- Use HTTPS in production
- Implement rate limiting
- Regular security audits
- Monitor authentication logs
- Keep dependencies updated