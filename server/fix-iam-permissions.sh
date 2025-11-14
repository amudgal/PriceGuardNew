#!/bin/bash
# Fix IAM permissions for ECS task execution role to access Secrets Manager

set -e

AWS_REGION="us-east-1"
ROLE_NAME="ecsTaskExecutionRole"

echo "🔧 Fixing IAM permissions for $ROLE_NAME..."
echo ""

# Create policy document for Secrets Manager access
cat > /tmp/secrets-manager-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:${AWS_REGION}:*:secret:priceguard/*"
      ]
    }
  ]
}
EOF

# Check if policy already exists
POLICY_NAME="ECSTaskExecutionSecretsManagerAccess"
POLICY_ARN=$(aws iam list-policies \
  --scope Local \
  --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" \
  --output text 2>/dev/null || echo "None")

if [ "$POLICY_ARN" != "None" ] && [ -n "$POLICY_ARN" ]; then
  echo "✅ Policy $POLICY_NAME already exists"
  echo "   ARN: $POLICY_ARN"
  
  # Check if role already has this policy
  ROLE_POLICIES=$(aws iam list-attached-role-policies \
    --role-name $ROLE_NAME \
    --query "AttachedPolicies[?PolicyArn=='$POLICY_ARN'].PolicyArn" \
    --output text 2>/dev/null || echo "None")
  
  if [ "$ROLE_POLICIES" == "$POLICY_ARN" ]; then
    echo "✅ Policy is already attached to role"
  else
    echo "📎 Attaching policy to role..."
    aws iam attach-role-policy \
      --role-name $ROLE_NAME \
      --policy-arn $POLICY_ARN \
      --region $AWS_REGION 2>/dev/null || echo "⚠️  Failed to attach (may already be attached)"
    echo "✅ Policy attached"
  fi
else
  echo "📝 Creating policy $POLICY_NAME..."
  POLICY_ARN=$(aws iam create-policy \
    --policy-name $POLICY_NAME \
    --policy-document file:///tmp/secrets-manager-policy.json \
    --region $AWS_REGION \
    --query 'Policy.Arn' \
    --output text 2>/dev/null)
  
  if [ -n "$POLICY_ARN" ] && [ "$POLICY_ARN" != "None" ]; then
    echo "✅ Policy created: $POLICY_ARN"
    
    echo "📎 Attaching policy to role..."
    aws iam attach-role-policy \
      --role-name $ROLE_NAME \
      --policy-arn $POLICY_ARN \
      --region $AWS_REGION
    echo "✅ Policy attached to role"
  else
    echo "❌ Failed to create policy"
    exit 1
  fi
fi

echo ""
echo "✅ IAM permissions fixed!"
echo ""
echo "📊 Verifying role permissions..."
aws iam list-attached-role-policies \
  --role-name $ROLE_NAME \
  --output table

echo ""
echo "🔄 Restarting ECS service to apply changes..."
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --force-new-deployment \
  --region $AWS_REGION \
  --query 'service.{status:status,runningCount:runningCount,desiredCount:desiredCount}' \
  --output json

echo ""
echo "✅ Service restarted. Wait 2-3 minutes for tasks to start."
echo ""
echo "Monitor status:"
echo "  cd server && ./check-status.sh"
echo ""
echo "View logs:"
echo "  aws logs tail /ecs/priceguard-server --follow --region $AWS_REGION"

