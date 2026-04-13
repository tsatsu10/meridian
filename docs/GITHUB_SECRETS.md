# GitHub Secrets Configuration

This document lists all GitHub Secrets required for the CI/CD pipelines in this repository.

## Required Secrets

### Staging Deployment (`deploy-staging.yml`)

These secrets must be configured in your GitHub repository under **Settings → Secrets and variables → Actions → Repository secrets**:

#### SSH Connection
- `STAGING_HOST` - Hostname or IP address of the staging server
- `STAGING_USER` - SSH username for the staging server
- `STAGING_SSH_KEY` - Private SSH key for authentication (full key content)

#### Application Configuration
- `STAGING_JWT_SECRET` - Secret key for JWT token signing (generate with `openssl rand -base64 32`)
- `STAGING_SESSION_SECRET` - Secret key for session management (generate with `openssl rand -base64 32`)
- `STAGING_ADMIN_EMAIL` - Default admin email address
- `STAGING_POSTGRES_PASSWORD` - PostgreSQL database password
- `STAGING_API_HOST` - API hostname (e.g., `api-staging.meridian.app`)

#### Monitoring (Optional)
- `STAGING_SENTRY_DSN` - Sentry DSN for error tracking (optional)

### Security Scanning (`security-scan.yml`)

#### Required for Dependency Scanning
- `SNYK_TOKEN` - API token from Snyk.io for dependency vulnerability scanning
  - Sign up at https://snyk.io
  - Get token from Account Settings → API Token

#### Optional
- `STAGING_URL` - URL to scan with OWASP ZAP (defaults to `https://staging.meridian.app`)

## How to Configure Secrets

### 1. Navigate to Repository Settings
```
Your Repository → Settings → Secrets and variables → Actions
```

### 2. Add Repository Secrets
Click **"New repository secret"** and add each secret with its corresponding value.

### 3. Verify Secrets
After adding secrets, you can verify they're set by:
- Checking the workflow runs don't fail with "secret not found" errors
- Running the workflow manually via **Actions → Select Workflow → Run workflow**

## Generating Secure Secrets

For cryptographic secrets like `JWT_SECRET` and `SESSION_SECRET`, generate strong random values:

```bash
# Generate a secure random secret
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Rotate secrets regularly** (at least every 90 days)
3. **Use different secrets** for staging and production
4. **Limit secret access** to only required workflows
5. **Use environment-specific secrets** (staging vs production)
6. **Monitor secret usage** in GitHub Actions logs

## Troubleshooting

### "Context access might be invalid" Warnings

The YAML linter shows warnings because it can't verify secrets exist at parse time. These are **informational warnings** and won't prevent workflows from running if secrets are properly configured.

### Workflow Fails with "secret not found"

1. Verify the secret name exactly matches the workflow
2. Check the secret is added to repository secrets (not environment secrets)
3. Ensure you have admin access to configure secrets

### SSH Connection Fails

1. Verify `STAGING_SSH_KEY` contains the **full private key** including:
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   ...key content...
   -----END OPENSSH PRIVATE KEY-----
   ```
2. Ensure the public key is added to `~/.ssh/authorized_keys` on the server
3. Test SSH connection manually: `ssh -i key.pem user@host`

## Production Secrets

When ready for production deployment, duplicate this setup with `PRODUCTION_*` prefixed secrets:
- `PRODUCTION_HOST`
- `PRODUCTION_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_JWT_SECRET`
- etc.

## Environment Secrets (Advanced)

For more granular control, consider using **Environment secrets** instead of repository secrets:

1. Create environments: `Settings → Environments`
2. Add environment-specific secrets
3. Update workflows to target specific environments

Example:
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging  # Uses staging environment secrets
```

This provides better isolation and allows environment-specific protection rules.

