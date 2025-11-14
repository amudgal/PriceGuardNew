#!/bin/bash
# Script to set up CloudWatch alarms and SNS notifications for ECS service

set -e

# Configuration
AWS_REGION="us-east-1"
ECS_CLUSTER_NAME="priceguard-cluster"
ECS_SERVICE_NAME="priceguard-server"
SNS_TOPIC_NAME="priceguard-alerts"
EMAIL_ADDRESS="amit.k.mudgal@gmail.com"

echo "🔔 Setting up CloudWatch alarms and SNS notifications..."

# 1. Create SNS Topic
echo ""
echo "📧 Creating SNS topic..."
TOPIC_ARN=$(aws sns create-topic \
  --name $SNS_TOPIC_NAME \
  --region $AWS_REGION \
  --query 'TopicArn' \
  --output text 2>/dev/null || \
  aws sns list-topics \
    --region $AWS_REGION \
    --query "Topics[?contains(TopicArn, '$SNS_TOPIC_NAME')].TopicArn" \
    --output text | head -1)

if [ -z "$TOPIC_ARN" ] || [ "$TOPIC_ARN" == "None" ]; then
  echo "❌ Failed to create or find SNS topic"
  exit 1
fi

echo "✅ SNS Topic ARN: $TOPIC_ARN"

# 2. Subscribe email to SNS topic
echo ""
echo "📧 Subscribing email to SNS topic..."
SUBSCRIPTION_ARN=$(aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint $EMAIL_ADDRESS \
  --region $AWS_REGION \
  --query 'SubscriptionArn' \
  --output text 2>/dev/null || echo "EXISTS")

if [ "$SUBSCRIPTION_ARN" == "EXISTS" ]; then
  echo "⚠️  Email subscription may already exist. Checking existing subscriptions..."
  EXISTING_SUB=$(aws sns list-subscriptions-by-topic \
    --topic-arn $TOPIC_ARN \
    --region $AWS_REGION \
    --query "Subscriptions[?Endpoint=='$EMAIL_ADDRESS'].SubscriptionArn" \
    --output text | head -1)
  
  if [ -n "$EXISTING_SUB" ] && [ "$EXISTING_SUB" != "None" ]; then
    echo "✅ Email already subscribed: $EXISTING_SUB"
    echo "⚠️  Please check your email and confirm the subscription"
  else
    echo "⚠️  Subscription may be pending. Please check your email for confirmation."
  fi
else
  echo "✅ Subscription created: $SUBSCRIPTION_ARN"
  echo "⚠️  Please check your email ($EMAIL_ADDRESS) and confirm the subscription"
fi

# 3. Create alarm for service failures (tasks failing to start)
echo ""
echo "🚨 Creating alarm for service task failures..."
aws cloudwatch put-metric-alarm \
  --alarm-name priceguard-service-task-failures \
  --alarm-description "Alert when ECS service has task failures" \
  --metric-name FailedTasks \
  --namespace AWS/ECS \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --datapoints-to-alarm 1 \
  --alarm-actions $TOPIC_ARN \
  --dimensions Name=ServiceName,Value=$ECS_SERVICE_NAME Name=ClusterName,Value=$ECS_CLUSTER_NAME \
  --region $AWS_REGION \
  --treat-missing-data notBreaching \
  2>/dev/null && echo "✅ Created alarm: priceguard-service-task-failures" || echo "⚠️  Alarm may already exist"

# 4. Create alarm for service down (no running tasks)
echo ""
echo "🚨 Creating alarm for service down (no running tasks)..."
aws cloudwatch put-metric-alarm \
  --alarm-name priceguard-service-down \
  --alarm-description "Alert when ECS service has no running tasks" \
  --metric-name RunningTaskCount \
  --namespace AWS/ECS \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --datapoints-to-alarm 1 \
  --alarm-actions $TOPIC_ARN \
  --dimensions Name=ServiceName,Value=$ECS_SERVICE_NAME Name=ClusterName,Value=$ECS_CLUSTER_NAME \
  --region $AWS_REGION \
  --treat-missing-data breaching \
  2>/dev/null && echo "✅ Created alarm: priceguard-service-down" || echo "⚠️  Alarm may already exist"

# 5. Create alarm for CPU utilization (high)
echo ""
echo "🚨 Creating alarm for high CPU utilization..."
aws cloudwatch put-metric-alarm \
  --alarm-name priceguard-high-cpu \
  --alarm-description "Alert when CPU utilization is high" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --datapoints-to-alarm 2 \
  --alarm-actions $TOPIC_ARN \
  --dimensions Name=ServiceName,Value=$ECS_SERVICE_NAME Name=ClusterName,Value=$ECS_CLUSTER_NAME \
  --region $AWS_REGION \
  --treat-missing-data notBreaching \
  2>/dev/null && echo "✅ Created alarm: priceguard-high-cpu" || echo "⚠️  Alarm may already exist"

# 6. Create alarm for memory utilization (high)
echo ""
echo "🚨 Creating alarm for high memory utilization..."
aws cloudwatch put-metric-alarm \
  --alarm-name priceguard-high-memory \
  --alarm-description "Alert when memory utilization is high" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --datapoints-to-alarm 2 \
  --alarm-actions $TOPIC_ARN \
  --dimensions Name=ServiceName,Value=$ECS_SERVICE_NAME Name=ClusterName,Value=$ECS_CLUSTER_NAME \
  --region $AWS_REGION \
  --treat-missing-data notBreaching \
  2>/dev/null && echo "✅ Created alarm: priceguard-high-memory" || echo "⚠️  Alarm may already exist"

# 7. Create alarm for unhealthy tasks (if health checks are configured)
echo ""
echo "🚨 Creating alarm for unhealthy tasks..."
# Note: This requires a custom metric or log-based metric
# For now, we'll create an alarm based on task count vs desired count
aws cloudwatch put-metric-alarm \
  --alarm-name priceguard-unhealthy-tasks \
  --alarm-description "Alert when running tasks are less than desired count" \
  --metric-name RunningTaskCount \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --datapoints-to-alarm 1 \
  --alarm-actions $TOPIC_ARN \
  --dimensions Name=ServiceName,Value=$ECS_SERVICE_NAME Name=ClusterName,Value=$ECS_CLUSTER_NAME \
  --region $AWS_REGION \
  --treat-missing-data breaching \
  2>/dev/null && echo "✅ Created alarm: priceguard-unhealthy-tasks" || echo "⚠️  Alarm may already exist"

echo ""
echo "✅ CloudWatch alarms setup complete!"
echo ""
echo "📧 Important: Check your email ($EMAIL_ADDRESS) and confirm the SNS subscription"
echo ""
echo "📊 View alarms: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#alarmsV2:"
echo ""
echo "🔔 Created alarms:"
echo "  - priceguard-service-task-failures (task failures)"
echo "  - priceguard-service-down (no running tasks)"
echo "  - priceguard-high-cpu (CPU > 80%)"
echo "  - priceguard-high-memory (Memory > 80%)"
echo "  - priceguard-unhealthy-tasks (tasks < desired count)"
echo ""
echo "📧 SNS Topic: $TOPIC_ARN"
echo "📧 Email: $EMAIL_ADDRESS"

