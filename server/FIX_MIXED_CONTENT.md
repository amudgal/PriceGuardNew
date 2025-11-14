# Fix Mixed Content Error

## Problem

The frontend at `https://aaires.netlify.app` is trying to access the backend API at `http://54.92.218.42:4000` (HTTP), but browsers block HTTP requests from HTTPS pages for security reasons.

**Error:**
```
Mixed Content: The page at 'https://aaires.netlify.app/' was loaded over HTTPS, 
but requested an insecure resource 'http://54.92.218.42:4000/api/auth/login'. 
This request has been blocked; the content must be served over HTTPS.
```

## Solution

The backend API must be served over HTTPS. There are several options:

### Option 1: Application Load Balancer (ALB) with HTTPS (Recommended)

Set up an ALB with HTTPS support:

1. **Create ALB:**
   ```bash
   cd server
   ./setup-alb.sh
   ```

2. **Request SSL Certificate:**
   - Go to AWS Certificate Manager (ACM): https://console.aws.amazon.com/acm/home?region=us-east-1
   - Request a certificate
   - Validate the certificate (DNS or email validation)

3. **Create HTTPS Listener:**
   - Attach the certificate to the ALB
   - Create HTTPS listener on port 443
   - Forward traffic to the target group

4. **Update Netlify Environment Variable:**
   - Set `VITE_API_BASE_URL` to `https://your-alb-dns-name.elb.us-east-1.amazonaws.com`
   - Trigger new deployment

### Option 2: Cloudflare (Quick Fix)

Use Cloudflare to add HTTPS to the backend:

1. **Set up Cloudflare:**
   - Add your backend IP to Cloudflare
   - Configure Cloudflare to proxy traffic
   - Cloudflare will provide HTTPS automatically

2. **Update Netlify Environment Variable:**
   - Set `VITE_API_BASE_URL` to the Cloudflare HTTPS URL
   - Trigger new deployment

### Option 3: API Gateway with HTTPS (Alternative)

Set up API Gateway with HTTPS:

1. **Create API Gateway:**
   - Create REST API
   - Configure HTTP integration to backend
   - Deploy API with HTTPS endpoint

2. **Update Netlify Environment Variable:**
   - Set `VITE_API_BASE_URL` to the API Gateway HTTPS URL
   - Trigger new deployment

## Quick Fix: Temporary Solution

For immediate testing, you can temporarily use HTTP for both frontend and backend, but this is **NOT recommended** for production:

1. **Option A: Use HTTP for frontend (NOT RECOMMENDED)**
   - Deploy frontend to HTTP (not HTTPS)
   - This allows HTTP backend connections
   - **Security risk:** Not recommended

2. **Option B: Use ALB with HTTP (Still has mixed content warning)**
   - Set up ALB with HTTP only
   - Use ALB DNS name instead of IP
   - Still shows mixed content warning in browser

## Recommended Solution: ALB with HTTPS

### Step 1: Set Up ALB

```bash
cd server
chmod +x setup-alb.sh
./setup-alb.sh
```

### Step 2: Request SSL Certificate

1. Go to AWS Certificate Manager: https://console.aws.amazon.com/acm/home?region=us-east-1
2. Click "Request a certificate"
3. Choose "Request a public certificate"
4. Enter domain name (or use wildcard `*.yourdomain.com`)
5. Choose validation method (DNS recommended)
6. Complete validation

### Step 3: Create HTTPS Listener

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

### Step 4: Update ECS Service

```bash
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=priceguard-server,containerPort=4000 \
  --region us-east-1
```

### Step 5: Update Netlify Environment Variable

1. Get ALB DNS name:
   ```bash
   aws elbv2 describe-load-balancers \
     --names priceguard-alb \
     --region us-east-1 \
     --query 'LoadBalancers[0].DNSName' \
     --output text
   ```

2. Set in Netlify:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-alb-dns-name.elb.us-east-1.amazonaws.com`
   - Trigger new deployment

## Alternative: Use Custom Domain

If you have a custom domain:

1. **Set up custom domain for backend:**
   - Point DNS to ALB
   - Request SSL certificate for custom domain
   - Configure ALB with custom domain certificate

2. **Update Netlify Environment Variable:**
   - Set `VITE_API_BASE_URL` to `https://api.yourdomain.com`
   - Trigger new deployment

## Current Status

- **Frontend:** `https://aaires.netlify.app` (HTTPS) ✅
- **Backend:** `http://54.92.218.42:4000` (HTTP) ❌
- **Issue:** Mixed content error ❌
- **Solution:** Set up HTTPS for backend ✅

## Next Steps

1. ✅ Set up ALB with HTTPS
2. ✅ Request SSL certificate
3. ✅ Configure HTTPS listener
4. ✅ Update ECS service to use ALB
5. ✅ Update Netlify environment variable
6. ✅ Test connection

## Resources

- **ALB Setup Script:** `./setup-alb.sh`
- **AWS Certificate Manager:** https://console.aws.amazon.com/acm/home?region=us-east-1
- **ALB Console:** https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LoadBalancers:
- **ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server

