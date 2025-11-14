#!/bin/bash
# Script to verify backend deployment on AWS

set -e

# Configuration
AWS_REGION="us-east-1"
ECS_CLUSTER_NAME="priceguard-cluster"
ECS_SERVICE_NAME="priceguard-server"
API_URL="${1:-}"  # Pass API URL as first argument, or set via environment

echo "🔍 Verifying backend deployment..."

# 1. Check ECS Service Status
echo ""
echo "📊 Checking ECS Service Status..."
SERVICE_STATUS=$(aws ecs describe-services \
  --cluster $ECS_CLUSTER_NAME \
  --services $ECS_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].status' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$SERVICE_STATUS" == "NOT_FOUND" ] || [ "$SERVICE_STATUS" == "None" ]; then
  echo "❌ ECS service not found. Please deploy first using ./deploy.sh"
  exit 1
fi

echo "✅ Service Status: $SERVICE_STATUS"

# 2. Check Running Tasks
echo ""
echo "📦 Checking Running Tasks..."
RUNNING_TASKS=$(aws ecs list-tasks \
  --cluster $ECS_CLUSTER_NAME \
  --service-name $ECS_SERVICE_NAME \
  --desired-status RUNNING \
  --region $AWS_REGION \
  --query 'taskArns | length(@)' \
  --output text)

echo "✅ Running Tasks: $RUNNING_TASKS"

if [ "$RUNNING_TASKS" -eq "0" ]; then
  echo "⚠️  No running tasks found. Service may be deploying or failed."
  echo "Check CloudWatch logs for details."
  exit 1
fi

# 3. Get Task Details
echo ""
echo "🔍 Getting Task Details..."
TASK_ARN=$(aws ecs list-tasks \
  --cluster $ECS_CLUSTER_NAME \
  --service-name $ECS_SERVICE_NAME \
  --desired-status RUNNING \
  --region $AWS_REGION \
  --query 'taskArns[0]' \
  --output text)

if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
  TASK_STATUS=$(aws ecs describe-tasks \
    --cluster $ECS_CLUSTER_NAME \
    --tasks $TASK_ARN \
    --region $AWS_REGION \
    --query 'tasks[0].lastStatus' \
    --output text)
  
  echo "✅ Task Status: $TASK_STATUS"
  
  # Check health status
  HEALTH_STATUS=$(aws ecs describe-tasks \
    --cluster $ECS_CLUSTER_NAME \
    --tasks $TASK_ARN \
    --region $AWS_REGION \
    --query 'tasks[0].healthStatus' \
    --output text 2>/dev/null || echo "UNKNOWN")
  
  echo "✅ Health Status: $HEALTH_STATUS"
fi

# 4. Check CloudWatch Logs
echo ""
echo "📋 Checking Recent Logs..."
LOG_GROUP="/ecs/priceguard-server"
LAST_LOG=$(aws logs tail $LOG_GROUP \
  --since 5m \
  --region $AWS_REGION \
  --format short \
  --max-items 10 2>/dev/null || echo "No logs found")

if [ "$LAST_LOG" != "No logs found" ]; then
  echo "Recent logs:"
  echo "$LAST_LOG" | tail -5
else
  echo "⚠️  No recent logs found. Logs may not be configured yet."
fi

# 5. Test Health Endpoint
if [ -n "$API_URL" ]; then
  echo ""
  echo "🏥 Testing Health Endpoint..."
  HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health" 2>/dev/null || echo -e "\n000")
  HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
  BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
  
  if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Health Check: PASSED"
    echo "Response: $BODY"
  else
    echo "❌ Health Check: FAILED (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
  fi
else
  echo ""
  echo "⚠️  Skipping health check. Provide API URL as argument:"
  echo "   ./verify-deployment.sh https://your-api-url.com"
fi

# 6. Test Login Endpoint
if [ -n "$API_URL" ]; then
  echo ""
  echo "🔐 Testing Login Endpoint..."
  LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"tester@example.com","password":"TestPass123!"}' \
    2>/dev/null || echo -e "\n000")
  
  HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
  BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
  
  if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Login Endpoint: WORKING"
    echo "Response: $BODY"
  elif [ "$HTTP_CODE" == "401" ]; then
    echo "⚠️  Login Endpoint: Responding (401 Unauthorized - expected if credentials don't match)"
  else
    echo "❌ Login Endpoint: FAILED (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
  fi
fi

echo ""
echo "✅ Verification complete!"
echo ""
echo "📊 View service in AWS Console:"
echo "https://console.aws.amazon.com/ecs/v2/clusters/$ECS_CLUSTER_NAME/services/$ECS_SERVICE_NAME"
echo ""
echo "📋 View logs:"
echo "https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server"

