# Immediate Fix for 503 Error

## Current Situation

- ✅ HTTPS listener is configured correctly
- ✅ Target group is set up with correct type ("ip" for Fargate)
- ✅ ECS service is configured to use target group
- ❌ **Tasks are failing** because database SSL certificate is missing/incorrect

## The Real Problem

The database connection requires SSL verification, but:
1. The RDS CA certificate file (`/app/rds-ca-bundle.pem`) is missing from the Docker image
2. The code tries to verify the certificate but can't find the CA bundle
3. This causes tasks to fail health checks

## Best Solution: Trigger GitHub Actions Deployment

The **proper fix** is to deploy a new Docker image with the RDS certificate included:

### Option 1: Trigger GitHub Actions Workflow (Recommended)

1. **Go to GitHub Actions:**
   https://github.com/amudgal/PriceGuard/actions/workflows/deploy-backend.yml

2. **Click "Run workflow"** button (top right)
3. **Select branch:** `main` or `master`
4. **Click "Run workflow"**

The workflow will:
- ✅ Download RDS CA certificate automatically
- ✅ Build Docker image with certificate
- ✅ Push to ECR
- ✅ Deploy to ECS

**Wait time:** 5-10 minutes

### Option 2: Push Code to Trigger Deployment

```bash
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject
git add .
git commit -m "Trigger deployment to fix database SSL"
git push origin main
```

This will automatically trigger the GitHub Actions workflow.

## Verify After Deployment

1. **Check task health:**
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn arn:aws:elasticloadbalancing:us-east-1:144935603834:targetgroup/priceguard-targets-ip/eec5829c943d6d26 \
     --region us-east-1
   ```

2. **Test endpoint:**
   ```bash
   curl https://api.priceguardbackend.live/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "...",
     "service": "priceguard-server",
     "database": "connected"
   }
   ```

## Why Temporary Fixes Don't Work Well

We tried several temporary fixes:
1. ❌ Changed `PGSSLMODE` from `verify-full` to `require` - Still requires certificate verification
2. ❌ Changed `PGSSLMODE` to `allow` - May try non-SSL first, but RDS requires SSL
3. ❌ Removed `PGSSLROOTCERT` - Code still tries to verify without CA cert

**The code logic:**
```typescript
rejectUnauthorized: process.env.PGSSLMODE !== "allow"
```

This means any mode except "allow" will reject unauthorized certificates. But RDS requires SSL, and "allow" mode prefers non-SSL, so it's not ideal.

## What GitHub Actions Will Fix

The GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) already:
1. Downloads RDS CA certificate:
   ```yaml
   curl -o server/rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem
   ```

2. Builds Docker image with certificate included (Dockerfile copies it)

3. Deploys with `PGSSLMODE=verify-full` and `PGSSLROOTCERT=/app/rds-ca-bundle.pem`

## Monitor Deployment

After triggering GitHub Actions:

1. **Watch workflow:** https://github.com/amudgal/PriceGuard/actions
2. **Check ECS service:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
3. **Check logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```

## Summary

**Action Required:**
1. ✅ Trigger GitHub Actions deployment (click "Run workflow" in GitHub)
2. ⏳ Wait 5-10 minutes for deployment
3. ✅ Test endpoint: `curl https://api.priceguardbackend.live/health`

The deployment will fix the SSL certificate issue and your API should work correctly.

