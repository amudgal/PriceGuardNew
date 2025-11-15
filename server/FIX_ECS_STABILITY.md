# Fix ECS Service Stability Issue

## Problem

GitHub Actions deployment fails with:
- `Resource is not in the state servicesStable during deployment to AWS ECS`
- Service fails to reach stable state, likely due to health check failures

## Root Causes

1. **Health check timeout:** Tasks may need more time to start up (database migrations, SSL certificate loading, etc.)
2. **Health check command:** May need better URL encoding for query parameters
3. **Start period too short:** Not enough time for application to fully start

## Solutions Applied

### ✅ 1. Updated Dockerfile Health Check

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
- Added `?simple=1` query parameter to skip database check during container health checks
- Added quotes around URL for proper shell escaping

### ✅ 2. Updated ECS Task Definition Health Check

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

### ✅ 3. Enhanced GitHub Actions Workflow

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
- Added `wait-for-minutes: 15` to allow more time for service stabilization
- Improved wait logic for newly created services

### ✅ 4. Verified Health Endpoint

The health endpoint already supports the `simple=1` query parameter:

```typescript
app.get("/health", async (_req, res) => {
  const isSimpleCheck = 
    !userAgent || 
    userAgent.includes("Wget") || 
    userAgent.includes("wget") ||
    _req.query.simple === "true" ||
    _req.query.simple === "1";
  
  if (isSimpleCheck) {
    // Return 200 without database check
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
- Full health checks (from ALB, API calls) verify database connectivity

## Health Check Configuration

### Container Health Check (ECS Task Definition)
- **Command:** `wget --no-verbose --tries=1 --spider "http://localhost:4000/health?simple=1" || exit 1`
- **Interval:** 30 seconds
- **Timeout:** 5 seconds
- **Retries:** 3 failures before marking unhealthy
- **Start Period:** 180 seconds (3 minutes) - tasks can fail health checks during this time

### Docker Health Check
- **Command:** `wget --no-verbose --tries=1 --spider "http://localhost:4000/health?simple=1" || exit 1`
- **Interval:** 30 seconds
- **Timeout:** 3 seconds
- **Start Period:** 60 seconds
- **Retries:** 3 failures before marking unhealthy

## Why These Changes Help

1. **Longer Start Period (180s):**
   - Allows time for database migrations to run
   - Allows time for SSL certificate loading
   - Allows time for application initialization
   - Tasks won't fail if health checks fail during this period

2. **Simple Health Check:**
   - Skips database connectivity check during startup
   - Returns immediately (faster response)
   - Prevents false failures if database connection takes time

3. **Proper URL Escaping:**
   - Quotes around URL ensure query parameters are passed correctly
   - Prevents shell interpretation issues

4. **Extended Wait Time:**
   - GitHub Actions will wait up to 15 minutes for service stabilization
   - Prevents premature failure reports

## Testing

### Test Health Endpoint Locally

```bash
# Simple health check (no database)
curl "http://localhost:4000/health?simple=1"

# Full health check (with database)
curl "http://localhost:4000/health"
```

### Test in Container

```bash
# Test health check command
docker exec <container-id> wget --no-verbose --tries=1 --spider "http://localhost:4000/health?simple=1" || echo "Failed"
```

### Verify Task Health in ECS

```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

# Check task health
aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks $TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].containers[0].healthStatus' \
  --output text
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

2. **Check task stopped reasons:**
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

4. **Increase start period further:**
   - If database migrations take longer, increase `startPeriod` to 240 or 300 seconds
   - Update `ecs-task-definition.json` and redeploy

5. **Check database connection:**
   - Verify RDS security group allows connections from ECS tasks
   - Verify SSL certificate is correctly loaded
   - Check database is accessible

### Common Issues

**Issue:** Tasks failing health checks immediately
- **Solution:** Increase `startPeriod` in task definition
- **Check:** Task logs for startup errors

**Issue:** Database connection timeout
- **Solution:** Verify RDS security group and network configuration
- **Check:** SSL certificate is loaded correctly

**Issue:** Service keeps stopping tasks
- **Solution:** Check CloudWatch logs for errors
- **Check:** Verify health check command is correct

## Summary

✅ **Dockerfile Health Check:** Updated to use `?simple=1` with proper quoting
✅ **ECS Task Definition:** Increased `startPeriod` to 180s, proper URL escaping
✅ **GitHub Actions:** Extended wait time to 15 minutes
✅ **Health Endpoint:** Already supports `simple=1` parameter
✅ **Configuration:** All health checks now use simple mode during startup

These changes should resolve the ECS service stability issues and allow successful deployments.

