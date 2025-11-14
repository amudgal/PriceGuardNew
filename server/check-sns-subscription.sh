#!/bin/bash
# Script to check SNS subscription status and troubleshoot email issues

set -e

# Configuration
AWS_REGION="us-east-1"
SNS_TOPIC_NAME="priceguard-alerts"
EMAIL_ADDRESS="amit.k.mudgal@gmail.com"

echo "🔍 Checking SNS subscription status..."

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

# 2. List all subscriptions for this topic
echo "📧 Checking subscriptions for topic..."
SUBSCRIPTIONS=$(aws sns list-subscriptions-by-topic \
  --topic-arn $TOPIC_ARN \
  --region $AWS_REGION \
  --query 'Subscriptions[*].{Endpoint:Endpoint,Protocol:Protocol,SubscriptionArn:SubscriptionArn,Owner:Owner}' \
  --output table)

echo "$SUBSCRIPTIONS"
echo ""

# 3. Check specific email subscription
echo "📧 Checking subscription for $EMAIL_ADDRESS..."
EMAIL_SUB=$(aws sns list-subscriptions-by-topic \
  --topic-arn $TOPIC_ARN \
  --region $AWS_REGION \
  --query "Subscriptions[?Endpoint=='$EMAIL_ADDRESS']" \
  --output json)

if [ -z "$EMAIL_SUB" ] || [ "$EMAIL_SUB" == "[]" ]; then
  echo "❌ No subscription found for $EMAIL_ADDRESS"
  echo ""
  echo "🔧 Creating new subscription..."
  SUBSCRIPTION_ARN=$(aws sns subscribe \
    --topic-arn $TOPIC_ARN \
    --protocol email \
    --notification-endpoint $EMAIL_ADDRESS \
    --region $AWS_REGION \
    --query 'SubscriptionArn' \
    --output text)
  
  echo "✅ Subscription created: $SUBSCRIPTION_ARN"
  echo "⚠️  Please check your email ($EMAIL_ADDRESS) for confirmation"
else
  echo "$EMAIL_SUB" | jq -r '.[] | "Subscription ARN: \(.SubscriptionArn)\nProtocol: \(.Protocol)\nEndpoint: \(.Endpoint)\nOwner: \(.Owner)"'
  echo ""
  
  SUBSCRIPTION_ARN=$(echo "$EMAIL_SUB" | jq -r '.[0].SubscriptionArn')
  
  if [[ "$SUBSCRIPTION_ARN" == *"PendingConfirmation"* ]]; then
    echo "⚠️  Subscription is PENDING CONFIRMATION"
    echo "📧 Check your email ($EMAIL_ADDRESS) for the confirmation email"
    echo "📧 Also check your SPAM/JUNK folder"
    echo ""
    echo "🔧 Resending confirmation email..."
    
    # Unsubscribe and resubscribe to resend confirmation
    aws sns unsubscribe \
      --subscription-arn "$SUBSCRIPTION_ARN" \
      --region $AWS_REGION > /dev/null 2>&1 || true
    
    sleep 2
    
    NEW_SUB=$(aws sns subscribe \
      --topic-arn $TOPIC_ARN \
      --protocol email \
      --notification-endpoint $EMAIL_ADDRESS \
      --region $AWS_REGION \
      --query 'SubscriptionArn' \
      --output text)
    
    echo "✅ Confirmation email resent. New subscription: $NEW_SUB"
    echo "📧 Please check your email ($EMAIL_ADDRESS) again"
  elif [[ "$SUBSCRIPTION_ARN" == *"arn:aws:sns"* ]]; then
    echo "✅ Subscription is CONFIRMED"
    echo "📧 Email: $EMAIL_ADDRESS"
    echo "📧 Subscription ARN: $SUBSCRIPTION_ARN"
    echo ""
    echo "🧪 Testing notification..."
    aws sns publish \
      --topic-arn $TOPIC_ARN \
      --message "Test notification from PriceGuard backend monitoring system. If you received this, your email notifications are working correctly!" \
      --subject "PriceGuard Test Notification" \
      --region $AWS_REGION
    
    echo "✅ Test notification sent. Check your email ($EMAIL_ADDRESS)"
  else
    echo "⚠️  Unknown subscription status: $SUBSCRIPTION_ARN"
  fi
fi

echo ""
echo "📊 View subscription in AWS Console:"
echo "https://console.aws.amazon.com/sns/v3/home?region=$AWS_REGION#/topic/$TOPIC_ARN"

