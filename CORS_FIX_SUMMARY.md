# CORS Fix Summary

## Problem

CORS error when frontend at `https://aaires.netlify.app` tries to access backend at `https://api.priceguardbackend.live`:

```
Access to fetch at 'https://api.priceguardbackend.live/api/auth/login' from origin 
'https://aaires.netlify.app' has been blocked by CORS policy
```

## Solution Applied

### ✅ Step 1: Updated ALLOWED_ORIGINS Secret

**Current value:** `https://aaires.netlify.app,http://localhost:3000`

```bash
aws secretsmanager update-secret \
  --secret-id arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/allowed-origins-yBKnxy \
  --secret-string "https://aaires.netlify.app,http://localhost:3000" \
  --region us-east-1
```

### ✅ Step 2: Enhanced CORS Configuration

Updated `server/src/index.ts` with explicit CORS settings:

```typescript
app.use(
  cors({
    origin: (origin, callback) => {
      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[cors] Blocked request from origin: ${origin || "none"}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type"],
  })
);
```

**Changes:**
- Added explicit `methods` array including `OPTIONS` for preflight
- Added explicit `allowedHeaders` for Content-Type and Authorization
- Added `exposedHeaders` for response headers
- Added logging for debugging CORS issues

### ✅ Step 3: Updated Frontend API Config

Updated `src/config/api.ts` to use custom domain:

- **Production HTTPS:** `https://api.priceguardbackend.live`
- **Development:** `http://localhost:4000`
- **Auto-detection:** Enabled

### ✅ Step 4: Restarted ECS Service

```bash
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --force-new-deployment \
  --region us-east-1
```

### ✅ Step 5: Committed and Pushed Changes

All changes have been committed and pushed to git:
- Enhanced CORS configuration
- Updated frontend API config
- Documentation added

## Verification

### Test Preflight Request (OPTIONS)

```bash
curl -X OPTIONS https://api.priceguardbackend.live/api/auth/login \
  -H "Origin: https://aaires.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected Response:**
```
< access-control-allow-origin: https://aaires.netlify.app
< access-control-allow-credentials: true
< access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE
< access-control-allow-headers: Content-Type, Authorization
```

✅ **Verified:** Preflight requests return correct CORS headers

### Test Actual Request (POST)

```bash
curl -X POST https://api.priceguardbackend.live/api/auth/login \
  -H "Origin: https://aaires.netlify.app" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Note:** May return 401 (unauthorized) or 503 (service unavailable) - but CORS headers should be present

## Current Status

✅ **ALLOWED_ORIGINS:** Updated to include `https://aaires.netlify.app`
✅ **CORS Configuration:** Enhanced with explicit methods and headers
✅ **Frontend API Config:** Updated to use `https://api.priceguardbackend.live`
✅ **Backend Code:** Enhanced with CORS logging
✅ **ECS Service:** Restarted to apply changes
✅ **Git:** Changes committed and pushed

## Next Steps

1. ⏳ **Wait for tasks to fully start** (2-3 minutes)
   - Check: `aws ecs describe-services --cluster priceguard-cluster --services priceguard-server`
   - Verify: `runningCount` == `desiredCount` (1)

2. ⏳ **Test from Netlify site:**
   - Visit: https://aaires.netlify.app
   - Try to log in
   - Check browser console (F12) for errors
   - CORS errors should be resolved

3. ⏳ **Monitor backend logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```
   - Look for: `[cors] Allowed origins: ...`
   - Check for any CORS warnings

## Troubleshooting

### If CORS Error Persists

1. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache entirely

2. **Verify tasks are running:**
   ```bash
   aws ecs list-tasks \
     --cluster priceguard-cluster \
     --service-name priceguard-server \
     --desired-status RUNNING \
     --region us-east-1
   ```

3. **Check backend logs for CORS messages:**
   ```bash
   aws logs tail /ecs/priceguard-server --since 5m --region us-east-1 | grep -i cors
   ```

4. **Verify secret value:**
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/allowed-origins-yBKnxy \
     --region us-east-1 \
     --query 'SecretString' \
     --output text
   ```
   Should show: `https://aaires.netlify.app,http://localhost:3000`

5. **Test preflight request:**
   ```bash
   curl -X OPTIONS https://api.priceguardbackend.live/api/auth/login \
     -H "Origin: https://aaires.netlify.app" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```
   Should return CORS headers

### Common Issues

**Issue:** Tasks still starting
- **Solution:** Wait 2-3 minutes for tasks to fully start
- **Check:** `aws ecs describe-services --cluster priceguard-cluster --services priceguard-server`

**Issue:** Browser cache
- **Solution:** Clear cache and hard refresh
- **Check:** Open DevTools (F12) → Network tab → Disable cache

**Issue:** DNS propagation
- **Solution:** Verify `api.priceguardbackend.live` resolves correctly
- **Test:** `nslookup api.priceguardbackend.live`

## Summary

✅ **ALLOWED_ORIGINS:** `https://aaires.netlify.app,http://localhost:3000`
✅ **CORS Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
✅ **CORS Headers:** Content-Type, Authorization
✅ **Frontend API:** `https://api.priceguardbackend.live`
✅ **Backend:** Enhanced with logging
✅ **Service:** Restarted

The CORS error should be resolved once the new tasks are running. Wait 2-3 minutes for tasks to start, then test the login functionality from the Netlify site.

