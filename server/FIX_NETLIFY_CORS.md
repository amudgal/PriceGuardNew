# Fix Netlify CORS Issue

## Problem

The frontend at `https://aaires.netlify.app` is trying to connect to `http://localhost:4000` instead of the deployed backend API, causing CORS errors.

## Solution

### Step 1: Get Backend API URL

First, get your backend API URL:

```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

# Get network interface
NETWORK_INTERFACE=$(aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks $TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

# Get public IP
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $NETWORK_INTERFACE \
  --region us-east-1 \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo "Backend URL: http://$PUBLIC_IP:4000"
```

**Note:** Using the task's public IP is temporary. For production, you should set up an Application Load Balancer (ALB) or API Gateway for a stable URL.

### Step 2: Update Netlify Environment Variables

1. Go to your Netlify dashboard: https://app.netlify.com
2. Select your site: `aaires`
3. Go to **Site settings** → **Environment variables**
4. Add or update the following variable:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `http://YOUR_PUBLIC_IP:4000` (replace with your actual IP)
   - **Scopes:** All scopes (or Production, Preview, Deploy previews as needed)

5. **Redeploy your site** after adding the environment variable:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**

### Step 3: Update Backend CORS to Allow Netlify Domain

The backend needs to allow requests from `https://aaires.netlify.app`.

**Check current ALLOWED_ORIGINS:**
```bash
aws secretsmanager get-secret-value \
  --secret-id priceguard/allowed-origins-yBKnxy \
  --region us-east-1 \
  --query 'SecretString' \
  --output text
```

**Update ALLOWED_ORIGINS to include Netlify domain:**
```bash
aws secretsmanager update-secret \
  --secret-id priceguard/allowed-origins-yBKnxy \
  --secret-string "https://aaires.netlify.app" \
  --region us-east-1
```

**Or if you want to allow multiple origins:**
```bash
aws secretsmanager update-secret \
  --secret-id priceguard/allowed-origins-yBKnxy \
  --secret-string "https://aaires.netlify.app,http://localhost:3000" \
  --region us-east-1
```

**Restart ECS service to apply changes:**
```bash
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --force-new-deployment \
  --region us-east-1
```

### Step 4: Verify Security Group Allows HTTPS from Netlify

Make sure your security group allows inbound traffic on port 4000 from the internet (or at least from Netlify's IPs).

```bash
# Allow inbound on port 4000 from anywhere (for testing)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0d20af83680061442 \
  --protocol tcp \
  --port 4000 \
  --cidr 0.0.0.0/0 \
  --region us-east-1
```

**Note:** Opening port 4000 to the internet is not recommended for production. Use an ALB with HTTPS instead.

### Step 5: Test the Connection

After updating Netlify environment variables and redeploying:

1. Visit `https://aaires.netlify.app`
2. Try to log in
3. Check browser console for errors
4. Check backend logs:
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```

## Alternative: Set Up Application Load Balancer (Recommended)

For production, you should set up an ALB with:
- Stable DNS name (not IP address)
- HTTPS/SSL certificate
- Better security (don't expose ECS tasks directly)
- Health checks

### Quick ALB Setup

1. **Create ALB:**
   ```bash
   aws elbv2 create-load-balancer \
     --name priceguard-alb \
     --subnets subnet-4854cf05 subnet-f8e531a7 \
     --security-groups sg-0d20af83680061442 \
     --region us-east-1
   ```

2. **Create target group:**
   ```bash
   aws elbv2 create-target-group \
     --name priceguard-targets \
     --protocol HTTP \
     --port 4000 \
     --vpc-id vpc-6fa24512 \
     --health-check-path /health \
     --region us-east-1
   ```

3. **Register ECS service with target group:**
   - Update ECS service to use the target group
   - Or use service discovery

4. **Create listener:**
   ```bash
   aws elbv2 create-listener \
     --load-balancer-arn <ALB_ARN> \
     --protocol HTTPS \
     --port 443 \
     --certificates CertificateArn=<SSL_CERT_ARN> \
     --default-actions Type=forward,TargetGroupArn=<TARGET_GROUP_ARN> \
     --region us-east-1
   ```

5. **Update Netlify environment variable:**
   - `VITE_API_BASE_URL=https://your-alb-dns-name.elb.us-east-1.amazonaws.com`

## Current Configuration

### Frontend (Login.tsx)
```typescript
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";
```

### Backend (index.ts)
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000"];
```

## Summary

1. ✅ Get backend public IP
2. ✅ Set `VITE_API_BASE_URL` in Netlify environment variables
3. ✅ Update `ALLOWED_ORIGINS` in Secrets Manager to include `https://aaires.netlify.app`
4. ✅ Restart ECS service
5. ✅ Redeploy Netlify site
6. ✅ Test connection

## Troubleshooting

### CORS Error Still Appears

1. **Check Netlify environment variable:**
   - Make sure `VITE_API_BASE_URL` is set correctly
   - Redeploy site after setting variable

2. **Check backend CORS:**
   - Verify `ALLOWED_ORIGINS` includes `https://aaires.netlify.app`
   - Check backend logs for CORS errors

3. **Check security group:**
   - Make sure port 4000 is open
   - Check if requests are reaching the backend

### Connection Refused

1. **Check if backend is running:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1 \
     --query 'services[0].{runningCount:runningCount,desiredCount:desiredCount}'
   ```

2. **Check backend logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --since 5m --region us-east-1
   ```

3. **Test backend directly:**
   ```bash
   curl http://$PUBLIC_IP:4000/health
   ```

## Next Steps

1. Set up ALB for stable URL
2. Set up HTTPS/SSL certificate
3. Configure custom domain
4. Set up monitoring and alerts

