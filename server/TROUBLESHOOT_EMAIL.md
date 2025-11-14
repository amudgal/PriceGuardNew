# Troubleshooting: Not Receiving SNS Email Notifications

## Quick Fix

### Step 1: Check Subscription Status

```bash
cd server
./check-sns-subscription.sh
```

This will:
- Check if subscription exists
- Show subscription status
- Resend confirmation if needed

### Step 2: Resend Confirmation Email

```bash
./resend-confirmation.sh
```

This will:
- Remove old pending subscription (if any)
- Create new subscription
- Send confirmation email

## Common Issues and Solutions

### Issue 1: Email in Spam Folder

**Solution:**
1. Check your SPAM/JUNK folder
2. Look for email from `no-reply@sns.amazonaws.com`
3. Subject: "AWS Notification - Subscription Confirmation"
4. Add AWS to your email whitelist

### Issue 2: Email Address Typo

**Check:**
```bash
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
  --region us-east-1 \
  --query 'Subscriptions[*].Endpoint' \
  --output table
```

**Fix:**
If email is wrong, unsubscribe and resubscribe:
```bash
# Get subscription ARN
SUB_ARN=$(aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
  --region us-east-1 \
  --query "Subscriptions[?Endpoint=='amit.k.mudgal@gmail.com'].SubscriptionArn" \
  --output text)

# Unsubscribe
aws sns unsubscribe --subscription-arn "$SUB_ARN" --region us-east-1

# Resubscribe with correct email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
  --protocol email \
  --notification-endpoint amit.k.mudgal@gmail.com \
  --region us-east-1
```

### Issue 3: AWS SES Sandbox Mode

If your AWS account is in SES sandbox mode, you can only send emails to verified email addresses.

**Check:**
```bash
aws ses get-identity-verification-attributes \
  --identities amit.k.mudgal@gmail.com \
  --region us-east-1
```

**Note:** SNS email subscriptions don't require SES verification, but if you're in sandbox mode, you may need to verify the email.

**Fix:** Verify email address in SES:
```bash
aws ses verify-email-identity \
  --email-address amit.k.mudgal@gmail.com \
  --region us-east-1
```

Then check your email for verification link.

### Issue 4: Email Provider Blocking AWS

Some email providers block emails from AWS.

**Solution:**
1. Check email provider's spam filter settings
2. Add `no-reply@sns.amazonaws.com` to whitelist
3. Check email provider's security settings
4. Try a different email address temporarily

### Issue 5: Subscription Already Confirmed

If subscription is already confirmed, you won't receive confirmation emails.

**Check:**
```bash
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
  --region us-east-1 \
  --query "Subscriptions[?Endpoint=='amit.k.mudgal@gmail.com']" \
  --output json
```

**If confirmed:**
- Subscription ARN will start with `arn:aws:sns:`
- You should receive notifications when alarms trigger
- Test with: `./check-sns-subscription.sh` (it will send a test email)

## Manual Verification

### Check Subscription Status

```bash
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
  --region us-east-1 \
  --output table
```

**Status meanings:**
- `PendingConfirmation` - Waiting for email confirmation
- `arn:aws:sns:...` - Confirmed and active

### Test Notification

If subscription is confirmed, test it:

```bash
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
  --message "Test notification from PriceGuard backend" \
  --subject "PriceGuard Test Notification" \
  --region us-east-1
```

You should receive an email within seconds.

### Check AWS Console

1. Go to: https://console.aws.amazon.com/sns/v3/home?region=us-east-1#/topic/arn:aws:sns:us-east-1:144935603834:priceguard-alerts
2. Click on "Subscriptions" tab
3. Check subscription status
4. If pending, click "Request confirmation" to resend

## Alternative: Use Different Email Address

If Gmail is blocking AWS emails, try:

1. **Different email provider:**
   ```bash
   aws sns subscribe \
     --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
     --protocol email \
     --notification-endpoint your-other-email@example.com \
     --region us-east-1
   ```

2. **AWS SES verified email:**
   - Verify email in SES first
   - Then subscribe to SNS topic

## Verify Email Works

Once subscription is confirmed, test it:

```bash
# Send test notification
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
  --message "Test notification - If you receive this, your email notifications are working!" \
  --subject "PriceGuard Test - Email Working" \
  --region us-east-1
```

You should receive an email within 1-2 minutes.

## Still Not Working?

1. **Check AWS CloudWatch Logs:**
   - Look for SNS errors in CloudWatch Logs
   - Check if there are any delivery failures

2. **Check IAM Permissions:**
   - Verify your AWS credentials have SNS permissions
   - Check if there are any SNS policy restrictions

3. **Contact AWS Support:**
   - If nothing works, contact AWS Support
   - They can check SNS delivery logs

4. **Use SMS instead:**
   - SNS supports SMS notifications
   - More reliable than email in some cases

## Quick Commands Reference

```bash
# Check subscription status
./check-sns-subscription.sh

# Resend confirmation
./resend-confirmation.sh

# List all subscriptions
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
  --region us-east-1

# Send test notification
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:144935603834:priceguard-alerts \
  --message "Test" \
  --subject "Test" \
  --region us-east-1

# View in AWS Console
open "https://console.aws.amazon.com/sns/v3/home?region=us-east-1#/topic/arn:aws:sns:us-east-1:144935603834:priceguard-alerts"
```

