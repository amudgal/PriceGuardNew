# Fix 503 Service Unavailable Error

## Problem
The API endpoint `https://api.priceguardbackend.live/api/auth/login` was returning 503 (Service Unavailable) errors.

## Root Cause
The ECS task was running and healthy, but the database connection was failing with:
```
Error: self-signed certificate in certificate chain
```

### Why This Happened
1. The task definition had `PGSSLMODE=allow`, which attempts SSL but doesn't verify certificates
2. However, `PGSSLROOTCERT` was **missing** from the task definition
3. Without the CA certificate path, the pg client couldn't validate the RDS server certificate
4. The database connection failed, causing all `/api/auth/*` endpoints to return 503

## Solution
Added `PGSSLROOTCERT` environment variable to the ECS task definition:

```json
{
  "name": "PGSSLROOTCERT",
  "value": "/app/rds-ca-bundle.pem"
}
```

Changed `PGSSLMODE` from `allow` to `verify-full` for proper certificate validation.

## Files Changed
- `server/ecs-task-definition.json`: Added `PGSSLROOTCERT` environment variable

## Verification
After deployment:
1. Check CloudWatch logs for database connection:
   ```bash
   aws logs tail /ecs/priceguard-server --since 5m --region us-east-1 | grep -i "database\|ssl"
   ```
   Should see: `[db] Loaded SSL CA certificate from /app/rds-ca-bundle.pem`

2. Test the API endpoint:
   ```bash
   curl -X POST "https://api.priceguardbackend.live/api/auth/login" \
     -H "Content-Type: application/json" \
     -H "Origin: https://aaires.netlify.app" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```
   Should return 401 (invalid credentials) instead of 503 (service unavailable)

## Next Steps
The GitHub Actions workflow will automatically:
1. Build and push the Docker image (with RDS CA bundle)
2. Register the new task definition (with `PGSSLROOTCERT`)
3. Deploy to ECS
4. New tasks will connect to the database successfully
