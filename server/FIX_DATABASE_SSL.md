# Fix Database SSL Certificate Error

## Problem

You're seeing this error:
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "self-signed certificate in certificate chain"
}
```

This happens when the database connection tries to verify the SSL certificate but:
1. The RDS CA certificate bundle is missing or outdated
2. The SSL mode is set to `verify-full` which requires certificate validation
3. The certificate file path is incorrect

## Solution Options

### Option 1: Quick Fix - Use Less Strict SSL Mode (Recommended for Immediate Fix)

This uses SSL encryption but doesn't verify the certificate. **Less secure but works immediately.**

**Run the fix script:**
```bash
cd priceguard/server
./fix-database-ssl.sh
```

This will:
1. Update `PGSSLMODE` from `verify-full` to `require`
2. Register a new task definition
3. Update the ECS service
4. Wait for deployment to complete

**What this does:**
- Uses SSL encryption (secure connection)
- Doesn't verify the certificate (less secure, but works)
- Immediate fix - no need to rebuild Docker image

### Option 2: Proper Fix - Include RDS CA Certificate (Recommended for Production)

This is the secure approach that verifies the certificate.

**Step 1: Update RDS CA Bundle**
```bash
cd priceguard/server
curl -o rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem
```

**Step 2: Ensure Certificate is in Docker Image**

The Dockerfile already includes this line:
```dockerfile
COPY rds-ca-bundle.pem /app/rds-ca-bundle.pem
```

**Step 3: Rebuild and Deploy**
```bash
# Build and push Docker image
./deploy.sh

# Or manually:
docker build -t your-image .
docker push your-image
```

**Step 4: Update Task Definition Back to verify-full**

Edit `ecs-task-definition.json`:
```json
{
  "name": "PGSSLMODE",
  "value": "verify-full"
}
```

Then register and update:
```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json --region us-east-1
aws ecs update-service --cluster priceguard-cluster --service priceguard-server --task-definition priceguard-server --region us-east-1
```

## What Changed in the Code

The `db.ts` file has been improved to:
1. **Handle missing certificate files gracefully** - Won't crash if certificate file is missing
2. **Better error logging** - Shows what SSL mode is being used
3. **Proper SSL mode handling** - Correctly interprets different SSL modes:
   - `verify-full` / `verify-ca`: Verifies certificate (most secure)
   - `require`: Uses SSL but doesn't verify (less secure, but works)
   - `prefer`: Prefers SSL but allows non-SSL
   - `allow`: Allows SSL but prefers non-SSL
   - `disable`: No SSL

## Verification

After applying the fix, check the health endpoint:
```bash
curl http://your-alb-dns/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

## Security Considerations

**Option 1 (require mode):**
- ✅ Uses SSL encryption
- ⚠️ Doesn't verify server certificate
- ⚠️ Vulnerable to man-in-the-middle attacks
- ✅ Good for development/testing

**Option 2 (verify-full mode):**
- ✅ Uses SSL encryption
- ✅ Verifies server certificate
- ✅ Most secure
- ✅ Required for production

## Troubleshooting

### Still Getting SSL Errors

1. **Check task definition:**
   ```bash
   aws ecs describe-task-definition --task-definition priceguard-server --region us-east-1 --query 'taskDefinition.containerDefinitions[0].environment'
   ```

2. **Check container logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```

3. **Verify certificate file exists in container:**
   ```bash
   # Check if file is in Docker image
   docker run --rm your-image ls -la /app/rds-ca-bundle.pem
   ```

### Certificate File Not Found

If you see warnings about certificate file not found:
1. Ensure `rds-ca-bundle.pem` is in the `priceguard/server/` directory
2. Ensure Dockerfile includes: `COPY rds-ca-bundle.pem /app/rds-ca-bundle.pem`
3. Rebuild Docker image

### Database Still Disconnected

1. **Check security group rules:**
   - ECS task security group should allow outbound to RDS
   - RDS security group should allow inbound from ECS task security group

2. **Check DATABASE_URL secret:**
   ```bash
   aws secretsmanager get-secret-value --secret-id priceguard/database-url-gVnioM --region us-east-1 --query 'SecretString' --output text
   ```

3. **Test database connection:**
   ```bash
   # From ECS task (if you can exec into it)
   psql $DATABASE_URL -c "SELECT 1;"
   ```

## Next Steps

1. ✅ **Immediate:** Run `./fix-database-ssl.sh` to fix the issue now
2. ✅ **Short-term:** Rebuild Docker image with updated certificate
3. ✅ **Long-term:** Change back to `verify-full` mode for production security

## Files Modified

- `src/db.ts` - Improved SSL certificate handling and error detection
- `rds-ca-bundle.pem` - Updated to latest RDS CA bundle
- `fix-database-ssl.sh` - Script to quickly fix SSL mode
- `ecs-task-definition.json` - Will be updated by the fix script

