# PayPal Integration - Quick Testing Guide

This guide shows you how to test PayPal integration directly in your running app.

## Prerequisites Checklist

Before testing, ensure:

- ✅ Backend server is running on `http://localhost:4000`
- ✅ Frontend server is running on `http://localhost:5173`
- ✅ Backend `.env` has PayPal credentials configured
- ✅ Frontend `.env` has `VITE_PAYPAL_CLIENT_ID` set
- ✅ Database is connected and migrations are run
- ✅ You have a PayPal Sandbox test account ready

---

## Step 1: Verify Your Setup

### 1.1 Check Backend is Running

Open terminal and verify:

```bash
curl http://localhost:4000/health
```

**Expected**: `{"status":"healthy",...}`

### 1.2 Check Frontend is Running

Open browser: [http://localhost:5173](http://localhost:5173)

**Expected**: PriceGuard homepage loads

### 1.3 Verify Environment Variables

**Backend** (`priceguard/server/.env`):
```bash
PAYPAL_CLIENT_ID=sb-xxxxxxxxx
PAYPAL_SECRET=sb-xxxxxxxxx
PAYPAL_MODE=sandbox
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`priceguard/.env`):
```bash
VITE_PAYPAL_CLIENT_ID=sb-xxxxxxxxx
VITE_API_BASE_URL=http://localhost:4000
```

---

## Step 2: Add PayPal Button to Your App (Quick Test)

The easiest way to test is to add a PayPal button to an existing page. Here are two options:

### Option A: Add to Login/Signup Page (Recommended)

1. Open `priceguard/src/components/Login.tsx`
2. Find the signup form section (around line 200-300)
3. Add PayPal button after the credit card form:

```tsx
// At the top of the file, add import:
import { PayPalButton } from "./PayPalButton";

// In the signup form, add after the credit card section:
<div className="mt-4 space-y-2">
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t" />
    </div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-white px-2 text-muted-foreground">Or pay with</span>
    </div>
  </div>
  
  {signupEmail && (
    <PayPalButton
      email={signupEmail}
      amount={selectedPlan === "basic" ? 0.45 : selectedPlan === "intermediate" ? 1.99 : 2.99}
      currency="USD"
      description={`PriceGuard ${selectedPlan} plan`}
      onCompleted={() => {
        alert("Payment successful! You can now complete signup.");
        console.log("PayPal payment completed");
      }}
      onError={(error) => {
        setSignupError(`PayPal payment failed: ${error}`);
        console.error("PayPal error:", error);
      }}
    />
  )}
</div>
```

### Option B: Create a Simple Test Page

1. Create `priceguard/src/pages/PayPalTestPage.tsx`:

```tsx
import { PayPalButton } from "../components/PayPalButton";
import { useState } from "react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function PayPalTestPage() {
  const [email, setEmail] = useState("test@example.com");
  const [amount, setAmount] = useState("9.99");

  return (
    <div className="container mx-auto max-w-2xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>PayPal Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email (must be registered account)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          
          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="9.99"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-2 font-semibold">One-Time Payment Test</h3>
            <PayPalButton
              email={email}
              amount={parseFloat(amount)}
              currency="USD"
              description="Test payment"
              onCompleted={() => {
                alert("✅ Payment successful!");
                console.log("Payment completed");
              }}
              onError={(error) => {
                alert(`❌ Payment failed: ${error}`);
                console.error("Payment error:", error);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

2. Add route in `priceguard/src/App.tsx`:

```tsx
import { PayPalTestPage } from "./pages/PayPalTestPage";

// Add this route in your App component:
if (currentPage === "paypal-test") {
  return <PayPalTestPage />;
}
```

3. Navigate to: `http://localhost:5173/paypal-test` (or add a link)

---

## Step 3: Test One-Time Payment Flow

### 3.1 Create a Test Account First

1. Go to your app's signup/login page
2. **Register a new account** with:
   - Email: `test@example.com` (or any email)
   - Password: `Test123!`
   - Fill in other required fields
3. **Complete registration** - this creates the account in your database

**Important**: You must register the account first because PayPal integration requires the email to exist in your database.

### 3.2 Test PayPal Payment

1. **Navigate to the page** where you added the PayPal button
2. **Enter the email** you registered with (e.g., `test@example.com`)
3. **Click the PayPal button**
4. **PayPal popup/modal should appear**

### 3.3 Complete Payment in PayPal Sandbox

1. **Log in with PayPal Sandbox test account**:
   - Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
   - Navigate to **Accounts** → **Sandbox** → **Personal Account**
   - Use the test buyer account credentials
   - Or create a new test account

2. **Complete the payment**:
   - Review payment details
   - Click **Pay Now** or **Approve Payment**
   - Wait for confirmation

### 3.4 Verify Payment Success

**Check Browser Console** (F12 → Console):
```
[paypal] Payment captured: {orderId: "...", status: "COMPLETED", ...}
```

**Check Backend Terminal**:
```
[paypal] Creating order for email: test@example.com
[paypal] Order created: ORDER-123456789
[paypal] Capturing order: ORDER-123456789
[paypal] Payment captured successfully
```

**Check Database**:
```bash
psql -d priceguard
SELECT email, paypal_payer_id, updated_at FROM accounts WHERE email = 'test@example.com';
```

**Expected**: `paypal_payer_id` should be populated with a PayPal payer ID.

---

## Step 4: Test Subscription Flow (Optional)

### 4.1 Create PayPal Plans First

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to **Products** → **Subscriptions** → **Plans**
3. Click **Create Plan**
4. Fill in:
   - **Plan Name**: `PriceGuard Basic Test`
   - **Billing Cycle**: Monthly
   - **Price**: $9.99 USD
5. Click **Create Plan**
6. **Copy the Plan ID** (starts with `P-`)

### 4.2 Update Frontend `.env`

```bash
VITE_PAYPAL_PLAN_BASIC=P-5ML427713U1234567  # Your plan ID
```

**Restart frontend** after updating `.env`.

### 4.3 Test Subscription

1. **Add subscription button** to your test page:

```tsx
<div className="border-t pt-4">
  <h3 className="mb-2 font-semibold">Subscription Test</h3>
  <PayPalButton
    email={email}
    planId="P-5ML427713U1234567"  // Your plan ID
    onCompleted={() => {
      alert("✅ Subscription created!");
      console.log("Subscription completed");
    }}
    onError={(error) => {
      alert(`❌ Subscription failed: ${error}`);
      console.error("Subscription error:", error);
    }}
  />
</div>
```

2. **Click the subscription button**
3. **Approve subscription** in PayPal
4. **Verify in database**:

```sql
SELECT email, paypal_subscription_id, subscription_status 
FROM accounts 
WHERE email = 'test@example.com';
```

**Expected**: `paypal_subscription_id` should be populated.

---

## Step 5: Test Error Scenarios

### 5.1 Test with Invalid Email

1. Use an email that **doesn't exist** in your database
2. Try to make a payment
3. **Expected**: Error message "Account not found"

### 5.2 Test Payment Cancellation

1. Click PayPal button
2. In PayPal popup, click **Cancel** or close the window
3. **Expected**: No error shown (user cancellation is expected)

### 5.3 Test with Missing Credentials

1. Temporarily remove `VITE_PAYPAL_CLIENT_ID` from frontend `.env`
2. Restart frontend
3. **Expected**: Error message "PayPal Client ID is not configured"

---

## Step 6: Monitor and Debug

### 6.1 Browser Console

Open DevTools (F12) → Console tab:
- Look for `[paypal]` prefixed messages
- Check for any errors
- Verify API calls are being made

### 6.2 Backend Logs

Watch your backend terminal for:
- `[paypal]` prefixed log messages
- API request logs
- Database update confirmations

### 6.3 Network Tab

Open DevTools → Network tab:
- Filter by "paypal" or "api/paypal"
- Check request/response details
- Verify status codes (200 = success)

### 6.4 PayPal Dashboard

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to **Sandbox** → **Transactions**
3. View your test transactions
4. Check transaction status and details

---

## Common Issues & Quick Fixes

### Issue: PayPal Button Not Appearing

**Check**:
1. ✅ `VITE_PAYPAL_CLIENT_ID` is set in frontend `.env`
2. ✅ Restart frontend after updating `.env`
3. ✅ Check browser console for errors
4. ✅ Verify Client ID starts with `sb-` (sandbox)

**Fix**: Restart frontend server

### Issue: "Account not found" Error

**Check**:
1. ✅ Email exists in database: `SELECT email FROM accounts;`
2. ✅ Using same email in PayPalButton as registered

**Fix**: Register account first, then test payment

### Issue: "PayPal is not configured" Error

**Check**:
1. ✅ Backend `.env` has `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET`
2. ✅ Backend server was restarted after updating `.env`
3. ✅ Check backend logs for: `PayPal integration enabled`

**Fix**: Restart backend server

### Issue: CORS Errors

**Check**:
1. ✅ `ALLOWED_ORIGINS` in backend `.env` includes `http://localhost:5173`
2. ✅ Backend server restarted

**Fix**: Add `http://localhost:5173` to `ALLOWED_ORIGINS` and restart

### Issue: Payment Completes but Database Not Updated

**Check**:
1. ✅ Database connection is working
2. ✅ Backend logs show database update
3. ✅ Check database directly: `SELECT * FROM accounts WHERE email = '...';`

**Fix**: Check backend logs for database errors

---

## Quick Test Checklist

Use this checklist to verify everything works:

- [ ] Backend server running on port 4000
- [ ] Frontend server running on port 5173
- [ ] PayPal button appears on page
- [ ] Clicking button opens PayPal popup
- [ ] Can log in with PayPal Sandbox account
- [ ] Payment completes successfully
- [ ] Browser console shows success message
- [ ] Backend logs show payment captured
- [ ] Database has `paypal_payer_id` populated
- [ ] No errors in browser console
- [ ] No errors in backend logs

---

## Next Steps After Testing

Once local testing is successful:

1. ✅ Test all payment scenarios (success, cancel, error)
2. ✅ Test with different amounts
3. ✅ Test subscription flow (if using subscriptions)
4. ✅ Verify webhook events (if webhooks are set up)
5. ✅ Test error handling
6. ✅ Review PayPal Dashboard for transaction history
7. ✅ Prepare for production deployment

---

## Need Help?

- Check `PAYPAL_LOCAL_TESTING_GUIDE.md` for detailed setup
- Review `PAYPAL_INTEGRATION_SUMMARY.md` for API details
- Check browser console and backend logs for specific errors
- Verify all environment variables are set correctly

---

## Quick Commands Reference

```bash
# Start backend
cd priceguard/server
npm run dev

# Start frontend (in new terminal)
cd priceguard
npm run dev

# Check database
psql -d priceguard
SELECT email, paypal_payer_id FROM accounts;

# Test backend health
curl http://localhost:4000/health

# Check backend logs
# (watch terminal where backend is running)
```

---

**Happy Testing! 🎉**

