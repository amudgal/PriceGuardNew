#!/bin/bash
# Script to create HTTPS listener on ALB once certificate is validated

set -e

AWS_REGION="us-east-1"
CERT_ARN="arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28"
ALB_NAME="priceguard-alb"
TARGET_GROUP_NAME="priceguard-targets"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Setting up HTTPS Listener on ALB${NC}"
echo ""

# Validate AWS CLI
if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
  exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
  exit 1
fi

# Check certificate status
echo -e "${YELLOW}1️⃣  Checking certificate status...${NC}"
CERT_STATUS=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION \
  --query 'Certificate.Status' \
  --output text 2>/dev/null || echo "ERROR")

if [ "$CERT_STATUS" == "ERROR" ]; then
  echo -e "${RED}❌ Failed to get certificate status. Check certificate ARN.${NC}"
  exit 1
fi

echo "   Certificate Status: $CERT_STATUS"
echo ""

if [ "$CERT_STATUS" != "ISSUED" ]; then
  echo -e "${YELLOW}⚠️  Certificate is not yet issued (Status: $CERT_STATUS)${NC}"
  echo ""
  echo "   To complete certificate validation, you need to add DNS validation records."
  echo ""
  echo -e "${BLUE}📋 DNS Validation Records Required:${NC}"
  echo ""
  
  # Get DNS validation records
  VALIDATION_JSON=$(aws acm describe-certificate \
    --certificate-arn $CERT_ARN \
    --region $AWS_REGION \
    --query 'Certificate.DomainValidationOptions[*]' \
    --output json 2>/dev/null || echo "[]")
  
  if [ "$VALIDATION_JSON" != "[]" ] && [ -n "$VALIDATION_JSON" ]; then
    # Use Python to parse and display records nicely
    echo "$VALIDATION_JSON" | python3 -c "
import json
import sys
try:
    data = json.load(sys.stdin)
    for i, record in enumerate(data, 1):
        domain = record.get('DomainName', '')
        rr = record.get('ResourceRecord', {})
        name = rr.get('Name', '')
        value = rr.get('Value', '')
        print(f'   Record #{i} (for {domain}):')
        print(f'      Type: CNAME')
        print(f'      Name: {name}')
        print(f'      Value: {value}')
        print()
except Exception as e:
    print(f'   Error parsing records: {e}')
    sys.exit(1)
" 2>/dev/null || {
      # Fallback if Python fails - show raw command
      echo "   Error: Could not parse validation records."
      echo ""
      echo "   Run this command to see validation records:"
      echo "   aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION --query 'Certificate.DomainValidationOptions[*].ResourceRecord' --output json"
    }
  else
    echo "   Error: Could not retrieve validation records."
    echo ""
    echo "   Run this command to see validation records:"
    echo "   aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION"
  fi
  
  echo ""
  echo -e "${YELLOW}📍 Where to add these records:${NC}"
  echo "   1. If Netlify manages your DNS:"
  echo "      - Go to Netlify Dashboard → Domain management → DNS"
  echo "      - Add CNAME records as shown above"
  echo ""
  echo "   2. If another DNS provider manages your domain:"
  echo "      - Log into your DNS provider (Route 53, Cloudflare, etc.)"
  echo "      - Add CNAME records as shown above"
  echo ""
  echo "   ⏱️  After adding records, wait 5-10 minutes for validation."
  echo ""
  echo "   Check status again with:"
  echo "   aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION --query 'Certificate.Status' --output text"
  echo ""
  echo "   Or run this script again after validation completes."
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Certificate is issued and ready to use${NC}"
echo ""

# Get ALB ARN
echo -e "${YELLOW}2️⃣  Getting ALB information...${NC}"
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names $ALB_NAME \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || echo "")

if [ -z "$ALB_ARN" ] || [ "$ALB_ARN" == "None" ]; then
  echo -e "${RED}❌ ALB '$ALB_NAME' not found${NC}"
  exit 1
fi

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo -e "${GREEN}✅ ALB found: $ALB_DNS${NC}"
echo ""

# Get Target Group ARN
echo -e "${YELLOW}3️⃣  Getting target group information...${NC}"
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names $TARGET_GROUP_NAME \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || echo "")

if [ -z "$TARGET_GROUP_ARN" ] || [ "$TARGET_GROUP_ARN" == "None" ]; then
  echo -e "${RED}❌ Target group '$TARGET_GROUP_NAME' not found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Target group found${NC}"
echo ""

# Check if HTTPS listener already exists
echo -e "${YELLOW}4️⃣  Checking for existing HTTPS listener...${NC}"
EXISTING_HTTPS=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region $AWS_REGION \
  --query 'Listeners[?Port==`443`].ListenerArn' \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_HTTPS" ] && [ "$EXISTING_HTTPS" != "None" ]; then
  echo -e "${GREEN}✅ HTTPS listener already exists on port 443${NC}"
  echo "   Listener ARN: $EXISTING_HTTPS"
  echo ""
  echo -e "${BLUE}🌐 Your API is available at:${NC}"
  echo "   https://api.priceguardbackend.live"
  echo "   https://$ALB_DNS"
  exit 0
fi

# Create HTTPS listener
echo -e "${YELLOW}5️⃣  Creating HTTPS listener on port 443...${NC}"
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
  echo -e "${GREEN}✅ HTTPS listener created successfully!${NC}"
  echo "   Listener ARN: $HTTPS_LISTENER_ARN"
  echo ""
  echo -e "${GREEN}🎉 Setup Complete!${NC}"
  echo ""
  echo -e "${BLUE}🌐 Your API is now available at:${NC}"
  echo "   https://api.priceguardbackend.live"
  echo "   https://$ALB_DNS"
  echo ""
  echo -e "${YELLOW}📝 Next Steps:${NC}"
  echo "   1. Update Netlify environment variable:"
  echo "      VITE_API_BASE_URL=https://api.priceguardbackend.live"
  echo "   2. Test your API:"
  echo "      curl https://api.priceguardbackend.live/health"
  echo ""
else
  # Check if listener already exists
  if echo "$HTTPS_LISTENER_OUTPUT" | grep -q "ResourceInUse\|ConflictException\|DuplicateListener"; then
    echo -e "${GREEN}✅ HTTPS listener already exists${NC}"
  else
    echo -e "${RED}❌ Failed to create HTTPS listener. Error:${NC}"
    echo "$HTTPS_LISTENER_OUTPUT"
    exit 1
  fi
fi

