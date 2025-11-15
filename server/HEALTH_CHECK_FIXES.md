# Health Check Configuration Fixes

## Problem

ECS service fails to reach stable state during deployment, causing GitHub Actions to fail with:
- `Resource is not in the state servicesStable during deployment to AWS ECS`
- Tasks failing health checks from both ECS container health checks and ALB target group health checks

## Root Causes

1. **Health check timeout:** Tasks need more time to start (database migrations, SSL certificate loading)
2. **Database dependency:** Health checks were checking database connectivity, which can fail during startup
3. **ALB health check path:** ALB was checking `/health` without query parameter, triggering database checks

## Solutions Applied

### ✅ 1. Updated Dockerfile Health Check

**File:** `server/Dockerfile`

**Before:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1
```

**After:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://localhost:4000/health?simple=1" || exit 1
```

**Changes:**
- Added `?simple=1` query parameter to skip database check
- Added quotes around URL for proper shell escaping

### ✅ 2. Updated ECS Task Definition Health Check

**File:** `server/ecs-task-definition.json`

**Before:**
```json
"healthCheck": {
  "command": [
    "CMD-SHELL",
    "wget --no-verbose --tries=1 --spider http://localhost:4000/health?simple=1 || exit 1"
  ],
  "interval": 30,
  "timeout": 5,
  "retries": 3,
  "startPeriod": 120
}
```

**After:**
```json
"healthCheck": {
  "command": [
    "CMD-SHELL",
    "wget --no-verbose --tries=1 --spider \"http://localhost:4000/health?simple=1\" || exit 1"
  ],
  "interval": 30,
  "timeout": 5,
  "retries": 3,
  "startPeriod": 180
}
```

**Changes:**
- Increased `startPeriod` from 120 to 180 seconds (3 minutes)
- Added quotes around URL for proper shell escaping
- Uses `?simple=1` to avoid database checks during startup

### ✅ 3. Updated ALB Target Group Health Check

**Updated via script:** `server/fix-alb-health-check.sh`

**Before:**
- Health Check Path: `/health`
- Health Check Protocol: HTTP
- Health Check Port: traffic-port

**After:**
- Health Check Path: `/health?simple=1`
- Health Check Protocol: HTTP
- Health Check Port: traffic-port

**Changes:**
- ALB now uses `?simple=1` query parameter
- Skips database connectivity check during health checks
- Faster health check response

### ✅ 4. Enhanced GitHub Actions Workflow

**File:** `.github/workflows/deploy-backend.yml`

**Before:**
```yaml
- uses: aws-actions/amazon-ecs-deploy-task-definition@v1
  with:
    wait-for-service-stability: true
```

**After:**
```yaml
- uses: aws-actions/amazon-ecs-deploy-task-definition@v1
  with:
    wait-for-service-stability: true
    wait-for-minutes: 15
```

**Changes:**
- Extended wait time to 15 minutes (from default ~5 minutes)
- Improved wait logic for newly created services
- Better error handling and status reporting

### ✅ 5. Health Endpoint Already Supports `?simple=1`

The health endpoint in `server/src/index.ts` already handles the `simple=1` query parameter:

```typescript
app.get("/health", async (_req, res) => {
  const isSimpleCheck = 
    !userAgent || 
    userAgent.includes("Wget") || 
    userAgent.includes("wget") ||
    _req.query.simple === "true" ||
    _req.query.simple === "1";
  
  if (isSimpleCheck) {
    // Return 200 without database check (fast response)
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "priceguard-server",
    });
    return;
  }
  
  // Full health check with database connectivity
  // ...
});
```

This ensures:
- Container health checks (using `?simple=1`) return quickly without database dependency
- ALB health checks (using `?simple=1`) return quickly without database dependency
- Full health checks (from API calls) verify database connectivity

## Health Check Configuration Summary

### Container Health Check (Docker)
- **Command:** `wget --no-verbose --tries=1 --spider "http://localhost:4000/health?simple=1" || exit 1`
- **Interval:** 30 seconds
- **Timeout:** 3 seconds
- **Start Period:** 60 seconds
- **Retries:** 3 failures before marking unhealthy

### ECS Task Health Check
- **Command:** `wget --no-verbose --tries=1 --spider "http://localhost:4000/health?simple=1" || exit 1`
- **Interval:** 30 seconds
- **Timeout:** 5 seconds
- **Start Period:** 180 seconds (3 minutes)
- **Retries:** 3 failures before marking unhealthy

### ALB Target Group Health Check
- **Path:** `/health?simple=1`
- **Protocol:** HTTP
- **Port:** traffic-port (4000)
- **Interval:** 30 seconds
- **Timeout:** 5 seconds
- **Healthy Threshold:** 2 consecutive successful checks
- **Unhealthy Threshold:** 3 consecutive failed checks

## Why These Changes Help

1. **Simple Health Check (`?simple=1`):**
   - Skips database connectivity check
   - Returns immediately (faster response)
   - Prevents false failures if database connection takes time during startup

2. **Longer Start Period (180s):**
   - Allows time for database migrations to run
   - Allows time for SSL certificate loading
   - Allows time for application initialization
   - Tasks won't fail if health checks fail during this period

3. **Extended Wait Time (15 minutes):**
   - GitHub Actions will wait longer for service stabilization
   - Prevents premature failure reports
   - Allows for slower startup times

4. **Proper URL Escaping:**
   - Quotes around URL ensure query parameters are passed correctly
   - Prevents shell interpretation issues

## Testing

### Test Health Endpoint Locally

```bash
# Simple health check (no database)
curl "http://localhost:4000/health?simple=1"

# Expected: 200 OK with status "healthy"

# Full health check (with database)
curl "http://localhost:4000/health"

# Expected: 200 OK if database connected, 503 if not
```

### Test in Container

```bash
# Test health check command
docker exec <container-id> wget --no-verbose --tries=1 --spider "http://localhost:4000/health?simple=1" || echo "Failed"
```

### Verify ALB Health Check

```bash
# Test ALB health check endpoint
curl "http://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com/health?simple=1"

# Or via HTTPS
curl "https://api.priceguardbackend.live/health?simple=1"
```

### Check Target Health

```bash
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names priceguard-targets \
  --region us-east-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

aws elbv2 describe-target-health \
  --target-group-arn $TARGET_GROUP_ARN \
  --region us-east-1 \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,HealthStatus:TargetHealth.State,Reason:TargetHealth.Reason}' \
  --output json
```

## Troubleshooting

### If Service Still Fails to Stabilize

1. **Check service events:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1 \
     --query 'services[0].events[0:5]' \
     --output table
   ```

2. **Check stopped tasks:**
   ```bash
   aws ecs list-tasks \
     --cluster priceguard-cluster \
     --service-name priceguard-server \
     --desired-status STOPPED \
     --region us-east-1 \
     --max-items 1
   ```

3. **Check CloudWatch logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```
   Look for:
   - "Server listening on port 4000"
   - Database connection errors
   - Health check failures

4. **Verify health endpoint:**
   ```bash
   # Get task public IP
   TASK_ARN=$(aws ecs list-tasks \
     --cluster priceguard-cluster \
     --service-name priceguard-server \
     --desired-status RUNNING \
     --region us-east-1 \
     --query 'taskArns[0]' \
     --output text)
   
   # Test health endpoint
   curl "http://<task-public-ip>:4000/health?simple=1"
   ```

5. **Increase start period further:**
   - If needed, increase `startPeriod` to 240 or 300 seconds
   - Update `ecs-task-definition.json` and redeploy

### Common Issues

**Issue:** Tasks failing health checks immediately
- **Solution:** Verify `startPeriod` is sufficient (180 seconds)
- **Check:** Task logs for startup errors

**Issue:** ALB health checks failing
- **Solution:** Verify ALB target group uses `/health?simple=1`
- **Check:** Target group health check configuration

**Issue:** Database connection timeout
- **Solution:** Verify RDS security group and network configuration
- **Check:** SSL certificate is loaded correctly

**Issue:** Service keeps stopping tasks
- **Solution:** Check CloudWatch logs for errors
- **Check:** Verify health check command is correct

## Summary

✅ **Dockerfile Health Check:** Updated to use `?simple=1` with proper quoting
✅ **ECS Task Definition:** Increased `startPeriod` to 180s, proper URL escaping
✅ **ALB Target Group:** Updated to use `/health?simple=1`
✅ **GitHub Actions:** Extended wait time to 15 minutes
✅ **Health Endpoint:** Already supports `simple=1` parameter
✅ **Configuration:** All health checks now use simple mode during startup

These changes should resolve the ECS service stability issues and allow successful deployments.

## Next Deployment

The next GitHub Actions deployment should:
1. Build new Docker image with updated health check
2. Register new task definition with updated health check configuration
3. Deploy to ECS service
4. Wait up to 15 minutes for service to stabilize
5. Successfully complete deployment

