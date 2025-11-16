# Stripe Integration - Next Steps

## ✅ Completed
- ✅ Backend setup intent endpoint working
- ✅ Backend subscription creation endpoint working
- ✅ Frontend BillingCardForm component integrated
- ✅ Database schema with Stripe fields

## 🔧 Next Steps

### 1. Create Stripe Products and Prices

1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/products
2. Create products for each plan:
   - **Basic Plan** (e.g., $9.99/month)
   - **Premium Plan** (e.g., $19.99/month)
   - **Enterprise Plan** (e.g., $49.99/month)

3. For each product:
   - Click "Add product"
   - Enter product name (e.g., "Basic Plan")
   - Set pricing: Choose "Recurring" → Set amount (e.g., $9.99) → Set billing period (e.g., Monthly)
   - Click "Save product"
   - **Copy the Price ID** (starts with `price_xxxxx`) - you'll need this!

### 2. Set Frontend Environment Variables

Create a `.env` file in the frontend directory (`priceguard/`):

```bash
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject/priceguard

# Create .env file
cat > .env << 'EOF'
# Stripe Publishable Key (get from https://dashboard.stripe.com/test/apikeys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY

# Stripe Price IDs (get from Stripe Dashboard after creating products)
VITE_STRIPE_PRICE_BASIC=price_xxxxx
VITE_STRIPE_PRICE_PREMIUM=price_xxxxx
VITE_STRIPE_PRICE_ENTERPRISE=price_xxxxx

# Backend API URL (already set, but verify)
VITE_API_BASE_URL=http://localhost:4000
EOF
```

**Important:** Replace the placeholder values with your actual keys from Stripe Dashboard.

### 3. Restart Frontend Development Server

After creating the `.env` file, restart your frontend:

```bash
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject/priceguard
npm run dev
```

The frontend will now load your Stripe keys and Price IDs.

### 4. Test the Full Flow

1. **Start both servers:**
   ```bash
   # Terminal 1: Backend
   cd priceguard/server
   npm run dev

   # Terminal 2: Frontend
   cd priceguard
   npm run dev
   ```

2. **Test from Frontend:**
   - Open http://localhost:5173
   - Log in with your test user (`your-email@example.com`)
   - Go to Dashboard → Billing & Payment Method section
   - Click "Add or Update Card"
   - Enter test card: `4242 4242 4242 4242`
   - Enter any future expiry (e.g., `12/25`)
   - Enter any CVV (e.g., `123`)
   - Click "Save Card"

3. **What should happen:**
   - ✅ Card is saved with Stripe (SetupIntent succeeds)
   - ✅ If plan is "basic", "premium", or "enterprise", a subscription is created
   - ✅ Payment is immediately charged (if subscription is created)
   - ✅ Success message appears
   - ✅ Card last 4 digits appear in "Current Payment Method" section

### 5. Verify in Stripe Dashboard

After testing, check your Stripe Dashboard:

- **Customers**: https://dashboard.stripe.com/test/customers
  - You should see a customer with your email
  - Payment method attached

- **Subscriptions**: https://dashboard.stripe.com/test/subscriptions
  - Active subscription (if plan was set)
  - Payment immediately charged

- **Payments**: https://dashboard.stripe.com/test/payments
  - Payment record for the subscription charge

### 6. (Optional) Set Up Webhooks

Webhooks allow Stripe to notify your backend about subscription changes:

1. **Local Testing (using Stripe CLI):**
   ```bash
   # Install Stripe CLI: https://stripe.com/docs/stripe-cli
   stripe listen --forward-to http://localhost:4000/api/stripe/webhook
   ```

2. **Production (on AWS):**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://api.priceguardbackend.live/api/stripe/webhook`
   - Select events:
     - `payment_method.attached`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the webhook signing secret (starts with `whsec_`)
   - Add to AWS Secrets Manager as `STRIPE_WEBHOOK_SECRET`

### 7. Test Card Numbers

Use these test card numbers from Stripe:

- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0027 6000 3184`

## 🐛 Troubleshooting

### "Stripe has not loaded yet"
- Make sure `VITE_STRIPE_PUBLISHABLE_KEY` is set correctly
- Check browser console for errors
- Verify the key starts with `pk_test_` or `pk_live_`

### "No Price ID configured"
- Make sure `VITE_STRIPE_PRICE_BASIC`, `VITE_STRIPE_PRICE_PREMIUM`, etc. are set
- Verify the Price IDs from Stripe Dashboard are correct
- Restart the frontend server after updating `.env`

### "Failed to create subscription"
- Check backend logs for detailed error messages
- Verify the Price ID exists in Stripe Dashboard
- Make sure the customer has a payment method attached

### Payments not appearing in Stripe Dashboard
- Check if subscription was created successfully
- Verify `STRIPE_SECRET_KEY` in backend is correct
- Check backend logs for Stripe API errors

## 📋 Checklist

- [ ] Created Stripe Products (Basic, Premium, Enterprise)
- [ ] Copied Price IDs from Stripe Dashboard
- [ ] Created frontend `.env` file with Stripe keys
- [ ] Set `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] Set `VITE_STRIPE_PRICE_BASIC`
- [ ] Set `VITE_STRIPE_PRICE_PREMIUM`
- [ ] Set `VITE_STRIPE_PRICE_ENTERPRISE`
- [ ] Restarted frontend server
- [ ] Tested card save from frontend
- [ ] Verified customer in Stripe Dashboard
- [ ] Verified subscription in Stripe Dashboard (if plan selected)
- [ ] Verified payment in Stripe Dashboard
- [ ] (Optional) Set up webhooks for production

