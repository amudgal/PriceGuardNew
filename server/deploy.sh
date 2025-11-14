#!/bin/bash
# Deployment script for AWS ECS Fargate

set -e

# Configuration
AWS_REGION="us-east-1"
ECR_REPO_NAME="priceguard-server"
ECS_CLUSTER_NAME="priceguard-cluster"
ECS_SERVICE_NAME="priceguard-server"
ECS_TASK_DEFINITION="priceguard-server"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Starting deployment..."

# 1. Login to ECR
echo "📦 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 2. Create ECR repository if it doesn't exist
echo "📦 Checking ECR repository..."
if ! aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION 2>/dev/null; then
  echo "Creating ECR repository..."
  aws ecr create-repository --repository-name $ECR_REPO_NAME --region $AWS_REGION
fi

ECR_REPO_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

# 3. Download RDS CA certificate
echo "📥 Downloading RDS CA certificate..."
mkdir -p certs
curl -o certs/rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem

# 4. Copy certificate to server directory
cp certs/rds-ca-bundle.pem ./rds-ca-bundle.pem

# 5. Build Docker image
echo "🔨 Building Docker image..."
docker build -t $ECR_REPO_NAME:latest .

# 6. Tag image
echo "🏷️  Tagging image..."
docker tag $ECR_REPO_NAME:latest $ECR_REPO_URI:latest

# 7. Push to ECR
echo "📤 Pushing image to ECR..."
docker push $ECR_REPO_URI:latest

# 8. Update ECS task definition
echo "📝 Updating ECS task definition..."
# Replace placeholders in task definition
sed -i.bak "s|YOUR_ACCOUNT_ID|$AWS_ACCOUNT_ID|g" ecs-task-definition.json
sed -i.bak "s|YOUR_ECR_REPO_URI|$ECR_REPO_URI|g" ecs-task-definition.json

# Register new task definition
TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ Task definition registered: $TASK_DEF_ARN"

# 9. Update ECS service (if it exists)
if aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $ECS_SERVICE_NAME --region $AWS_REGION --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
  echo "🔄 Updating ECS service..."
  aws ecs update-service \
    --cluster $ECS_CLUSTER_NAME \
    --service $ECS_SERVICE_NAME \
    --task-definition $TASK_DEF_ARN \
    --force-new-deployment \
    --region $AWS_REGION > /dev/null
  
  echo "✅ Service update initiated. Check AWS Console for deployment status."
else
  echo "⚠️  ECS service not found. Please create it manually or use the create-service.sh script."
fi

# Restore original task definition file
mv ecs-task-definition.json.bak ecs-task-definition.json 2>/dev/null || true

echo "🎉 Deployment complete!"
echo "📊 Monitor deployment: https://console.aws.amazon.com/ecs/v2/clusters/$ECS_CLUSTER_NAME/services/$ECS_SERVICE_NAME"

