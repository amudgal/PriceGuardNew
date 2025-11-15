#!/bin/bash
# Script to request an SSL certificate from AWS Certificate Manager and show DNS validation records

set -e

AWS_REGION="us-east-1"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Requesting SSL Certificate from AWS Certificate Manager${NC}"
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

# Get domain name(s) from user
echo -e "${YELLOW}Enter the domain name(s) for your certificate:${NC}"
echo "Examples:"
echo "  - Single domain: api.yourdomain.com"
echo "  - Multiple domains: api.yourdomain.com www.yourdomain.com"
echo "  - Wildcard: *.yourdomain.com yourdomain.com"
echo ""
read -p "Domain name(s): " DOMAIN_NAMES

if [ -z "$DOMAIN_NAMES" ]; then
  echo -e "${RED}❌ Domain name is required${NC}"
  exit 1
fi

# Parse domain names into array
read -a DOMAIN_ARRAY <<< "$DOMAIN_NAMES"
PRIMARY_DOMAIN="${DOMAIN_ARRAY[0]}"

echo ""
echo -e "${BLUE}📋 Requesting certificate for:${NC}"
for domain in "${DOMAIN_ARRAY[@]}"; do
  echo "   - $domain"
done
echo ""

# Request certificate
echo -e "${YELLOW}1️⃣  Requesting certificate...${NC}"
set +e
if [ ${#DOMAIN_ARRAY[@]} -eq 1 ]; then
  # Single domain
  CERT_OUTPUT=$(aws acm request-certificate \
    --domain-name "$PRIMARY_DOMAIN" \
    --validation-method DNS \
    --region $AWS_REGION \
    --output json 2>&1)
else
  # Multiple domains - use subject alternative names
  SAN_LIST=""
  for i in "${!DOMAIN_ARRAY[@]}"; do
    if [ $i -ne 0 ]; then
      SAN_LIST="$SAN_LIST ${DOMAIN_ARRAY[$i]}"
    fi
  done
  
  CERT_OUTPUT=$(aws acm request-certificate \
    --domain-name "$PRIMARY_DOMAIN" \
    --subject-alternative-names $SAN_LIST \
    --validation-method DNS \
    --region $AWS_REGION \
    --output json 2>&1)
fi

CERT_EXIT_CODE=$?
set -e

if [ $CERT_EXIT_CODE -ne 0 ]; then
  # Check if certificate already exists
  if echo "$CERT_OUTPUT" | grep -q "One or more parameter values are invalid\|InvalidParameter"; then
    echo -e "${RED}❌ Invalid domain name(s). Please check your input.${NC}"
    echo "$CERT_OUTPUT"
    exit 1
  else
    echo -e "${RED}❌ Failed to request certificate:${NC}"
    echo "$CERT_OUTPUT"
    exit 1
  fi
fi

# Extract certificate ARN
CERT_ARN=$(echo "$CERT_OUTPUT" | grep -o '"CertificateArn": "[^"]*"' | cut -d'"' -f4)

if [ -z "$CERT_ARN" ]; then
  echo -e "${RED}❌ Failed to get certificate ARN${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Certificate requested successfully${NC}"
echo -e "${BLUE}   Certificate ARN: $CERT_ARN${NC}"
echo ""

# Wait a few seconds for validation records to be created
echo -e "${YELLOW}⏳ Waiting for validation records to be created...${NC}"
sleep 5

# Get validation records
echo ""
echo -e "${YELLOW}2️⃣  Getting DNS validation records...${NC}"
set +e
VALIDATION_OUTPUT=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region $AWS_REGION \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value,ValidationStatus]' \
  --output json 2>&1)
DESCRIBE_EXIT_CODE=$?
set -e

if [ $DESCRIBE_EXIT_CODE -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Could not retrieve validation records yet. Try again in a few minutes.${NC}"
  echo "   Certificate ARN: $CERT_ARN"
  exit 0
fi

# Parse validation records
VALIDATION_COUNT=$(echo "$VALIDATION_OUTPUT" | grep -c '"DomainName"')

if [ "$VALIDATION_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Validation records not yet available. Please check again in a few minutes.${NC}"
  echo "   Certificate ARN: $CERT_ARN"
  echo ""
  echo "   To check manually, run:"
  echo "   aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION"
  exit 0
fi

# Display validation records
echo ""
echo -e "${GREEN}✅ DNS Validation Records${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Extract and display each validation record
echo "$VALIDATION_OUTPUT" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)
    for i, record in enumerate(data, 1):
        domain = record[0] if len(record) > 0 else 'N/A'
        cname_name = record[1] if len(record) > 1 else 'N/A'
        cname_value = record[2] if len(record) > 2 else 'N/A'
        status = record[3] if len(record) > 3 else 'PENDING_VALIDATION'
        
        print(f'📌 Domain {i}: {domain}')
        print(f'   Status: {status}')
        print(f'   CNAME Name:  {cname_name}')
        print(f'   CNAME Value: {cname_value}')
        print()
except:
    # Fallback if python3 is not available
    print('Note: Install python3 for better formatting')
" 2>/dev/null || {
  # Fallback display without python
  echo "$VALIDATION_OUTPUT" | grep -A 3 '"DomainName"'
}

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Instructions for adding DNS records
echo -e "${BLUE}📝 Next Steps:${NC}"
echo ""
echo -e "${YELLOW}1. Add the CNAME records above to your DNS provider:${NC}"
echo ""
echo -e "   ${GREEN}If using Route 53:${NC}"
echo "   - Go to Route 53 console"
echo "   - Find your hosted zone"
echo "   - Click 'Create record'"
echo "   - Add each CNAME record shown above"
echo ""
echo -e "   ${GREEN}If using other DNS provider (GoDaddy, Namecheap, Cloudflare, etc.):${NC}"
echo "   - Log into your DNS provider"
echo "   - Navigate to DNS settings"
echo "   - Add CNAME records exactly as shown above"
echo "   - ⚠️  If using Cloudflare, set proxy status to 'DNS only' (gray cloud)"
echo ""
echo -e "${YELLOW}2. Wait for DNS propagation (5-30 minutes, up to 72 hours)${NC}"
echo ""
echo -e "${YELLOW}3. Check certificate status:${NC}"
echo "   aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION --query 'Certificate.Status' --output text"
echo ""
echo -e "${YELLOW}4. Once status is 'ISSUED', you can use the certificate with your ALB${NC}"
echo ""

# Save certificate ARN for reference
echo -e "${BLUE}💾 Certificate ARN saved for reference:${NC}"
echo "   $CERT_ARN"
echo ""

# Provide command to check status
echo -e "${BLUE}🔍 Quick Status Check:${NC}"
echo "   Run this command to check certificate status:"
echo ""
echo -e "   ${GREEN}aws acm describe-certificate \\\\${NC}"
echo -e "     ${GREEN}--certificate-arn $CERT_ARN \\\\${NC}"
echo -e "     ${GREEN}--region $AWS_REGION \\\\${NC}"
echo -e "     ${GREEN}--query 'Certificate.Status' \\\\${NC}"
echo -e "     ${GREEN}--output text${NC}"
echo ""

# Provide command to get validation records again if needed
echo -e "${BLUE}📋 Get Validation Records Again:${NC}"
echo "   If you need to see the validation records again, run:"
echo ""
echo -e "   ${GREEN}aws acm describe-certificate \\\\${NC}"
echo -e "     ${GREEN}--certificate-arn $CERT_ARN \\\\${NC}"
echo -e "     ${GREEN}--region $AWS_REGION \\\\${NC}"
echo -e "     ${GREEN}--query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \\\\${NC}"
echo -e "     ${GREEN}--output table${NC}"
echo ""

echo -e "${GREEN}✅ Certificate request complete!${NC}"
echo ""
echo -e "${YELLOW}📖 For detailed instructions, see: REQUEST_SSL_CERTIFICATE.md${NC}"
echo ""

