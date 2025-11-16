# Stripe Payment Debugging Guide

## Issue: Payments Not Appearing in Stripe Dashboard

If payments are not showing up in Stripe Dashboard, check the following:

### 1. Check Environment Variables

**Frontend (Netlify/local):**
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRICE_BASIC=price_xxxxx
VITE_STRIPE_PRICE_PREMIUM=price_xxxxx
VITE_STRIPE_PRICE_ENTERPRISE=price_xxxxx
```

**Backend (ECS/local):**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Verify Stripe Price IDs

1. Go to Stripe Dashboard → Products
2. Click on each product (Basic, Premium, Enterprise)
3. Copy the **Price ID** (starts with `price_`)
4. Set them in your environment variables

### 3. Check Browser Console

When saving a card, check the browser console for:
- `[billing] Attempting to create subscription for plan: ...`
- `[billing] Subscription created: ...` (success)
- `[billing] Subscription creation failed: ...` (error)

### 4. Check Backend Logs

Look for:
- `[billing] Created subscription sub_xxx for customer cus_xxx`
- `[billing] Confirmed payment intent pi_xxx for subscription sub_xxx`

### 5. Verify Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Check if webhook endpoint is configured: `https://api.priceguardbackend.live/api/stripe/webhook`
3. Check recent webhook events for:
   - `payment_method.attached`
   - `customer.subscription.created`
   - `invoice.payment_succeeded`

### 6. Test Subscription Creation Manually

```bash
curl -X POST http://localhost:4000/api/billing/create-subscription \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "priceId": "price_xxxxx"
  }'
```

### 7. Common Issues

**Issue: "No payment method found"**
- Card wasn't saved successfully
- Webhook didn't fire or failed
- Check `stripe_default_payment_method_id` in database

**Issue: "Price ID not configured"**
- Environment variable `VITE_STRIPE_PRICE_*` not set
- Plan name doesn't match (basic/premium/enterprise)

**Issue: Subscription created but no payment**
- Payment intent might need confirmation
- Check subscription status in Stripe Dashboard
- Verify payment method is attached to customer

### 8. Force Payment Creation

If subscription exists but payment didn't process:

1. Go to Stripe Dashboard → Subscriptions
2. Find the subscription
3. Click "Create invoice" or "Retry payment"
4. Or use Stripe API to create a payment intent manually

