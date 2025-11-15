#!/bin/bash
# Temporary fix: Update task definition to use less strict SSL mode
# This allows the database connection to work without the certificate file

set -e

AWS_REGION="us-east-1"
ECS_CLUSTER_NAME="priceguard-cluster"
ECS_SERVICE_NAME="priceguard-server"
TASK_DEFINITION="priceguard-server"

echo "🔧 Temporary Fix: Updating SSL mode to allow connection without certificate"
echo ""
echo "⚠️  WARNING: This is a temporary fix. You should deploy a new image with the certificate for production."
echo ""

# Get current task definition
echo "📥 Getting current task definition..."
CURRENT_TD=$(aws ecs describe-task-definition \
  --task-definition $TASK_DEFINITION \
  --region $AWS_REGION \
  --query 'taskDefinition' \
  --output json)

# Update PGSSLMODE from verify-full to require and remove PGSSLROOTCERT
echo "🔨 Updating SSL environment variables..."
UPDATED_TD=$(echo "$CURRENT_TD" | python3 -c "
import json
import sys

data = json.load(sys.stdin)
container = data['containerDefinitions'][0]

# Update PGSSLMODE from verify-full to require
# And remove PGSSLROOTCERT to prevent reading non-existent certificate file
env_to_remove = []
for i, env in enumerate(container['environment']):
    if env['name'] == 'PGSSLMODE':
        env['value'] = 'require'
        print('✅ Updated PGSSLMODE: verify-full -> require', file=sys.stderr)
    elif env['name'] == 'PGSSLROOTCERT':
        env_to_remove.append(i)
        print('✅ Removing PGSSLROOTCERT (certificate file not available)', file=sys.stderr)

# Remove PGSSLROOTCERT from environment
for i in reversed(env_to_remove):
    container['environment'].pop(i)

# Remove fields that shouldn't be in register-task-definition
fields_to_remove = ['taskDefinitionArn', 'revision', 'status', 'requiresAttributes', 'placementConstraints', 'compatibilities', 'registeredAt', 'registeredBy']
for field in fields_to_remove:
    data.pop(field, None)

print(json.dumps(data, indent=2))
")

# Save to temporary file
TEMP_FILE=$(mktemp)
echo "$UPDATED_TD" > "$TEMP_FILE"

# Register new task definition
echo "📝 Registering updated task definition..."
NEW_TD_ARN=$(aws ecs register-task-definition \
  --cli-input-json file://"$TEMP_FILE" \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

# Clean up
rm -f "$TEMP_FILE"

echo "✅ New task definition registered: $NEW_TD_ARN"
echo ""

# Update service to use new task definition
echo "🚀 Updating ECS service..."
aws ecs update-service \
  --cluster $ECS_CLUSTER_NAME \
  --service $ECS_SERVICE_NAME \
  --task-definition $NEW_TD_ARN \
  --force-new-deployment \
  --region $AWS_REGION > /dev/null

echo "✅ Service update initiated"
echo ""
echo "⏳ Waiting for new tasks to start (this may take 2-3 minutes)..."
echo ""

# Wait a bit and check
sleep 10

echo "📊 Service Status:"
aws ecs describe-services \
  --cluster $ECS_CLUSTER_NAME \
  --services $ECS_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}' \
  --output json

echo ""
echo "✅ Temporary fix applied!"
echo ""
echo "⚠️  IMPORTANT: This is a temporary fix using less strict SSL verification."
echo "   For production, you should:"
echo "   1. Trigger GitHub Actions deployment to build image with RDS certificate"
echo "   2. Update task definition back to PGSSLMODE=verify-full"
echo ""
echo "📝 Monitor deployment:"
echo "   https://console.aws.amazon.com/ecs/v2/clusters/$ECS_CLUSTER_NAME/services/$ECS_SERVICE_NAME"

