# Quick Fix: Mixed Content Error (HTTPS Required)

## Problem

**Error:** Mixed Content - The page at `https://aaires.netlify.app/` was loaded over HTTPS, but requested an insecure resource `http://54.92.218.42:4000/api/auth/login`.

Browsers block HTTP requests from HTTPS pages for security reasons.

## Quick Solution: Use ALB with HTTPS

### Step 1: Set Up Application Load Balancer

Run the setup script:

```bash
cd server
chmod +x setup-alb.sh
./setup-alb.sh
```

This will:
- Create an ALB
- Create a target group
- Configure HTTP listener (port 80)
- Provide instructions for HTTPS

### Step 2: Request SSL Certificate

1. **Go to AWS Certificate Manager:**
   - https://console.aws.amazon.com/acm/home?region=us-east-1

2. **Request a certificate:**
   - Click "Request a certificate"
   - Choose "Request a public certificate"
   - Enter domain name (e.g., `api.yourdomain.com` or use ALB DNS)
   - Choose validation method (DNS recommended)
   - Complete validation

3. **Wait for certificate to be issued** (usually 5-10 minutes)

### Step 3: Create HTTPS Listener

After certificate is issued:

```bash
# Get certificate ARN
CERT_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --query 'CertificateSummaryList[0].CertificateArn' \
  --output text)

# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names priceguard-alb \
  --region us-east-1 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get target group ARN
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names priceguard-targets \
  --region us-east-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --region us-east-1
```

### Step 4: Update ECS Service to Use ALB

```bash
# Get target group ARN
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names priceguard-targets \
  --region us-east-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Update ECS service
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=priceguard-server,containerPort=4000 \
  --region us-east-1
```

### Step 5: Get ALB HTTPS URL

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names priceguard-alb \
  --region us-east-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB HTTPS URL: https://$ALB_DNS"
```

### Step 6: Update Netlify Environment Variable

1. **Go to Netlify:**
   - https://app.netlify.com/sites/aaires/settings/deploys#environment-variables

2. **Update variable:**
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-alb-dns-name.elb.us-east-1.amazonaws.com`
   - Click "Save"

3. **Trigger new deployment:**
   - https://app.netlify.com/sites/aaires/deploys
   - Click "Trigger deploy" → "Deploy site"

## Alternative: Temporary Workaround (NOT RECOMMENDED)

For testing only, you can temporarily disable mixed content warnings in the browser:

1. **Chrome:** Visit `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add your HTTP backend URL
3. Restart browser

**⚠️ This is NOT recommended for production and only works for testing.**

## Summary

✅ **Problem:** Mixed content error (HTTPS frontend, HTTP backend)
✅ **Solution:** Set up ALB with HTTPS
✅ **Steps:**
   1. Create ALB
   2. Request SSL certificate
   3. Create HTTPS listener
   4. Update ECS service
   5. Update Netlify environment variable

## Resources

- **ALB Setup Script:** `./setup-alb.sh`
- **AWS Certificate Manager:** https://console.aws.amazon.com/acm/home?region=us-east-1
- **ALB Console:** https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LoadBalancers:
- **ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server

