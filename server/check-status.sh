#!/bin/bash
# Quick script to check deployment status

set -e

AWS_REGION="us-east-1"
ECS_CLUSTER_NAME="priceguard-cluster"
ECS_SERVICE_NAME="priceguard-server"

echo "📊 Checking deployment status..."
echo ""

# Service status
SERVICE_STATUS=$(aws ecs describe-services \
  --cluster $ECS_CLUSTER_NAME \
  --services $ECS_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].{status:status,runningCount:runningCount,desiredCount:desiredCount}' \
  --output json)

echo "Service Status:"
echo "$SERVICE_STATUS" | jq .

# Running tasks
RUNNING_TASKS=$(aws ecs list-tasks \
  --cluster $ECS_CLUSTER_NAME \
  --service-name $ECS_SERVICE_NAME \
  --desired-status RUNNING \
  --region $AWS_REGION \
  --query 'taskArns | length(@)' \
  --output text)

echo ""
echo "Running Tasks: $RUNNING_TASKS"

if [ "$RUNNING_TASKS" -gt "0" ]; then
  TASK_ARN=$(aws ecs list-tasks \
    --cluster $ECS_CLUSTER_NAME \
    --service-name $ECS_SERVICE_NAME \
    --desired-status RUNNING \
    --region $AWS_REGION \
    --query 'taskArns[0]' \
    --output text)
  
  echo ""
  echo "Task Details:"
  aws ecs describe-tasks \
    --cluster $ECS_CLUSTER_NAME \
    --tasks $TASK_ARN \
    --region $AWS_REGION \
    --query 'tasks[0].{lastStatus:lastStatus,healthStatus:healthStatus,createdAt:createdAt}' \
    --output json | jq .
  
  echo ""
  echo "Recent Logs:"
  aws logs tail /ecs/priceguard-server \
    --since 2m \
    --region $AWS_REGION \
    --format short \
    --max-items 5 2>/dev/null | tail -5 || echo "No recent logs"
fi

echo ""
echo "📊 View in AWS Console:"
echo "https://console.aws.amazon.com/ecs/v2/clusters/$ECS_CLUSTER_NAME/services/$ECS_SERVICE_NAME"

