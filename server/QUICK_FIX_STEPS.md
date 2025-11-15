# Quick Fix Steps - 503 Error

## Current Status ✅
- ✅ Endpoint is responding: `curl https://api.priceguardbackend.live/health` returns JSON
- ✅ Task is registered with target group
- ❌ Database connection failing: "self-signed certificate in certificate chain"
- ❌ Health check returns unhealthy status

## The Problem
The Docker image doesn't contain the RDS CA certificate file (`/app/rds-ca-bundle.pem`), so database SSL verification fails.

## Solution: Deploy New Image via GitHub Actions

### Option 1: Click "Run workflow" in GitHub (FASTEST - 2 clicks)

1. **Open this URL:**
   ```
   https://github.com/amudgal/PriceGuard/actions/workflows/deploy-backend.yml
   ```

2. **Click "Run workflow"** (top right button)

3. **Select branch:** `main`

4. **Click "Run workflow"**

5. **Wait 5-10 minutes** for deployment

6. **Test:**
   ```bash
   curl https://api.priceguardbackend.live/health
   ```

### Option 2: Push code to trigger deployment

```bash
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject

# Make any change to trigger deployment
git add .
git commit -m "Trigger deployment to fix database SSL"
git push origin main
```

This will automatically trigger GitHub Actions.

## What Happens During Deployment

The GitHub Actions workflow:
1. ✅ Downloads RDS CA certificate automatically
2. ✅ Builds Docker image with certificate included
3. ✅ Pushes new image to ECR
4. ✅ Updates ECS task definition
5. ✅ Deploys to ECS service

After deployment, your tasks will have the certificate file and database connections will work.

## Verify After Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1 \
  --query 'services[0].{Running:runningCount,Desired:desiredCount}'

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:144935603834:targetgroup/priceguard-targets-ip/eec5829c943d6d26 \
  --region us-east-1

# Test endpoint
curl https://api.priceguardbackend.live/health
```

**Expected after deployment:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

## Why This Works

The current Docker image (built on 2025-11-14) doesn't have the RDS certificate file. The GitHub Actions workflow downloads it during build and includes it in the image. Once deployed, tasks will have the certificate at `/app/rds-ca-bundle.pem` and database connections will work.

---

**Next Step:** Open the GitHub Actions URL and click "Run workflow" now! 🚀

