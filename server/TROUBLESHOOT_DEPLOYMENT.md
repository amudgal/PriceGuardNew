# Troubleshooting Deployment Failures

## Common Issues and Solutions

### Issue 1: Secrets Manager ARN Error

**Error:** `ResourceNotFoundException` or `InvalidParameterException` for secrets

**Solution:**
- Verify secrets exist: `aws secretsmanager describe-secret --secret-id priceguard/database-url --region us-east-1`
- Use full ARN with suffix (e.g., `arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/database-url-gVnioM`)
- Update `ecs-task-definition.json` with correct ARNs

**Fixed:** ✅ Updated task definition with correct secret ARNs

### Issue 2: Task Definition Registration Failed

**Error:** `ClientException` or `InvalidParameterException` when registering task definition

**Solution:**
1. Check task definition JSON is valid:
   ```bash
   aws ecs register-task-definition \
     --cli-input-json file://server/ecs-task-definition.json \
     --region us-east-1 \
     --dry-run
   ```

2. Verify image URI is correct:
   - Image should be in format: `144935603834.dkr.ecr.us-east-1.amazonaws.com/priceguard-server:latest`
   - Image must exist in ECR

3. Check IAM roles exist:
   - `ecsTaskExecutionRole` - Must exist
   - `ecsTaskRole` - Must exist (or remove from task definition if not needed)

**Fixed:** ✅ Added explicit task definition registration step

### Issue 3: ECS Service Creation Failed

**Error:** `InvalidParameterException` or `ClusterNotFoundException`

**Solution:**
1. Verify cluster exists:
   ```bash
   aws ecs describe-clusters --clusters priceguard-cluster --region us-east-1
   ```

2. Check subnets and security groups:
   - Subnets must be in the same VPC
   - Security group must allow outbound traffic (for database, etc.)
   - If `assignPublicIp=DISABLED`, subnets need NAT gateway for outbound internet access

3. Verify task definition exists before creating service:
   ```bash
   aws ecs list-task-definitions --family-prefix priceguard-server --region us-east-1
   ```

**Fixed:** ✅ Workflow now registers task definition before creating service

### Issue 4: Docker Build Failed

**Error:** Build errors in GitHub Actions

**Solution:**
1. Check Dockerfile syntax
2. Verify all files are in the build context
3. Check RDS CA certificate is downloaded:
   ```bash
   curl -o server/rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem
   ```

4. Verify package.json dependencies are correct

**Fixed:** ✅ Fixed certificate download path

### Issue 5: Image Push to ECR Failed

**Error:** `UnauthorizedException` or `RepositoryNotFoundException`

**Solution:**
1. Verify ECR repository exists:
   ```bash
   aws ecr describe-repositories --repository-names priceguard-server --region us-east-1
   ```

2. Check AWS credentials have ECR permissions:
   - `ecr:GetAuthorizationToken`
   - `ecr:BatchCheckLayerAvailability`
   - `ecr:GetDownloadUrlForLayer`
   - `ecr:BatchGetImage`
   - `ecr:PutImage`

3. Verify GitHub Secrets are configured correctly

### Issue 6: Network Configuration Issues

**Error:** Tasks fail to start or can't connect to database

**Solution:**
1. **If using private subnets:**
   - Ensure NAT gateway is configured for outbound internet access
   - Or use `assignPublicIp=ENABLED` for public subnets

2. **Security group rules:**
   - Allow outbound HTTPS (443) for Secrets Manager
   - Allow outbound PostgreSQL (5432) for RDS
   - Allow inbound HTTP (4000) from ALB/API Gateway (if using)

3. **VPC endpoints (optional):**
   - Create VPC endpoints for ECR, Secrets Manager, CloudWatch Logs
   - Reduces NAT gateway costs

### Issue 7: Health Check Failing

**Error:** Tasks start but health check fails

**Solution:**
1. Check health endpoint is accessible:
   ```bash
   # From inside the container
   wget --no-verbose --tries=1 --spider http://localhost:4000/health
   ```

2. Verify health check configuration:
   - Interval: 30 seconds
   - Timeout: 5 seconds
   - Retries: 3
   - Start period: 60 seconds

3. Check CloudWatch logs for errors:
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```

### Issue 8: Database Connection Failed

**Error:** `ECONNREFUSED` or `self-signed certificate` errors

**Solution:**
1. Verify DATABASE_URL secret is correct:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id priceguard/database-url \
     --region us-east-1 \
     --query 'SecretString' \
     --output text
   ```

2. Check RDS CA certificate is in container:
   - Certificate should be at `/app/rds-ca-bundle.pem`
   - Verify certificate is downloaded in Dockerfile

3. Verify security group allows outbound to RDS:
   - Port 5432
   - RDS security group

4. Check RDS endpoint is accessible from ECS tasks

### Issue 9: IAM Role Missing

**Error:** `AccessDeniedException` or role not found

**Solution:**
1. Verify `ecsTaskExecutionRole` exists:
   ```bash
   aws iam get-role --role-name ecsTaskExecutionRole
   ```

2. Check role has required policies:
   - `AmazonECSTaskExecutionRolePolicy`
   - `SecretsManagerReadWrite` (or custom policy for secrets)

3. Verify `ecsTaskRole` exists (if used):
   ```bash
   aws iam get-role --role-name ecsTaskRole
   ```

4. If `ecsTaskRole` doesn't exist, remove it from task definition:
   - Remove `taskRoleArn` field from `ecs-task-definition.json`

## Debugging Steps

### Step 1: Check GitHub Actions Logs

1. Go to: https://github.com/amudgal/PriceGuard/actions
2. Click on the failed workflow run
3. Expand each step to see error messages
4. Look for specific error codes and messages

### Step 2: Check AWS Resources

```bash
# Check ECR repository
aws ecr describe-repositories --repository-names priceguard-server --region us-east-1

# Check ECS cluster
aws ecs describe-clusters --clusters priceguard-cluster --region us-east-1

# Check ECS service
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1

# Check task definitions
aws ecs list-task-definitions --family-prefix priceguard-server --region us-east-1

# Check running tasks
aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --region us-east-1
```

### Step 3: Check CloudWatch Logs

```bash
# View recent logs
aws logs tail /ecs/priceguard-server \
  --since 1h \
  --region us-east-1 \
  --format short

# Filter for errors
aws logs filter-log-events \
  --log-group-name /ecs/priceguard-server \
  --filter-pattern "ERROR" \
  --region us-east-1
```

### Step 4: Test Task Definition Manually

```bash
# Register task definition manually
aws ecs register-task-definition \
  --cli-input-json file://server/ecs-task-definition.json \
  --region us-east-1

# Run task manually
aws ecs run-task \
  --cluster priceguard-cluster \
  --task-definition priceguard-server \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-4854cf05],securityGroups=[sg-0d20af83680061442],assignPublicIp=DISABLED}" \
  --region us-east-1
```

## Quick Fixes

### Fix 1: Update Secret ARNs

```bash
# Get full ARN for database URL
DB_ARN=$(aws secretsmanager describe-secret \
  --secret-id priceguard/database-url \
  --region us-east-1 \
  --query 'ARN' \
  --output text)

# Get full ARN for allowed origins
ORIGINS_ARN=$(aws secretsmanager describe-secret \
  --secret-id priceguard/allowed-origins \
  --region us-east-1 \
  --query 'ARN' \
  --output text)

# Update task definition
sed -i.bak "s|arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/database-url.*|$DB_ARN|g" server/ecs-task-definition.json
sed -i.bak "s|arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/allowed-origins.*|$ORIGINS_ARN|g" server/ecs-task-definition.json
```

### Fix 2: Create Missing IAM Role

```bash
# Create ecsTaskRole if it doesn't exist
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

### Fix 3: Enable Public IP (if NAT gateway not available)

Update workflow to use `assignPublicIp=ENABLED`:

```yaml
--network-configuration "awsvpcConfiguration={subnets=[subnet-4854cf05,subnet-f8e531a7],securityGroups=[sg-0d20af83680061442],assignPublicIp=ENABLED}" \
```

## Next Steps After Fixing

1. ✅ Commit fixes to git
2. ✅ Push to trigger new deployment
3. ✅ Monitor GitHub Actions workflow
4. ✅ Check ECS service status
5. ✅ Verify tasks are running
6. ✅ Test health endpoint
7. ✅ Test login endpoint

## Resources

- **GitHub Actions:** https://github.com/amudgal/PriceGuard/actions
- **AWS ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server
- **ECR Repository:** https://console.aws.amazon.com/ecr/repositories/private/us-east-1/priceguard-server

