# Quick Fix: Netlify CORS Issue

## Problem

Frontend at `https://aaires.netlify.app` is trying to connect to `http://localhost:4000` instead of the deployed backend API.

## Solution

### ✅ Step 1: Backend CORS Already Updated

The backend CORS has been updated to allow `https://aaires.netlify.app`.

### ✅ Step 2: Backend URL

**Backend URL:** `http://34.235.168.136:4000`

**⚠️ Note:** This IP may change if tasks restart. For production, set up an ALB.

### ⏳ Step 3: Set Netlify Environment Variable (YOU NEED TO DO THIS)

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables

2. **Add Environment Variable:**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `http://34.235.168.136:4000`
   - **Scopes:** All scopes (Production, Preview, Deploy previews)
   - Click **Save**

3. **Redeploy Site:**
   - Go to: https://app.netlify.com/sites/aaires/deploys
   - Click **Trigger deploy** → **Deploy site**
   - Wait for deployment to complete

### ✅ Step 4: Test

1. Visit: https://aaires.netlify.app
2. Try to log in
3. Check browser console (F12) for errors
4. Should no longer see CORS errors

## Quick Test Commands

```bash
# Test backend health
curl http://34.235.168.136:4000/health

# Test login endpoint
curl -X POST http://34.235.168.136:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

## Summary

✅ Backend CORS updated
✅ Backend URL: `http://34.235.168.136:4000`
⏳ **YOU NEED TO:** Set `VITE_API_BASE_URL` in Netlify
⏳ **YOU NEED TO:** Redeploy Netlify site

## Resources

- **Netlify Environment Variables:** https://app.netlify.com/sites/aaires/settings/deploys#environment-variables
- **Netlify Deploys:** https://app.netlify.com/sites/aaires/deploys

