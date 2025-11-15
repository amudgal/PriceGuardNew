#!/bin/bash
# Script to check SSL certificate status and display validation records

set -e

AWS_REGION="us-east-1"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking SSL Certificate Status${NC}"
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

# Get certificate ARN from user or list available certificates
if [ -z "$1" ]; then
  echo -e "${YELLOW}No certificate ARN provided. Listing available certificates...${NC}"
  echo ""
  
  set +e
  CERT_LIST=$(aws acm list-certificates \
    --region $AWS_REGION \
    --query 'CertificateSummaryList[*].[CertificateArn,DomainName,Status]' \
    --output table 2>&1)
  LIST_EXIT_CODE=$?
  set -e
  
  if [ $LIST_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Failed to list certificates:${NC}"
    echo "$CERT_LIST"
    exit 1
  fi
  
  if [ -z "$CERT_LIST" ] || [ "$CERT_LIST" == "None" ]; then
    echo -e "${YELLOW}⚠️  No certificates found in region $AWS_REGION${NC}"
    echo ""
    echo "To request a new certificate, run:"
    echo "  ./request-certificate.sh"
    exit 0
  fi
  
  echo "$CERT_LIST"
  echo ""
  echo -e "${YELLOW}Please provide a certificate ARN:${NC}"
  echo "  Usage: $0 <certificate-arn>"
  echo ""
  echo "Example:"
  echo "  $0 arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
  exit 0
fi

CERT_ARN="$1"

echo -e "${BLUE}Certificate ARN:${NC} $CERT_ARN"
echo ""

# Get certificate details
echo -e "${YELLOW}Fetching certificate details...${NC}"
set +e
CERT_STATUS=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region $AWS_REGION \
  --query 'Certificate.Status' \
  --output text 2>&1)
STATUS_EXIT_CODE=$?
set -e

if [ $STATUS_EXIT_CODE -ne 0 ]; then
  echo -e "${RED}❌ Failed to get certificate status:${NC}"
  echo "$CERT_STATUS"
  exit 1
fi

# Display status
echo ""
case "$CERT_STATUS" in
  "ISSUED")
    echo -e "${GREEN}✅ Status: ISSUED${NC}"
    echo ""
    echo -e "${GREEN}Certificate is ready to use!${NC}"
    ;;
  "PENDING_VALIDATION")
    echo -e "${YELLOW}⏳ Status: PENDING_VALIDATION${NC}"
    echo ""
    echo -e "${YELLOW}Certificate is waiting for DNS validation.${NC}"
    echo ""
    ;;
  "VALIDATION_TIMED_OUT")
    echo -e "${RED}❌ Status: VALIDATION_TIMED_OUT${NC}"
    echo ""
    echo -e "${RED}Validation timed out. Please request a new certificate.${NC}"
    exit 1
    ;;
  *)
    echo -e "${YELLOW}Status: $CERT_STATUS${NC}"
    ;;
esac

# Get full certificate details
set +e
CERT_DETAILS=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region $AWS_REGION \
  --output json 2>&1)
set -e

# Extract domain names
DOMAINS=$(echo "$CERT_DETAILS" | grep -o '"DomainName": "[^"]*"' | cut -d'"' -f4)

echo -e "${BLUE}Domain(s):${NC}"
for domain in $DOMAINS; do
  echo "  - $domain"
done
echo ""

# Get validation records
if [ "$CERT_STATUS" == "PENDING_VALIDATION" ]; then
  echo -e "${BLUE}📋 DNS Validation Records:${NC}"
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  # Try to format with python3, fallback to raw output
  VALIDATION_RECORDS=$(echo "$CERT_DETAILS" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)
    cert = data.get('Certificate', {})
    domain_validations = cert.get('DomainValidationOptions', [])
    
    for i, dv in enumerate(domain_validations, 1):
        domain = dv.get('DomainName', 'N/A')
        status = dv.get('ValidationStatus', 'PENDING_VALIDATION')
        resource_record = dv.get('ResourceRecord', {})
        
        print(f'📌 Domain {i}: {domain}')
        print(f'   Validation Status: {status}')
        
        if resource_record:
            cname_name = resource_record.get('Name', 'N/A')
            cname_value = resource_record.get('Value', 'N/A')
            print(f'   CNAME Name:  {cname_name}')
            print(f'   CNAME Value: {cname_value}')
        else:
            print('   ⚠️  Validation record not yet available')
        print()
except Exception as e:
    pass
" 2>/dev/null)
  
  if [ -n "$VALIDATION_RECORDS" ]; then
    echo "$VALIDATION_RECORDS"
  else
    # Fallback: use jq if available
    if command -v jq &> /dev/null; then
      echo "$CERT_DETAILS" | jq -r '.Certificate.DomainValidationOptions[] | "📌 Domain: \(.DomainName)\n   Status: \(.ValidationStatus)\n   CNAME Name:  \(.ResourceRecord.Name // "N/A")\n   CNAME Value: \(.ResourceRecord.Value // "N/A")\n"'
    else
      # Basic fallback
      echo "$CERT_DETAILS" | grep -A 10 "DomainValidationOptions" | head -20
      echo ""
      echo -e "${YELLOW}💡 Tip: Install 'jq' or 'python3' for better output formatting${NC}"
    fi
  fi
  
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${BLUE}📝 To validate this certificate:${NC}"
  echo ""
  echo "1. Add the CNAME records above to your DNS provider"
  echo "2. Wait for DNS propagation (5-30 minutes)"
  echo "3. Run this script again to check status"
  echo ""
fi

# Show expiration date if issued
if [ "$CERT_STATUS" == "ISSUED" ]; then
  EXPIRATION=$(echo "$CERT_DETAILS" | grep -o '"NotAfter": "[^"]*"' | cut -d'"' -f4)
  if [ -n "$EXPIRATION" ]; then
    echo -e "${BLUE}Expiration Date:${NC} $EXPIRATION"
    echo ""
  fi
fi

echo -e "${GREEN}✅ Check complete!${NC}"
echo ""

