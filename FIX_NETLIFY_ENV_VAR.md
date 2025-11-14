# Fix Netlify Environment Variable Issue

## Problem

The frontend at `https://aaires.netlify.app` is still trying to connect to `http://localhost:4000` instead of the backend API because the `VITE_API_BASE_URL` environment variable was not set **BEFORE** the build.

## Why This Happens

Vite reads environment variables **at build time**, not runtime. If `VITE_API_BASE_URL` is not set during the Netlify build, the code defaults to `http://localhost:4000`.

**Frontend code (Login.tsx line 73):**
```typescript
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";
```

## Solution

### Step 1: Get Backend Public IP

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

**Current Backend URL:** `http://34.235.168.136:4000`

### Step 2: Set Environment Variable in Netlify

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables

2. **Add Environment Variable:**
   - Click **"Add a variable"** or **"Edit variables"**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `http://34.235.168.136:4000` (or your current backend IP)
   - **Scopes:** Select ALL scopes:
     - ✅ Production
     - ✅ Preview
     - ✅ Deploy previews
   - Click **"Save"**

### Step 3: Trigger New Deployment

After setting the environment variable, you **MUST** trigger a new deployment so it's available during the build:

1. **Option A: Trigger Manual Deploy**
   - Go to: https://app.netlify.com/sites/aaires/deploys
   - Click **"Trigger deploy"** → **"Deploy site"**
   - Wait for deployment to complete (1-2 minutes)

2. **Option B: Push to Git** (if auto-deploy is enabled)
   ```bash
   cd priceguard
   git commit --allow-empty -m "Trigger Netlify rebuild with VITE_API_BASE_URL"
   git push origin main
   ```

### Step 4: Verify Deployment

1. **Check Build Logs:**
   - Go to: https://app.netlify.com/sites/aaires/deploys
   - Click on the latest deployment
   - Check **"Build log"** section
   - Verify the build shows the environment variable is available

2. **Check Deployed Code:**
   - After deployment, the built JavaScript should contain the correct URL
   - You can verify by checking the browser console or network tab

3. **Test Connection:**
   - Visit: https://aaires.netlify.app
   - Try to log in
   - Check browser console (F12) → Network tab
   - Should see requests going to `http://34.235.168.136:4000` instead of `localhost:4000`

## Important Notes

### Environment Variable Must Be Set Before Build

- ❌ Setting it after build won't work
- ✅ Must be set before/during build
- ✅ Each new deployment rebuilds with current environment variables

### Backend IP May Change

If ECS tasks restart, the public IP may change. You'll need to:
1. Get the new IP (use the command above)
2. Update `VITE_API_BASE_URL` in Netlify
3. Trigger a new deployment

**Better Solution for Production:** Use an Application Load Balancer (ALB) with a stable DNS name instead of using the task's public IP.

### Verify Environment Variable is Set

You can verify it's set correctly in Netlify:
1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables
2. Look for `VITE_API_BASE_URL` in the list
3. Verify the value is `http://34.235.168.136:4000` (or current IP)

### Debug in Browser

After deployment, check the browser console:
```javascript
// In browser console (F12)
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
```

If it shows `undefined` or `http://localhost:4000`, the environment variable wasn't set during the build.

## Quick Fix Script

```bash
#!/bin/bash
# Set VITE_API_BASE_URL and trigger Netlify redeploy

BACKEND_IP="34.235.168.136"
BACKEND_URL="http://${BACKEND_IP}:4000"

echo "Backend URL: $BACKEND_URL"
echo ""
echo "1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables"
echo "2. Set VITE_API_BASE_URL = $BACKEND_URL"
echo "3. Go to: https://app.netlify.com/sites/aaires/deploys"
echo "4. Click 'Trigger deploy' → 'Deploy site'"
```

## Troubleshooting

### Still Seeing localhost:4000

1. **Check if variable is set in Netlify:**
   - Go to environment variables page
   - Verify `VITE_API_BASE_URL` exists and has correct value

2. **Check if deployment was triggered after setting variable:**
   - Go to deploys page
   - Verify latest deployment happened AFTER setting the variable
   - Check build log to see if variable was available

3. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache entirely

4. **Verify build used the variable:**
   - Check build logs for the variable value
   - Should show `VITE_API_BASE_URL=http://34.235.168.136:4000` during build

### CORS Errors Persist

Even after fixing the URL, you may still see CORS errors if:
1. Backend CORS doesn't allow `https://aaires.netlify.app` (already fixed)
2. Security group doesn't allow inbound traffic on port 4000 (check this)

## Summary

✅ **Problem:** `VITE_API_BASE_URL` not set before build
✅ **Solution:** 
  1. Set `VITE_API_BASE_URL=http://34.235.168.136:4000` in Netlify
  2. Trigger new deployment
  3. Verify deployment completed successfully
  4. Test the site

✅ **Current Backend URL:** `http://34.235.168.136:4000`

