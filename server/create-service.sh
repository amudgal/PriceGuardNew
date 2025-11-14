#!/bin/bash
# Script to create ECS Fargate service

set -e

# Configuration
AWS_REGION="us-east-1"
ECS_CLUSTER_NAME="priceguard-cluster"
ECS_SERVICE_NAME="priceguard-server"
ECS_TASK_DEFINITION="priceguard-server"
SUBNET_IDS="subnet-4854cf05,subnet-f8e531a7"  # Subnets in us-east-1c and us-east-1d for high availability
SECURITY_GROUP_ID="sg-0d20af83680061442"  # Security group for PriceGuard ECS tasks
LOAD_BALANCER_ARN="arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:loadbalancer/app/priceguard-alb/xxxxx"  # Optional: if using ALB

echo "🏗️  Creating ECS Fargate service..."

# 1. Create cluster if it doesn't exist
if ! aws ecs describe-clusters --clusters $ECS_CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
  echo "Creating ECS cluster..."
  aws ecs create-cluster --cluster-name $ECS_CLUSTER_NAME --region $AWS_REGION
fi

# 2. Get latest task definition
LATEST_TASK_DEF=$(aws ecs list-task-definitions \
  --family-prefix $ECS_TASK_DEFINITION \
  --sort DESC \
  --max-items 1 \
  --region $AWS_REGION \
  --query 'taskDefinitionArns[0]' \
  --output text)

if [ -z "$LATEST_TASK_DEF" ] || [ "$LATEST_TASK_DEF" == "None" ]; then
  echo "❌ No task definition found. Please run deploy.sh first."
  exit 1
fi

# 3. Create service
echo "Creating ECS service..."
aws ecs create-service \
  --cluster $ECS_CLUSTER_NAME \
  --service-name $ECS_SERVICE_NAME \
  --task-definition $LATEST_TASK_DEF \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
  --region $AWS_REGION

echo "✅ Service created successfully!"
echo "📊 View service: https://console.aws.amazon.com/ecs/v2/clusters/$ECS_CLUSTER_NAME/services/$ECS_SERVICE_NAME"

