#!/bin/bash
# Comprehensive script to test if the backend API is running correctly

set -e

AWS_REGION="us-east-1"
ECS_CLUSTER_NAME="priceguard-cluster"
ECS_SERVICE_NAME="priceguard-server"

echo "🧪 Testing Backend API..."
echo ""

# 1. Check if service is running
echo "1️⃣  Checking ECS Service Status..."
SERVICE_STATUS=$(aws ecs describe-services \
  --cluster $ECS_CLUSTER_NAME \
  --services $ECS_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].{status:status,runningCount:runningCount,desiredCount:desiredCount}' \
  --output json)

RUNNING_COUNT=$(echo "$SERVICE_STATUS" | jq -r '.runningCount')
DESIRED_COUNT=$(echo "$SERVICE_STATUS" | jq -r '.desiredCount')
STATUS=$(echo "$SERVICE_STATUS" | jq -r '.status')

echo "   Status: $STATUS"
echo "   Running Tasks: $RUNNING_COUNT / $DESIRED_COUNT"
echo ""

if [ "$RUNNING_COUNT" -eq "0" ]; then
  echo "❌ No tasks are running. Service may be starting or failed."
  echo "   Check CloudWatch logs for details."
  echo ""
  echo "   View logs: aws logs tail /ecs/priceguard-server --follow --region $AWS_REGION"
  exit 1
fi

# 2. Get running task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster $ECS_CLUSTER_NAME \
  --service-name $ECS_SERVICE_NAME \
  --desired-status RUNNING \
  --region $AWS_REGION \
  --query 'taskArns[0]' \
  --output text)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" == "None" ]; then
  echo "❌ No running tasks found"
  exit 1
fi

echo "✅ Task is running: $TASK_ARN"
echo ""

# 3. Check task health
echo "2️⃣  Checking Task Health..."
TASK_HEALTH=$(aws ecs describe-tasks \
  --cluster $ECS_CLUSTER_NAME \
  --tasks $TASK_ARN \
  --region $AWS_REGION \
  --query 'tasks[0].{lastStatus:lastStatus,healthStatus:healthStatus}' \
  --output json)

LAST_STATUS=$(echo "$TASK_HEALTH" | jq -r '.lastStatus')
HEALTH_STATUS=$(echo "$TASK_HEALTH" | jq -r '.healthStatus')

echo "   Last Status: $LAST_STATUS"
echo "   Health Status: $HEALTH_STATUS"
echo ""

if [ "$LAST_STATUS" != "RUNNING" ]; then
  echo "⚠️  Task is not running yet. Status: $LAST_STATUS"
  echo "   Wait a few minutes and try again."
  exit 1
fi

# 4. Check CloudWatch logs
echo "3️⃣  Checking Recent Logs..."
RECENT_LOGS=$(aws logs tail /ecs/priceguard-server \
  --since 2m \
  --region $AWS_REGION \
  --format short \
  --max-items 10 2>/dev/null || echo "No logs found")

if echo "$RECENT_LOGS" | grep -q "Server listening on port 4000"; then
  echo "✅ Server is listening on port 4000"
else
  echo "⚠️  'Server listening on port 4000' not found in recent logs"
fi

if echo "$RECENT_LOGS" | grep -q -i "error\|failed\|exception"; then
  echo "⚠️  Errors found in logs:"
  echo "$RECENT_LOGS" | grep -i "error\|failed\|exception" | head -3
else
  echo "✅ No errors found in recent logs"
fi
echo ""

# 5. Get task network details
echo "4️⃣  Getting Task Network Information..."
NETWORK_INTERFACE=$(aws ecs describe-tasks \
  --cluster $ECS_CLUSTER_NAME \
  --tasks $TASK_ARN \
  --region $AWS_REGION \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

if [ -n "$NETWORK_INTERFACE" ] && [ "$NETWORK_INTERFACE" != "None" ]; then
  PUBLIC_IP=$(aws ec2 describe-network-interfaces \
    --network-interface-ids $NETWORK_INTERFACE \
    --region $AWS_REGION \
    --query 'NetworkInterfaces[0].Association.PublicIp' \
    --output text 2>/dev/null || echo "None")
  
  if [ "$PUBLIC_IP" != "None" ] && [ -n "$PUBLIC_IP" ]; then
    echo "   Public IP: $PUBLIC_IP"
    echo "   Port: 4000"
    echo ""
    
    # Check if security group allows inbound on port 4000
    MY_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "unknown")
    echo "   Your IP: $MY_IP"
    echo ""
    
    # 6. Test health endpoint
    echo "5️⃣  Testing Health Endpoint..."
    echo "   Testing: http://$PUBLIC_IP:4000/health"
    
    # Check security group rule
    SG_RULE_EXISTS=$(aws ec2 describe-security-groups \
      --group-ids sg-0d20af83680061442 \
      --region $AWS_REGION \
      --query "SecurityGroups[0].IpPermissions[?FromPort==\`4000\` && ToPort==\`4000\`]" \
      --output json 2>/dev/null | jq 'length' || echo "0")
    
    if [ "$SG_RULE_EXISTS" == "0" ]; then
      echo "   ⚠️  Security group doesn't allow inbound on port 4000"
      echo "   Adding rule for your IP..."
      aws ec2 authorize-security-group-ingress \
        --group-id sg-0d20af83680061442 \
        --protocol tcp \
        --port 4000 \
        --cidr $MY_IP/32 \
        --region $AWS_REGION 2>/dev/null && echo "   ✅ Rule added" || echo "   ⚠️  Failed to add rule (may already exist)"
    fi
    
    sleep 2
    
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" --connect-timeout 5 "http://$PUBLIC_IP:4000/health" 2>/dev/null || echo -e "\n000")
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
    BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" == "200" ]; then
      echo "   ✅ Health Check: PASSED"
      echo "   Response: $BODY" | jq . 2>/dev/null || echo "   Response: $BODY"
    else
      echo "   ❌ Health Check: FAILED (HTTP $HTTP_CODE)"
      echo "   Response: $BODY"
      echo "   Note: If you see connection refused, check security group rules"
    fi
    echo ""
    
    # 7. Test login endpoint
    echo "6️⃣  Testing Login Endpoint..."
    echo "   Testing: http://$PUBLIC_IP:4000/api/auth/login"
    
    LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" --connect-timeout 5 \
      -X POST "http://$PUBLIC_IP:4000/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"tester@example.com","password":"TestPass123!"}' \
      2>/dev/null || echo -e "\n000")
    
    HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
    BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" == "200" ]; then
      echo "   ✅ Login: SUCCESS"
      echo "   Response: $BODY" | jq . 2>/dev/null || echo "   Response: $BODY"
    elif [ "$HTTP_CODE" == "401" ]; then
      echo "   ⚠️  Login: UNAUTHORIZED (401)"
      echo "   This is expected if credentials don't match or account doesn't exist"
      echo "   Response: $BODY"
    else
      echo "   ❌ Login: FAILED (HTTP $HTTP_CODE)"
      echo "   Response: $BODY"
    fi
    echo ""
    
    # Summary
    echo "📊 Summary:"
    echo "   ✅ Service: $STATUS"
    echo "   ✅ Running Tasks: $RUNNING_COUNT"
    echo "   ✅ Task Status: $LAST_STATUS"
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "401" ]; then
      echo "   ✅ API Endpoint: Accessible"
    else
      echo "   ⚠️  API Endpoint: May not be accessible (check security group)"
    fi
    echo ""
    echo "🌐 Test URLs:"
    echo "   Health: http://$PUBLIC_IP:4000/health"
    echo "   Login:  http://$PUBLIC_IP:4000/api/auth/login"
    echo ""
  else
    echo "   ⚠️  No public IP assigned to task"
    echo "   Tasks may not have public IP or are still starting"
    echo ""
    echo "   Alternative: Use ECS Exec to test from inside container"
    echo ""
    echo "   aws ecs execute-command \\"
    echo "     --cluster $ECS_CLUSTER_NAME \\"
    echo "     --task $TASK_ARN \\"
    echo "     --container priceguard-server \\"
    echo "     --command \"wget -O- http://localhost:4000/health\" \\"
    echo "     --interactive \\"
    echo "     --region $AWS_REGION"
  fi
else
  echo "   ⚠️  Network interface not found"
fi

echo ""
echo "📊 View in AWS Console:"
echo "   Service: https://console.aws.amazon.com/ecs/v2/clusters/$ECS_CLUSTER_NAME/services/$ECS_SERVICE_NAME"
echo "   Logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server"

