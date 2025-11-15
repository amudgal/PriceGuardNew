# How to Request and Validate an SSL Certificate

This guide walks you through requesting a public SSL certificate from AWS Certificate Manager (ACM) and validating it using DNS.

## Prerequisites

1. **AWS Account** with permissions to:
   - Request certificates in ACM
   - Create DNS records in Route 53 (if using Route 53) OR
   - Access to your domain's DNS provider to add CNAME records

2. **Domain or Subdomain** you own (e.g., `api.yourdomain.com` or `yourdomain.com`)

3. **AWS CLI configured** (optional, for CLI method)

---

## Method 1: AWS Console (Recommended for First Time)

### Step 1: Navigate to Certificate Manager

1. Go to **AWS Certificate Manager**: https://console.aws.amazon.com/acm/home?region=us-east-1
   - ⚠️ **Important:** Make sure you're in the **same region** as your ALB (us-east-1)

2. Click **"Request a certificate"**

### Step 2: Request a Public Certificate

1. Select **"Request a public certificate"**
2. Click **"Next"**

### Step 3: Enter Domain Names

Enter your domain or subdomain:

**Option A: Single Domain**
```
api.yourdomain.com
```

**Option B: Multiple Domains** (click "Add another name to this certificate")
```
yourdomain.com
www.yourdomain.com
api.yourdomain.com
```

**Option C: Wildcard Certificate** (covers all subdomains)
```
*.yourdomain.com
yourdomain.com  (recommended to also include root domain)
```

**Option D: Use ALB DNS Name** (for testing - not recommended for production)
```
priceguard-alb-123456789.us-east-1.elb.amazonaws.com
```

### Step 4: Choose Validation Method

Select **"DNS validation"** (recommended):
- ✅ Faster validation
- ✅ More secure
- ✅ Works for wildcard certificates

Or select **"Email validation"** (alternative):
- ⚠️ Requires access to email addresses like `admin@yourdomain.com`
- ⚠️ Cannot be used for wildcard certificates

### Step 5: Add Tags (Optional)

You can add tags to organize your certificate (e.g., `Name=priceguard-ssl`)

### Step 6: Review and Request

1. Review your domain names and validation method
2. Click **"Request"**

---

## Step 7: Validate the Certificate (DNS Method)

After requesting, you'll see a **"Validation"** page with DNS records to add.

### If Using Route 53:

1. Click **"Create record in Route 53"** for each domain
2. AWS will automatically create the CNAME records
3. Wait 5-10 minutes for DNS propagation
4. The certificate status will change from "Pending validation" to "Issued"

### If NOT Using Route 53 (Manual DNS Configuration):

1. **Copy the CNAME records** shown in the console:

   Example:
   ```
   Name: _abc123def456.api.yourdomain.com
   Value: _xyz789.abcdefghijklmnop.acm-validations.aws.
   ```

2. **Add CNAME records** to your DNS provider:

   **For your domain registrar (e.g., GoDaddy, Namecheap):**
   - Log into your domain registrar
   - Navigate to DNS settings
   - Add a new CNAME record:
     - **Name/Host:** `_abc123def456.api` (or as shown in ACM)
     - **Value/Target:** `_xyz789.abcdefghijklmnop.acm-validations.aws.`
     - **TTL:** 300 (or default)

   **For Cloudflare:**
   - Log into Cloudflare
   - Select your domain
   - Go to **DNS** → **Records**
   - Click **"Add record"**
   - Type: **CNAME**
   - Name: `_abc123def456.api` (or as shown in ACM)
   - Target: `_xyz789.abcdefghijklmnop.acm-validations.aws.`
   - Proxy status: **DNS only** (gray cloud) - ⚠️ Important!
   - Click **"Save"**

   **For other DNS providers:**
   - Follow your provider's instructions for adding CNAME records
   - Make sure the record name and value match exactly what's shown in ACM

3. **Wait for DNS propagation** (usually 5-30 minutes, can take up to 72 hours)
4. **Check certificate status** in ACM console - it will change from "Pending validation" to "Issued"

---

## Method 2: AWS CLI (For Automation)

### Request Certificate via CLI

```bash
# Request certificate for a single domain
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1

# Request certificate for multiple domains
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --subject-alternative-names www.yourdomain.com yourdomain.com \
  --validation-method DNS \
  --region us-east-1

# Request wildcard certificate
aws acm request-certificate \
  --domain-name "*.yourdomain.com" \
  --subject-alternative-names yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

This will return a **Certificate ARN** like:
```
arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
```

### Get Validation Records

```bash
# Get the certificate ARN first
CERT_ARN=$(aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' \
  --output text)

# Wait a few seconds for validation records to be created
sleep 5

# Get validation records
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[*].[DomainName,ResourceRecord.Name,ResourceRecord.Value]' \
  --output table
```

This will show you the CNAME records you need to add to your DNS.

### Check Certificate Status

```bash
# Check if certificate is issued
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Status will be:
- `PENDING_VALIDATION` - Waiting for DNS validation
- `ISSUED` - ✅ Certificate is ready to use
- `VALIDATION_TIMED_OUT` - DNS records not added in time (request again)

---

## Troubleshooting

### Certificate Stuck in "Pending Validation"

**Problem:** Certificate status remains "Pending validation" after adding DNS records.

**Solutions:**
1. **Wait longer** - DNS propagation can take up to 72 hours
2. **Verify DNS records** - Use `dig` or `nslookup` to check if CNAME records are correct:
   ```bash
   dig _abc123def456.api.yourdomain.com CNAME
   # or
   nslookup -type=CNAME _abc123def456.api.yourdomain.com
   ```
3. **Check for typos** - Ensure the CNAME name and value match exactly
4. **Verify DNS provider** - Make sure you're editing the correct DNS provider
5. **Check Cloudflare proxy** - If using Cloudflare, make sure the DNS record is set to "DNS only" (gray cloud), not proxied (orange cloud)

### Certificate Validation Timed Out

**Problem:** Status shows "VALIDATION_TIMED_OUT" (72 hours passed without validation).

**Solution:**
1. Delete the failed certificate in ACM console
2. Request a new certificate
3. Add DNS records immediately
4. Wait for validation

### "Certificate is already in use" Error

**Problem:** Trying to delete a certificate that's attached to a load balancer.

**Solution:**
1. Remove the certificate from the ALB listener first
2. Then delete the certificate

---

## After Certificate is Issued

Once your certificate status is **"Issued"**, you can:

1. **Use it with your ALB:**
   ```bash
   # Get certificate ARN
   CERT_ARN=$(aws acm list-certificates \
     --region us-east-1 \
     --query 'CertificateSummaryList[?DomainName==`api.yourdomain.com`].CertificateArn' \
     --output text)
   
   # Create HTTPS listener on ALB
   aws elbv2 create-listener \
     --load-balancer-arn $ALB_ARN \
     --protocol HTTPS \
     --port 443 \
     --certificates CertificateArn=$CERT_ARN \
     --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
     --region us-east-1
   ```

2. **Or use the setup script:**
   ```bash
   ./setup-alb.sh
   ```
   The script will automatically find and use your certificate if it contains "priceguard" or "aaires" in the domain name.

---

## Quick Reference

### Console URL
- **ACM Console:** https://console.aws.amazon.com/acm/home?region=us-east-1

### Important Notes

1. ⚠️ **Region Matters:** Certificate must be in the **same region** as your ALB
2. ⚠️ **DNS Propagation:** Can take 5-72 hours (usually 5-30 minutes)
3. ✅ **Free:** AWS certificates are free (only pay for resources using them)
4. ✅ **Auto-Renewal:** AWS automatically renews certificates before expiration
5. ⚠️ **Wildcard Limitation:** Cannot use email validation for wildcard certificates

### Certificate Lifecycle

1. **Request** → Certificate ARN created
2. **Pending Validation** → Waiting for DNS records
3. **Issued** → ✅ Ready to use
4. **Auto-Renewed** → AWS renews before expiration
5. **Expired** → Certificate no longer valid (rare, AWS auto-renews)

---

## Next Steps

After your certificate is issued:

1. ✅ Create HTTPS listener on ALB (see `QUICK_FIX_HTTPS.md`)
2. ✅ Update ECS service to use ALB
3. ✅ Update Netlify environment variable to use HTTPS URL
4. ✅ Test your API endpoint over HTTPS

---

## Helpful Commands

### List All Certificates
```bash
aws acm list-certificates --region us-east-1
```

### Get Certificate Details
```bash
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1
```

### Delete a Certificate (if not in use)
```bash
aws acm delete-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1
```

---

## Resources

- **AWS Certificate Manager Documentation:** https://docs.aws.amazon.com/acm/
- **ACM Console:** https://console.aws.amazon.com/acm/home?region=us-east-1
- **ALB Setup Guide:** `QUICK_FIX_HTTPS.md`
- **DNS Validation Guide:** https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html

