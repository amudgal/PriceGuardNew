#!/bin/bash
# Script to set up Application Load Balancer (ALB) with HTTPS for backend API

set -e

AWS_REGION="us-east-1"
VPC_ID="vpc-6fa24512"
SUBNET_IDS="subnet-4854cf05,subnet-f8e531a7"
SECURITY_GROUP_ID="sg-0d20af83680061442"
ECS_CLUSTER_NAME="priceguard-cluster"
ECS_SERVICE_NAME="priceguard-server"
ALB_NAME="priceguard-alb"
TARGET_GROUP_NAME="priceguard-targets"

echo "🔧 Setting up Application Load Balancer (ALB) with HTTPS..."
echo ""

# Step 1: Create Application Load Balancer
echo "1️⃣  Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name $ALB_NAME \
  --subnets $SUBNET_IDS \
  --security-groups $SECURITY_GROUP_ID \
  --scheme internet-facing \
  --type application \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || echo "")

if [ -z "$ALB_ARN" ] || [ "$ALB_ARN" == "None" ]; then
  # Check if ALB already exists
  ALB_ARN=$(aws elbv2 describe-load-balancers \
    --names $ALB_NAME \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$ALB_ARN" ] || [ "$ALB_ARN" == "None" ]; then
    echo "❌ Failed to create or find ALB"
    exit 1
  else
    echo "✅ ALB already exists: $ALB_ARN"
  fi
else
  echo "✅ ALB created: $ALB_ARN"
fi

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "   DNS Name: $ALB_DNS"
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
  --output text 2>/dev/null || echo "")

if [ -z "$TARGET_GROUP_ARN" ] || [ "$TARGET_GROUP_ARN" == "None" ]; then
  # Check if target group already exists
  TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
    --names $TARGET_GROUP_NAME \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$TARGET_GROUP_ARN" ] || [ "$TARGET_GROUP_ARN" == "None" ]; then
    echo "❌ Failed to create or find target group"
    exit 1
  else
    echo "✅ Target group already exists: $TARGET_GROUP_ARN"
  fi
else
  echo "✅ Target group created: $TARGET_GROUP_ARN"
fi
echo ""

# Step 3: Register ECS service with target group
echo "3️⃣  Registering ECS service with target group..."
# This requires updating the ECS service to use the target group
# For now, we'll create a note about this
echo "   ⚠️  Note: You need to update the ECS service to use this target group"
echo "   Or manually register tasks with the target group"
echo ""

# Step 4: Request SSL Certificate (or use existing)
echo "4️⃣  Checking for SSL certificate..."
# List existing certificates
CERT_ARN=$(aws acm list-certificates \
  --region $AWS_REGION \
  --query 'CertificateSummaryList[?contains(DomainName, `priceguard`) || contains(DomainName, `aaires`)].CertificateArn' \
  --output text 2>/dev/null | head -1 || echo "")

if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" == "None" ]; then
  echo "   ⚠️  No SSL certificate found"
  echo "   You need to:"
  echo "   1. Request a certificate from AWS Certificate Manager (ACM)"
  echo "   2. Or use a wildcard certificate if available"
  echo "   3. Or set up a custom domain and request a certificate for it"
  echo ""
  echo "   For now, we'll create an HTTP listener (you can add HTTPS later)"
  CERT_ARN=""
else
  echo "✅ SSL certificate found: $CERT_ARN"
fi
echo ""

# Step 5: Create HTTP Listener (for now)
echo "5️⃣  Creating HTTP listener (port 80)..."
HTTP_LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --region $AWS_REGION \
  --query 'Listeners[0].ListenerArn' \
  --output text 2>/dev/null || echo "")

if [ -z "$HTTP_LISTENER_ARN" ] || [ "$HTTP_LISTENER_ARN" == "None" ]; then
  echo "   ⚠️  HTTP listener may already exist or failed to create"
else
  echo "✅ HTTP listener created"
fi
echo ""

# Step 6: Create HTTPS Listener (if certificate available)
if [ -n "$CERT_ARN" ] && [ "$CERT_ARN" != "None" ]; then
  echo "6️⃣  Creating HTTPS listener (port 443)..."
  HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
    --region $AWS_REGION \
    --query 'Listeners[0].ListenerArn' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$HTTPS_LISTENER_ARN" ] || [ "$HTTPS_LISTENER_ARN" == "None" ]; then
    echo "   ⚠️  HTTPS listener may already exist or failed to create"
  else
    echo "✅ HTTPS listener created"
    ALB_URL="https://$ALB_DNS"
  fi
else
  echo "6️⃣  Skipping HTTPS listener (no certificate available)"
  ALB_URL="http://$ALB_DNS"
fi
echo ""

# Step 7: Update security group to allow ALB traffic
echo "7️⃣  Updating security group..."
# Allow inbound on port 80 and 443 from anywhere (for ALB)
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION 2>/dev/null || echo "   Port 80 rule may already exist"

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION 2>/dev/null || echo "   Port 443 rule may already exist"

echo "✅ Security group updated"
echo ""

# Step 8: Update ECS service to use target group (manual step for now)
echo "8️⃣  Next Steps:"
echo ""
echo "   📋 Manual Steps Required:"
echo ""
echo "   1. Update ECS service to use the target group:"
echo "      aws ecs update-service \\"
echo "        --cluster $ECS_CLUSTER_NAME \\"
echo "        --service $ECS_SERVICE_NAME \\"
echo "        --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=priceguard-server,containerPort=4000 \\"
echo "        --region $AWS_REGION"
echo ""
echo "   2. Register ECS tasks with target group (automatic if service is updated)"
echo ""
echo "   3. For HTTPS:"
echo "      - Request SSL certificate from ACM"
echo "      - Or use existing certificate"
echo "      - Create HTTPS listener on port 443"
echo ""
echo "   4. Update Netlify environment variable:"
echo "      - VITE_API_BASE_URL = $ALB_URL"
echo ""
echo "   ⚠️  Note: HTTP (port 80) will work for now, but browsers will still show mixed content warnings"
echo "   For production, you MUST use HTTPS (port 443) with a valid SSL certificate"
echo ""

echo "✅ ALB Setup Complete!"
echo ""
echo "📊 Summary:"
echo "   ALB DNS: $ALB_DNS"
echo "   ALB URL: $ALB_URL"
echo "   Target Group: $TARGET_GROUP_ARN"
echo ""
echo "🌐 ALB Console:"
echo "   https://console.aws.amazon.com/ec2/v2/home?region=$AWS_REGION#LoadBalancers:"

