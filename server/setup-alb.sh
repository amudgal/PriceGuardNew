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
echo "🔍 Validating VPC and networking resources..."
if ! aws ec2 describe-vpcs --vpc-ids $VPC_ID --region $AWS_REGION &> /dev/null; then
  echo "❌ VPC $VPC_ID does not exist or you don't have permissions to access it"
  exit 1
fi

# Validate subnets exist and are in different AZs (required for ALB)
IFS=',' read -ra SUBNET_ARRAY <<< "$SUBNET_IDS"
declare -a SUBNET_AZS=()
for subnet in "${SUBNET_ARRAY[@]}"; do
  SUBNET_INFO=$(aws ec2 describe-subnets --subnet-ids $subnet --region $AWS_REGION --query 'Subnets[0].{AZ:AvailabilityZone,ID:SubnetId}' --output json 2>&1)
  if [ $? -ne 0 ]; then
    echo "❌ Subnet $subnet does not exist or you don't have permissions to access it"
    echo "   Error: $SUBNET_INFO"
    exit 1
  fi
  AZ=$(echo "$SUBNET_INFO" | grep -o '"AZ": "[^"]*"' | cut -d'"' -f4)
  SUBNET_AZS+=("$AZ")
done

# Check that we have at least 2 subnets in different AZs
if [ ${#SUBNET_ARRAY[@]} -lt 2 ]; then
  echo "❌ ALB requires at least 2 subnets in different availability zones"
  exit 1
fi

# Check if all subnets are in the same AZ (ALB requirement)
UNIQUE_AZS=$(printf '%s\n' "${SUBNET_AZS[@]}" | sort -u | wc -l)
if [ "$UNIQUE_AZS" -lt 2 ]; then
  echo "⚠️  Warning: Subnets should be in different availability zones for ALB"
  echo "   Current AZs: ${SUBNET_AZS[*]}"
  echo "   Continuing anyway, but this may cause issues..."
fi

# Validate security group exists
if ! aws ec2 describe-security-groups --group-ids $SECURITY_GROUP_ID --region $AWS_REGION &> /dev/null; then
  echo "❌ Security group $SECURITY_GROUP_ID does not exist or you don't have permissions to access it"
  exit 1
fi

echo "✅ VPC, subnets, and security group validated"
echo ""

# Convert comma-separated subnet IDs to space-separated for AWS CLI
SUBNET_IDS_SPACE=$(echo $SUBNET_IDS | tr ',' ' ')

# Step 0: Create Target Group first (if it doesn't exist)
echo "0️⃣  Checking/Creating Target Group (required before ALB)..."
set +e
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names $TARGET_GROUP_NAME \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null)

if [ -z "$TARGET_GROUP_ARN" ] || [ "$TARGET_GROUP_ARN" == "None" ]; then
  echo "   Creating target group..."
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
  
  if [ $? -eq 0 ] && [ -n "$TARGET_GROUP_OUTPUT" ] && [ "$TARGET_GROUP_OUTPUT" != "None" ]; then
    TARGET_GROUP_ARN="$TARGET_GROUP_OUTPUT"
    echo "✅ Target group created: $TARGET_GROUP_ARN"
  else
    echo "❌ Failed to create target group. Error:"
    echo "$TARGET_GROUP_OUTPUT"
    exit 1
  fi
else
  echo "✅ Target group already exists: $TARGET_GROUP_ARN"
fi
set -e
echo ""

# Step 1: Create Application Load Balancer
echo "1️⃣  Creating Application Load Balancer..."
set +e
ALB_OUTPUT=$(aws elbv2 create-load-balancer \
  --name $ALB_NAME \
  --subnets $SUBNET_IDS_SPACE \
  --security-groups $SECURITY_GROUP_ID \
  --scheme internet-facing \
  --type application \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>&1)
ALB_EXIT_CODE=$?
set -e

if [ $ALB_EXIT_CODE -eq 0 ] && [ -n "$ALB_OUTPUT" ] && [ "$ALB_OUTPUT" != "None" ]; then
  ALB_ARN="$ALB_OUTPUT"
  echo "✅ ALB created: $ALB_ARN"
else
  # Check if error is because ALB already exists
  if echo "$ALB_OUTPUT" | grep -q "DuplicateLoadBalancerName"; then
    echo "   ℹ️  ALB with this name already exists, looking it up..."
    set +e
    ALB_ARN=$(aws elbv2 describe-load-balancers \
      --names $ALB_NAME \
      --region $AWS_REGION \
      --query 'LoadBalancers[0].LoadBalancerArn' \
      --output text 2>&1)
    DESCRIBE_EXIT_CODE=$?
    set -e
    
    if [ $DESCRIBE_EXIT_CODE -eq 0 ] && [ -n "$ALB_ARN" ] && [ "$ALB_ARN" != "None" ]; then
      echo "✅ ALB already exists: $ALB_ARN"
    else
      echo "❌ Failed to find existing ALB: $ALB_ARN"
      exit 1
    fi
  else
    echo "❌ Failed to create ALB. Error:"
    echo "$ALB_OUTPUT"
    exit 1
  fi
fi

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "   DNS Name: $ALB_DNS"
echo ""

# Step 2: Update ECS service to use target group
echo "2️⃣  Updating ECS service to use target group..."
set +e
# Check if service exists
SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster $ECS_CLUSTER_NAME \
  --services $ECS_SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].status' \
  --output text 2>/dev/null)

if [ "$SERVICE_EXISTS" != "None" ] && [ "$SERVICE_EXISTS" != "" ]; then
  echo "   ℹ️  ECS service exists, updating to use target group..."
  
  # Get current service configuration
  CURRENT_LOAD_BALANCERS=$(aws ecs describe-services \
    --cluster $ECS_CLUSTER_NAME \
    --services $ECS_SERVICE_NAME \
    --region $AWS_REGION \
    --query 'services[0].loadBalancers[*].targetGroupArn' \
    --output text 2>/dev/null)
  
  # Check if target group is already attached
  if echo "$CURRENT_LOAD_BALANCERS" | grep -q "$TARGET_GROUP_ARN"; then
    echo "   ✅ Target group already attached to ECS service"
  else
    # Update service to use target group
    UPDATE_OUTPUT=$(aws ecs update-service \
      --cluster $ECS_CLUSTER_NAME \
      --service $ECS_SERVICE_NAME \
      --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=priceguard-server,containerPort=4000 \
      --region $AWS_REGION \
      --query 'service.serviceName' \
      --output text 2>&1)
    
    if [ $? -eq 0 ] && [ -n "$UPDATE_OUTPUT" ]; then
      echo "   ✅ ECS service updated to use target group"
      echo "   ⏳ Waiting for service to stabilize (this may take a few minutes)..."
      aws ecs wait services-stable \
        --cluster $ECS_CLUSTER_NAME \
        --services $ECS_SERVICE_NAME \
        --region $AWS_REGION 2>/dev/null || echo "   ⚠️  Service update initiated (may still be in progress)"
    else
      echo "   ⚠️  Failed to update ECS service. You may need to update it manually:"
      echo "      aws ecs update-service \\"
      echo "        --cluster $ECS_CLUSTER_NAME \\"
      echo "        --service $ECS_SERVICE_NAME \\"
      echo "        --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=priceguard-server,containerPort=4000 \\"
      echo "        --region $AWS_REGION"
    fi
  fi
else
  echo "   ⚠️  ECS service '$ECS_SERVICE_NAME' not found in cluster '$ECS_CLUSTER_NAME'"
  echo "   ℹ️  You can create the service first using create-service.sh, then run this script again"
  echo "   Or update the service manually once it's created:"
  echo "      aws ecs update-service \\"
  echo "        --cluster $ECS_CLUSTER_NAME \\"
  echo "        --service $ECS_SERVICE_NAME \\"
  echo "        --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=priceguard-server,containerPort=4000 \\"
  echo "        --region $AWS_REGION"
fi
set -e
echo ""

# Step 3: Request SSL Certificate (or use existing)
echo "3️⃣  Checking for SSL certificate..."
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

# Step 4: Create HTTP Listener (for now)
echo "4️⃣  Creating HTTP listener (port 80)..."
set +e
HTTP_LISTENER_OUTPUT=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --region $AWS_REGION \
  --query 'Listeners[0].ListenerArn' \
  --output text 2>&1)
HTTP_LISTENER_EXIT_CODE=$?
set -e

if [ $HTTP_LISTENER_EXIT_CODE -eq 0 ] && [ -n "$HTTP_LISTENER_OUTPUT" ] && [ "$HTTP_LISTENER_OUTPUT" != "None" ]; then
  HTTP_LISTENER_ARN="$HTTP_LISTENER_OUTPUT"
  echo "✅ HTTP listener created: $HTTP_LISTENER_ARN"
else
  # Check if listener already exists
  if echo "$HTTP_LISTENER_OUTPUT" | grep -q "ResourceInUse\|ConflictException\|DuplicateListener"; then
    echo "   ℹ️  HTTP listener on port 80 already exists"
  else
    echo "   ⚠️  Failed to create HTTP listener. Error:"
    echo "$HTTP_LISTENER_OUTPUT"
    echo "   Continuing anyway..."
  fi
fi
echo ""

# Step 5: Create HTTPS Listener (if certificate available)
if [ -n "$CERT_ARN" ] && [ "$CERT_ARN" != "None" ]; then
  echo "5️⃣  Creating HTTPS listener (port 443)..."
  set +e
  HTTPS_LISTENER_OUTPUT=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
    --region $AWS_REGION \
    --query 'Listeners[0].ListenerArn' \
    --output text 2>&1)
  HTTPS_LISTENER_EXIT_CODE=$?
  set -e
  
  if [ $HTTPS_LISTENER_EXIT_CODE -eq 0 ] && [ -n "$HTTPS_LISTENER_OUTPUT" ] && [ "$HTTPS_LISTENER_OUTPUT" != "None" ]; then
    HTTPS_LISTENER_ARN="$HTTPS_LISTENER_OUTPUT"
    echo "✅ HTTPS listener created: $HTTPS_LISTENER_ARN"
    ALB_URL="https://$ALB_DNS"
  else
    # Check if listener already exists
    if echo "$HTTPS_LISTENER_OUTPUT" | grep -q "ResourceInUse\|ConflictException\|DuplicateListener"; then
      echo "   ℹ️  HTTPS listener on port 443 already exists"
      ALB_URL="https://$ALB_DNS"
    else
      echo "   ⚠️  Failed to create HTTPS listener. Error:"
      echo "$HTTPS_LISTENER_OUTPUT"
      echo "   Continuing with HTTP only..."
      ALB_URL="http://$ALB_DNS"
    fi
  fi
else
  echo "5️⃣  Skipping HTTPS listener (no certificate available)"
  ALB_URL="http://$ALB_DNS"
fi
echo ""

# Step 6: Update security group to allow ALB traffic
echo "6️⃣  Updating security group..."
# Allow inbound on port 80 and 443 from anywhere (for ALB)
set +e
SG_OUTPUT_80=$(aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION 2>&1)
SG_80_EXIT_CODE=$?
set -e

if [ $SG_80_EXIT_CODE -eq 0 ]; then
  echo "   ✅ Added port 80 rule"
elif echo "$SG_OUTPUT_80" | grep -q "InvalidPermission.Duplicate\|already exists"; then
  echo "   ℹ️  Port 80 rule already exists"
else
  echo "   ⚠️  Failed to add port 80 rule: $SG_OUTPUT_80"
fi

set +e
SG_OUTPUT_443=$(aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION 2>&1)
SG_443_EXIT_CODE=$?
set -e

if [ $SG_443_EXIT_CODE -eq 0 ]; then
  echo "   ✅ Added port 443 rule"
elif echo "$SG_OUTPUT_443" | grep -q "InvalidPermission.Duplicate\|already exists"; then
  echo "   ℹ️  Port 443 rule already exists"
else
  echo "   ⚠️  Failed to add port 443 rule: $SG_OUTPUT_443"
fi

echo "✅ Security group update complete"
echo ""

# Step 7: Additional configuration and next steps
echo "7️⃣  Additional Configuration:"
echo ""
echo "   📋 Next Steps (if needed):"
echo ""
echo "   1. For HTTPS (Recommended for Production):"
echo "      - Request SSL certificate from AWS Certificate Manager (ACM)"
echo "      - Or use existing certificate"
echo "      - Run this script again after certificate is available, or manually create HTTPS listener:"
echo "        aws elbv2 create-listener \\"
echo "          --load-balancer-arn $ALB_ARN \\"
echo "          --protocol HTTPS \\"
echo "          --port 443 \\"
echo "          --certificates CertificateArn=<CERT_ARN> \\"
echo "          --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \\"
echo "          --region $AWS_REGION"
echo ""
echo "   2. Update Netlify environment variable:"
echo "      - Go to Netlify Dashboard → Site settings → Environment variables"
echo "      - Set VITE_API_BASE_URL = $ALB_URL"
echo ""
echo "   3. Test the ALB endpoint:"
echo "      curl $ALB_URL/health"
echo ""
echo "   ⚠️  Note: HTTP (port 80) will work for now, but browsers may show mixed content warnings"
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

