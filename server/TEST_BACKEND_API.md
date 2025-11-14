# How to Test Your Backend API

This guide covers multiple ways to test your backend API running on AWS ECS.

## Quick Test Script

The easiest way to test everything at once:

```bash
cd server
./test-backend.sh
```

This script automatically:
1. ✅ Checks if ECS service is running
2. ✅ Verifies task health
3. ✅ Checks CloudWatch logs
4. ✅ Gets task public IP
5. ✅ Tests health endpoint
6. ✅ Tests login endpoint

## Manual Testing Steps

### Step 1: Check Service Status

```bash
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1 \
  --query 'services[0].{runningCount:runningCount,desiredCount:desiredCount,status:status}' \
  --output table
```

**Expected:** `runningCount` should equal `desiredCount` (1)

### Step 2: Check CloudWatch Logs

```bash
# View recent logs
aws logs tail /ecs/priceguard-server \
  --since 5m \
  --region us-east-1 \
  --format short

# Follow logs in real-time
aws logs tail /ecs/priceguard-server \
  --follow \
  --region us-east-1 \
  --format short
```

**Look for:**
- ✅ `Server listening on port 4000`
- ✅ No database connection errors
- ✅ No Secrets Manager errors

### Step 3: Get Task Public IP

```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

# Get network interface
NETWORK_INTERFACE=$(aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks $TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

# Get public IP
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $NETWORK_INTERFACE \
  --region us-east-1 \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo "Public IP: $PUBLIC_IP"
```

### Step 4: Configure Security Group (One-time)

Allow inbound traffic on port 4000 from your IP:

```bash
# Get your IP
MY_IP=$(curl -s https://api.ipify.org)
echo "Your IP: $MY_IP"

# Add security group rule
aws ec2 authorize-security-group-ingress \
  --group-id sg-0d20af83680061442 \
  --protocol tcp \
  --port 4000 \
  --cidr $MY_IP/32 \
  --region us-east-1
```

### Step 5: Test API Endpoints

#### Test 1: Health Endpoint

```bash
curl http://$PUBLIC_IP:4000/health
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

#### Test 2: Login Endpoint (Success)

```bash
curl -X POST http://$PUBLIC_IP:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

**Expected Response (200 OK):**
```json
{
  "id": "uuid-here",
  "email": "tester@example.com",
  "plan": "premium",
  "pastDue": false,
  "cardLast4": null
}
```

**Expected Response (401 Unauthorized) if credentials don't match:**
```json
{
  "error": "Invalid email or password"
}
```

#### Test 3: Register Endpoint

```bash
curl -X POST http://$PUBLIC_IP:4000/api/auth/register \
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
  "id": "uuid-here",
  "email": "newuser@example.com",
  "plan": "premium",
  "pastDue": false,
  "cardLast4": null
}
```

#### Test 4: Login with New Account

```bash
curl -X POST http://$PUBLIC_IP:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"SecurePass123!"}'
```

## Alternative: Test from Inside Container

If you don't have public IP or security group access, test from inside the container:

### Enable ECS Exec (One-time)

```bash
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --enable-execute-command \
  --region us-east-1
```

Wait 1-2 minutes for service to update.

### Test Health Endpoint

```bash
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

### Test Login Endpoint

```bash
aws ecs execute-command \
  --cluster priceguard-cluster \
  --task $TASK_ARN \
  --container priceguard-server \
  --command "wget -O- --post-data='{\"email\":\"tester@example.com\",\"password\":\"TestPass123!\"}' --header='Content-Type: application/json' http://localhost:4000/api/auth/login" \
  --interactive \
  --region us-east-1
```

## Testing with Test Account

Use these credentials for testing:

- **Email:** `tester@example.com`
- **Password:** `TestPass123!`

If the account doesn't exist, create it first using the register endpoint.

## Complete Test Script

Save this as `quick-test.sh`:

```bash
#!/bin/bash
set -e

# Get task public IP
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

PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $NETWORK_INTERFACE \
  --region us-east-1 \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo "Testing API at: http://$PUBLIC_IP:4000"
echo ""

# Test health
echo "1. Testing /health..."
curl -s http://$PUBLIC_IP:4000/health | jq .
echo ""

# Test login
echo "2. Testing /api/auth/login..."
curl -s -X POST http://$PUBLIC_IP:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}' | jq .
echo ""
```

Run it:
```bash
chmod +x quick-test.sh
./quick-test.sh
```

## Troubleshooting

### Tasks Not Starting

1. **Check service events:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1 \
     --query 'services[0].events[0:5]' \
     --output table
   ```

2. **Check CloudWatch logs for errors:**
   ```bash
   aws logs tail /ecs/priceguard-server --since 10m --region us-east-1 | grep -i error
   ```

### Can't Connect to API

1. **Check security group rules:**
   ```bash
   aws ec2 describe-security-groups \
     --group-ids sg-0d20af83680061442 \
     --region us-east-1 \
     --query 'SecurityGroups[0].IpPermissions[?FromPort==`4000`]' \
     --output table
   ```

2. **Verify task has public IP:**
   ```bash
   aws ecs describe-tasks \
     --cluster priceguard-cluster \
     --tasks $TASK_ARN \
     --region us-east-1 \
     --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
     --output text
   ```

### API Returns Errors

1. **Check application logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```

2. **Verify environment variables:**
   - Check Secrets Manager for `DATABASE_URL` and `ALLOWED_ORIGINS`
   - Verify task definition has correct secret ARNs

## Expected API Responses

### Health Endpoint
- **URL:** `GET /health`
- **Success:** 200 OK with database connection status
- **Failure:** 503 Service Unavailable if database is down

### Login Endpoint
- **URL:** `POST /api/auth/login`
- **Body:** `{"email": "...", "password": "..."}`
- **Success:** 200 OK with user data
- **Failure:** 401 Unauthorized for invalid credentials
- **Failure:** 503 Service Unavailable if database is down

### Register Endpoint
- **URL:** `POST /api/auth/register`
- **Body:** `{"email": "...", "password": "...", "plan": "premium"}`
- **Success:** 201 Created with user data
- **Failure:** 400 Bad Request for validation errors
- **Failure:** 409 Conflict if email already exists
- **Failure:** 503 Service Unavailable if database is down

## Next Steps

After successful API testing:

1. ✅ Set up Application Load Balancer
2. ✅ Configure custom domain
3. ✅ Update Netlify environment variable `VITE_API_URL`
4. ✅ Test from frontend
5. ✅ Set up monitoring and alarms

## Resources

- **AWS ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server
- **Test Script:** `./test-backend.sh`
- **Status Check:** `./check-status.sh`

