# Monitor ECS Deployment

## 🚀 Deployment Status

The GitHub Actions workflow has been triggered and is now deploying to AWS ECS.

## 📊 Monitor Deployment

### 1. GitHub Actions (Real-time)

**Link:** https://github.com/amudgal/PriceGuard/actions

**What to check:**
- ✅ Workflow is running
- ✅ All steps are passing
- ✅ No errors in logs
- ✅ Deployment completes successfully

### 2. AWS ECS Console

**Link:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server

**What to check:**
- ✅ Service status is `ACTIVE`
- ✅ Running tasks count = Desired count (1)
- ✅ Task status is `RUNNING`
- ✅ Health status is `HEALTHY`

### 3. CloudWatch Logs

**Link:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server

**What to check:**
- ✅ Logs are being generated
- ✅ No errors in logs
- ✅ "Server listening on port 4000" message
- ✅ No database connection errors

## ⏳ Deployment Timeline

1. **0-2 minutes:** GitHub Actions builds Docker image
2. **2-3 minutes:** Image pushed to ECR
3. **3-4 minutes:** ECS task definition registered
4. **4-5 minutes:** ECS service created/updated
5. **5-10 minutes:** Tasks start and stabilize
6. **10+ minutes:** Service is running and healthy

## 🔍 Verify Deployment

### Step 1: Check GitHub Actions

```bash
# View workflow runs
open "https://github.com/amudgal/PriceGuard/actions"
```

**Look for:**
- Green checkmark (✅) = Success
- Yellow circle (⏳) = In progress
- Red X (❌) = Failed

### Step 2: Check ECS Service

```bash
# Check service status
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1 \
  --query 'services[0].{status:status,runningCount:runningCount,desiredCount:desiredCount}' \
  --output table
```

**Expected output:**
```
| status | runningCount | desiredCount |
|--------|--------------|--------------|
| ACTIVE | 1            | 1            |
```

### Step 3: Check Running Tasks

```bash
# List running tasks
aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1
```

**Expected:** At least 1 task ARN returned

### Step 4: Check Task Health

```bash
# Get task details
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
  --query 'tasks[0].{lastStatus:lastStatus,healthStatus:healthStatus}' \
  --output table
```

**Expected output:**
```
| healthStatus | lastStatus |
|--------------|------------|
| HEALTHY      | RUNNING    |
```

### Step 5: Check CloudWatch Logs

```bash
# View recent logs
aws logs tail /ecs/priceguard-server \
  --since 10m \
  --region us-east-1 \
  --format short
```

**Look for:**
- ✅ "Server listening on port 4000"
- ✅ No database connection errors
- ✅ No CORS errors
- ✅ Health check endpoint responding

## 🧪 Test Deployment

Once the service is running, test it:

### Test Health Endpoint

```bash
# Get service endpoint (if using ALB or API Gateway)
# Replace with your actual endpoint
API_URL="https://your-api-url.amazonaws.com"

curl https://your-api-url/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-14T...",
  "service": "priceguard-server",
  "database": "connected"
}
```

### Test Login Endpoint

```bash
curl -X POST https://your-api-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

**Expected responses:**
- ✅ **200 OK:** Login successful
- ✅ **401 Unauthorized:** Invalid credentials (expected if credentials don't match)
- ❌ **503 Service Unavailable:** Service not running or database not connected

## 🚨 Troubleshooting

### GitHub Actions Fails

**Check:**
1. GitHub Secrets are configured correctly
2. AWS credentials have proper permissions
3. ECR repository exists
4. ECS cluster exists
5. Security group and subnets are correct

**View logs:**
- Go to GitHub Actions → Click on failed workflow → View logs

### ECS Service Won't Start

**Check:**
1. Task definition is valid
2. Security group allows traffic
3. Subnets are in the same VPC
4. IAM roles have proper permissions
5. Secrets Manager secrets exist

**View logs:**
```bash
aws logs tail /ecs/priceguard-server --follow --region us-east-1
```

### Tasks Keep Failing

**Check:**
1. CloudWatch logs for errors
2. Task definition configuration
3. Database connectivity
4. Environment variables
5. Health check configuration

**Get task details:**
```bash
aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks <TASK_ARN> \
  --region us-east-1
```

### Database Connection Errors

**Check:**
1. DATABASE_URL secret is correct
2. RDS CA certificate is in container
3. Security group allows outbound to RDS
4. RDS endpoint is accessible

**Verify secret:**
```bash
aws secretsmanager get-secret-value \
  --secret-id priceguard/database-url \
  --region us-east-1 \
  --query 'SecretString' \
  --output text
```

## ✅ Success Criteria

Your deployment is successful when:

1. ✅ GitHub Actions workflow completes successfully
2. ✅ ECS service status is `ACTIVE`
3. ✅ Running tasks = Desired count (1)
4. ✅ Task health status is `HEALTHY`
5. ✅ CloudWatch logs show "Server listening on port 4000"
6. ✅ Health endpoint returns 200 OK
7. ✅ Login endpoint responds (200 or 401)

## 📊 Quick Status Check

Run this script to check deployment status:

```bash
cd server
./verify-deployment.sh
```

Or check manually:

```bash
# Service status
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1 \
  --query 'services[0].status' \
  --output text

# Running tasks
aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --region us-east-1 \
  --query 'length(taskArns)' \
  --output text
```

## 🔗 Useful Links

- **GitHub Actions:** https://github.com/amudgal/PriceGuard/actions
- **AWS ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
- **ECR Repository:** https://console.aws.amazon.com/ecr/repositories/private/us-east-1/priceguard-server
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server
- **CloudWatch Alarms:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:

## 📝 Next Steps

After deployment is successful:

1. ✅ Verify service is running
2. ✅ Test health endpoint
3. ✅ Test login endpoint
4. ✅ Set up Application Load Balancer (if needed)
5. ✅ Configure custom domain (if needed)
6. ✅ Update Netlify environment variable with API URL
7. ✅ Set up CloudWatch alarms (if not done)
8. ✅ Monitor service metrics

