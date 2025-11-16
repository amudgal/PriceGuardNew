# Fix "Failed to create setup intent" Error

## Common Causes

### 1. Server Not Restarted
The billing routes were recently added. **Restart your backend server** to load the new code:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd priceguard/server
npm run dev
```

### 2. Stripe Secret Key Not Set
The Stripe client requires `STRIPE_SECRET_KEY` environment variable:

```bash
export STRIPE_SECRET_KEY="sk_test_xxxxx"
```

If not set, the server will fail to start with:
```
STRIPE_SECRET_KEY environment variable is required for Stripe integration
```

### 3. Account Not Found
The endpoint requires an account to exist in the database. Make sure:
- User is logged in (account exists)
- Email matches the account in database

### 4. CORS Issues
If calling from frontend, ensure:
- `ALLOWED_ORIGINS` includes your frontend URL
- For localhost: `ALLOWED_ORIGINS=http://localhost:5173`

### 5. Route Not Registered
Verify the route is registered in `src/index.ts`:
```typescript
app.use("/api/billing", billingRouter);
```

## Testing the Endpoint

### Test with curl:
```bash
curl -X POST http://localhost:4000/api/billing/create-setup-intent \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"email":"test@example.com","plan":"basic"}'
```

### Expected Response (Success):
```json
{
  "clientSecret": "seti_xxxxx_secret_xxxxx",
  "customerId": "cus_xxxxx"
}
```

### Expected Response (Error):
```json
{
  "error": "Account not found"
}
```
or
```json
{
  "error": "Failed to create setup intent: [detailed error]"
}
```

## Debugging Steps

1. **Check server logs** for error messages
2. **Verify Stripe key** is set: `echo $STRIPE_SECRET_KEY`
3. **Check account exists**: Query database for the email
4. **Test endpoint directly** with curl (see above)
5. **Check browser console** for CORS or network errors

## Quick Fix

Most likely issue: **Server needs restart** after adding billing routes.

```bash
# Kill existing server
pkill -f "tsx.*index"

# Restart with Stripe key
cd priceguard/server
export STRIPE_SECRET_KEY="sk_test_xxxxx"
npm run dev
```

