#!/bin/bash
# Simplified ALB setup script for AWS CloudShell
# This version can be easily copied and pasted into CloudShell

set -e

# Configuration - UPDATE THESE VALUES
AWS_REGION="us-east-1"
VPC_ID="vpc-6fa24512"
SUBNET_IDS="subnet-4854cf05,subnet-f8e531a7"
SECURITY_GROUP_ID="sg-0d20af83680061442"
ECS_CLUSTER_NAME="priceguard-cluster"
ECS_SERVICE_NAME="priceguard-server"
ALB_NAME="priceguard-alb"
TARGET_GROUP_NAME="priceguard-targets"

echo "🔧 Setting up Application Load Balancer (ALB)..."
echo ""

# Step 1: Create ALB
echo "1️⃣  Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name $ALB_NAME \
  --subnets $SUBNET_IDS \
  --security-groups $SECURITY_GROUP_ID \
  --scheme internet-facing \
  --type application \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>&1 || \
  aws elbv2 describe-load-balancers \
    --names $ALB_NAME \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "✅ ALB created: $ALB_DNS"
echo ""

# Step 2: Create Target Group
echo "2️⃣  Creating Target Group..."
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
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
  --output text 2>&1 || \
  aws elbv2 describe-target-groups \
    --names $TARGET_GROUP_NAME \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

echo "✅ Target group created: $TARGET_GROUP_ARN"
echo ""

# Step 3: Create HTTP Listener
echo "3️⃣  Creating HTTP Listener..."
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --region $AWS_REGION > /dev/null 2>&1 || echo "Listener may already exist"

echo "✅ HTTP listener created"
echo ""

# Step 4: Update ECS Service
echo "4️⃣  Updating ECS Service..."
aws ecs update-service \
  --cluster $ECS_CLUSTER_NAME \
  --service $ECS_SERVICE_NAME \
  --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=priceguard-server,containerPort=4000 \
  --region $AWS_REGION > /dev/null

echo "✅ ECS service updated"
echo ""

# Step 5: Update Security Group
echo "5️⃣  Updating Security Group..."
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION > /dev/null 2>&1 || echo "Port 80 rule may already exist"

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION > /dev/null 2>&1 || echo "Port 443 rule may already exist"

echo "✅ Security group updated"
echo ""

echo "✅ ALB Setup Complete!"
echo ""
echo "📊 Summary:"
echo "   ALB DNS: $ALB_DNS"
echo "   ALB URL: http://$ALB_DNS"
echo "   Target Group: $TARGET_GROUP_ARN"
echo ""
echo "🧪 Test the endpoint:"
echo "   curl http://$ALB_DNS/health"
echo ""
echo "🌐 View in Console:"
echo "   https://console.aws.amazon.com/ec2/v2/home?region=$AWS_REGION#LoadBalancers:"

