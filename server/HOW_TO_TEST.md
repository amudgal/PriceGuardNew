# How to Test Your Deployed Backend

## Current Status

✅ **Code pushed to ECR:** Docker image is in ECR
✅ **Service updated:** Public IP enabled for Secrets Manager access
⏳ **Tasks starting:** New tasks are being deployed

## Testing Steps

### Step 1: Wait for Tasks to Start (2-5 minutes)

Tasks need time to:
1. Pull image from ECR
2. Retrieve secrets from Secrets Manager  
3. Start the application
4. Pass health checks

**Check status:**
```bash
cd server
./check-status.sh
```

**Or manually:**
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

### Step 3: Test the API

#### Option A: If You Have an ALB/API Gateway URL

```bash
# Replace with your actual API URL
API_URL="https://your-api-url.amazonaws.com"

# Test health endpoint
curl $API_URL/health

# Test login endpoint
curl -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

**Or use the test script:**
```bash
cd server
./test-api.sh https://your-api-url.amazonaws.com
```

#### Option B: Test from Inside Container (No Public Endpoint Yet)

If you don't have an ALB/API Gateway, test directly from the container:

**1. Enable ECS Exec (one-time):**
```bash
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --enable-execute-command \
  --region us-east-1
```

**2. Wait for service to update (1-2 minutes)**

**3. Get task ARN:**
```bash
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

echo "Task ARN: $TASK_ARN"
```

**4. Test health endpoint:**
```bash
aws ecs execute-command \
  --cluster priceguard-cluster \
  --task $TASK_ARN \
  --container priceguard-server \
  --command "wget -O- http://localhost:4000/health" \
  --interactive \
  --region us-east-1
```

**5. Test login endpoint:**
```bash
aws ecs execute-command \
  --cluster priceguard-cluster \
  --task $TASK_ARN \
  --container priceguard-server \
  --command "wget -O- --post-data='{\"email\":\"tester@example.com\",\"password\":\"TestPass123!\"}' --header='Content-Type: application/json' http://localhost:4000/api/auth/login" \
  --interactive \
  --region us-east-1
```

#### Option C: Get Task IP and Test Directly

**1. Get task network interface:**
```bash
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

NETWORK_INTERFACE=$(aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks $TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

echo "Network Interface: $NETWORK_INTERFACE"
```

**2. Get public IP:**
```bash
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $NETWORK_INTERFACE \
  --region us-east-1 \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo "Public IP: $PUBLIC_IP"
```

**3. Test health endpoint:**
```bash
curl http://$PUBLIC_IP:4000/health
```

**Note:** Make sure your security group allows inbound traffic on port 4000 from your IP!

**4. Test login endpoint:**
```bash
curl -X POST http://$PUBLIC_IP:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

### Step 4: Update Security Group (If Testing from Public IP)

If testing from your local machine using the task's public IP:

```bash
# Get your current IP
MY_IP=$(curl -s https://api.ipify.org)
echo "Your IP: $MY_IP"

# Add inbound rule to security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-0d20af83680061442 \
  --protocol tcp \
  --port 4000 \
  --cidr $MY_IP/32 \
  --region us-east-1
```

## Expected Test Results

### Health Endpoint (`/health`)

**Success (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-14T...",
  "service": "priceguard-server",
  "database": "connected"
}
```

### Login Endpoint (`/api/auth/login`)

**Success (200 OK):**
```json
{
  "id": "...",
  "email": "tester@example.com",
  "plan": "premium",
  "pastDue": false,
  "cardLast4": null
}
```

**Unauthorized (401):**
```json
{
  "error": "Invalid email or password"
}
```

### Register Endpoint (`/api/auth/register`)

**Success (201 Created):**
```json
{
  "id": "...",
  "email": "newuser@example.com",
  "plan": "premium",
  "pastDue": false,
  "cardLast4": null
}
```

## Quick Test Commands

```bash
# 1. Check service status
cd server
./check-status.sh

# 2. View logs
aws logs tail /ecs/priceguard-server --follow --region us-east-1

# 3. Test health (if you have API URL)
curl https://your-api-url/health

# 4. Test login (if you have API URL)
curl -X POST https://your-api-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

## Troubleshooting

### Tasks Not Starting

1. **Check service events:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1 \
     --query 'services[0].events[0:3]' \
     --output table
   ```

2. **Check CloudWatch logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```

### Can't Connect to API

1. **Check security group rules:**
   - Allow inbound on port 4000 from your IP
   - Allow outbound HTTPS (443) for Secrets Manager
   - Allow outbound PostgreSQL (5432) for RDS

2. **Check if task has public IP:**
   ```bash
   aws ecs describe-tasks \
     --cluster priceguard-cluster \
     --tasks $TASK_ARN \
     --region us-east-1 \
     --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
     --output text
   ```

## Next Steps

After successful testing:

1. ✅ Set up Application Load Balancer
2. ✅ Configure custom domain
3. ✅ Update Netlify environment variable
4. ✅ Test from frontend
5. ✅ Set up monitoring

## Resources

- **AWS ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server

