#!/bin/bash
# Quick check for SNS subscription status

AWS_REGION="us-east-1"
TOPIC_ARN="arn:aws:sns:us-east-1:144935603834:priceguard-alerts"
EMAIL="amit.k.mudgal@gmail.com"

echo "📧 Checking SNS subscription for: $EMAIL"
echo ""

aws sns list-subscriptions-by-topic \
  --topic-arn $TOPIC_ARN \
  --region $AWS_REGION \
  --query "Subscriptions[?Endpoint=='$EMAIL']" \
  --output json | jq -r '.[] | "Status: \(.SubscriptionArn | if contains("PendingConfirmation") then "PENDING CONFIRMATION" else "CONFIRMED" end)\nEndpoint: \(.Endpoint)\nProtocol: \(.Protocol)\nARN: \(.SubscriptionArn)"'

echo ""
echo "📊 View in AWS Console:"
echo "https://console.aws.amazon.com/sns/v3/home?region=$AWS_REGION#/topic/$TOPIC_ARN"

