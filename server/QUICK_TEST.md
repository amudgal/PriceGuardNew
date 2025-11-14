# Quick Test Guide

## Current Status

✅ **Service Updated:** Public IP enabled for Secrets Manager access
⏳ **Tasks Starting:** New deployment in progress

## How to Test

### Step 1: Wait for Tasks to Start

Tasks need 2-5 minutes to:
1. Pull image from ECR
2. Retrieve secrets from Secrets Manager
3. Start the application
4. Pass health checks

**Check status:**
```bash
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1 \
  --query 'services[0].{runningCount:runningCount,desiredCount:desiredCount}' \
  --output table
```

**Wait until:** `runningCount` = `desiredCount` (1)

### Step 2: Check CloudWatch Logs

```bash
aws logs tail /ecs/priceguard-server \
  --follow \
  --region us-east-1 \
  --format short
```

**Look for:**
- ✅ `Server listening on port 4000`
- ✅ No database connection errors
- ✅ No Secrets Manager errors

### Step 3: Test from Inside Container (If No Public Endpoint)

If you don't have an ALB/API Gateway yet, test directly from the container:

```bash
# Get running task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

# Enable ECS Exec (one-time setup)
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --enable-execute-command \
  --region us-east-1

# Wait for service to update, then test
aws ecs execute-command \
  --cluster priceguard-cluster \
  --task $TASK_ARN \
  --container priceguard-server \
  --command "wget -O- http://localhost:4000/health" \
  --interactive \
  --region us-east-1
```

### Step 4: Test with Public Endpoint (If You Have ALB/API Gateway)

```bash
# Replace with your actual API URL
API_URL="https://your-api-url.amazonaws.com"

# Test health
curl $API_URL/health

# Test login
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

Or use the test script:
```bash
cd server
./test-api.sh https://your-api-url.amazonaws.com
```

## Quick Status Check

```bash
cd server
./verify-deployment.sh
```

## What to Expect

### Successful Deployment:
- ✅ Service status: `ACTIVE`
- ✅ Running tasks: `1`
- ✅ Task health: `HEALTHY`
- ✅ Logs show: `Server listening on port 4000`
- ✅ Health endpoint returns: `200 OK`

### If Tasks Are Still Starting:
- ⏳ Wait 2-5 minutes
- ⏳ Check CloudWatch logs for progress
- ⏳ Verify no errors in service events

## Troubleshooting

### Tasks Keep Failing

1. **Check service events:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1 \
     --query 'services[0].events[0:5]' \
     --output table
   ```

2. **Check CloudWatch logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```

3. **Check task details:**
   ```bash
   TASK_ARN=$(aws ecs list-tasks \
     --cluster priceguard-cluster \
     --service-name priceguard-server \
     --region us-east-1 \
     --query 'taskArns[0]' \
     --output text)
   
   aws ecs describe-tasks \
     --cluster priceguard-cluster \
     --tasks $TASK_ARN \
     --region us-east-1 \
     --query 'tasks[0].{lastStatus:lastStatus,stoppedReason:stoppedReason,containers:containers[0].{reason:reason,exitCode:exitCode}}' \
     --output json
   ```

## Next Steps After Testing

1. ✅ Verify service is running
2. ✅ Test health endpoint
3. ✅ Test login/register endpoints
4. ✅ Set up Application Load Balancer (if needed)
5. ✅ Configure custom domain (if needed)
6. ✅ Update Netlify with API URL
7. ✅ Test from frontend

## Resources

- **AWS ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server

