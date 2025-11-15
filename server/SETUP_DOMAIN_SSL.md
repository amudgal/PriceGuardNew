# Setting Up SSL Certificate for priceguardbackend.live

## Certificate Information

**Certificate ARN:** `arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28`

**Domains covered:**
- `api.priceguardbackend.live` (primary - for API backend)
- `priceguardbackend.live` (root domain)
- `www.priceguardbackend.live` (www subdomain)

**ALB DNS Name:** `priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`

---

## Step 1: Add DNS Validation Records in Netlify

You need to add **3 CNAME records** to validate your certificate. These are for AWS Certificate Manager validation.

### Go to Netlify DNS Settings:

1. Log into **Netlify Dashboard**
2. Go to your site: **priceguardbackend.live**
3. Navigate to: **Site settings** → **Domain management** → **DNS**
4. Click **"Add DNS record"**

### Add these 3 CNAME records:

#### Record 1: For `api.priceguardbackend.live`
- **Type:** CNAME
- **Name/Host:** `_34f8d0696ae60d5f296b8a9081ffaa25.api`
- **Value/Target:** `_92a3917b366a57427860497c0e0a60e0.jkddzztszm.acm-validations.aws.`
- **TTL:** 3600 (or default)

#### Record 2: For `priceguardbackend.live`
- **Type:** CNAME
- **Name/Host:** `_4d104a318cd5307eaa4735302cdd9ce0`
- **Value/Target:** `_4b2d6f567dd7aacbf79c62d050e7c3ff.jkddzztszm.acm-validations.aws.`
- **TTL:** 3600 (or default)

#### Record 3: For `www.priceguardbackend.live`
- **Type:** CNAME
- **Name/Host:** `_800866258fb9d6a036b6daa2abbf0798.www`
- **Value/Target:** `_e6cfe7d479dcbe311dcbb153950c0de8.jkddzztszm.acm-validations.aws.`
- **TTL:** 3600 (or default)

**⚠️ Important:** Make sure there's a trailing dot (.) at the end of the Target values!

---

## Step 2: Point Domain to ALB

After adding validation records, add a CNAME record to point your API subdomain to the ALB:

### Add CNAME Record for API:

- **Type:** CNAME
- **Name/Host:** `api`
- **Value/Target:** `priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`
- **TTL:** 3600 (or default)

This will make `api.priceguardbackend.live` point to your ALB.

**Optional:** If you also want the root domain (`priceguardbackend.live`) to point to the ALB, you can add:
- **Type:** CNAME
- **Name/Host:** `@` (or leave blank for root)
- **Value/Target:** `priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`

**Note:** Some DNS providers don't allow CNAME on root domain. If Netlify doesn't allow it, you'll need to use an A record with ALB IPs (which change), or just use the `api` subdomain.

---

## Step 3: Wait for Certificate Validation

After adding the DNS validation records:

1. **Wait 5-30 minutes** for DNS propagation
2. **Check certificate status** using this command:

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28 \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Status should change from `PENDING_VALIDATION` to `ISSUED`.

---

## Step 4: Create HTTPS Listener on ALB

Once the certificate status is `ISSUED`, create the HTTPS listener:

```bash
# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names priceguard-alb \
  --region us-east-1 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get Target Group ARN
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
  --certificates CertificateArn=arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --region us-east-1
```

Or run the automated script:
```bash
cd priceguard/server
./setup-alb.sh
```

The script will automatically detect your certificate and create the HTTPS listener.

---

## Step 5: Test Your HTTPS Endpoint

After everything is set up, test your API:

```bash
# Test health endpoint
curl https://api.priceguardbackend.live/health

# Test API endpoint
curl https://api.priceguardbackend.live/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

---

## Step 6: Update Frontend Configuration

Update your Netlify environment variables to use the new HTTPS endpoint:

1. Go to **Netlify Dashboard** → Your frontend site
2. **Site settings** → **Environment variables**
3. Update or add:
   ```
   VITE_API_BASE_URL=https://api.priceguardbackend.live
   ```
4. **Redeploy** your frontend site

---

## Troubleshooting

### Certificate Stuck in "PENDING_VALIDATION"

1. **Verify DNS records are correct:**
   ```bash
   dig _34f8d0696ae60d5f296b8a9081ffaa25.api.priceguardbackend.live CNAME
   ```

2. **Check for typos** in the CNAME records
3. **Wait longer** - DNS propagation can take up to 72 hours
4. **Verify records in Netlify** - Make sure they're saved correctly

### Cannot Access api.priceguardbackend.live

1. **Check DNS propagation:**
   ```bash
   dig api.priceguardbackend.live CNAME
   ```
   Should return: `priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`

2. **Check ALB is active:**
   ```bash
   aws elbv2 describe-load-balancers \
     --names priceguard-alb \
     --region us-east-1 \
     --query 'LoadBalancers[0].State.Code' \
     --output text
   ```
   Should return: `active`

3. **Check HTTPS listener exists:**
   ```bash
   aws elbv2 describe-listeners \
     --load-balancer-arn $ALB_ARN \
     --region us-east-1 \
     --query 'Listeners[*].{Port:Port,Protocol:Protocol}' \
     --output table
   ```
   Should show port 443 with HTTPS protocol

---

## Quick Reference Commands

### Check Certificate Status
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28 \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

### Get Validation Records (if needed again)
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28 \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \
  --output table
```

### List All Certificates
```bash
aws acm list-certificates --region us-east-1
```

---

## Summary

✅ **Certificate Requested:** `arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28`

📋 **Next Steps:**
1. Add 3 DNS validation CNAME records in Netlify
2. Add CNAME record to point `api` to ALB
3. Wait for certificate validation (5-30 minutes)
4. Create HTTPS listener on ALB
5. Test HTTPS endpoint
6. Update frontend environment variables

🌐 **Your API will be available at:**
- `https://api.priceguardbackend.live`
- `https://priceguardbackend.live` (if you set it up)
- `https://www.priceguardbackend.live` (if you set it up)

