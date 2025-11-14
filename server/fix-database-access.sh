#!/bin/bash
# Fix RDS security group to allow inbound connections from ECS tasks

set -e

AWS_REGION="us-east-1"
RDS_SG_ID="sg-c135a5e5"
ECS_SG_ID="sg-0d20af83680061442"

echo "🔧 Fixing database access from ECS tasks..."
echo ""

# Check current inbound rules
echo "📊 Current RDS Security Group Rules:"
aws ec2 describe-security-groups \
  --group-ids $RDS_SG_ID \
  --region $AWS_REGION \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432`]' \
  --output json | jq .

echo ""
echo "🔍 Checking if ECS security group is allowed..."

# Check if ECS SG is already allowed
EXISTING_RULE=$(aws ec2 describe-security-groups \
  --group-ids $RDS_SG_ID \
  --region $AWS_REGION \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`5432\` && contains(UserIdGroupPairs[*].GroupId, \`$ECS_SG_ID\`)]" \
  --output json 2>/dev/null | jq 'length' || echo "0")

if [ "$EXISTING_RULE" != "0" ] && [ -n "$EXISTING_RULE" ]; then
  echo "✅ RDS security group already allows connections from ECS security group"
else
  echo "📝 Adding inbound rule to RDS security group..."
  
  # Add inbound rule to allow PostgreSQL from ECS security group
  aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG_ID \
    --protocol tcp \
    --port 5432 \
    --source-group $ECS_SG_ID \
    --region $AWS_REGION 2>/dev/null && echo "✅ Rule added successfully" || echo "⚠️  Failed to add rule (may already exist)"
fi

echo ""
echo "✅ Database access configured!"
echo ""
echo "📊 Updated RDS Security Group Rules:"
aws ec2 describe-security-groups \
  --group-ids $RDS_SG_ID \
  --region $AWS_REGION \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432`]' \
  --output json | jq .

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

