# CloudWatch Alarms and Email Notifications

This guide explains how to set up CloudWatch alarms that send email notifications when the PriceGuard backend service goes down or encounters issues.

## Overview

The monitoring setup includes:
- **SNS Topic** - For sending notifications
- **Email Subscription** - Sends alerts to amit.k.mudgal@gmail.com
- **CloudWatch Alarms** - Monitor various metrics and trigger alerts

## Alarms Configured

1. **Service Task Failures** - Alerts when tasks fail to start
2. **Service Down** - Alerts when no tasks are running
3. **High CPU Utilization** - Alerts when CPU > 80%
4. **High Memory Utilization** - Alerts when Memory > 80%
5. **Unhealthy Tasks** - Alerts when running tasks < desired count

## Setup Instructions

### Step 1: Run Setup Script

```bash
cd server
chmod +x setup-alarms.sh
./setup-alarms.sh
```

This script will:
1. Create SNS topic for alerts
2. Subscribe your email to the topic
3. Create CloudWatch alarms
4. Configure alarms to send notifications

### Step 2: Confirm Email Subscription

**Important:** After running the script, you must confirm the email subscription:

1. Check your email inbox (amit.k.mudgal@gmail.com)
2. Look for an email from AWS SNS
3. Click the confirmation link in the email
4. You should see a confirmation page

**Until you confirm the subscription, you won't receive any alerts!**

### Step 3: Verify Alarms

Check that alarms were created:

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix priceguard \
  --region us-east-1 \
  --query 'MetricAlarms[*].{Name:AlarmName,State:StateValue}' \
  --output table
```

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Create SNS Topic

```bash
aws sns create-topic \
  --name priceguard-alerts \
  --region us-east-1
```

### 2. Subscribe Email

```bash
TOPIC_ARN="arn:aws:sns:us-east-1:144935603834:priceguard-alerts"

aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint amit.k.mudgal@gmail.com \
  --region us-east-1
```

**Don't forget to confirm the subscription in your email!**

### 3. Create Alarms

#### Service Down Alarm

```bash
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
  --dimensions Name=ServiceName,Value=priceguard-server Name=ClusterName,Value=priceguard-cluster \
  --region us-east-1
```

#### Task Failures Alarm

```bash
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
  --dimensions Name=ServiceName,Value=priceguard-server Name=ClusterName,Value=priceguard-cluster \
  --region us-east-1
```

## Testing Alarms

### Test Email Notification

To test that email notifications are working:

```bash
TOPIC_ARN="arn:aws:sns:us-east-1:144935603834:priceguard-alerts"

aws sns publish \
  --topic-arn $TOPIC_ARN \
  --message "Test alert from PriceGuard backend monitoring" \
  --subject "PriceGuard Test Alert" \
  --region us-east-1
```

You should receive an email at amit.k.mudgal@gmail.com.

### Test Service Down Alarm

To test the service down alarm (be careful - this will stop your service):

1. **Stop the service temporarily:**
   ```bash
   aws ecs update-service \
     --cluster priceguard-cluster \
     --service priceguard-server \
     --desired-count 0 \
     --region us-east-1
   ```

2. **Wait for alarm to trigger** (should trigger within 2 minutes)

3. **Check your email** for the alert

4. **Restore the service:**
   ```bash
   aws ecs update-service \
     --cluster priceguard-cluster \
     --service priceguard-server \
     --desired-count 1 \
     --region us-east-1
   ```

## Alarm Details

### Service Down Alarm

- **Metric:** RunningTaskCount
- **Threshold:** < 1 running task
- **Period:** 60 seconds
- **Evaluation:** 2 consecutive periods
- **Action:** Send email notification

**This alarm triggers when:**
- No tasks are running
- Service is stopped
- All tasks have failed

### Task Failures Alarm

- **Metric:** FailedTasks
- **Threshold:** > 0 failures
- **Period:** 300 seconds (5 minutes)
- **Evaluation:** 1 period
- **Action:** Send email notification

**This alarm triggers when:**
- Tasks fail to start
- Tasks crash repeatedly
- Health checks fail

### High CPU Alarm

- **Metric:** CPUUtilization
- **Threshold:** > 80%
- **Period:** 300 seconds (5 minutes)
- **Evaluation:** 2 consecutive periods
- **Action:** Send email notification

### High Memory Alarm

- **Metric:** MemoryUtilization
- **Threshold:** > 80%
- **Period:** 300 seconds (5 minutes)
- **Evaluation:** 2 consecutive periods
- **Action:** Send email notification

## Viewing Alarms

### AWS Console

- **CloudWatch Alarms:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:
- **SNS Topic:** https://console.aws.amazon.com/sns/v3/home?region=us-east-1#/topic/arn:aws:sns:us-east-1:144935603834:priceguard-alerts

### CLI

```bash
# List all PriceGuard alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix priceguard \
  --region us-east-1 \
  --output table

# Get alarm history
aws cloudwatch describe-alarm-history \
  --alarm-name priceguard-service-down \
  --region us-east-1 \
  --max-items 10
```

## Email Notification Format

When an alarm triggers, you'll receive an email with:

- **Subject:** ALARM: "priceguard-service-down" in US East (N. Virginia)
- **Body:** 
  - Alarm details
  - Metric information
  - Threshold information
  - Timestamp
  - Link to CloudWatch console

Example email subject:
```
ALARM: "priceguard-service-down" in US East (N. Virginia)
```

## Troubleshooting

### Not Receiving Emails

1. **Check email subscription status:**
   ```bash
   aws sns list-subscriptions-by-topic \
     --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
     --region us-east-1
   ```

2. **Verify subscription is confirmed:**
   - SubscriptionArn should NOT contain "PendingConfirmation"
   - Check your email inbox for confirmation email

3. **Check spam folder:**
   - AWS emails may go to spam
   - Add AWS to your whitelist

4. **Test notification manually:**
   ```bash
   aws sns publish \
     --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
     --message "Test" \
     --subject "Test" \
     --region us-east-1
   ```

### Alarm Not Triggering

1. **Check alarm state:**
   ```bash
   aws cloudwatch describe-alarms \
     --alarm-names priceguard-service-down \
     --region us-east-1 \
     --query 'MetricAlarms[0].StateValue'
   ```

2. **Check alarm configuration:**
   ```bash
   aws cloudwatch describe-alarms \
     --alarm-names priceguard-service-down \
     --region us-east-1
   ```

3. **Check metric data:**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ECS \
     --metric-name RunningTaskCount \
     --dimensions Name=ServiceName,Value=priceguard-server Name=ClusterName,Value=priceguard-cluster \
     --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 60 \
     --statistics Average \
     --region us-east-1
   ```

### False Positives

If you're getting too many alerts:

1. **Adjust thresholds:**
   - Increase evaluation periods
   - Adjust threshold values
   - Change comparison operators

2. **Add alarm actions:**
   - Create different SNS topics for different severity levels
   - Use different email addresses for different alerts

3. **Disable unnecessary alarms:**
   ```bash
   aws cloudwatch disable-alarm-actions \
     --alarm-names priceguard-high-cpu \
     --region us-east-1
   ```

## Updating Email Address

To change the email address:

1. **Unsubscribe old email:**
   ```bash
   aws sns list-subscriptions-by-topic \
     --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
     --region us-east-1
   ```

2. **Subscribe new email:**
   ```bash
   aws sns subscribe \
     --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
     --protocol email \
     --notification-endpoint new-email@example.com \
     --region us-east-1
   ```

3. **Confirm subscription in new email**

## Cost Considerations

- **SNS:** Free tier includes 1,000 email notifications per month
- **CloudWatch Alarms:** First 10 alarms are free, then $0.10 per alarm per month
- **CloudWatch Metrics:** Free tier includes 10 custom metrics

**Estimated cost:** < $1/month for basic monitoring

## Best Practices

1. ✅ **Confirm email subscription** immediately after setup
2. ✅ **Test alarms** periodically to ensure they're working
3. ✅ **Monitor alarm state** in CloudWatch console
4. ✅ **Set up multiple notification channels** (email + SMS)
5. ✅ **Create different severity levels** for different alerts
6. ✅ **Review alarm history** regularly
7. ✅ **Adjust thresholds** based on actual usage patterns

## Additional Resources

- [CloudWatch Alarms Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)
- [SNS Email Notifications](https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html)
- [ECS CloudWatch Metrics](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-metrics.html)

