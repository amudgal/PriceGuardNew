#!/bin/bash
# Script to create Target Group first (before ALB)
# This can be run independently if you need to create the target group separately

set -e

AWS_REGION="us-east-1"
VPC_ID="vpc-6fa24512"
TARGET_GROUP_NAME="priceguard-targets"

echo "🎯 Creating Target Group..."
echo ""

# Validate AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
  echo "❌ AWS CLI is not installed. Please install it first."
  exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
  echo "❌ AWS credentials not configured. Please run 'aws configure' first."
  exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# Validate VPC exists
echo "🔍 Validating VPC..."
if ! aws ec2 describe-vpcs --vpc-ids $VPC_ID --region $AWS_REGION &> /dev/null; then
  echo "❌ VPC $VPC_ID does not exist or you don't have permissions to access it"
  exit 1
fi

echo "✅ VPC validated"
echo ""

# Create Target Group
echo "Creating Target Group..."
set +e
TARGET_GROUP_OUTPUT=$(aws elbv2 create-target-group \
  --name $TARGET_GROUP_NAME \
  --protocol HTTP \
  --port 4000 \
  --vpc-id $VPC_ID \
  --health-check-path /health \
  --health-check-protocol HTTP \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>&1)
TG_EXIT_CODE=$?
set -e

if [ $TG_EXIT_CODE -eq 0 ] && [ -n "$TARGET_GROUP_OUTPUT" ] && [ "$TARGET_GROUP_OUTPUT" != "None" ]; then
  TARGET_GROUP_ARN="$TARGET_GROUP_OUTPUT"
  echo "✅ Target group created successfully!"
  echo ""
  echo "📊 Target Group Details:"
  echo "   Name: $TARGET_GROUP_NAME"
  echo "   ARN: $TARGET_GROUP_ARN"
  echo "   Protocol: HTTP"
  echo "   Port: 4000"
  echo "   Health Check: /health"
  echo ""
  echo "🌐 View in Console:"
  echo "   https://console.aws.amazon.com/ec2/v2/home?region=$AWS_REGION#TargetGroups:"
  echo ""
  echo "💡 Next Steps:"
  echo "   1. Now you can create the ALB using setup-alb.sh"
  echo "   2. Or create ALB manually in AWS Console and attach this target group"
else
  # Check if error is because target group already exists
  if echo "$TARGET_GROUP_OUTPUT" | grep -q "DuplicateTargetGroupName"; then
    echo "   ℹ️  Target group with this name already exists, looking it up..."
    set +e
    TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
      --names $TARGET_GROUP_NAME \
      --region $AWS_REGION \
      --query 'TargetGroups[0].TargetGroupArn' \
      --output text 2>&1)
    TG_DESCRIBE_EXIT_CODE=$?
    set -e
    
    if [ $TG_DESCRIBE_EXIT_CODE -eq 0 ] && [ -n "$TARGET_GROUP_ARN" ] && [ "$TARGET_GROUP_ARN" != "None" ]; then
      echo "✅ Target group already exists: $TARGET_GROUP_ARN"
      echo ""
      echo "📊 Target Group Details:"
      echo "   Name: $TARGET_GROUP_NAME"
      echo "   ARN: $TARGET_GROUP_ARN"
      echo ""
      echo "💡 You can now create the ALB using setup-alb.sh"
    else
      echo "❌ Failed to find existing target group. Error:"
      echo "$TARGET_GROUP_ARN"
      exit 1
    fi
  else
    echo "❌ Failed to create target group. Error:"
    echo "$TARGET_GROUP_OUTPUT"
    exit 1
  fi
fi

