# PayPal Integration Guide for PriceGuard

This guide explains how to integrate PayPal payments (including micropayments) into your PriceGuard application.

## Overview

PayPal integration allows users to:
- Pay for subscriptions using PayPal
- Handle one-time micropayments
- Manage PayPal payment methods
- Receive payment notifications via webhooks

## Architecture

Similar to Stripe, PayPal integration follows this pattern:
1. **Frontend**: Uses PayPal JavaScript SDK for secure payment processing
2. **Backend**: Uses PayPal REST API for payment creation and management
3. **Webhooks**: PayPal sends event notifications to your backend
4. **Database**: Stores PayPal payment IDs and subscription info

## Setup Steps

### 1. Create PayPal Developer Account

1. Go to https://developer.paypal.com/
2. Sign in with your PayPal account (or create one)
3. Create a new app in the Dashboard
4. Get your **Client ID** and **Secret**:
   - Sandbox: For testing
   - Live: For production

### 2. Environment Variables

Add these to your `.env` file and AWS Secrets Manager:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=sb-xxxxxxxxx  # Sandbox client ID
PAYPAL_SECRET=sb-xxxxxxxxx     # Sandbox secret
PAYPAL_MODE=sandbox            # or "live" for production
PAYPAL_WEBHOOK_ID=WH-xxxxx     # Webhook ID (created in PayPal dashboard)
```

### 3. Install PayPal SDK

The backend uses `@paypal/checkout-server-sdk` for server-side operations.

### 4. Database Schema Updates

The `accounts` table already has Stripe fields. We'll add PayPal fields:

```sql
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_payment_method_token TEXT,
  ADD COLUMN IF NOT EXISTS paypal_billing_agreement_id TEXT;
```

### 5. PayPal Products & Plans

1. Go to PayPal Developer Dashboard
2. Navigate to **Products** or **Plans** (for subscriptions)
3. Create products/plans that match your subscription tiers:
   - Basic Plan ($X/month)
   - Premium Plan ($Y/month)
   - Enterprise Plan ($Z/month)

### 6. Webhook Setup

1. In PayPal Developer Dashboard, go to **Webhooks**
2. Create a new webhook endpoint: `https://api.priceguardbackend.live/api/paypal/webhook`
3. Subscribe to these events:
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.DENIED`
4. Copy the **Webhook ID** for your environment variables

## Integration Files Created

1. **`server/src/paypalClient.ts`** - PayPal SDK initialization
2. **`server/src/routes/paypal.ts`** - PayPal API endpoints
3. **`server/src/routes/paypalWebhook.ts`** - Webhook handler
4. **`src/components/PayPalButton.tsx`** - Frontend PayPal button component
5. **Updated `migrations.ts`** - Database schema additions

## Usage

### Frontend: Adding PayPal Payment Option

Users can choose between Stripe or PayPal when subscribing. The PayPal button component handles the payment flow.

### Backend: API Endpoints

- `POST /api/paypal/create-subscription` - Create a PayPal subscription
- `POST /api/paypal/create-order` - Create a one-time payment order
- `POST /api/paypal/capture-order` - Capture a payment order
- `GET /api/paypal/subscription/:id` - Get subscription details
- `POST /api/paypal/cancel-subscription` - Cancel a subscription
- `POST /api/paypal/webhook` - Handle PayPal webhooks

## Micropayments

For micropayments (small one-time payments), PayPal Standard Checkout is ideal:
- No minimum amount requirements (unlike some payment processors)
- Low fees for small transactions
- Quick checkout experience

Use the `create-order` and `capture-order` endpoints for one-time payments.

## Testing

1. Use PayPal Sandbox credentials for testing
2. Create test accounts in PayPal Sandbox
3. Use test card numbers provided by PayPal
4. Verify webhook delivery in PayPal Dashboard

## Security

- Never expose PayPal Secret on the frontend
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Validate all payment amounts server-side

## Resources

- [PayPal REST API Documentation](https://developer.paypal.com/docs/api/overview/)
- [PayPal JavaScript SDK](https://developer.paypal.com/sdk/js/)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)

