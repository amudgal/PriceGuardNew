# Fixing 503 Error on ALB

## Summary

The HTTPS listener is set up successfully, but you're getting a 503 error because:
1. ✅ Target group with correct type ("ip" for Fargate) has been created
2. ✅ Listeners are updated to use the new target group
3. ✅ ECS service is updated to use the new target group
4. ✅ Security groups are configured correctly
5. ✅ Target is registered with the target group
6. ⚠️ **Target is unhealthy** because the database SSL certificate is missing/incorrect

## Current Status

- **Target Registration**: ✅ Working (target `172.31.19.147:4000` is registered)
- **Target Health**: ❌ Unhealthy (health check returns 503)
- **Reason**: Database connection fails with "self-signed certificate in certificate chain"

## Solution

The Docker container expects `/app/rds-ca-bundle.pem` but the file is missing or incorrect.

### Step 1: Download RDS CA Certificate

```bash
cd priceguard/server
./download-rds-cert.sh
```

This downloads the RDS CA bundle to `rds-ca-bundle.pem`.

### Step 2: Deploy via GitHub Actions (Recommended - No Docker Required)

Since you're using GitHub Actions for deployment, you have two options:

**Option A: Trigger GitHub Actions Workflow**

The GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) already downloads the RDS certificate during build. Simply:

1. **Commit and push your changes** (if any):
   ```bash
   cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject
   git add priceguard/server/rds-ca-bundle.pem  # If you downloaded it
   git commit -m "Add RDS CA certificate"
   git push origin main
   ```

2. **Or trigger the workflow manually**:
   - Go to: https://github.com/amudgal/PriceGuard/actions
   - Click on "Deploy Backend to AWS ECS" workflow
   - Click "Run workflow" → Select branch → Click "Run workflow"

The workflow will:
- Download RDS CA certificate
- Build Docker image with certificate
- Push to ECR
- Update ECS task definition
- Deploy to ECS service

**Option B: Use deploy.sh Script (If you have Docker installed)**

If you have Docker installed locally, you can use:
```bash
cd priceguard/server
./deploy.sh
```

### Step 3: Monitor GitHub Actions Deployment

1. **Watch the workflow**: https://github.com/amudgal/PriceGuard/actions
2. **Wait for completion**: Usually takes 5-10 minutes
3. **Check AWS ECS Console**: https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server

### Step 4: Verify Deployment

Wait 2-3 minutes after deployment completes for:
1. New tasks to start
2. Tasks to register with target group
3. Health checks to pass

Then check target health:
```bash
NEW_TG_ARN="arn:aws:elasticloadbalancing:us-east-1:144935603834:targetgroup/priceguard-targets-ip/eec5829c943d6d26"
aws elbv2 describe-target-health --target-group-arn $NEW_TG_ARN --region us-east-1
```

Expected result: Target should show as "healthy".

### Step 5: Test Endpoint

```bash
curl https://api.priceguardbackend.live/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T...",
  "service": "priceguard-server",
  "database": "connected"
}
```

## Quick Fix: Trigger GitHub Actions Now

If you want to deploy immediately without committing changes:

1. Go to: https://github.com/amudgal/PriceGuard/actions/workflows/deploy-backend.yml
2. Click **"Run workflow"** button
3. Select branch: **main**
4. Click **"Run workflow"**
5. Wait for deployment to complete (5-10 minutes)
6. Test: `curl https://api.priceguardbackend.live/health`

The GitHub Actions workflow automatically:
- ✅ Downloads RDS CA certificate during build
- ✅ Builds Docker image with certificate included
- ✅ Pushes to ECR
- ✅ Updates and deploys to ECS

## Alternative: If Certificate Still Fails

If the RDS certificate still doesn't work, you can temporarily disable SSL verification (NOT recommended for production):

1. Update ECS task definition environment variable:
   - `PGSSLMODE`: Change from `verify-full` to `require` or `prefer`
   - Remove `PGSSLROOTCERT` environment variable

2. Force new deployment

**Note**: This is less secure and should only be used for testing.

## Troubleshooting

### Check Target Health
```bash
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:144935603834:targetgroup/priceguard-targets-ip/eec5829c943d6d26 \
  --region us-east-1
```

### Check Container Logs
```bash
aws logs tail /ecs/priceguard-server --follow --region us-east-1
```

### Check ECS Service Status
```bash
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1
```

## What Was Fixed

1. ✅ Created new target group with `--target-type ip` (required for Fargate)
2. ✅ Updated HTTP (port 80) and HTTPS (port 443) listeners to use new target group
3. ✅ Updated ECS service load balancer configuration
4. ✅ Added security group self-reference rule for ALB → ECS communication
5. ✅ Verified target registration is working

The only remaining issue is the database SSL certificate configuration.

