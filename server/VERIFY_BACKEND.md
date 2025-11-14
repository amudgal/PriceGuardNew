# How to Verify Backend is Working in AWS

## Quick Verification Steps

### 1. Check ECS Service Status

```bash
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1 \
  --query 'services[0].{status:status,runningCount:runningCount,desiredCount:desiredCount}' \
  --output table
```

**Expected:** Status = `ACTIVE`, runningCount = desiredCount

### 2. Check Running Tasks

```bash
aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1
```

**Expected:** At least 1 task ARN returned

### 3. Check Task Health

```bash
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks $TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].{lastStatus:lastStatus,healthStatus:healthStatus,containers:containers[0].{name:name,lastStatus:lasters[0].lastStatus}}' \
  --output table
```

**Expected:** 
- lastStatus = `RUNNING`
- healthStatus = `HEALTHY`
- container lastStatus = `RUNNING`

### 4. View CloudWatch Logs

```bash
aws logs tail /ecs/priceguard-server \
  --follow \
  --region us-east-1 \
  --format short
```

**Look for:**
- ✅ `Server listening on port 4000`
- ✅ No database connection errors
- ✅ No CORS errors

### 5. Test Health Endpoint

If you have an ALB or API Gateway URL:

```bash
# Replace with your actual API URL
API_URL="https://your-api-url.amazonaws.com"

curl -v $API_URL/health
```

**Expected Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "priceguard-server",
  "database": "connected"
}
```

### 6. Test Login Endpoint

```bash
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

**Expected Responses:**
- ✅ **200 OK:** Login successful (returns user data)
- ✅ **401 Unauthorized:** Invalid credentials (expected if credentials don't match)
- ❌ **503 Service Unavailable:** Database not connected
- ❌ **CORS Error:** Check ALLOWED_ORIGINS secret

### 7. Automated Verification Script

Use the provided verification script:

```bash
cd server
chmod +x verify-deployment.sh
./verify-deployment.sh https://your-api-url.amazonaws.com
```

This script checks:
- ✅ ECS service status
- ✅ Running tasks
- ✅ Task health
- ✅ CloudWatch logs
- ✅ Health endpoint
- ✅ Login endpoint

## Common Issues and Solutions

### Issue: Service Won't Start

**Symptoms:**
- Service status = `INACTIVE`
- No running tasks
- Tasks keep restarting

**Check:**
1. CloudWatch logs for errors
2. Task definition (CPU/memory)
3. Secrets Manager (DATABASE_URL, ALLOWED_ORIGINS)
4. Security group rules
5. IAM roles (ecsTaskExecutionRole, ecsTaskRole)

**Solution:**
```bash
# Check recent task failures
aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status STOPPED \
  --region us-east-1

# Get stopped task details
aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks <TASK_ARN> \
  --region us-east-1 \
  --query 'tasks[0].{stoppedReason:stoppedReason,containers:containers[0].{reason:reason}}'
```

### Issue: Health Check Failing

**Symptoms:**
- Task healthStatus = `UNHEALTHY`
- Health endpoint returns 503

**Check:**
1. Database connectivity
2. RDS CA certificate path
3. Security group rules (outbound to RDS)
4. DATABASE_URL secret format

**Solution:**
```bash
# Check health check logs
aws logs filter-log-events \
  --log-group-name /ecs/priceguard-server \
  --filter-pattern "health" \
  --region us-east-1

# Test database connectivity from ECS task
# (Requires ECS Exec)
aws ecs execute-command \
  --cluster priceguard-cluster \
  --task <TASK_ARN> \
  --container priceguard-server \
  --command "wget -O- http://localhost:4000/health" \
  --interactive \
  --region us-east-1
```

### Issue: CORS Errors

**Symptoms:**
- Frontend gets CORS error
- Browser console shows CORS policy error

**Check:**
1. ALLOWED_ORIGINS secret in Secrets Manager
2. Netlify domain matches exactly (including https://)
3. CORS configuration in index.ts

**Solution:**
```bash
# Verify ALLOWED_ORIGINS secret
aws secretsmanager get-secret-value \
  --secret-id priceguard/allowed-origins \
  --region us-east-1 \
  --query 'SecretString' \
  --output text

# Update if needed (replace with your actual Netlify domain)
aws secretsmanager update-secret \
  --secret-id priceguard/allowed-origins \
  --secret-string "https://your-site.netlify.app" \
  --region us-east-1
```

### Issue: Database Connection Failed

**Symptoms:**
- Health endpoint returns 503
- Logs show database connection errors
- "self-signed certificate" errors

**Check:**
1. DATABASE_URL secret format
2. RDS CA certificate in container
3. Security group rules
4. RDS endpoint accessibility

**Solution:**
```bash
# Verify DATABASE_URL secret (mask password)
aws secretsmanager get-secret-value \
  --secret-id priceguard/database-url \
  --region us-east-1 \
  --query 'SecretString' \
  --output text | sed 's/:[^@]*@/:***@/'

# Check security group rules
aws ec2 describe-security-groups \
  --group-ids sg-0d20af83680061442 \
  --region us-east-1 \
  --query 'SecurityGroups[0].IpPermissionsEgress'
```

## Monitoring Dashboard

### AWS Console Links

- **ECS Service:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server
- **CloudWatch Metrics:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2:graph=~();query=AWS/ECS
- **ECS Tasks:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/tasks
- **Secrets Manager:** https://console.aws.amazon.com/secretsmanager/home?region=us-east-1#/listSecrets

### Key Metrics to Monitor

1. **CPU Utilization** - Should be < 80%
2. **Memory Utilization** - Should be < 80%
3. **Task Count** - Should match desired count
4. **Health Check Status** - Should be HEALTHY
5. **HTTP 5xx Errors** - Should be 0
6. **Database Connection Errors** - Should be 0

## Success Criteria

Your backend is working correctly when:

1. ✅ ECS service status = `ACTIVE`
2. ✅ At least 1 task is running
3. ✅ Task healthStatus = `HEALTHY`
4. ✅ Health endpoint returns 200 OK
5. ✅ Login endpoint responds (200 or 401)
6. ✅ CloudWatch logs show "Server listening on port 4000"
7. ✅ No database connection errors
8. ✅ No CORS errors from Netlify frontend
9. ✅ Frontend can successfully call API endpoints

## Next Steps After Verification

1. ✅ Set up Application Load Balancer (if not done)
2. ✅ Configure custom domain for API
3. ✅ Set up CloudWatch alarms
4. ✅ Configure auto-scaling
5. ✅ Set up monitoring dashboards
6. ✅ Update Netlify environment variable with API URL

