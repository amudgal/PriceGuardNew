#!/bin/bash
# Script to show DNS validation records for AWS ACM certificate

set -e

AWS_REGION="us-east-1"
CERT_ARN="arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📋 DNS Validation Records for AWS ACM Certificate${NC}"
echo ""
echo "Certificate ARN: $CERT_ARN"
echo ""

# Get validation records
VALIDATION_JSON=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION \
  --query 'Certificate.DomainValidationOptions[*]' \
  --output json 2>/dev/null || echo "[]")

if [ "$VALIDATION_JSON" == "[]" ] || [ -z "$VALIDATION_JSON" ]; then
  echo -e "${YELLOW}❌ Could not retrieve validation records${NC}"
  exit 1
fi

# Parse and display
echo "$VALIDATION_JSON" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)
    print('Add these CNAME records to your DNS provider:\n')
    
    for i, record in enumerate(data, 1):
        domain = record.get('DomainName', '')
        rr = record.get('ResourceRecord', {})
        name = rr.get('Name', '').rstrip('.')
        value = rr.get('Value', '').rstrip('.')
        
        print(f'Record #{i} (for {domain}):')
        print(f'  Type: CNAME')
        print(f'  Name: {name}')
        print(f'  Value: {value}')
        print()
        
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    sys.exit(1)
" 2>/dev/null || {
  echo -e "${YELLOW}⚠️  Could not parse JSON. Showing raw output:${NC}"
  echo "$VALIDATION_JSON" | python3 -m json.tool
}

echo ""
echo -e "${GREEN}📍 Instructions:${NC}"
echo ""
echo "1. If Netlify manages your DNS:"
echo "   - Go to: Netlify Dashboard → Your Site → Domain settings → DNS"
echo "   - Click 'Add DNS record'"
echo "   - Select Type: CNAME"
echo "   - Enter Name and Value from above"
echo "   - Save the record"
echo ""
echo "2. If another DNS provider manages your domain:"
echo "   - Log into your DNS provider (Route 53, Cloudflare, Namecheap, etc.)"
echo "   - Add CNAME records as shown above"
echo ""
echo "3. Wait for validation (5-10 minutes):"
echo "   - AWS will automatically validate once DNS records are added"
echo "   - Check status with:"
echo "     aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION --query 'Certificate.Status' --output text"
echo ""
echo "4. After validation completes, run:"
echo "   ./setup-https-listener.sh"

