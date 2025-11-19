# PayPal Integration Setup Instructions

## Quick Start Guide

This guide will help you set up PayPal micropayments and subscriptions in your PriceGuard application.

## Step 1: Create PayPal Developer Account

1. Go to https://developer.paypal.com/
2. Sign in with your PayPal account (or create one)
3. Click **"Dashboard"** in the top navigation
4. Click **"Create App"** button
5. Choose **"Merchant"** or **"Partner"** account type
6. Fill in app details:
   - App Name: `PriceGuard Production` (or similar)
   - Sandbox: Toggle **OFF** for production, **ON** for testing
7. Click **"Create App"**
8. Copy your **Client ID** and **Secret**:
   - **Sandbox** credentials: For testing
   - **Live** credentials: For production

## Step 2: Set Environment Variables

### Local Development

Add to `server/.env`:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=sb-xxxxxxxxx  # Sandbox Client ID
PAYPAL_SECRET=sb-xxxxxxxxx     # Sandbox Secret
PAYPAL_MODE=sandbox            # Use "live" for production
PAYPAL_WEBHOOK_ID=WH-xxxxx     # Webhook ID (created in Step 3)
FRONTEND_URL=http://localhost:3000
```

### Production (AWS Secrets Manager)

Add these secrets to AWS Secrets Manager:

1. **Secret Name**: `priceguard/paypal-client-id`
   - **Value**: Your PayPal Client ID (sandbox or live)

2. **Secret Name**: `priceguard/paypal-secret`
   - **Value**: Your PayPal Secret (sandbox or live)

3. **Secret Name**: `priceguard/paypal-webhook-id`
   - **Value**: Your PayPal Webhook ID (from Step 3)

Then update `ecs-task-definition.json` to include these secrets.

## Step 3: Create PayPal Webhook

1. Go to PayPal Developer Dashboard
2. Navigate to **"Webhooks"** in the left sidebar
3. Click **"Create Webhook"**
4. Enter webhook URL:
   - **Development**: `http://your-ngrok-url.ngrok.io/api/paypal/webhook`
   - **Production**: `https://api.priceguardbackend.live/api/paypal/webhook`
5. Subscribe to these events:
   - ✅ `BILLING.SUBSCRIPTION.CREATED`
   - ✅ `BILLING.SUBSCRIPTION.UPDATED`
   - ✅ `BILLING.SUBSCRIPTION.CANCELLED`
   - ✅ `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - ✅ `PAYMENT.SALE.COMPLETED`
   - ✅ `PAYMENT.SALE.DENIED`
6. Click **"Save Webhook"**
7. Copy the **Webhook ID** (starts with `WH-`)

## Step 4: Create PayPal Plans (for Subscriptions)

1. Go to PayPal Developer Dashboard
2. Navigate to **"Plans"** or use PayPal REST API
3. Create plans matching your subscription tiers:
   - Basic Plan: `$X/month`
   - Premium Plan: `$Y/month`
   - Enterprise Plan: `$Z/month`
4. Copy the **Plan IDs** for each tier
5. Add Plan IDs to your frontend environment variables:
   ```bash
   VITE_PAYPAL_PLAN_BASIC=P-xxxxxxxxx
   VITE_PAYPAL_PLAN_PREMIUM=P-xxxxxxxxx
   VITE_PAYPAL_PLAN_ENTERPRISE=P-xxxxxxxxx
   ```

## Step 5: Frontend Environment Variables (Netlify)

Add to Netlify environment variables:

```
VITE_PAYPAL_CLIENT_ID=sb-xxxxxxxxx  # Sandbox Client ID
VITE_PAYPAL_PLAN_BASIC=P-xxxxxxxxx
VITE_PAYPAL_PLAN_PREMIUM=P-xxxxxxxxx
VITE_PAYPAL_PLAN_ENTERPRISE=P-xxxxxxxxx
```

## Step 6: Install Dependencies

```bash
cd server
npm install @paypal/checkout-server-sdk
```

## Step 7: Run Database Migrations

The migrations will automatically add PayPal columns to the `accounts` table:

```bash
cd server
npm run db:migrate
```

Or the migrations will run automatically when you start the server.

## Step 8: Test Integration

### Testing One-Time Payments (Micropayments)

1. Use the `PayPalButton` component with `amount` prop:
   ```tsx
   <PayPalButton
     email={userEmail}
     amount={10.99}
     currency="USD"
     description="PriceGuard payment"
     onCompleted={() => console.log("Payment completed!")}
   />
   ```

### Testing Subscriptions

1. Use the `PayPalButton` component with `planId` prop:
   ```tsx
   <PayPalButton
     email={userEmail}
     planId={planId} // From PayPal Plans
     onCompleted={() => console.log("Subscription created!")}
   />
   ```

## Step 9: Update ECS Task Definition

Update `server/ecs-task-definition.json` to include PayPal secrets:

```json
"secrets": [
  {
    "name": "PAYPAL_CLIENT_ID",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/paypal-client-id-xxxxx"
  },
  {
    "name": "PAYPAL_SECRET",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/paypal-secret-xxxxx"
  },
  {
    "name": "PAYPAL_WEBHOOK_ID",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/paypal-webhook-id-xxxxx"
  },
  {
    "name": "PAYPAL_MODE",
    "value": "live"
  },
  {
    "name": "FRONTEND_URL",
    "value": "https://your-frontend-domain.netlify.app"
  }
]
```

## API Endpoints

### Backend Endpoints

- `POST /api/paypal/create-order` - Create a one-time payment order
  ```json
  {
    "email": "user@example.com",
    "amount": 10.99,
    "currency": "USD",
    "description": "Payment description"
  }
  ```

- `POST /api/paypal/capture-order` - Capture a payment order
  ```json
  {
    "orderId": "ORDER_ID",
    "email": "user@example.com"
  }
  ```

- `POST /api/paypal/create-subscription` - Create a subscription
  ```json
  {
    "email": "user@example.com",
    "planId": "P-xxxxxxxxx"
  }
  ```

- `GET /api/paypal/subscription/:id` - Get subscription details

- `POST /api/paypal/cancel-subscription` - Cancel a subscription
  ```json
  {
    "email": "user@example.com",
    "reason": "Optional cancellation reason"
  }
  ```

- `POST /api/paypal/webhook` - Handle PayPal webhook events (automatically configured)

## Frontend Usage Example

```tsx
import { PayPalButton } from "./components/PayPalButton";

// For one-time payments (micropayments)
<PayPalButton
  email={userEmail}
  amount={9.99}
  currency="USD"
  description="PriceGuard Premium Plan"
  onCompleted={() => {
    console.log("Payment successful!");
    // Refresh subscription status
  }}
  onError={(error) => {
    console.error("Payment failed:", error);
  }}
/>

// For subscriptions
<PayPalButton
  email={userEmail}
  planId={paypalPlanId}
  onCompleted={() => {
    console.log("Subscription created!");
    // Refresh subscription status
  }}
/>
```

## Testing with PayPal Sandbox

1. Use Sandbox credentials in your `.env` file
2. Create test accounts in PayPal Sandbox
3. Use test PayPal accounts for testing payments
4. Check webhook delivery in PayPal Dashboard → Webhooks → [Your Webhook] → Events

## Production Checklist

- [ ] Switch `PAYPAL_MODE` to `live`
- [ ] Use Live credentials (Client ID & Secret)
- [ ] Update webhook URL to production URL
- [ ] Test webhook delivery
- [ ] Update frontend `VITE_PAYPAL_CLIENT_ID` to live Client ID
- [ ] Create live PayPal Plans
- [ ] Update Plan IDs in frontend environment variables

## Troubleshooting

### Webhook not receiving events
- Verify webhook URL is accessible from the internet
- Check PayPal Dashboard → Webhooks → Events for delivery status
- Ensure webhook endpoint is using `express.raw()` middleware

### Payments not completing
- Check PayPal Dashboard for transaction details
- Verify Client ID and Secret are correct
- Ensure `FRONTEND_URL` environment variable is set correctly

### TypeScript errors
- The PayPal SDK doesn't have TypeScript types, so we use `@ts-ignore` comments
- This is expected and safe - the SDK works correctly at runtime

## Resources

- [PayPal REST API Documentation](https://developer.paypal.com/docs/api/overview/)
- [PayPal JavaScript SDK](https://developer.paypal.com/sdk/js/)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [PayPal Plans API](https://developer.paypal.com/docs/api/subscriptions/v1/)

