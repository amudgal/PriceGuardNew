#!/bin/bash
# Fix ALB target group health check configuration

set -e

AWS_REGION="us-east-1"
TARGET_GROUP_NAME="priceguard-targets"

echo "🔧 Fixing ALB Target Group Health Check Configuration..."
echo ""

# Get target group ARN
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names $TARGET_GROUP_NAME \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || echo "None")

if [ -z "$TARGET_GROUP_ARN" ] || [ "$TARGET_GROUP_ARN" == "None" ]; then
  echo "❌ Target group not found: $TARGET_GROUP_NAME"
  exit 1
fi

echo "📊 Current Health Check Configuration:"
aws elbv2 describe-target-groups \
  --target-group-arns $TARGET_GROUP_ARN \
  --region $AWS_REGION \
  --query 'TargetGroups[0].{Path:HealthCheckPath,Port:HealthCheckPort,Protocol:HealthCheckProtocol,Interval:HealthCheckIntervalSeconds,Timeout:HealthCheckTimeoutSeconds,HealthyThreshold:HealthyThresholdCount,UnhealthyThreshold:UnhealthyThresholdCount}' \
  --output json | jq .

echo ""
echo "📝 Updating health check configuration..."

# Update target group health check to use simple health endpoint
aws elbv2 modify-target-group \
  --target-group-arn $TARGET_GROUP_ARN \
  --health-check-path "/health?simple=1" \
  --health-check-protocol HTTP \
  --health-check-port traffic-port \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $AWS_REGION \
  --query 'TargetGroups[0].{Path:HealthCheckPath,Port:HealthCheckPort,Protocol:HealthCheckProtocol}' \
  --output json | jq .

echo ""
echo "✅ Health check configuration updated!"
echo ""
echo "📊 Updated Configuration:"
aws elbv2 describe-target-groups \
  --target-group-arns $TARGET_GROUP_ARN \
  --region $AWS_REGION \
  --query 'TargetGroups[0].{Path:HealthCheckPath,Port:HealthCheckPort,Protocol:HealthCheckProtocol,Interval:HealthCheckIntervalSeconds,Timeout:HealthCheckTimeoutSeconds,HealthyThreshold:HealthyThresholdCount,UnhealthyThreshold:UnhealthyThresholdCount}' \
  --output json | jq .

echo ""
echo "🔄 Checking target health status..."
sleep 5

aws elbv2 describe-target-health \
  --target-group-arn $TARGET_GROUP_ARN \
  --region $AWS_REGION \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,HealthStatus:TargetHealth.State,Reason:TargetHealth.Reason,Description:TargetHealth.Description}' \
  --output json | jq .

