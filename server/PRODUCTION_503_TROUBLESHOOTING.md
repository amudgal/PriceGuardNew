# Production 503 Error Troubleshooting Guide

## Error: `POST https://api.priceguardbackend.live/api/auth/login 503 (Service Unavailable)`

## Possible Causes

### 1. Database Connection Failure (Most Likely)

**Symptoms:**
- Health check endpoint returns `503` with `"database": "disconnected"`
- ALB marks target as unhealthy
- Requests fail with 503

**Causes:**
- DATABASE_URL contains SSL parameters that conflict with `PGSSLMODE` and `PGSSLROOTCERT`
- RDS CA certificate not found at `/app/rds-ca-bundle.pem`
- Database security group not allowing traffic from ECS tasks
- Database credentials incorrect

**Fix:**
1. Check CloudWatch Logs for database connection errors:
   ```bash
   aws logs tail /ecs/priceguard-server --follow --filter-pattern "database"
   ```

2. Verify DATABASE_URL in Secrets Manager doesn't have `?sslmode=...` parameters:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id priceguard/database-url-gVnioM \
     --region us-east-1 \
     --query SecretString --output text
   ```
   If it has `?sslmode=verify-full` or similar, the code should remove it automatically now.

3. Verify RDS CA certificate exists in container:
   - Check ECS task logs for: `[db] Loaded SSL CA certificate from /app/rds-ca-bundle.pem`
   - If missing, verify Dockerfile copies it correctly

4. Check RDS security group allows traffic from ECS security group (`sg-0d20af83680061442`)

### 2. Health Check Failures

**Symptoms:**
- ECS task starts but ALB marks it unhealthy
- Health check endpoint accessible but returns 503

**Fix:**
1. Check ALB target group health:
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn <target-group-arn> \
     --region us-east-1
   ```

2. Verify health check path is `/health?simple=1` (should return 200 without DB check)

3. Check health check logs:
   ```bash
   aws logs tail /ecs/priceguard-server --follow --filter-pattern "health"
   ```

### 3. Task Startup Failures

**Symptoms:**
- Tasks keep restarting
- Tasks fail to start within start period (180 seconds)

**Fix:**
1. Check ECS task status:
   ```bash
   aws ecs describe-tasks \
     --cluster priceguard-cluster \
     --tasks <task-id> \
     --region us-east-1
   ```

2. Check container logs for startup errors:
   ```bash
   aws logs tail /ecs/priceguard-server --follow --since 10m
   ```

### 4. SSL Configuration Issues

**Symptoms:**
- Database connection errors with "self-signed certificate" or "certificate chain" errors

**Fix:**
1. Verify `PGSSLMODE` is set to `require` (not `verify-full` or `verify-ca`) to avoid strict certificate validation
2. Verify `PGSSLROOTCERT` points to `/app/rds-ca-bundle.pem`
3. Ensure Dockerfile copies `rds-ca-bundle.pem` to `/app/rds-ca-bundle.pem`

## Quick Fixes

### Fix 1: Update DATABASE_URL in Secrets Manager

If DATABASE_URL has SSL parameters, remove them:

```bash
# Get current value
CURRENT_URL=$(aws secretsmanager get-secret-value \
  --secret-id priceguard/database-url-gVnioM \
  --region us-east-1 \
  --query SecretString --output text)

# Remove SSL parameters (the code does this automatically now, but verify)
echo "$CURRENT_URL" | sed 's/[?&]sslmode=[^&]*//g' | sed 's/[?&]sslrootcert=[^&]*//g'
```

The code should automatically handle this now.

### Fix 2: Restart ECS Service

After code changes, restart the service:

```bash
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server-service \
  --force-new-deployment \
  --region us-east-1
```

### Fix 3: Check CloudWatch Logs

```bash
# Tail logs in real-time
aws logs tail /ecs/priceguard-server --follow --region us-east-1

# Search for errors
aws logs filter-log-events \
  --log-group-name /ecs/priceguard-server \
  --filter-pattern "error" \
  --region us-east-1 \
  --max-items 50
```

## Verification Steps

1. **Check Health Endpoint:**
   ```bash
   curl https://api.priceguardbackend.live/health
   ```
   Should return 200 with `"database": "connected"` or at least `"status": "healthy"` for simple checks

2. **Check API Endpoint:**
   ```bash
   curl -X POST https://api.priceguardbackend.live/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test"}'
   ```
   Should return 401 (unauthorized) or 400 (bad request), NOT 503

3. **Check ECS Service Status:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server-service \
     --region us-east-1 \
     --query 'services[0].{status:status,runningCount:runningCount,desiredCount:desiredCount}'
   ```
   Should show `runningCount` >= `desiredCount`

## Recent Changes

The latest code update:
- ✅ Removes SSL parameters from DATABASE_URL automatically
- ✅ URL-encodes passwords to handle special characters like `#`
- ✅ Handles migrations gracefully (server can start even if DB is temporarily unavailable)
- ✅ Improved health check logic (simple checks don't require DB)
- ✅ Better error logging

After deploying this code, the 503 error should be resolved.

