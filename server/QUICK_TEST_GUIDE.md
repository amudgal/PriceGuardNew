# Quick Test Guide: Backend API Testing

## Current Status

✅ **IAM Permissions Fixed:** ECS tasks can now access Secrets Manager
✅ **Database Access Fixed:** RDS security group allows connections from ECS tasks
✅ **Tasks Running:** Tasks are now RUNNING (2 tasks currently)
⚠️ **SSL Certificate Issue:** Database connection failing with "self-signed certificate in certificate chain"

## How to Test the API

### Option 1: Test Health Endpoint (Expected: 503 - Database Unhealthy)

The health endpoint should work even if the database is not connected. It will return a 503 status with database status.

**Get Task Public IP:**
```bash
# Get running tasks
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

**Test Health Endpoint:**
```bash
curl http://$PUBLIC_IP:4000/health
```

**Expected Response (503 - Database Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-11-14T...",
  "service": "priceguard-server",
  "database": "disconnected",
  "error": "self-signed certificate in certificate chain"
}
```

This confirms:
- ✅ Server is running
- ✅ Health endpoint is accessible
- ⚠️ Database connection is failing (SSL certificate issue)

### Option 2: Use Automated Test Script

```bash
cd server
./test-backend.sh
```

**Note:** The script may show database connection errors, but the server itself is running.

### Option 3: Check CloudWatch Logs

```bash
# View recent logs
aws logs tail /ecs/priceguard-server --since 5m --region us-east-1 --format short

# Follow logs in real-time
aws logs tail /ecs/priceguard-server --follow --region us-east-1 --format short
```

**Look for:**
- ✅ `Server listening on port 4000` - Server is running
- ⚠️ `Failed to connect to PostgreSQL` - Database connection issue
- ⚠️ `self-signed certificate in certificate chain` - SSL certificate issue

## Current Issues

### Issue 1: SSL Certificate Error

**Error:** `self-signed certificate in certificate chain`

**Possible Causes:**
1. RDS CA certificate file doesn't exist in container
2. Certificate file path is incorrect
3. Certificate is not valid or expired
4. SSL configuration is incorrect

**Solution:**
1. Verify certificate file exists in Docker image
2. Check certificate path: `/app/rds-ca-bundle.pem`
3. Verify certificate is correctly loaded in `db.ts`
4. Check if certificate needs to be downloaded/updated

### Issue 2: Task Definition Secret ARNs

The task definition may need updated secret ARNs with random suffixes.

**Check current task definition:**
```bash
aws ecs describe-task-definition \
  --task-definition priceguard-server \
  --region us-east-1 \
  --query 'taskDefinition.containerDefinitions[0].secrets' \
  --output json
```

**Expected ARNs:**
- `arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/database-url-gVnioM`
- `arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/allowed-origins-yBKnxy`

## Next Steps

### Step 1: Fix SSL Certificate Issue

**Option A: Verify Certificate File**
```bash
# Check if certificate file exists in Docker image
# (Requires ECS Exec - need Session Manager Plugin)
```

**Option B: Update SSL Configuration**
- Verify `PGSSLROOTCERT` environment variable is set correctly
- Check if certificate file is readable
- Verify certificate format is correct

**Option C: Temporarily Disable SSL (Testing Only)**
- Change `PGSSLMODE` to `disable` in task definition
- **Note:** This is NOT recommended for production

### Step 2: Verify Database Connection

Once SSL is fixed, verify database connection:
```bash
# Check logs for successful database connection
aws logs tail /ecs/priceguard-server --since 1m --region us-east-1 | grep -i "database\|connected"
```

### Step 3: Test API Endpoints

Once database is connected:
```bash
# Test health endpoint (should return 200)
curl http://$PUBLIC_IP:4000/health

# Test login endpoint
curl -X POST http://$PUBLIC_IP:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'

# Test register endpoint
curl -X POST http://$PUBLIC_IP:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "plan": "premium"
  }'
```

## Summary

### What's Working ✅
- ECS service is ACTIVE
- Tasks are RUNNING
- Server is listening on port 4000
- Health endpoint is accessible
- IAM permissions are correct
- Database security group allows connections

### What Needs Fixing ⚠️
- SSL certificate loading/validation
- Database connection (blocked by SSL issue)

### How to Verify
1. ✅ Check service status: `./check-status.sh`
2. ✅ Test health endpoint: `curl http://$PUBLIC_IP:4000/health`
3. ✅ Check logs: `aws logs tail /ecs/priceguard-server --follow --region us-east-1`
4. ⚠️ Fix SSL certificate issue
5. ✅ Test database connection
6. ✅ Test API endpoints

## Resources

- **AWS ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server
- **Test Script:** `./test-backend.sh`
- **Status Check:** `./check-status.sh`

