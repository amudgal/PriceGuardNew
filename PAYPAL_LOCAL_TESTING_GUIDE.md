# PayPal Integration - Local Testing Guide

This guide walks you through testing PayPal integration locally, step by step.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Get PayPal Sandbox Credentials](#step-1-get-paypal-sandbox-credentials)
3. [Step 2: Configure Backend Environment](#step-2-configure-backend-environment)
4. [Step 3: Configure Frontend Environment](#step-3-configure-frontend-environment)
5. [Step 4: Set Up Database](#step-4-set-up-database)
6. [Step 5: Install Dependencies](#step-5-install-dependencies)
7. [Step 6: Start the Backend Server](#step-6-start-the-backend-server)
8. [Step 7: Start the Frontend Server](#step-7-start-the-frontend-server)
9. [Step 8: Test One-Time Payments](#step-8-test-one-time-payments)
10. [Step 9: Test Subscriptions](#step-9-test-subscriptions)
11. [Step 10: Test Webhooks (Optional)](#step-10-test-webhooks-optional)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:
- ✅ Node.js 20+ installed
- ✅ PostgreSQL 14+ database running
- ✅ A PayPal Developer account (free)
- ✅ Git repository cloned
- ✅ Basic understanding of terminal/command line

---

## Step 1: Get PayPal Sandbox Credentials

### 1.1 Create PayPal Developer Account

1. Go to [https://developer.paypal.com/](https://developer.paypal.com/)
2. Sign in with your PayPal account (or create one)
3. Navigate to **Dashboard** → **My Apps & Credentials**

### 1.2 Create a Sandbox App

1. In the **Sandbox** tab, click **Create App**
2. Fill in:
   - **App Name**: `PriceGuard Local Testing` (or any name)
   - **Merchant**: Select your sandbox business account
3. Click **Create App**

### 1.3 Get Your Credentials

After creating the app, you'll see:
- **Client ID**: Starts with `sb-` (e.g., `sb-xxxxxxxxx`)
- **Secret**: Click **Show** to reveal (starts with `sb-`)

**📝 Save these credentials** - you'll need them in the next steps.

### 1.4 Create Test Accounts (Optional but Recommended)

1. Go to **Dashboard** → **Accounts** (Sandbox)
2. Create test accounts:
   - **Personal Account**: For testing buyer experience
   - **Business Account**: Already created with your app

**Note**: PayPal Sandbox provides pre-configured test accounts. You can use:
- **Buyer Account**: `sb-buyer@personal.example.com` (password: provided in dashboard)
- **Business Account**: Your app's merchant account

---

## Step 2: Configure Backend Environment

### 2.1 Navigate to Server Directory

```bash
cd priceguard/server
```

### 2.2 Create `.env` File

```bash
cp env.example .env
```

### 2.3 Edit `.env` File

Open `priceguard/server/.env` and add/update these PayPal variables:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=sb-xxxxxxxxx          # Your Sandbox Client ID from Step 1.3
PAYPAL_SECRET=sb-xxxxxxxxx              # Your Sandbox Secret from Step 1.3
PAYPAL_MODE=sandbox                    # Must be "sandbox" for local testing
PAYPAL_WEBHOOK_ID=                     # Leave empty for now (we'll set this in Step 10)
FRONTEND_URL=http://localhost:5173     # Your frontend URL (Vite default port)

# Database (ensure this is configured)
DATABASE_URL=postgres://user:password@localhost:5432/priceguard
PGSSLMODE=disable

# Other required variables
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=4000
NODE_ENV=development
```

**⚠️ Important**: 
- Replace `sb-xxxxxxxxx` with your actual credentials from Step 1.3
- Ensure `PAYPAL_MODE=sandbox` (not "live")
- Update `DATABASE_URL` with your PostgreSQL connection string

---

## Step 3: Configure Frontend Environment

### 3.1 Navigate to Frontend Directory

```bash
cd priceguard
```

### 3.2 Create `.env` File (if it doesn't exist)

```bash
touch .env
```

### 3.3 Edit `.env` File

Open `priceguard/.env` and add:

```bash
# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=sb-xxxxxxxxx     # Your Sandbox Client ID from Step 1.3

# Optional: PayPal Plan IDs (for subscription testing)
# You'll create these in PayPal Dashboard if testing subscriptions
VITE_PAYPAL_PLAN_BASIC=P-xxxxxxxxx
VITE_PAYPAL_PLAN_PREMIUM=P-xxxxxxxxx
VITE_PAYPAL_PLAN_ENTERPRISE=P-xxxxxxxxx

# API Configuration
VITE_API_BASE_URL=http://localhost:4000
```

**⚠️ Important**: 
- Replace `sb-xxxxxxxxx` with your actual Client ID
- Plan IDs are optional - only needed if testing subscriptions
- The frontend uses Vite, so all env variables must start with `VITE_`

---

## Step 4: Set Up Database

### 4.1 Verify Database Connection

```bash
cd priceguard/server
npm run db:check
```

**Expected Output**:
```
Database connected successfully!
Database: priceguard
Timestamp: 2024-01-15T10:30:00.000Z
```

If you see an error, check your `DATABASE_URL` in `.env`.

### 4.2 Run Database Migrations

```bash
npm run db:migrate
```

**Expected Output**:
```
Running migrations...
✓ Created accounts table
✓ Added PayPal columns to accounts table
Migrations completed successfully
```

This creates the `accounts` table with PayPal-related columns:
- `paypal_payer_id`
- `paypal_subscription_id`
- `paypal_payment_method_token`
- `paypal_billing_agreement_id`

---

## Step 5: Install Dependencies

### 5.1 Install Backend Dependencies

```bash
cd priceguard/server
npm install
```

**Verify PayPal SDK is installed**:
```bash
npm list @paypal/checkout-server-sdk
```

Should show: `@paypal/checkout-server-sdk@^1.0.3`

### 5.2 Install Frontend Dependencies

```bash
cd priceguard
npm install
```

---

## Step 6: Start the Backend Server

### 6.1 Start the Server

```bash
cd priceguard/server
npm run dev
```

**Expected Output**:
```
[env] Loaded .env from: /path/to/server/.env
[paypal] PayPal integration enabled (mode: sandbox)
[bootstrap] Starting server...
[bootstrap] Migrations completed successfully
[server] Server listening on port 4000 on 0.0.0.0
[server] Health check endpoint: http://0.0.0.0:4000/health
[server] API endpoints: http://0.0.0.0:4000/api/*
```

**✅ Success Indicators**:
- ✅ `PayPal integration enabled (mode: sandbox)` - PayPal is configured
- ✅ `Server listening on port 4000` - Server is running
- ✅ No errors about missing credentials

### 6.2 Verify Backend is Running

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:4000/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "priceguard-server",
  "database": "connected"
}
```

**Keep this terminal open** - the server needs to keep running.

---

## Step 7: Start the Frontend Server

### 7.1 Start the Frontend

Open a **new terminal** (keep backend running):

```bash
cd priceguard
npm run dev
```

**Expected Output**:
```
  VITE v5.4.10  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 7.2 Verify Frontend is Running

1. Open your browser: [http://localhost:5173](http://localhost:5173)
2. You should see the PriceGuard homepage
3. Open browser DevTools (F12) → Console
4. Check for errors - there should be no PayPal-related errors

**✅ Success Indicators**:
- ✅ Frontend loads without errors
- ✅ No console errors about `VITE_PAYPAL_CLIENT_ID`

---

## Step 8: Test One-Time Payments

### 8.1 Create a Test Account

1. Navigate to the signup/login page in your frontend
2. Create a test account with:
   - **Email**: `test@example.com` (or any email)
   - **Password**: `Test123!` (or any password)
   - **Other fields**: Fill as needed

3. **Register the account** - this creates an account in your database

### 8.2 Add PayPal Button to Test Page

You can test the PayPal button in two ways:

#### Option A: Use Existing Component

If `PayPalButton` is already integrated in your app:
1. Navigate to the page with the PayPal button
2. The button should appear automatically

#### Option B: Create a Test Page

Create a simple test page to test PayPal:

1. Create `priceguard/src/pages/PayPalTestPage.tsx`:

```tsx
import { PayPalButton } from "../components/PayPalButton";

export function PayPalTestPage() {
  return (
    <div style={{ padding: "2rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1>PayPal Test Page</h1>
      
      <div style={{ marginTop: "2rem" }}>
        <h2>One-Time Payment Test</h2>
        <p>Amount: $9.99</p>
        <PayPalButton
          email="test@example.com"  // Use the email you registered
          amount={9.99}
          currency="USD"
          description="Test payment"
          onCompleted={() => {
            alert("Payment successful!");
            console.log("Payment completed");
          }}
          onError={(error) => {
            alert(`Payment failed: ${error}`);
            console.error("Payment error:", error);
          }}
        />
      </div>
    </div>
  );
}
```

2. Add route in your router (if using React Router)

### 8.3 Test the Payment Flow

1. **Click the PayPal button** on your test page
2. **PayPal popup/modal should appear** (or redirect to PayPal)
3. **Log in with Sandbox test account**:
   - Use the test buyer account from Step 1.4
   - Or use: `sb-buyer@personal.example.com` (password from PayPal Dashboard)
4. **Complete the payment**:
   - Review the payment details
   - Click **Pay Now** or **Approve Payment**
5. **Verify success**:
   - You should see "Payment successful!" alert
   - Check browser console for: `[paypal] Payment captured: {...}`
   - Check backend terminal for: `[paypal] Processing payment...`

### 8.4 Verify Payment in Database

Check that the payment was recorded:

```bash
# Connect to your PostgreSQL database
psql -d priceguard

# Query the accounts table
SELECT email, paypal_payer_id, updated_at 
FROM accounts 
WHERE email = 'test@example.com';
```

**Expected Result**:
- `paypal_payer_id` should be populated (e.g., `PAYER123456789`)
- `updated_at` should be recent

### 8.5 Check Backend Logs

In your backend terminal, you should see:

```
[paypal] Creating order for email: test@example.com
[paypal] Order created: ORDER-123456789
[paypal] Capturing order: ORDER-123456789
[paypal] Payment captured successfully
```

---

## Step 9: Test Subscriptions

### 9.1 Create PayPal Plans (Required for Subscriptions)

Before testing subscriptions, you need to create PayPal Plans:

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to **Products** → **Subscriptions** → **Plans**
3. Click **Create Plan**
4. Fill in:
   - **Plan Name**: `PriceGuard Basic`
   - **Billing Cycle**: Monthly
   - **Price**: $9.99 USD
   - **Setup Fee**: $0
5. Click **Create Plan**
6. **Copy the Plan ID** (starts with `P-`, e.g., `P-5ML427713U1234567`)

Repeat for other plans (Premium, Enterprise) if needed.

### 9.2 Update Frontend `.env` with Plan IDs

Update `priceguard/.env`:

```bash
VITE_PAYPAL_PLAN_BASIC=P-5ML427713U1234567    # Your Basic plan ID
VITE_PAYPAL_PLAN_PREMIUM=P-5ML427713U1234568  # Your Premium plan ID
VITE_PAYPAL_PLAN_ENTERPRISE=P-5ML427713U1234569  # Your Enterprise plan ID
```

**Restart the frontend server** after updating `.env`:

```bash
# Stop frontend (Ctrl+C)
npm run dev  # Start again
```

### 9.3 Test Subscription Flow

1. **Create a test page** or use existing subscription page
2. **Add PayPal subscription button**:

```tsx
<PayPalButton
  email="test@example.com"
  planId="P-5ML427713U1234567"  // Your Basic plan ID
  onCompleted={() => {
    alert("Subscription created!");
    console.log("Subscription completed");
  }}
  onError={(error) => {
    alert(`Subscription failed: ${error}`);
    console.error("Subscription error:", error);
  }}
/>
```

3. **Click the subscription button**
4. **Approve subscription** in PayPal popup
5. **Verify subscription**:
   - Check browser console for success message
   - Check backend logs
   - Query database:

```sql
SELECT email, paypal_subscription_id, subscription_status 
FROM accounts 
WHERE email = 'test@example.com';
```

**Expected Result**:
- `paypal_subscription_id` should be populated (e.g., `I-BW452GLLEP1G`)
- `subscription_status` should be `active`

### 9.4 Test Subscription Cancellation

You can test cancellation via API:

```bash
curl -X POST http://localhost:4000/api/paypal/cancel-subscription \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "reason": "Testing cancellation"
  }'
```

**Expected Response**:
```json
{
  "success": true
}
```

---

## Step 10: Test Webhooks (Optional)

Webhooks allow PayPal to notify your backend about payment events. For local testing, you need to expose your local server to the internet using a tunnel service.

### 10.1 Install ngrok

```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com/download
```

### 10.2 Start ngrok Tunnel

```bash
ngrok http 4000
```

**Expected Output**:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:4000
```

**📝 Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### 10.3 Update Backend `.env`

Update `priceguard/server/.env`:

```bash
FRONTEND_URL=http://localhost:5173
# Add ngrok URL for webhook testing
WEBHOOK_URL=https://abc123.ngrok.io
```

**Restart the backend server** after updating.

### 10.4 Create Webhook in PayPal Dashboard

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to **My Apps & Credentials** → Your Sandbox App
3. Scroll to **Webhooks** section
4. Click **Add Webhook**
5. Fill in:
   - **Webhook URL**: `https://abc123.ngrok.io/api/paypal/webhook`
   - **Event Types**: Select:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `BILLING.SUBSCRIPTION.CREATED`
     - `BILLING.SUBSCRIPTION.UPDATED`
     - `BILLING.SUBSCRIPTION.CANCELLED`
     - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
6. Click **Save**
7. **Copy the Webhook ID** - It may appear in different formats:
   - **Format 1**: Starts with `WH-` (e.g., `WH-2WR32451H0U1234567`)
   - **Format 2**: Just a long alphanumeric string (e.g., `2WR32451H0U1234567`)
   - **Format 3**: UUID format (e.g., `12345678-1234-1234-1234-123456789012`)
   
   **⚠️ Important**: Use the **exact ID** shown in the PayPal dashboard, regardless of format. The code will work with any format PayPal provides.

### 10.5 Update Backend `.env` with Webhook ID

Update `priceguard/server/.env`:

```bash
# Use the EXACT webhook ID from PayPal dashboard (any format is fine)
PAYPAL_WEBHOOK_ID=WH-2WR32451H0U1234567
# OR if it doesn't start with WH-:
# PAYPAL_WEBHOOK_ID=2WR32451H0U1234567
# OR if it's a UUID:
# PAYPAL_WEBHOOK_ID=12345678-1234-1234-1234-123456789012
```

**⚠️ Important**: 
- Use the **exact webhook ID** as shown in PayPal dashboard
- Don't add `WH-` prefix if it's not in the original ID
- Don't remove `WH-` prefix if it's in the original ID
- The format doesn't matter - PayPal's API accepts any format they provide

**Restart the backend server** after updating.

### 10.6 Test Webhook

1. **Make a test payment** (follow Step 8)
2. **Check ngrok web interface**: [http://localhost:4040](http://localhost:4040)
   - You should see incoming requests to `/api/paypal/webhook`
3. **Check backend logs** for webhook processing:

```
[paypal] Processing webhook event: PAYMENT.CAPTURE.COMPLETED
[paypal] Webhook processed successfully
```

4. **Check PayPal Dashboard**:
   - Go to **Webhooks** → Your Webhook → **Events**
   - You should see delivery attempts and status

---

## Troubleshooting

### Issue: PayPal Button Not Loading

**Symptoms**: Button doesn't appear, or shows error message

**Solutions**:
1. ✅ Check `VITE_PAYPAL_CLIENT_ID` is set in frontend `.env`
2. ✅ Restart frontend server after updating `.env`
3. ✅ Check browser console for errors
4. ✅ Verify Client ID starts with `sb-` (sandbox)

### Issue: "PayPal is not configured" Error

**Symptoms**: Backend returns `503 PayPal is not configured`

**Solutions**:
1. ✅ Check `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET` in backend `.env`
2. ✅ Verify `.env` file is in `priceguard/server/` directory
3. ✅ Restart backend server after updating `.env`
4. ✅ Check backend logs for: `PayPal integration enabled`

### Issue: Payment Fails with "Account not found"

**Symptoms**: Error: "Account not found" when creating order

**Solutions**:
1. ✅ Ensure you've registered an account first (Step 8.1)
2. ✅ Use the same email in `PayPalButton` that you registered with
3. ✅ Check database: `SELECT email FROM accounts;`

### Issue: CORS Errors

**Symptoms**: Browser console shows CORS errors

**Solutions**:
1. ✅ Check `ALLOWED_ORIGINS` in backend `.env` includes your frontend URL
2. ✅ Default includes `http://localhost:5173` and `http://localhost:3000`
3. ✅ Restart backend after updating `.env`

### Issue: Webhook Not Receiving Events

**Symptoms**: No webhook events in ngrok or backend logs

**Solutions**:
1. ✅ Verify ngrok is running and forwarding to port 4000
2. ✅ Check webhook URL in PayPal Dashboard matches ngrok URL
3. ✅ Ensure webhook is created in **Sandbox** (not Live)
4. ✅ Check webhook event types are selected
5. ✅ Make a test payment to trigger webhook
6. ✅ Check PayPal Dashboard → Webhooks → Events for delivery status
7. ✅ Verify `PAYPAL_WEBHOOK_ID` matches exactly what's in PayPal dashboard (any format is fine)

### Issue: Webhook ID Format Doesn't Match

**Symptoms**: Webhook ID doesn't start with `WH-` or has different format

**Solutions**:
1. ✅ **Use the exact webhook ID** as shown in PayPal Dashboard - don't modify it
2. ✅ PayPal webhook IDs can be in different formats:
   - `WH-xxxxxxxxx` (traditional format)
   - `xxxxxxxxx` (without prefix)
   - UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
3. ✅ The code accepts **any format** PayPal provides - just copy it exactly
4. ✅ To find your webhook ID:
   - Go to PayPal Dashboard → My Apps & Credentials → Your App
   - Scroll to **Webhooks** section
   - Click on your webhook
   - The ID is shown at the top or in the URL
5. ✅ If you can't find the ID, you can also get it via API:
   ```bash
   # List all webhooks (requires PayPal API access)
   curl -X GET "https://api.sandbox.paypal.com/v1/notifications/webhooks" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

### Issue: Database Connection Errors

**Symptoms**: Backend can't connect to database

**Solutions**:
1. ✅ Verify PostgreSQL is running: `pg_isready`
2. ✅ Check `DATABASE_URL` in `.env` is correct
3. ✅ Test connection: `npm run db:check`
4. ✅ Ensure database exists: `createdb priceguard`

### Issue: PayPal SDK Not Found

**Symptoms**: `Cannot find module '@paypal/checkout-server-sdk'`

**Solutions**:
1. ✅ Run `npm install` in `priceguard/server/`
2. ✅ Verify package.json includes: `"@paypal/checkout-server-sdk": "^1.0.3"`
3. ✅ Check `node_modules` exists in server directory

---

## Quick Reference

### Backend Endpoints

- `POST /api/paypal/create-order` - Create one-time payment
- `POST /api/paypal/capture-order` - Capture payment
- `POST /api/paypal/create-subscription` - Create subscription
- `GET /api/paypal/subscription/:id` - Get subscription details
- `POST /api/paypal/cancel-subscription` - Cancel subscription
- `POST /api/paypal/webhook` - Webhook handler

### Environment Variables Checklist

**Backend** (`priceguard/server/.env`):
- ✅ `PAYPAL_CLIENT_ID=sb-...`
- ✅ `PAYPAL_SECRET=sb-...`
- ✅ `PAYPAL_MODE=sandbox`
- ✅ `PAYPAL_WEBHOOK_ID=WH-...` (optional, for webhook testing)
- ✅ `FRONTEND_URL=http://localhost:5173`
- ✅ `DATABASE_URL=postgres://...`
- ✅ `ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000`

**Frontend** (`priceguard/.env`):
- ✅ `VITE_PAYPAL_CLIENT_ID=sb-...`
- ✅ `VITE_PAYPAL_PLAN_BASIC=P-...` (optional, for subscriptions)
- ✅ `VITE_API_BASE_URL=http://localhost:4000`

### Useful Commands

```bash
# Backend
cd priceguard/server
npm run dev              # Start backend
npm run db:check        # Test database connection
npm run db:migrate      # Run migrations

# Frontend
cd priceguard
npm run dev             # Start frontend

# Database
psql -d priceguard      # Connect to database
SELECT * FROM accounts; # View accounts

# ngrok (for webhook testing)
ngrok http 4000         # Start tunnel
```

---

## Next Steps

After successfully testing locally:

1. ✅ **Test all payment flows** (one-time, subscriptions)
2. ✅ **Test error scenarios** (cancelled payments, failed payments)
3. ✅ **Verify database updates** after each payment
4. ✅ **Test webhook events** (if using webhooks)
5. ✅ **Review PayPal Dashboard** for transaction history
6. ✅ **Switch to Live mode** when ready for production:
   - Update `PAYPAL_MODE=live` in backend
   - Use Live credentials (not sandbox)
   - Update webhook URL to production domain

---

## Additional Resources

- [PayPal Developer Dashboard](https://developer.paypal.com/)
- [PayPal REST API Docs](https://developer.paypal.com/docs/api/overview/)
- [PayPal JavaScript SDK](https://developer.paypal.com/sdk/js/)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [ngrok Documentation](https://ngrok.com/docs)

---

**Need Help?** Check the troubleshooting section or review the main integration docs:
- `PAYPAL_INTEGRATION_SUMMARY.md`
- `server/PAYPAL_SETUP_INSTRUCTIONS.md`
- `server/PAYPAL_INTEGRATION.md`

