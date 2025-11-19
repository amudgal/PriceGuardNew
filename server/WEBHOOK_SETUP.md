# PayPal Webhook Setup Guide

## ⚠️ Important: Developer Dashboard vs Business Dashboard

**You're seeing "Webhook Simulator" because you're in the Business Dashboard.**

The **Webhook Simulator** in the Business Dashboard is for **testing existing webhooks only**. To **create new webhooks and get Webhook IDs**, you need to use the **Developer Dashboard**.

### Difference:

| Feature | Business Dashboard | Developer Dashboard |
|---------|-------------------|---------------------|
| URL | `paypal.com/business` | `developer.paypal.com` |
| Webhook Simulator | ✅ Yes (for testing) | ❌ No |
| Create Webhooks | ❌ No | ✅ Yes |
| Get Webhook ID | ❌ No | ✅ Yes |
| Manage Apps | ❌ No | ✅ Yes |

## How to Get PAYPAL_WEBHOOK_ID

### Step 1: Access PayPal Developer Dashboard

1. Go to **https://developer.paypal.com/** (NOT paypal.com/business)
2. Sign in with your PayPal Business account credentials
3. You should see **"My Apps & Credentials"** in the dashboard

### Step 2: Navigate to Your App

1. Scroll to **"My Apps & Credentials"** section
2. Select the app you're using for PriceGuard (or create a new one if needed)
   - If creating new: Click **"Create App"** → Choose **"Merchant"** → Name it (e.g., "PriceGuard Production")
3. Click on your app to open its details

### Step 3: Navigate to Webhooks Section

1. In your app's details page, scroll down to find **"Webhooks"** section
2. You'll see a list of existing webhooks (or an empty list if this is your first one)

### Step 4: Create a New Webhook

1. Click **"Add Webhook"** button (in the Webhooks section)
2. If you don't see "Add Webhook", look for **"+ Add"** or **"Create Webhook"** button

### Step 5: Configure the Webhook

1. **Webhook URL:**
   - **Local/Testing**: Use ngrok URL (see "Local Testing Setup" below)
   - **Production**: `https://api.priceguardbackend.live/api/paypal/webhook`

2. **Event Types** - Select these events (checkboxes):
   - ✅ `BILLING.SUBSCRIPTION.CREATED`
   - ✅ `BILLING.SUBSCRIPTION.UPDATED`
   - ✅ `BILLING.SUBSCRIPTION.CANCELLED`
   - ✅ `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - ✅ `PAYMENT.SALE.COMPLETED`
   - ✅ `PAYMENT.SALE.DENIED`

3. Click **"Save Webhook"** or **"Create"**

### Step 6: Get the Webhook ID

1. After saving, you'll see the webhook in your list
2. Click on the webhook name to view details
3. **Copy the Webhook ID** - It starts with `WH-`
   - Example: `WH-1234567890ABCDEF`
   - Format: `WH-` followed by alphanumeric characters

4. Add this ID to your environment variables:
   ```bash
   PAYPAL_WEBHOOK_ID=WH-1234567890ABCDEF
   ```

## Local Testing Setup (ngrok)

If you want to test webhooks locally before deploying:

### 1. Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### 2. Sign up for ngrok (free account)

1. Go to https://dashboard.ngrok.com/signup
2. Sign up with your email (free account is sufficient for testing)
3. Verify your email address

### 3. Get your authtoken

1. Go to https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (looks like: `2AbC123dEf456gHi789jKl0Mn_1OpQrStUvWxYz2AbC123`)

### 4. Configure ngrok with authtoken

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

Replace `YOUR_AUTHTOKEN_HERE` with the authtoken you copied.

Example:
```bash
ngrok config add-authtoken 2AbC123dEf456gHi789jKl0Mn_1OpQrStUvWxYz2AbC123
```

You should see: `Authtoken saved to configuration file: /Users/yourname/.ngrok2/ngrok.yml`

### 5. Start your backend server

```bash
cd server
npm run dev
# Server should be running on port 4000
```

### 6. Start ngrok tunnel

```bash
ngrok http 4000
```

### 7. Copy the ngrok URL

You'll see output like:
```
Forwarding  https://abc123def456.ngrok-free.app -> http://localhost:4000
```

### 8. Create Webhook in PayPal with ngrok URL

1. Use the ngrok HTTPS URL: `https://abc123def456.ngrok-free.app/api/paypal/webhook`
   - Replace `abc123def456.ngrok-free.app` with your actual ngrok URL
2. Create the webhook as described in "How to Get PAYPAL_WEBHOOK_ID" section above
3. Copy the Webhook ID

### 9. Test the Webhook

PayPal will automatically send a test event when you create the webhook. Check your server logs to confirm it's received.

**Note**: ngrok URLs change each time you restart ngrok (unless you have a paid plan with a static URL). You'll need to update the webhook URL in PayPal each time, or use a static ngrok domain.

## Production Setup

### Option 1: Direct Production URL

1. Ensure your backend is deployed and accessible at:
   ```
   https://api.priceguardbackend.live/api/paypal/webhook
   ```

2. Create webhook in PayPal using production URL

3. Copy Webhook ID to production environment variables

### Option 2: AWS Secrets Manager

1. Create secret in AWS Secrets Manager:
   - **Secret Name**: `priceguard/paypal-webhook-id`
   - **Value**: Your Webhook ID (e.g., `WH-1234567890ABCDEF`)

2. Update `ecs-task-definition.json`:
   ```json
   {
     "name": "PAYPAL_WEBHOOK_ID",
     "valueFrom": "arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/paypal-webhook-id-xxxxx"
   }
   ```

## Verify Webhook is Working

1. **Check PayPal Dashboard:**
   - Go to Webhooks → Your Webhook
   - Click **"Events"** tab
   - You should see event delivery status (✅ Success or ❌ Failed)

2. **Check Server Logs:**
   - Look for `[paypal] Processing webhook event: ...` messages
   - Check for any verification errors

3. **Test with PayPal Sandbox:**
   - Create a test subscription
   - Check webhook events in PayPal Dashboard
   - Verify your database is updated correctly

## Troubleshooting

### Webhook not receiving events?

1. **Verify webhook URL is accessible:**
   ```bash
   curl -X POST https://api.priceguardbackend.live/api/paypal/webhook
   ```

2. **Check PayPal Dashboard:**
   - Go to Webhooks → Your Webhook → Events
   - Look for delivery failures
   - Check error messages

3. **Verify webhook signature:**
   - Ensure `PAYPAL_WEBHOOK_ID` is set correctly
   - Check server logs for verification errors

4. **Check HTTPS requirement:**
   - PayPal requires HTTPS for webhook endpoints (except local testing with ngrok)
   - Ensure your production URL uses HTTPS

### Webhook ID format

- Should start with `WH-`
- Example: `WH-1234567890ABCDEF`
- Usually 18-20 characters total

### Multiple Environments

You'll need **separate webhooks** for:
- Sandbox (testing): Create webhook in Sandbox mode
- Production (live): Create webhook in Live mode

Each will have a different Webhook ID, so use different environment variables for each.

## Quick Reference

```bash
# Local Development (.env file)
PAYPAL_WEBHOOK_ID=WH-xxxxxxxxx

# Production (AWS Secrets Manager)
# Secret: priceguard/paypal-webhook-id
# Value: WH-xxxxxxxxx
```

## Next Steps

After setting up the webhook:

1. ✅ Add `PAYPAL_WEBHOOK_ID` to your environment variables
2. ✅ Verify webhook receives test events from PayPal
3. ✅ Test with a real payment/subscription
4. ✅ Monitor webhook delivery in PayPal Dashboard
5. ✅ Check server logs for webhook processing

