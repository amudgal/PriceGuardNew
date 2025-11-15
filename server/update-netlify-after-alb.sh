#!/bin/bash
# Script to get ALB URL and update Netlify environment variable after ALB setup

set -e

AWS_REGION="us-east-1"
ALB_NAME="${ALB_NAME:-priceguard-alb}"  # Can be overridden with env var or parameter
NETLIFY_SITE_ID="${NETLIFY_SITE_ID:-aaires}"  # Can be overridden with env var
NETLIFY_DOMAIN="${NETLIFY_DOMAIN:-https://aaires.netlify.app}"  # Can be overridden

# Check if ALB name provided as argument
if [ -n "$1" ]; then
  ALB_NAME="$1"
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌐 Updating Netlify Environment Variable After ALB Setup${NC}"
echo ""
echo -e "${YELLOW}Looking for ALB: ${ALB_NAME}${NC}"
echo ""

# Validate AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
  exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
  exit 1
fi

# Get ALB details
echo -e "${YELLOW}1️⃣  Getting ALB details...${NC}"
set +e
ALB_INFO=$(aws elbv2 describe-load-balancers \
  --names $ALB_NAME \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].{DNSName:DNSName,Scheme:Scheme,State:State.Code}' \
  --output json 2>&1)
ALB_EXIT_CODE=$?
set -e

if [ $ALB_EXIT_CODE -ne 0 ] || [ -z "$ALB_INFO" ] || [ "$ALB_INFO" == "null" ]; then
  echo -e "${RED}❌ Failed to find ALB '$ALB_NAME'${NC}"
  echo ""
  echo -e "${YELLOW}💡 Listing available ALBs...${NC}"
  set +e
  EXISTING_ALBS=$(aws elbv2 describe-load-balancers \
    --region $AWS_REGION \
    --query 'LoadBalancers[*].[LoadBalancerName,DNSName,State.Code]' \
    --output table 2>&1)
  set -e
  
  if [ -n "$EXISTING_ALBS" ] && ! echo "$EXISTING_ALBS" | grep -q "error\|Error"; then
    echo ""
    echo "$EXISTING_ALBS"
    echo ""
    echo -e "${BLUE}📋 Options:${NC}"
    echo ""
    echo "1. If you see an ALB above, run the script with its name:"
    echo -e "   ${CYAN}./update-netlify-after-alb.sh <alb-name>${NC}"
    echo ""
    echo "2. Or set the ALB name as an environment variable:"
    echo -e "   ${CYAN}export ALB_NAME=your-alb-name${NC}"
    echo -e "   ${CYAN}./update-netlify-after-alb.sh${NC}"
    echo ""
    echo "3. If no ALB exists yet, create one first:"
    echo -e "   ${CYAN}./setup-alb.sh${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Note: Make sure you're using the correct ALB name for your priceguard service.${NC}"
  else
    echo ""
    echo -e "${YELLOW}No ALBs found in region $AWS_REGION${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo ""
    echo "1. Create an ALB first:"
    echo -e "   ${CYAN}./setup-alb.sh${NC}"
    echo ""
    echo "2. Then run this script again to update Netlify"
    echo ""
  fi
  exit 1
fi

# Extract ALB DNS name
ALB_DNS=$(echo "$ALB_INFO" | grep -o '"DNSName": "[^"]*"' | cut -d'"' -f4)
ALB_STATE=$(echo "$ALB_INFO" | grep -o '"State": "[^"]*"' | cut -d'"' -f4)

if [ -z "$ALB_DNS" ]; then
  echo -e "${RED}❌ Failed to get ALB DNS name${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found ALB${NC}"
echo "   DNS Name: $ALB_DNS"
echo "   State: $ALB_STATE"
echo ""

# Check if HTTPS listener exists
echo -e "${YELLOW}2️⃣  Checking for HTTPS listener...${NC}"
set +e
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names $ALB_NAME \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>&1)

HTTPS_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn "$ALB_ARN" \
  --region $AWS_REGION \
  --query 'Listeners[?Port==`443`]' \
  --output json 2>&1)
HTTPS_EXIT_CODE=$?
set -e

if [ $HTTPS_EXIT_CODE -eq 0 ] && [ -n "$HTTPS_LISTENER" ] && [ "$HTTPS_LISTENER" != "[]" ] && [ "$HTTPS_LISTENER" != "null" ]; then
  ALB_URL="https://$ALB_DNS"
  PROTOCOL="HTTPS"
  echo -e "${GREEN}✅ HTTPS listener found${NC}"
else
  ALB_URL="http://$ALB_DNS"
  PROTOCOL="HTTP"
  echo -e "${YELLOW}⚠️  HTTPS listener not found, using HTTP${NC}"
  echo "   Note: For production, you should set up HTTPS with an SSL certificate"
fi
echo ""

# Display the ALB URL
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 ALB URL for Netlify:${NC}"
echo ""
echo -e "   ${BLUE}VITE_API_BASE_URL${NC} = ${GREEN}$ALB_URL${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Instructions for updating Netlify
echo -e "${YELLOW}3️⃣  Update Netlify Environment Variable:${NC}"
echo ""
echo -e "${BLUE}Method 1: Using Netlify Web UI (Recommended)${NC}"
echo ""
echo "1. Go to Netlify Dashboard:"
echo -e "   ${CYAN}https://app.netlify.com/sites/$NETLIFY_SITE_ID/settings/deploys#environment-variables${NC}"
echo ""
echo "2. Add or update environment variable:"
echo "   - Click 'Add variable' (if new) or click to edit existing"
echo -e "   - ${BLUE}Key:${NC} VITE_API_BASE_URL"
echo -e "   - ${BLUE}Value:${NC} $ALB_URL"
echo "   - Scope: All scopes (or specific scopes if needed)"
echo "   - Click 'Save'"
echo ""
echo "3. Redeploy your site:"
echo "   - Go to: https://app.netlify.com/sites/$NETLIFY_SITE_ID/deploys"
echo "   - Click 'Trigger deploy' → 'Deploy site'"
echo "   - Or push a commit to trigger automatic deployment"
echo ""

# Method 2: Using Netlify CLI (if available)
if command -v netlify &> /dev/null; then
  echo -e "${BLUE}Method 2: Using Netlify CLI${NC}"
  echo ""
  echo "If you have Netlify CLI installed and authenticated:"
  echo ""
  echo "  # Set environment variable"
  echo "  netlify env:set VITE_API_BASE_URL \"$ALB_URL\" --context production"
  echo ""
  echo "  # Trigger deployment"
  echo "  netlify deploy --prod"
  echo ""
else
  echo -e "${YELLOW}💡 Tip: Install Netlify CLI for programmatic updates${NC}"
  echo "   npm install -g netlify-cli"
  echo "   Then run: netlify login"
  echo ""
fi

# Method 3: Using Netlify API (if token provided)
if [ -n "$NETLIFY_AUTH_TOKEN" ]; then
  echo -e "${BLUE}Method 3: Using Netlify API${NC}"
  echo ""
  echo "Updating via API..."
  
  set +e
  API_RESPONSE=$(curl -s -X POST \
    "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/env" \
    -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"VITE_API_BASE_URL\", \"value\": \"$ALB_URL\", \"scopes\": [\"builds\", \"functions\", \"runtime\", \"post_processing\"]}" 2>&1)
  API_EXIT_CODE=$?
  set -e
  
  if [ $API_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Environment variable updated via API${NC}"
    echo ""
    echo "To trigger deployment, run:"
    echo "  curl -X POST \"https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys\" \\"
    echo "    -H \"Authorization: Bearer \$NETLIFY_AUTH_TOKEN\""
    echo ""
  else
    echo -e "${YELLOW}⚠️  Failed to update via API. Please use Method 1 (Web UI) instead.${NC}"
    echo "$API_RESPONSE"
    echo ""
  fi
else
  echo -e "${YELLOW}💡 Tip: Set NETLIFY_AUTH_TOKEN to update via API${NC}"
  echo "   export NETLIFY_AUTH_TOKEN=your_token_here"
  echo "   Get token from: https://app.netlify.com/user/applications"
  echo ""
fi

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 Summary:${NC}"
echo ""
echo -e "   ALB DNS:     ${BLUE}$ALB_DNS${NC}"
echo -e "   Protocol:    ${BLUE}$PROTOCOL${NC}"
echo -e "   ALB URL:     ${GREEN}$ALB_URL${NC}"
echo -e "   Netlify Site: ${BLUE}$NETLIFY_DOMAIN${NC}"
echo ""
if [ "$PROTOCOL" == "HTTP" ]; then
  echo -e "   ${YELLOW}⚠️  Warning: Using HTTP. For production, set up HTTPS with SSL certificate.${NC}"
  echo ""
fi
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Next steps
echo -e "${BLUE}✅ Next Steps:${NC}"
echo ""
echo "1. ✅ Update Netlify environment variable: VITE_API_BASE_URL = $ALB_URL"
echo "2. ✅ Redeploy Netlify site"
echo "3. ✅ Test your application at: $NETLIFY_DOMAIN"
echo ""
if [ "$PROTOCOL" == "HTTP" ]; then
  echo "4. ⚠️  Set up HTTPS (recommended):"
  echo "   - Request SSL certificate: ./request-certificate.sh"
  echo "   - Create HTTPS listener on ALB"
  echo "   - Update Netlify variable to use https://"
  echo ""
fi

# Test the ALB endpoint
echo -e "${YELLOW}4️⃣  Testing ALB endpoint...${NC}"
set +e
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$ALB_URL/health" 2>&1)
CURL_EXIT_CODE=$?
set -e

if [ $CURL_EXIT_CODE -eq 0 ] && [ "$HEALTH_CHECK" == "200" ]; then
  echo -e "${GREEN}✅ ALB health check passed (HTTP $HEALTH_CHECK)${NC}"
elif [ "$HEALTH_CHECK" == "000" ]; then
  echo -e "${YELLOW}⚠️  Could not reach ALB endpoint${NC}"
  echo "   This might be normal if:"
  echo "   - ALB is still provisioning"
  echo "   - No targets are registered yet"
  echo "   - Security group rules need updating"
else
  echo -e "${YELLOW}⚠️  ALB health check returned HTTP $HEALTH_CHECK${NC}"
  echo "   This might indicate the service needs configuration"
fi
echo ""

# Copy command for easy use
echo -e "${BLUE}💡 Quick Copy:${NC}"
echo ""
echo -e "${CYAN}# Copy this to set in Netlify:${NC}"
echo "VITE_API_BASE_URL=$ALB_URL"
echo ""
echo -e "${CYAN}# Test the API endpoint:${NC}"
echo "curl $ALB_URL/health"
echo ""

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}📖 For more details, see:${NC}"
echo "   - REQUEST_SSL_CERTIFICATE.md (for HTTPS setup)"
echo "   - QUICK_FIX_HTTPS.md (for troubleshooting)"
echo ""

