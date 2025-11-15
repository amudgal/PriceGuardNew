# Update Netlify Environment Variable After ALB Setup

After setting up your Application Load Balancer (ALB), you need to update the Netlify environment variable to point to your ALB URL instead of the old backend URL.

## Quick Start

Run the helper script:

```bash
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject/priceguard/server
./update-netlify-after-alb.sh
```

This script will:
- ✅ Get your ALB DNS name
- ✅ Check if HTTPS is available
- ✅ Display the exact URL to use
- ✅ Provide instructions for updating Netlify
- ✅ Test the ALB endpoint

---

## Manual Method

### Step 1: Get ALB URL

```bash
# Get ALB DNS name
aws elbv2 describe-load-balancers \
  --names priceguard-alb \
  --region us-east-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

This will output something like:
```
priceguard-alb-1234567890.us-east-1.elb.amazonaws.com
```

### Step 2: Determine Protocol (HTTP or HTTPS)

**Check if HTTPS listener exists:**
```bash
# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names priceguard-alb \
  --region us-east-1 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Check for HTTPS listener
aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region us-east-1 \
  --query 'Listeners[?Port==`443`]' \
  --output json
```

- **If HTTPS listener exists:** Use `https://your-alb-dns-name.elb.us-east-1.amazonaws.com`
- **If only HTTP listener:** Use `http://your-alb-dns-name.elb.us-east-1.amazonaws.com`
  - ⚠️ **Warning:** For production, you should set up HTTPS

### Step 3: Update Netlify Environment Variable

#### Method A: Using Netlify Web UI (Recommended)

1. **Go to Netlify Dashboard:**
   - https://app.netlify.com/sites/aaires/settings/deploys#environment-variables
   - (Replace `aaires` with your site ID)

2. **Update or Add Variable:**
   - If `VITE_API_BASE_URL` already exists, click to edit it
   - If it doesn't exist, click "Add variable"
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://your-alb-dns-name.elb.us-east-1.amazonaws.com` (or `http://` if HTTPS not available)
   - **Scope:** All scopes (or Production/Build if you prefer)
   - Click **"Save"**

3. **Redeploy Your Site:**
   - Go to: https://app.netlify.com/sites/aaires/deploys
   - Click **"Trigger deploy"** → **"Deploy site"**
   - Or push a commit to trigger automatic deployment

#### Method B: Using Netlify CLI

If you have Netlify CLI installed:

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Set environment variable
netlify env:set VITE_API_BASE_URL "https://your-alb-dns-name.elb.us-east-1.amazonaws.com" --context production

# Trigger deployment
netlify deploy --prod
```

#### Method C: Using Netlify API

If you have a Netlify API token:

```bash
# Get your API token from: https://app.netlify.com/user/applications
export NETLIFY_AUTH_TOKEN=your_token_here
export NETLIFY_SITE_ID=aaires  # Your site ID

# Set environment variable
curl -X POST "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/env" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "VITE_API_BASE_URL",
    "value": "https://your-alb-dns-name.elb.us-east-1.amazonaws.com",
    "scopes": ["builds", "functions", "runtime", "post_processing"]
  }'

# Trigger deployment
curl -X POST "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys" \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN"
```

---

## Verify the Update

### Step 1: Check Netlify Environment Variable

In Netlify dashboard, verify:
- ✅ Variable `VITE_API_BASE_URL` exists
- ✅ Value matches your ALB URL
- ✅ Scope includes "Build" or "All"

### Step 2: Check Deployment

1. Go to Netlify deploys: https://app.netlify.com/sites/aaires/deploys
2. Wait for deployment to complete
3. Check build logs for any errors

### Step 3: Test Your Application

1. **Visit your site:** https://aaires.netlify.app
2. **Open browser developer tools** (F12)
3. **Check Network tab:**
   - Look for API requests to your ALB URL
   - Verify they're using the correct protocol (HTTPS recommended)
4. **Try logging in or registering** to test the API connection
5. **Check Console tab** for any CORS or connection errors

### Step 4: Test ALB Endpoint Directly

```bash
# Test health endpoint
curl https://your-alb-dns-name.elb.us-east-1.amazonaws.com/health

# Should return:
# {"status":"healthy","timestamp":"...","service":"priceguard-server","database":"connected"}
```

---

## Troubleshooting

### Problem: Still Getting Mixed Content Errors

**Symptoms:**
- Browser shows "Mixed Content" warnings
- API requests are blocked

**Solutions:**
1. **Check if you're using HTTPS:**
   - Verify `VITE_API_BASE_URL` starts with `https://`
   - If using HTTP, set up HTTPS with SSL certificate (see `REQUEST_SSL_CERTIFICATE.md`)

2. **Verify ALB has HTTPS listener:**
   ```bash
   aws elbv2 describe-listeners \
     --load-balancer-arn $ALB_ARN \
     --region us-east-1 \
     --query 'Listeners[?Port==`443`]'
   ```

3. **Update Netlify variable to use HTTPS:**
   - Change from `http://` to `https://`
   - Redeploy Netlify site

### Problem: API Requests Fail with CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- Requests return "Access-Control-Allow-Origin" errors

**Solutions:**
1. **Verify ALLOWED_ORIGINS includes Netlify domain:**
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id priceguard/allowed-origins-yBKnxy \
     --region us-east-1 \
     --query 'SecretString' \
     --output text
   ```
   
   Should include: `https://aaires.netlify.app`

2. **Update ALLOWED_ORIGINS if needed:**
   ```bash
   aws secretsmanager update-secret \
     --secret-id priceguard/allowed-origins-yBKnxy \
     --secret-string "https://aaires.netlify.app,http://localhost:3000" \
     --region us-east-1
   ```

3. **Restart ECS service to apply changes:**
   ```bash
   aws ecs update-service \
     --cluster priceguard-cluster \
     --service priceguard-server \
     --force-new-deployment \
     --region us-east-1
   ```

### Problem: ALB Returns 502 Bad Gateway

**Symptoms:**
- ALB endpoint returns 502 errors
- Health check fails

**Solutions:**
1. **Check if ECS tasks are registered with target group:**
   ```bash
   TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
     --names priceguard-targets \
     --region us-east-1 \
     --query 'TargetGroups[0].TargetGroupArn' \
     --output text)
   
   aws elbv2 describe-target-health \
     --target-group-arn $TARGET_GROUP_ARN \
     --region us-east-1
   ```

2. **Verify ECS service is using the target group:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1 \
     --query 'services[0].loadBalancers'
   ```

3. **Update ECS service to use target group:**
   ```bash
   aws ecs update-service \
     --cluster priceguard-cluster \
     --service priceguard-server \
     --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=priceguard-server,containerPort=4000 \
     --region us-east-1
   ```

### Problem: Environment Variable Not Applied

**Symptoms:**
- Updated variable but old URL still being used
- Build logs show old URL

**Solutions:**
1. **Verify variable scope:**
   - Make sure scope includes "Build" (required for Vite environment variables)

2. **Clear Netlify build cache:**
   - Go to Netlify dashboard → Site settings → Build & deploy → Clear cache
   - Trigger new deployment

3. **Check build logs:**
   - Look for `VITE_API_BASE_URL` in build logs
   - Verify it's using the new value

---

## Complete Workflow Example

After setting up ALB:

```bash
# 1. Get ALB URL (using script)
cd priceguard/server
./update-netlify-after-alb.sh

# 2. The script will show you the URL, then:
#    - Go to Netlify dashboard
#    - Update VITE_API_BASE_URL environment variable
#    - Redeploy site

# 3. If HTTPS is not set up yet:
./request-certificate.sh
# Follow instructions to validate certificate
# Then create HTTPS listener on ALB
# Update Netlify variable to use https://

# 4. Verify everything works:
curl https://your-alb-dns-name.elb.us-east-1.amazonaws.com/health
```

---

## Quick Reference

### Environment Variable
- **Key:** `VITE_API_BASE_URL`
- **Value Format:** `https://your-alb-dns-name.elb.us-east-1.amazonaws.com`
- **Scope:** All scopes (or at least Build)

### Important URLs
- **Netlify Environment Variables:** https://app.netlify.com/sites/aaires/settings/deploys#environment-variables
- **Netlify Deploys:** https://app.netlify.com/sites/aaires/deploys
- **ALB Console:** https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LoadBalancers:

### Commands

```bash
# Get ALB DNS name
aws elbv2 describe-load-balancers --names priceguard-alb --region us-east-1 --query 'LoadBalancers[0].DNSName' --output text

# Check HTTPS listener
aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --region us-east-1 --query 'Listeners[?Port==`443`]'

# Test ALB endpoint
curl https://your-alb-dns-name.elb.us-east-1.amazonaws.com/health
```

---

## Next Steps

After updating Netlify:

1. ✅ Verify API is accessible from frontend
2. ✅ Test login/registration
3. ✅ Monitor for any errors
4. ✅ Set up HTTPS if not already done (see `REQUEST_SSL_CERTIFICATE.md`)
5. ✅ Configure monitoring and alerts

---

## Resources

- **Helper Script:** `./update-netlify-after-alb.sh`
- **SSL Certificate Guide:** `REQUEST_SSL_CERTIFICATE.md`
- **HTTPS Setup:** `QUICK_FIX_HTTPS.md`
- **Troubleshooting:** `FIX_NETLIFY_CORS.md`

