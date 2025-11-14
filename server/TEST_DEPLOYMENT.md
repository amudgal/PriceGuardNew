# Testing Your ECS Deployment

## Quick Status Check

```bash
cd server
./verify-deployment.sh
```

## Step 1: Check Service Status

```bash
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1 \
  --query 'services[0].{status:status,runningCount:runningCount,desiredCount:desiredCount}' \
  --output table
```

**Expected:**
- Status: `ACTIVE`
- Running Count: `1` (or more)
- Desired Count: `1`

## Step 2: Check Running Tasks

```bash
aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1
```

**Expected:** At least 1 task ARN returned

## Step 3: Check Task Health

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
  --query 'tasks[0].{lastStatus:lastStatus,healthStatus:healthStatus,containers:containers[0].{name:name,lastStatus:lastStatus,healthStatus:healthStatus}}' \
  --output table
```

**Expected:**
- lastStatus: `RUNNING`
- healthStatus: `HEALTHY`
- container lastStatus: `RUNNING`

## Step 4: View CloudWatch Logs

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
- ✅ Health check endpoint responding

## Step 5: Test Health Endpoint

### Option A: If you have an ALB or API Gateway URL

```bash
# Replace with your actual API URL
API_URL="https://your-api-url.amazonaws.com"

curl -v $API_URL/health
```

**Expected Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-14T...",
  "service": "priceguard-server",
  "database": "connected"
}
```

### Option B: Test from ECS Task (Direct Access)

If you don't have an ALB/API Gateway yet, you can test directly from the ECS task:

```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

# Get task network details
aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks $TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text
```

Then use ECS Exec to test from inside the container:

```bash
aws ecs execute-command \
  --cluster priceguard-cluster \
  --task $TASK_ARN \
  --container priceguard-server \
  --command "wget -O- http://localhost:4000/health" \
  --interactive \
  --region us-east-1
```

## Step 6: Test Login Endpoint

### With API URL:

```bash
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tester@example.com",
    "password": "TestPass123!"
  }'
```

**Expected Responses:**
- ✅ **200 OK:** Login successful
  ```json
  {
    "id": "...",
    "email": "tester@example.com",
    "plan": "premium",
    "pastDue": false,
    "cardLast4": null
  }
  ```
- ✅ **401 Unauthorized:** Invalid credentials (expected if credentials don't match)
- ❌ **503 Service Unavailable:** Database not connected

### Test Registration:

```bash
curl -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "plan": "premium"
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": "...",
  "email": "newuser@example.com",
  "plan": "premium",
  "pastDue": false,
  "cardLast4": null
}
```

## Step 7: Automated Testing Script

Use the provided verification script:

```bash
cd server
./verify-deployment.sh https://your-api-url.amazonaws.com
```

This script checks:
- ✅ ECS service status
- ✅ Running tasks
- ✅ Task health
- ✅ CloudWatch logs
- ✅ Health endpoint
- ✅ Login endpoint

## Testing Without Public Endpoint

If you don't have an ALB or API Gateway yet, you can:

### Option 1: Use AWS Systems Manager Session Manager (ECS Exec)

```bash
# Enable ECS Exec on the service
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --enable-execute-command \
  --region us-east-1

# Wait for service to update, then execute command
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

aws ecs execute-command \
  --cluster priceguard-cluster \
  --task $TASK_ARN \
  --container priceguard-server \
  --command "wget -O- http://localhost:4000/health" \
  --interactive \
  --region us-east-1
```

### Option 2: Create a Test Script in the Container

```bash
# Execute into container
aws ecs execute-command \
  --cluster priceguard-cluster \
  --task $TASK_ARN \
  --container priceguard-server \
  --command "/bin/sh" \
  --interactive \
  --region us-east-1

# Then inside the container:
wget -O- http://localhost:4000/health
wget -O- --post-data='{"email":"tester@example.com","password":"TestPass123!"}' \
  --header="Content-Type: application/json" \
  http://localhost:4000/api/auth/login
```

### Option 3: Set Up Application Load Balancer

1. Create an ALB in your VPC
2. Create a target group pointing to your ECS service (port 4000)
3. Configure listener rules
4. Get the ALB DNS name
5. Test using the ALB URL

## Common Issues

### Tasks Not Starting

**Check:**
1. CloudWatch logs for errors
2. Task definition is valid
3. Security group allows traffic
4. Subnets are in the same VPC
5. IAM roles have proper permissions

**View logs:**
```bash
aws logs tail /ecs/priceguard-server --follow --region us-east-1
```

### Health Check Failing

**Check:**
1. Health endpoint is accessible: `wget http://localhost:4000/health`
2. Database connectivity
3. Health check configuration in task definition

### Database Connection Errors

**Check:**
1. DATABASE_URL secret is correct
2. RDS CA certificate is in container
3. Security group allows outbound to RDS (port 5432)
4. RDS endpoint is accessible

**Verify secret:**
```bash
aws secretsmanager get-secret-value \
  --secret-id priceguard/database-url \
  --region us-east-1 \
  --query 'SecretString' \
  --output text | sed 's/:[^@]*@/:***@/'
```

## Quick Test Commands

```bash
# 1. Check service status
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1 \
  --query 'services[0].{status:status,runningCount:runningCount}' \
  --output table

# 2. View recent logs
aws logs tail /ecs/priceguard-server --since 5m --region us-east-1

# 3. Test health (if you have API URL)
curl https://your-api-url/health

# 4. Test login (if you have API URL)
curl -X POST https://your-api-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

## Success Criteria

Your deployment is working when:

1. ✅ ECS service status = `ACTIVE`
2. ✅ Running tasks = Desired count (1)
3. ✅ Task health status = `HEALTHY`
4. ✅ CloudWatch logs show "Server listening on port 4000"
5. ✅ Health endpoint returns 200 OK
6. ✅ Login endpoint responds (200 or 401)
7. ✅ No database connection errors in logs

## Next Steps

After successful testing:

1. ✅ Set up Application Load Balancer (if not done)
2. ✅ Configure custom domain for API
3. ✅ Update Netlify environment variable with API URL
4. ✅ Test from frontend
5. ✅ Set up monitoring and alerts

## Resources

- **AWS ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server
- **ECR Repository:** https://console.aws.amazon.com/ecr/repositories/private/us-east-1/priceguard-server

