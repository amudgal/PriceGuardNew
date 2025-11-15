# Deploy Now to Fix 503 Error

## Current Status
- ❌ **0 tasks running** (tasks failing health checks)
- ❌ **All targets unhealthy** (503 errors)
- ❌ **Database SSL connection failing** (certificate missing from Docker image)

## Solution: Deploy via GitHub Actions

You need to trigger a GitHub Actions deployment to build a new Docker image with the RDS certificate included.

### Step 1: Go to GitHub Actions

**Open this URL in your browser:**
https://github.com/amudgal/PriceGuard/actions/workflows/deploy-backend.yml

### Step 2: Run the Workflow

1. Click the **"Run workflow"** button (top right of the page)
2. Select branch: **main** (or **master** if that's your default branch)
3. Click **"Run workflow"** button

### Step 3: Wait for Deployment

The workflow will:
1. ✅ Download RDS CA certificate automatically
2. ✅ Build Docker image with certificate included
3. ✅ Push to ECR
4. ✅ Update ECS task definition
5. ✅ Deploy to ECS service

**Wait time:** 5-10 minutes

### Step 4: Monitor Deployment

**Watch progress:**
- GitHub Actions: https://github.com/amudgal/PriceGuard/actions
- AWS ECS Console: https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server

### Step 5: Verify Fix

After deployment completes (5-10 minutes):

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

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T...",
  "service": "priceguard-server",
  "database": "connected"
}
```

## Alternative: Push Code to Trigger

If you prefer to push code instead:

```bash
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject

# Make a small change to trigger deployment (or just commit any existing changes)
git add .
git commit -m "Trigger deployment to fix database SSL"
git push origin main
```

This will automatically trigger the GitHub Actions workflow.

## What the GitHub Actions Workflow Does

The workflow (`.github/workflows/deploy-backend.yml`) automatically:

1. **Downloads RDS certificate:**
   ```yaml
   curl -o server/rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem
   ```

2. **Builds Docker image** (Dockerfile copies certificate to `/app/rds-ca-bundle.pem`)

3. **Deploys with correct SSL settings:**
   - `PGSSLMODE=verify-full`
   - `PGSSLROOTCERT=/app/rds-ca-bundle.pem`

## Why This Will Fix the Issue

- ✅ RDS certificate will be included in Docker image
- ✅ Database connection will work with SSL verification
- ✅ Health checks will pass
- ✅ Targets will become healthy
- ✅ API endpoint will return 200 instead of 503

## Troubleshooting

If deployment fails:
1. Check GitHub Actions logs for errors
2. Verify AWS credentials are set in GitHub Secrets
3. Check if ECR repository exists: `aws ecr describe-repositories --repository-names priceguard-server --region us-east-1`
4. Verify ECS service exists: `aws ecs describe-services --cluster priceguard-cluster --services priceguard-server --region us-east-1`

---

**Next Step:** Click "Run workflow" in GitHub Actions now! 🚀
