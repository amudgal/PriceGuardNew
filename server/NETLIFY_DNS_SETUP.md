# How to Add DNS Records in Netlify

This guide shows you exactly how to add the 4 DNS records (3 validation + 1 ALB pointer) to Netlify.

## Step-by-Step Instructions

### Step 1: Navigate to DNS Settings

1. **Log into Netlify Dashboard**
   - Go to https://app.netlify.com
   - Sign in to your account

2. **Select Your Site**
   - Click on your site: **priceguardbackend.live**

3. **Open DNS Settings**
   - Click on **Site settings** (top menu)
   - Click on **Domain management** (left sidebar)
   - Click on **DNS** (left sidebar)

4. **You should now see:**
   - A list of existing DNS records (if any)
   - An **"Add DNS record"** button

---

### Step 2: Add DNS Validation Records (3 CNAME records)

These records validate your SSL certificate with AWS Certificate Manager.

#### Adding Each Record:

1. Click **"Add DNS record"** button
2. Fill in the form:
   - **Type:** Select `CNAME` from dropdown
   - **Name/Host:** Enter the name exactly as shown below
   - **Value/Target:** Enter the value exactly as shown (including trailing dot)
   - **TTL:** Use default or `3600`
3. Click **"Save"** or **"Add record"**

---

### Record 1: Validate api.priceguardbackend.live

```
Type:       CNAME
Name:       _34f8d0696ae60d5f296b8a9081ffaa25.api
Value:      _92a3917b366a57427860497c0e0a60e0.jkddzztszm.acm-validations.aws.
TTL:        3600 (or default)
```

**Visual in Netlify form:**
```
┌─────────────────────────────────────────────┐
│ Add DNS record                              │
├─────────────────────────────────────────────┤
│ Type:        [CNAME ▼]                      │
│ Name:        _34f8d0696ae60d5f296b8a9081... │
│ Value:       _92a3917b366a57427860497c0e... │
│ TTL:         [3600 ▼]                       │
│                                             │
│         [Cancel]  [Save]                    │
└─────────────────────────────────────────────┘
```

---

### Record 2: Validate priceguardbackend.live

```
Type:       CNAME
Name:       _4d104a318cd5307eaa4735302cdd9ce0
Value:      _4b2d6f567dd7aacbf79c62d050e7c3ff.jkddzztszm.acm-validations.aws.
TTL:        3600 (or default)
```

**Visual in Netlify form:**
```
┌─────────────────────────────────────────────┐
│ Add DNS record                              │
├─────────────────────────────────────────────┤
│ Type:        [CNAME ▼]                      │
│ Name:        _4d104a318cd5307eaa4735302cd... │
│ Value:       _4b2d6f567dd7aacbf79c62d050e... │
│ TTL:         [3600 ▼]                       │
│                                             │
│         [Cancel]  [Save]                    │
└─────────────────────────────────────────────┘
```

---

### Record 3: Validate www.priceguardbackend.live

```
Type:       CNAME
Name:       _800866258fb9d6a036b6daa2abbf0798.www
Value:      _e6cfe7d479dcbe311dcbb153950c0de8.jkddzztszm.acm-validations.aws.
TTL:        3600 (or default)
```

**Visual in Netlify form:**
```
┌─────────────────────────────────────────────┐
│ Add DNS record                              │
├─────────────────────────────────────────────┤
│ Type:        [CNAME ▼]                      │
│ Name:        _800866258fb9d6a036b6daa2ab... │
│ Value:       _e6cfe7d479dcbe311dcbb15395... │
│ TTL:         [3600 ▼]                       │
│                                             │
│         [Cancel]  [Save]                    │
└─────────────────────────────────────────────┘
```

---

### Step 3: Add ALB Pointer Record (1 CNAME record)

This record points your API subdomain to the Application Load Balancer.

#### Record 4: Point api to ALB

```
Type:       CNAME
Name:       api
Value:      priceguard-alb-1564033973.us-east-1.elb.amazonaws.com
TTL:        3600 (or default)
```

**Visual in Netlify form:**
```
┌─────────────────────────────────────────────┐
│ Add DNS record                              │
├─────────────────────────────────────────────┤
│ Type:        [CNAME ▼]                      │
│ Name:        api                            │
│ Value:       priceguard-alb-1564033973.u... │
│ TTL:         [3600 ▼]                       │
│                                             │
│         [Cancel]  [Save]                    │
└─────────────────────────────────────────────┘
```

**Note:** For the ALB pointer, you do NOT need a trailing dot in the value.

---

## Summary Checklist

After completing all steps, you should have **4 DNS records** total:

- [ ] ✅ CNAME: `_34f8d0696ae60d5f296b8a9081ffaa25.api` → `_92a3917b366a57427860497c0e0a60e0.jkddzztszm.acm-validations.aws.`
- [ ] ✅ CNAME: `_4d104a318cd5307eaa4735302cdd9ce0` → `_4b2d6f567dd7aacbf79c62d050e7c3ff.jkddzztszm.acm-validations.aws.`
- [ ] ✅ CNAME: `_800866258fb9d6a036b6daa2abbf0798.www` → `_e6cfe7d479dcbe311dcbb153950c0de8.jkddzztszm.acm-validations.aws.`
- [ ] ✅ CNAME: `api` → `priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`

---

## Important Notes

1. **Trailing Dots:** 
   - ✅ **Validation records:** MUST have trailing dot (.) at end of value
   - ❌ **ALB pointer:** Do NOT include trailing dot

2. **Typo Check:**
   - Copy and paste the exact values (especially the long hash strings)
   - Double-check for any typos or extra spaces

3. **Save Each Record:**
   - Click "Save" after adding each record
   - You should see it appear in your DNS records list

4. **Wait Time:**
   - DNS propagation: 5-30 minutes (can take up to 72 hours)
   - Certificate validation: Usually completes within 5-30 minutes after DNS propagation

---

## Verify Your Records

After adding all records, verify they're correct:

1. **In Netlify:**
   - Check your DNS records list
   - Make sure all 4 records are visible

2. **Using Command Line:**
   ```bash
   # Check validation record 1
   dig _34f8d0696ae60d5f296b8a9081ffaa25.api.priceguardbackend.live CNAME
   
   # Check validation record 2
   dig _4d104a318cd5307eaa4735302cdd9ce0.priceguardbackend.live CNAME
   
   # Check validation record 3
   dig _800866258fb9d6a036b6daa2abbf0798.www.priceguardbackend.live CNAME
   
   # Check ALB pointer
   dig api.priceguardbackend.live CNAME
   ```

---

## What Happens Next?

1. **DNS Propagation** (5-30 minutes)
   - Your DNS records propagate across the internet
   - AWS Certificate Manager starts checking for validation records

2. **Certificate Validation** (5-30 minutes after DNS propagation)
   - AWS validates your certificate
   - Status changes from `PENDING_VALIDATION` to `ISSUED`

3. **Create HTTPS Listener** (once certificate is ISSUED)
   - Add HTTPS listener to your ALB
   - Your API will be accessible at `https://api.priceguardbackend.live`

---

## Troubleshooting

### Record Not Showing Up
- Wait 2-5 minutes after saving
- Refresh the Netlify DNS page
- Check for typos in the record values

### Certificate Still Pending
- Verify all 3 validation records are added correctly
- Check DNS propagation using `dig` command
- Wait up to 72 hours for full propagation

### Cannot Access api.priceguardbackend.live
- Verify the ALB pointer CNAME record is added
- Check that ALB is active: `aws elbv2 describe-load-balancers --names priceguard-alb --region us-east-1`
- Wait for DNS propagation (can take up to 72 hours)

---

## Quick Reference

**Certificate ARN:**
```
arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28
```

**ALB DNS Name:**
```
priceguard-alb-1564033973.us-east-1.elb.amazonaws.com
```

**Check Certificate Status:**
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28 \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

**Expected Result:** `ISSUED` (after validation completes)

---

## Need Help?

If you're having issues:
1. Check the detailed guide: `SETUP_DOMAIN_SSL.md`
2. Run the certificate status check script: `./check-certificate-status.sh <certificate-arn>`
3. Verify DNS propagation with `dig` or `nslookup`

