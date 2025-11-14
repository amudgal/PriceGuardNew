#!/bin/bash
# Script to set up AWS resources needed for ECS deployment

set -e

# Configuration
AWS_REGION="us-east-1"
ECR_REPO_NAME="priceguard-server"
ECS_CLUSTER_NAME="priceguard-cluster"
ECS_SERVICE_NAME="priceguard-server"
LOG_GROUP_NAME="/ecs/priceguard-server"

echo "🏗️  Setting up AWS resources for ECS deployment..."
echo ""

# 1. Create ECR repository
echo "📦 Creating ECR repository..."
if aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION 2>/dev/null; then
  echo "✅ ECR repository already exists"
else
  aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256
  
  echo "✅ ECR repository created"
fi

ECR_REPO_URI=$(aws ecr describe-repositories \
  --repository-names $ECR_REPO_NAME \
  --region $AWS_REGION \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "📦 ECR Repository URI: $ECR_REPO_URI"
echo ""

# 2. Create CloudWatch log group
echo "📋 Creating CloudWatch log group..."
if aws logs describe-log-groups --log-group-name-prefix $LOG_GROUP_NAME --region $AWS_REGION --query "logGroups[?logGroupName=='$LOG_GROUP_NAME']" --output text 2>/dev/null | grep -q "$LOG_GROUP_NAME"; then
  echo "✅ CloudWatch log group already exists"
else
  aws logs create-log-group \
    --log-group-name $LOG_GROUP_NAME \
    --region $AWS_REGION
  
  echo "✅ CloudWatch log group created"
fi
echo ""

# 3. Create ECS cluster
echo "🏗️  Creating ECS cluster..."
if aws ecs describe-clusters --clusters $ECS_CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
  echo "✅ ECS cluster already exists"
else
  aws ecs create-cluster \
    --cluster-name $ECS_CLUSTER_NAME \
    --region $AWS_REGION \
    --capacity-providers FARGATE FARGATE_SPOT \
    --default-capacity-provider-strategy \
      capacityProvider=FARGATE,weight=1 \
      capacityProvider=FARGATE_SPOT,weight=0
  
  echo "✅ ECS cluster created"
fi
echo ""

# 4. Check if Secrets Manager secrets exist
echo "🔐 Checking Secrets Manager secrets..."
DB_SECRET=$(aws secretsmanager describe-secret \
  --secret-id priceguard/database-url \
  --region $AWS_REGION \
  --query 'ARN' \
  --output text 2>/dev/null || echo "None")

if [ "$DB_SECRET" == "None" ]; then
  echo "⚠️  Secret 'priceguard/database-url' not found"
  echo "   Create it with:"
  echo "   aws secretsmanager create-secret \\"
  echo "     --name priceguard/database-url \\"
  echo "     --secret-string 'your-database-url' \\"
  echo "     --region $AWS_REGION"
else
  echo "✅ Secret 'priceguard/database-url' exists"
fi

ORIGINS_SECRET=$(aws secretsmanager describe-secret \
  --secret-id priceguard/allowed-origins \
  --region $AWS_REGION \
  --query 'ARN' \
  --output text 2>/dev/null || echo "None")

if [ "$ORIGINS_SECRET" == "None" ]; then
  echo "⚠️  Secret 'priceguard/allowed-origins' not found"
  echo "   Create it with:"
  echo "   aws secretsmanager create-secret \\"
  echo "     --name priceguard/allowed-origins \\"
  echo "     --secret-string 'https://your-netlify-site.netlify.app' \\"
  echo "     --region $AWS_REGION"
else
  echo "✅ Secret 'priceguard/allowed-origins' exists"
fi
echo ""

# 5. Check IAM roles
echo "👤 Checking IAM roles..."
if aws iam get-role --role-name ecsTaskExecutionRole --region $AWS_REGION 2>/dev/null; then
  echo "✅ IAM role 'ecsTaskExecutionRole' exists"
else
  echo "⚠️  IAM role 'ecsTaskExecutionRole' not found"
  echo "   Create it with the setup-alarms.sh script or manually"
fi

if aws iam get-role --role-name ecsTaskRole --region $AWS_REGION 2>/dev/null; then
  echo "✅ IAM role 'ecsTaskRole' exists"
else
  echo "⚠️  IAM role 'ecsTaskRole' not found"
  echo "   Create it with the setup-alarms.sh script or manually"
fi
echo ""

# 6. Summary
echo "✅ AWS resources setup complete!"
echo ""
echo "📊 Summary:"
echo "  - ECR Repository: $ECR_REPO_URI"
echo "  - ECS Cluster: $ECS_CLUSTER_NAME"
echo "  - CloudWatch Logs: $LOG_GROUP_NAME"
echo ""
echo "⚠️  Next steps:"
echo "  1. Create ECS service (if not exists): ./create-service.sh"
echo "  2. Set up GitHub Secrets (if using GitHub Actions)"
echo "  3. Deploy: ./deploy.sh (requires Docker) or use GitHub Actions"
echo ""
echo "📊 View resources:"
echo "  - ECR: https://console.aws.amazon.com/ecr/repositories/private/$AWS_REGION/$ECR_REPO_NAME"
echo "  - ECS: https://console.aws.amazon.com/ecs/v2/clusters/$ECS_CLUSTER_NAME"
echo "  - CloudWatch: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups/log-group/$LOG_GROUP_NAME"

