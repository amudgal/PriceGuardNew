# PayPal Sandbox Testing Guide

## ✅ Success! Your PayPal SDK is Working

If you can see the PayPal buttons (PayPal, Pay Later, Debit or Credit Card), that means:
- ✅ PayPal SDK loaded successfully
- ✅ Client ID is valid
- ✅ Ready to test payments!

---

## Step 1: Get PayPal Sandbox Test Accounts

### Option A: Use Pre-configured Test Accounts

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to **Accounts** → **Sandbox** → **Accounts**
3. You'll see pre-configured test accounts:
   - **Personal Account** (Buyer) - for testing payments
   - **Business Account** (Merchant) - your app's account

### Option B: Create New Test Accounts

1. In PayPal Developer Dashboard → **Accounts** → **Sandbox**
2. Click **Create Account**
3. Choose account type:
   - **Personal** - for testing as a buyer
   - **Business** - for testing as a merchant
4. Fill in details (can be fake/test data)
5. Click **Create**

---

## Step 2: Test Account Credentials

After creating or selecting a test account, you'll see:

**Personal Account (Buyer):**
- **Email**: `sb-buyer@personal.example.com` (or your custom email)
- **Password**: (shown in dashboard, or you set it)
- **Balance**: Can add test funds in dashboard

**Business Account (Merchant):**
- **Email**: Your app's merchant account
- **Password**: (shown in dashboard)

**Note**: These are test accounts - no real money is involved!

---

## Step 3: Test Payment Flow

### In Your App:

1. **Navigate to payment page** (Signup or Account Settings)
2. **Click the PayPal button**
3. **PayPal popup/modal should appear**

### In PayPal Sandbox:

1. **Log in with Sandbox test account**:
   - Use the Personal (Buyer) account credentials
   - Email: `sb-buyer@personal.example.com` (or your test account email)
   - Password: (from PayPal Dashboard)

2. **Complete the payment**:
   - Review payment details
   - Click **Pay Now** or **Continue**
   - You'll see a confirmation screen

3. **Payment options you might see**:
   - **PayPal Balance** - if account has funds
   - **Pay Later** - test PayPal's buy now, pay later
   - **Debit or Credit Card** - test card payments
   - **Bank Account** - test bank transfers

---

## Step 4: Test Different Payment Scenarios

### Scenario 1: Successful Payment

1. Use a test account with sufficient balance
2. Complete payment
3. **Expected**: Payment succeeds, you see success message

### Scenario 2: Insufficient Funds

1. Use a test account with $0 balance
2. Try to pay
3. **Expected**: Error message about insufficient funds

### Scenario 3: Payment Cancellation

1. Start payment process
2. Click **Cancel** or close the popup
3. **Expected**: Payment cancelled, no error shown

### Scenario 4: Card Payment

1. Click **Debit or Credit Card** option
2. Use test card numbers:
   - **Card Number**: `4111111111111111` (Visa test card)
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVV**: Any 3 digits (e.g., `123`)
   - **Name**: Any name
3. Complete payment
4. **Expected**: Payment processes successfully

---

## Step 5: Verify Payment in PayPal Dashboard

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to **Sandbox** → **Transactions**
3. You'll see:
   - All test transactions
   - Payment status
   - Transaction details
   - Amount, date, payer info

---

## Step 6: Verify Payment in Your App

### Check Browser Console:

After payment completes, check console (F12) for:
```
[paypal] Payment captured: {orderId: "...", status: "COMPLETED", ...}
```

### Check Backend Logs:

In your backend terminal, you should see:
```
[paypal] Creating order for email: test@example.com
[paypal] Order created: ORDER-123456789
[paypal] Capturing order: ORDER-123456789
[paypal] Payment captured successfully
```

### Check Database:

```sql
SELECT email, paypal_payer_id, updated_at 
FROM accounts 
WHERE email = 'test@example.com';
```

**Expected**: `paypal_payer_id` should be populated with a PayPal payer ID.

---

## Test Card Numbers (Sandbox)

PayPal Sandbox accepts these test card numbers:

### Visa:
- **Number**: `4111111111111111`
- **Expiry**: Any future date
- **CVV**: Any 3 digits

### Mastercard:
- **Number**: `5555555555554444`
- **Expiry**: Any future date
- **CVV**: Any 3 digits

### American Express:
- **Number**: `378282246310005`
- **Expiry**: Any future date
- **CVV**: Any 4 digits

**Note**: These cards will always be approved in Sandbox (unless you test specific error scenarios).

---

## Common Test Scenarios

### ✅ Happy Path:
1. User clicks PayPal button
2. Logs in with test account
3. Completes payment
4. Sees success message
5. Payment recorded in database

### ❌ Error Scenarios to Test:

1. **User cancels payment**:
   - Click PayPal button
   - Click Cancel
   - Should not show error

2. **Network error**:
   - Disconnect internet
   - Try payment
   - Should show error message

3. **Invalid account**:
   - Use wrong credentials
   - Should show login error

---

## Troubleshooting Sandbox Testing

### Issue: Can't log in to Sandbox

**Solutions**:
- Make sure you're using Sandbox credentials (not your real PayPal account)
- Check credentials in PayPal Developer Dashboard
- Try creating a new test account

### Issue: Payment not completing

**Solutions**:
- Check browser console for errors
- Check backend logs
- Verify backend is running on port 4000
- Check database connection

### Issue: Payment succeeds but not recorded

**Solutions**:
- Check backend logs for database errors
- Verify database connection
- Check if account exists in database
- Verify email matches between payment and database

---

## Quick Test Checklist

- [ ] PayPal buttons visible on page
- [ ] Clicking button opens PayPal popup
- [ ] Can log in with Sandbox test account
- [ ] Payment completes successfully
- [ ] Success message shown in app
- [ ] Payment appears in PayPal Dashboard
- [ ] Payment recorded in database
- [ ] Backend logs show payment captured

---

## Next Steps After Testing

Once Sandbox testing is successful:

1. ✅ Test all payment scenarios (success, cancel, error)
2. ✅ Test with different amounts
3. ✅ Test subscription flow (if using subscriptions)
4. ✅ Verify webhook events (if webhooks are set up)
5. ✅ Review PayPal Dashboard for transaction history
6. ✅ Prepare for production:
   - Switch to Live credentials
   - Update `PAYPAL_MODE=live` in backend
   - Use Live Client ID in frontend
   - Test with real PayPal account (small amount)

---

## Tips for Sandbox Testing

1. **Use different test accounts** for different scenarios
2. **Add test funds** to accounts in PayPal Dashboard for balance testing
3. **Check transaction history** regularly to verify payments
4. **Test error scenarios** to ensure proper error handling
5. **Keep Sandbox credentials** separate from Live credentials

---

**Happy Testing! 🎉**

Your PayPal integration is working - now you can test all the payment flows!

