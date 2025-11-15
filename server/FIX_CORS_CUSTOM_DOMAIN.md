# Fix CORS Error with Custom Domain

## Problem

CORS error when frontend at `https://aaires.netlify.app` tries to access backend at `https://api.priceguardbackend.live`:

```
Access to fetch at 'https://api.priceguardbackend.live/api/auth/login' from origin 
'https://aaires.netlify.app' has been blocked by CORS policy: Response to preflight 
request doesn't pass access control check: No 'Access-Control-Allow-Origin' header 
is present on the requested resource.
```

## Root Cause

The backend's `ALLOWED_ORIGINS` secret needs to include `https://aaires.netlify.app`, and the CORS middleware needs to be properly configured for preflight (OPTIONS) requests.

## Solution

### Step 1: Update ALLOWED_ORIGINS Secret ✅

The secret has been updated to include the Netlify domain:

```bash
aws secretsmanager update-secret \
  --secret-id arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/allowed-origins-yBKnxy \
  --secret-string "https://aaires.netlify.app,http://localhost:3000" \
  --region us-east-1
```

**Current value:** `https://aaires.netlify.app,http://localhost:3000`

### Step 2: Enhanced CORS Configuration ✅

Updated the CORS middleware to explicitly handle preflight requests:

```typescript
app.use(
  cors({
    origin: (origin, callback) => {
      // Check if origin is allowed
      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
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

### Step 3: Restart ECS Service ✅

The ECS service has been restarted to apply the CORS changes:

```bash
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --force-new-deployment \
  --region us-east-1
```

### Step 4: Update Frontend API Config ✅

Updated the frontend to use the custom domain:

- **Custom Domain:** `https://api.priceguardbackend.live`
- **Frontend Config:** `src/config/api.ts` updated to use custom domain
- **Build:** Frontend rebuilt and committed

## Verification

### Test Preflight Request

```bash
curl -X OPTIONS https://api.priceguardbackend.live/api/auth/login \
  -H "Origin: https://aaires.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected Response Headers:**
```
< access-control-allow-origin: https://aaires.netlify.app
< access-control-allow-credentials: true
< access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE
< access-control-allow-headers: Content-Type, Authorization
```

### Test Actual Request

```bash
curl -X POST https://api.priceguardbackend.live/api/auth/login \
  -H "Origin: https://aaires.netlify.app" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Current Configuration

### Backend CORS
- **Allowed Origins:** `https://aaires.netlify.app`, `http://localhost:3000`
- **Credentials:** Enabled
- **Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers:** Content-Type, Authorization

### Frontend API Config
- **Production:** `https://api.priceguardbackend.live`
- **Development:** `http://localhost:4000`
- **Auto-detection:** Enabled

## Troubleshooting

### Still Getting CORS Error?

1. **Wait for tasks to start:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1 \
     --query 'services[0].{runningCount:runningCount,desiredCount:desiredCount}'
   ```

2. **Check backend logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```
   Look for CORS-related messages: `[cors] Allowed origins: ...`

3. **Verify secret value:**
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/allowed-origins-yBKnxy \
     --region us-east-1 \
     --query 'SecretString' \
     --output text
   ```

4. **Test endpoint directly:**
   ```bash
   curl -X OPTIONS https://api.priceguardbackend.live/api/auth/login \
     -H "Origin: https://aaires.netlify.app" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```

### Common Issues

**Issue 1: Tasks not running**
- **Solution:** Wait 2-3 minutes for tasks to start
- **Check:** `aws ecs list-tasks --cluster priceguard-cluster --service-name priceguard-server --desired-status RUNNING`

**Issue 2: Secret not updated**
- **Solution:** Verify secret value includes `https://aaires.netlify.app`
- **Fix:** Update secret and restart service

**Issue 3: Frontend cache**
- **Solution:** Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

**Issue 4: DNS propagation**
- **Solution:** Verify `api.priceguardbackend.live` resolves correctly
- **Test:** `nslookup api.priceguardbackend.live`

## Next Steps

1. ✅ ALLOWED_ORIGINS updated
2. ✅ CORS middleware enhanced
3. ✅ ECS service restarted
4. ✅ Frontend updated to use custom domain
5. ⏳ Wait for tasks to start (2-3 minutes)
6. ⏳ Test login from Netlify site
7. ⏳ Verify no CORS errors

## Summary

✅ **CORS Configuration:** Enhanced with explicit methods and headers
✅ **ALLOWED_ORIGINS:** Updated to include `https://aaires.netlify.app`
✅ **Frontend:** Updated to use custom domain `https://api.priceguardbackend.live`
✅ **Backend:** Enhanced CORS logging for debugging
✅ **Service:** Restarted to apply changes

The CORS error should be resolved once the new tasks are running with the updated configuration.

