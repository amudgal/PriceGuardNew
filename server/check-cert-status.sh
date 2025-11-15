#!/bin/bash
# Quick script to check certificate status

CERT_ARN="arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28"

echo "Checking certificate status..."
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text

echo ""
echo "If status is 'ISSUED', you can run: ./setup-https-listener.sh"
