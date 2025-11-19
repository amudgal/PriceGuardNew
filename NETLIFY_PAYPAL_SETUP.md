# Netlify Setup for PayPal Integration

This guide explains what environment variables you need to set in Netlify for PayPal integration to work in production.

## Required Environment Variables

You need to set the following environment variables in Netlify:

### 1. `VITE_PAYPAL_CLIENT_ID` (Required)

**What it is:** Your PayPal Client ID from the PayPal Developer Dashboard.

**Where to get it:**
- **Sandbox (Testing):** https://developer.paypal.com/dashboard/applications/sandbox
- **Live (Production):** https://developer.paypal.com/dashboard/applications/live

**Format:**
- Sandbox: Starts with `sb-` (e.g., `sb-xxxxxxxxx`)
- Live: Starts with `live-` or `A` (e.g., `AXx1Lt6dwJix_8-Va_E7YTH5E_-1n8...`)

**How to set in Netlify:**
1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables
2. Click **"Add a variable"**
3. **Key:** `VITE_PAYPAL_CLIENT_ID`
4. **Value:** Your PayPal Client ID (e.g., `sb-xxxxxxxxx` for sandbox or your live Client ID)
5. **Scopes:** Select all scopes:
   - ✅ Production
   - ✅ Preview
   - ✅ Deploy previews
6. Click **"Save"**

### 2. `VITE_API_BASE_URL` (Required)

**What it is:** The URL of your backend API server.

**Current value:** `http://34.235.168.136:4000` (verify this is still correct)

**How to get current backend IP:**
```bash
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

NETWORK_INTERFACE=$(aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks $TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $NETWORK_INTERFACE \
  --region us-east-1 \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo "Backend URL: http://$PUBLIC_IP:4000"
```

**How to set in Netlify:**
1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables
2. Add or update the variable:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `http://YOUR_BACKEND_IP:4000` (replace with current IP)
   - **Scopes:** Select all scopes
3. Click **"Save"**

### 3. PayPal Plan IDs (Optional - Only if using subscriptions)

If you're using PayPal subscriptions, you also need to set these:

- `VITE_PAYPAL_PLAN_BASIC` - Plan ID for Basic plan (starts with `P-`)
- `VITE_PAYPAL_PLAN_PREMIUM` - Plan ID for Premium plan (starts with `P-`)
- `VITE_PAYPAL_PLAN_ENTERPRISE` - Plan ID for Enterprise plan (starts with `P-`)

**Where to get them:**
- PayPal Developer Dashboard → Products → Subscriptions → Your Plans
- Or from your backend after creating plans via API

**How to set in Netlify:**
1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables
2. Add each variable:
   - **Key:** `VITE_PAYPAL_PLAN_BASIC`
   - **Value:** `P-xxxxxxxxx` (your Basic plan ID)
   - Repeat for `VITE_PAYPAL_PLAN_PREMIUM` and `VITE_PAYPAL_PLAN_ENTERPRISE`
3. **Scopes:** Select all scopes
4. Click **"Save"**

## Step-by-Step Setup Instructions

### Step 1: Get Your PayPal Client ID

1. **For Sandbox (Testing):**
   - Go to: https://developer.paypal.com/dashboard/applications/sandbox
   - Log in with your PayPal Developer account
   - Find your app or create a new one
   - Copy the **Client ID** (starts with `sb-`)

2. **For Live (Production):**
   - Go to: https://developer.paypal.com/dashboard/applications/live
   - Find your app or create a new one
   - Copy the **Client ID** (starts with `live-` or `A`)

### Step 2: Set Environment Variables in Netlify

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables

2. **Add `VITE_PAYPAL_CLIENT_ID`:**
   - Click **"Add a variable"**
   - **Key:** `VITE_PAYPAL_CLIENT_ID`
   - **Value:** Your PayPal Client ID (from Step 1)
   - **Scopes:** ✅ Production ✅ Preview ✅ Deploy previews
   - Click **"Save"**

3. **Verify `VITE_API_BASE_URL` is set:**
   - Check if `VITE_API_BASE_URL` already exists
   - If not, add it with your current backend IP (see above for how to get it)
   - If it exists, verify the IP is still correct

4. **Add PayPal Plan IDs (if using subscriptions):**
   - Add `VITE_PAYPAL_PLAN_BASIC`, `VITE_PAYPAL_PLAN_PREMIUM`, `VITE_PAYPAL_PLAN_ENTERPRISE`
   - Use the Plan IDs from your PayPal Developer Dashboard

### Step 3: Trigger New Deployment

**⚠️ IMPORTANT:** Environment variables are only available during the build. You MUST trigger a new deployment after setting them.

1. **Go to Deploys:**
   - Visit: https://app.netlify.com/sites/aaires/deploys

2. **Trigger Manual Deploy:**
   - Click **"Trigger deploy"** → **"Deploy site"**
   - Wait for deployment to complete (1-2 minutes)

3. **Verify Build:**
   - Click on the latest deployment
   - Check the build log
   - Verify no errors related to environment variables

### Step 4: Test PayPal Integration

1. **Visit your site:**
   - Go to: https://aaires.netlify.app

2. **Test PayPal Button:**
   - Navigate to signup or account settings
   - Select PayPal as payment method
   - Verify the PayPal button appears (should show PayPal logo and buttons)

3. **Check Browser Console:**
   - Open browser console (F12)
   - Look for any errors related to PayPal SDK
   - Should see PayPal SDK loading successfully

4. **Test Payment Flow:**
   - Click the PayPal button
   - Should redirect to PayPal login (sandbox or live, depending on your Client ID)
   - Complete a test payment

## Environment Variables Summary

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_PAYPAL_CLIENT_ID` | ✅ Yes | PayPal Client ID | `sb-xxxxxxxxx` or `AXx1Lt6dwJix_8-Va...` |
| `VITE_API_BASE_URL` | ✅ Yes | Backend API URL | `http://34.235.168.136:4000` |
| `VITE_PAYPAL_PLAN_BASIC` | ⚠️ Optional | Basic plan ID (subscriptions) | `P-xxxxxxxxx` |
| `VITE_PAYPAL_PLAN_PREMIUM` | ⚠️ Optional | Premium plan ID (subscriptions) | `P-xxxxxxxxx` |
| `VITE_PAYPAL_PLAN_ENTERPRISE` | ⚠️ Optional | Enterprise plan ID (subscriptions) | `P-xxxxxxxxx` |

## Troubleshooting

### PayPal SDK Not Loading

**Error:** "Failed to load PayPal SDK" or "PayPal Client ID is not configured"

**Solutions:**
1. ✅ Verify `VITE_PAYPAL_CLIENT_ID` is set in Netlify
2. ✅ Check that you triggered a new deployment AFTER setting the variable
3. ✅ Verify the Client ID is correct (check PayPal Developer Dashboard)
4. ✅ Check browser console for detailed error messages
5. ✅ Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### PayPal Button Not Appearing

**Possible causes:**
1. Client ID not set or incorrect
2. Network/firewall blocking PayPal SDK
3. Ad blocker blocking PayPal scripts
4. Browser security settings

**Solutions:**
1. Check browser console for errors
2. Try in incognito/private mode
3. Disable ad blocker
4. Verify Client ID in Netlify dashboard

### Backend API Errors

**Error:** CORS errors or connection refused

**Solutions:**
1. ✅ Verify `VITE_API_BASE_URL` is set correctly
2. ✅ Check backend is running and accessible
3. ✅ Verify backend CORS allows `https://aaires.netlify.app`
4. ✅ Check backend IP hasn't changed (if using ECS task IP)

### Environment Variable Not Available

**Problem:** Variable is set but still shows as undefined

**Solutions:**
1. ✅ Make sure you triggered a NEW deployment after setting the variable
2. ✅ Check build logs to verify variable was available during build
3. ✅ Verify variable name is exactly `VITE_PAYPAL_CLIENT_ID` (case-sensitive)
4. ✅ Check that variable is set for the correct scope (Production/Preview)

## Important Notes

### ⚠️ Environment Variables Are Build-Time Only

- Vite reads environment variables **at build time**, not runtime
- Setting a variable after deployment won't work until you redeploy
- Each deployment rebuilds with current environment variables

### ⚠️ Backend IP May Change

- If using ECS task IP directly, it may change when tasks restart
- Update `VITE_API_BASE_URL` in Netlify if the IP changes
- **Better solution:** Use Application Load Balancer (ALB) for stable URL

### ⚠️ Sandbox vs Live

- **Sandbox Client ID** (`sb-...`): For testing, uses PayPal sandbox
- **Live Client ID** (`live-...` or `A...`): For production, uses real PayPal
- Make sure you're using the correct one for your environment

### ⚠️ Security

- Never commit `.env` files to Git (they're already in `.gitignore`)
- Environment variables in Netlify are encrypted at rest
- Only set sensitive values in Netlify dashboard, not in code

## Quick Checklist

Before deploying to Netlify, make sure:

- [ ] `VITE_PAYPAL_CLIENT_ID` is set in Netlify
- [ ] `VITE_API_BASE_URL` is set in Netlify (with current backend IP)
- [ ] PayPal Plan IDs are set (if using subscriptions)
- [ ] All variables are set for Production, Preview, and Deploy previews
- [ ] New deployment triggered after setting variables
- [ ] Build completed successfully
- [ ] Tested PayPal button on deployed site

## Next Steps

After setting up Netlify:

1. **Test PayPal Integration:**
   - Test signup with PayPal
   - Test account settings PayPal payment
   - Test one-time payments (if applicable)
   - Test subscriptions (if applicable)

2. **Monitor:**
   - Check Netlify build logs for errors
   - Monitor browser console for PayPal SDK errors
   - Check backend logs for PayPal webhook events

3. **Production Considerations:**
   - Switch from Sandbox to Live Client ID when ready
   - Set up Application Load Balancer for stable backend URL
   - Configure HTTPS for backend API
   - Set up proper error monitoring

## Resources

- **Netlify Dashboard:** https://app.netlify.com/sites/aaires
- **Environment Variables:** https://app.netlify.com/sites/aaires/settings/deploys#environment-variables
- **Deploys:** https://app.netlify.com/sites/aaires/deploys
- **PayPal Developer Dashboard (Sandbox):** https://developer.paypal.com/dashboard/applications/sandbox
- **PayPal Developer Dashboard (Live):** https://developer.paypal.com/dashboard/applications/live

