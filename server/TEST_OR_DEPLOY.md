# Test URL or Deploy? Quick Decision Guide

## Current Status

Your API is currently showing:
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "self-signed certificate in certificate chain"
}
```

## ✅ Recommended: Quick Fix First (No Rebuild Needed)

**Option 1: Quick Fix - Test Immediately** ⚡

This fixes the issue without rebuilding the Docker image:

```bash
cd priceguard/server
./fix-database-ssl.sh
```

**What this does:**
- Changes `PGSSLMODE` from `verify-full` to `require`
- Updates ECS task definition
- Restarts ECS service with new configuration
- **Takes ~2-3 minutes**
- **No code rebuild needed**

**Then test:**
```bash
curl http://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com/health
```

**Expected result:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 🔄 Option 2: Full Fix - Rebuild with Improved Code

After the quick fix works, you can rebuild with the improved code for better error handling.

### Option 2A: Manual Deploy (Recommended for Now)

```bash
cd priceguard/server
./deploy.sh
```

This will:
1. Build Docker image with updated `db.ts` code
2. Push to ECR
3. Update ECS service
4. **Takes ~5-10 minutes**

### Option 2B: GitHub Actions (For Future)

If you want automated deployments on every push:

1. **Check if workflow exists:**
   ```bash
   ls -la .github/workflows/
   ```

2. **If it doesn't exist, create it:**
   - See `GITHUB_ACTIONS_SETUP.md` for instructions
   - Set up GitHub Secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
   - Push code to trigger workflow

3. **If it exists, just push:**
   ```bash
   git add .
   git commit -m "Fix database SSL certificate handling"
   git push
   ```

---

## 🎯 My Recommendation

**Do this now:**

1. ✅ **Run quick fix:**
   ```bash
   cd priceguard/server
   ./fix-database-ssl.sh
   ```

2. ✅ **Wait 2-3 minutes for deployment**

3. ✅ **Test the URL:**
   ```bash
   curl http://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com/health
   ```

4. ✅ **If it works, you're done for now!**

5. ✅ **Later (when you have time), rebuild with improved code:**
   ```bash
   ./deploy.sh
   ```

---

## 📊 Comparison

| Method | Time | Rebuild Needed | Code Changes Included |
|--------|------|----------------|----------------------|
| **Quick Fix** | 2-3 min | ❌ No | ❌ No (just config change) |
| **Manual Deploy** | 5-10 min | ✅ Yes | ✅ Yes (improved error handling) |
| **GitHub Actions** | 5-10 min | ✅ Yes | ✅ Yes (automated) |

---

## 🚀 Quick Start Commands

**Fastest way to fix right now:**
```bash
cd priceguard/server
./fix-database-ssl.sh
# Wait 2-3 minutes
curl http://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com/health
```

**If you want the improved code:**
```bash
cd priceguard/server
./deploy.sh
# Wait 5-10 minutes
curl http://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com/health
```

---

## ❓ Which Should You Choose?

- **Need it working NOW?** → Run `./fix-database-ssl.sh`
- **Have 10 minutes?** → Run `./deploy.sh` (includes code improvements)
- **Want automation?** → Set up GitHub Actions (see `GITHUB_ACTIONS_SETUP.md`)

---

## 🔍 Verify It's Working

After either method, test:

```bash
# Health check
curl http://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com/health

# Should return:
# {
#   "status": "healthy",
#   "database": "connected"
# }

# Test API endpoint
curl -X POST http://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

