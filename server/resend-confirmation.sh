#!/bin/bash
# Script to resend SNS confirmation email

set -e

# Configuration
AWS_REGION="us-east-1"
SNS_TOPIC_NAME="priceguard-alerts"
EMAIL_ADDRESS="amit.k.mudgal@gmail.com"

echo "📧 Resending SNS confirmation email..."

# 1. Get SNS Topic ARN
TOPIC_ARN=$(aws sns list-topics \
  --region $AWS_REGION \
  --query "Topics[?contains(TopicArn, '$SNS_TOPIC_NAME')].TopicArn" \
  --output text | head -1)

if [ -z "$TOPIC_ARN" ] || [ "$TOPIC_ARN" == "None" ]; then
  echo "❌ SNS topic not found. Please run setup-alarms.sh first"
  exit 1
fi

echo "✅ SNS Topic ARN: $TOPIC_ARN"
echo ""

# 2. Check existing subscription
EXISTING_SUB=$(aws sns list-subscriptions-by-topic \
  --topic-arn $TOPIC_ARN \
  --region $AWS_REGION \
  --query "Subscriptions[?Endpoint=='$EMAIL_ADDRESS'].SubscriptionArn" \
  --output text | head -1)

if [ -n "$EXISTING_SUB" ] && [ "$EXISTING_SUB" != "None" ]; then
  echo "📧 Found existing subscription: $EXISTING_SUB"
  
  if [[ "$EXISTING_SUB" == *"PendingConfirmation"* ]]; then
    echo "⚠️  Subscription is pending confirmation. Unsubscribing and resubscribing..."
    aws sns unsubscribe \
      --subscription-arn "$EXISTING_SUB" \
      --region $AWS_REGION > /dev/null 2>&1 || true
    
    echo "✅ Old subscription removed"
    sleep 2
  elif [[ "$EXISTING_SUB" == *"arn:aws:sns"* ]]; then
    echo "✅ Subscription is already confirmed!"
    echo "📧 Email: $EMAIL_ADDRESS"
    echo "📧 Subscription ARN: $EXISTING_SUB"
    echo ""
    echo "🧪 Sending test notification..."
    aws sns publish \
      --topic-arn $TOPIC_ARN \
      --message "Test notification from PriceGuard backend. Your email notifications are working!" \
      --subject "PriceGuard Test - Email Notifications Working" \
      --region $AWS_REGION
    
    echo "✅ Test notification sent. Check your email!"
    exit 0
  fi
fi

# 3. Create new subscription (or resubscribe)
echo "📧 Creating new subscription for $EMAIL_ADDRESS..."
SUBSCRIPTION_ARN=$(aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint $EMAIL_ADDRESS \
  --region $AWS_REGION \
  --query 'SubscriptionArn' \
  --output text)

echo "✅ Subscription created: $SUBSCRIPTION_ARN"
echo ""
echo "📧 Confirmation email has been sent to: $EMAIL_ADDRESS"
echo ""
echo "⚠️  IMPORTANT:"
echo "   1. Check your email inbox ($EMAIL_ADDRESS)"
echo "   2. Check your SPAM/JUNK folder"
echo "   3. Look for an email from AWS SNS"
echo "   4. Click the confirmation link in the email"
echo ""
echo "📧 The email subject will be:"
echo "   'AWS Notification - Subscription Confirmation'"
echo ""
echo "📊 View subscription status:"
echo "https://console.aws.amazon.com/sns/v3/home?region=$AWS_REGION#/topic/$TOPIC_ARN"

