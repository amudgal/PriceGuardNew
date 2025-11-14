# Quick Start: CloudWatch Alarms Setup

## Quick Setup (5 minutes)

### Step 1: Run Setup Script

```bash
cd server
./setup-alarms.sh
```

### Step 2: Confirm Email Subscription

**CRITICAL:** Check your email (amit.k.mudgal@gmail.com) and click the confirmation link.

Without confirming, you won't receive any alerts!

### Step 3: Test (Optional)

```bash
# Test email notification
TOPIC_ARN="arn:aws:sns:us-east-1:144935603834:priceguard-alerts"

aws sns publish \
  --topic-arn $TOPIC_ARN \
  --message "Test alert from PriceGuard backend" \
  --subject "PriceGuard Test Alert" \
  --region us-east-1
```

You should receive an email at amit.k.mudgal@gmail.com.

## What Gets Created

✅ **SNS Topic:** `priceguard-alerts`
✅ **Email Subscription:** amit.k.mudgal@gmail.com
✅ **CloudWatch Alarms:**
   - `priceguard-service-down` - No running tasks
   - `priceguard-service-task-failures` - Task failures
   - `priceguard-high-cpu` - CPU > 80%
   - `priceguard-high-memory` - Memory > 80%
   - `priceguard-unhealthy-tasks` - Tasks < desired count

## When You'll Get Emails

You'll receive an email when:
- ✅ Service goes down (no running tasks)
- ✅ Tasks fail to start
- ✅ CPU utilization exceeds 80%
- ✅ Memory utilization exceeds 80%
- ✅ Running tasks are less than desired count

## Verify Setup

```bash
# List all alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix priceguard \
  --region us-east-1 \
  --query 'MetricAlarms[*].{Name:AlarmName,State:StateValue}' \
  --output table

# Check SNS subscription
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
  --region us-east-1
```

## Troubleshooting

### Not Receiving Emails?

1. **Check spam folder**
2. **Confirm subscription** - Check email for confirmation link
3. **Verify subscription status:**
   ```bash
   aws sns list-subscriptions-by-topic \
     --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
     --region us-east-1
   ```
4. **Test manually** (see Step 3 above)

### Alarm Not Triggering?

1. **Check alarm state:**
   ```bash
   aws cloudwatch describe-alarms \
     --alarm-names priceguard-service-down \
     --region us-east-1
   ```

2. **Check service status:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1
   ```

## View Alarms in AWS Console

- **CloudWatch Alarms:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:
- **SNS Topic:** https://console.aws.amazon.com/sns/v3/home?region=us-east-1#/topic/arn:aws:sns:us-east-1:144935603834:priceguard-alerts

## Additional Setup (Optional)

For log-based alarms (service crashes, database errors):

```bash
./setup-log-alarm.sh
```

This creates additional alarms for:
- Service start failures
- Database connection errors

## Documentation

- **Detailed Guide:** `CLOUDWATCH_ALARMS.md`
- **Deployment Guide:** `NEXT_STEPS.md`

## Support

If you have issues:
1. Check `CLOUDWATCH_ALARMS.md` for detailed troubleshooting
2. Verify AWS credentials have proper permissions
3. Check CloudWatch logs for errors

