#!/bin/bash
# Script to set up CloudWatch log-based alarm for service failures

set -e

# Configuration
AWS_REGION="us-east-1"
LOG_GROUP_NAME="/ecs/priceguard-server"
SNS_TOPIC_NAME="priceguard-alerts"
ALARM_NAME="priceguard-service-crash"

echo "🔔 Setting up log-based alarm for service crashes..."

# 1. Get SNS Topic ARN
TOPIC_ARN=$(aws sns list-topics \
  --region $AWS_REGION \
  --query "Topics[?contains(TopicArn, '$SNS_TOPIC_NAME')].TopicArn" \
  --output text | head -1)

if [ -z "$TOPIC_ARN" ] || [ "$TOPIC_ARN" == "None" ]; then
  echo "❌ SNS topic not found. Please run setup-alarms.sh first"
  exit 1
fi

echo "✅ Using SNS Topic: $TOPIC_ARN"

# 2. Create metric filter for service failures
echo ""
echo "📊 Creating metric filter for service failures..."

# Check if metric filter already exists
EXISTING_FILTER=$(aws logs describe-metric-filters \
  --log-group-name $LOG_GROUP_NAME \
  --filter-name-prefix priceguard-service-error \
  --region $AWS_REGION \
  --query 'metricFilters[0].filterName' \
  --output text 2>/dev/null || echo "None")

if [ "$EXISTING_FILTER" == "None" ] || [ -z "$EXISTING_FILTER" ]; then
  # Create metric filter for "Failed to start server"
  aws logs put-metric-filter \
    --log-group-name $LOG_GROUP_NAME \
    --filter-name priceguard-service-error \
    --filter-pattern "Failed to start server" \
    --metric-transformations \
      metricName=ServiceStartFailure \
      metricNamespace=PriceGuard/ECS \
      metricValue=1 \
      defaultValue=0 \
    --region $AWS_REGION \
    2>/dev/null && echo "✅ Created metric filter: priceguard-service-error" || echo "⚠️  Failed to create metric filter"
else
  echo "⚠️  Metric filter already exists: $EXISTING_FILTER"
fi

# 3. Create metric filter for database connection errors
echo ""
echo "📊 Creating metric filter for database connection errors..."

EXISTING_DB_FILTER=$(aws logs describe-metric-filters \
  --log-group-name $LOG_GROUP_NAME \
  --filter-name-prefix priceguard-db-error \
  --region $AWS_REGION \
  --query 'metricFilters[0].filterName' \
  --output text 2>/dev/null || echo "None")

if [ "$EXISTING_DB_FILTER" == "None" ] || [ -z "$EXISTING_DB_FILTER" ]; then
  aws logs put-metric-filter \
    --log-group-name $LOG_GROUP_NAME \
    --filter-name priceguard-db-error \
    --filter-pattern "[timestamp, level=\"ERROR\", ... , message=\"*database*\", ...]" \
    --metric-transformations \
      metricName=DatabaseConnectionError \
      metricNamespace=PriceGuard/ECS \
      metricValue=1 \
      defaultValue=0 \
    --region $AWS_REGION \
    2>/dev/null && echo "✅ Created metric filter: priceguard-db-error" || echo "⚠️  Failed to create metric filter"
else
  echo "⚠️  Metric filter already exists: $EXISTING_DB_FILTER"
fi

# 4. Create alarm for service start failures
echo ""
echo "🚨 Creating alarm for service start failures..."

aws cloudwatch put-metric-alarm \
  --alarm-name priceguard-service-start-failure \
  --alarm-description "Alert when service fails to start" \
  --metric-name ServiceStartFailure \
  --namespace PriceGuard/ECS \
  --statistic Sum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --datapoints-to-alarm 1 \
  --alarm-actions $TOPIC_ARN \
  --region $AWS_REGION \
  --treat-missing-data notBreaching \
  2>/dev/null && echo "✅ Created alarm: priceguard-service-start-failure" || echo "⚠️  Alarm may already exist"

# 5. Create alarm for database connection errors
echo ""
echo "🚨 Creating alarm for database connection errors..."

aws cloudwatch put-metric-alarm \
  --alarm-name priceguard-database-error \
  --alarm-description "Alert when database connection fails" \
  --metric-name DatabaseConnectionError \
  --namespace PriceGuard/ECS \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --datapoints-to-alarm 1 \
  --alarm-actions $TOPIC_ARN \
  --region $AWS_REGION \
  --treat-missing-data notBreaching \
  2>/dev/null && echo "✅ Created alarm: priceguard-database-error" || echo "⚠️  Alarm may already exist"

echo ""
echo "✅ Log-based alarms setup complete!"
echo ""
echo "🔔 Created alarms:"
echo "  - priceguard-service-start-failure (service fails to start)"
echo "  - priceguard-database-error (database connection errors)"
echo ""
echo "📊 View alarms: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#alarmsV2:"

