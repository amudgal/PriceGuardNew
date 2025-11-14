# Deploy to ECS Now

## Current Status

✅ AWS resources created:
- ECR repository: `priceguard-server`
- ECS cluster: `priceguard-cluster`
- CloudWatch log group: `/ecs/priceguard-server`
- Secrets Manager secrets: `priceguard/database-url`, `priceguard/allowed-origins`
- IAM roles: `ecsTaskExecutionRole`

❌ Missing:
- Docker (not installed locally)
- ECS service (not created yet)
- GitHub Secrets (may not be configured)

## Option 1: Deploy via GitHub Actions (Recommended)

### Step 1: Set up GitHub Secrets

1. Go to: https://github.com/amudgal/PriceGuard/settings/secrets/actions
2. Add the following secrets:
   - `AWS_ACCESS_KEY_ID` - Your AWS Access Key ID
   - `AWS_SECRET_ACCESS_KEY` - Your AWS Secret Access Key

### Step 2: Trigger Deployment

```bash
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject/priceguard
git add .
git commit -m "Trigger ECS deployment"
git push origin main
```

This will trigger the GitHub Actions workflow which will:
1. Build Docker image
2. Push to ECR
3. Create/update ECS task definition
4. Create/update ECS service

### Step 3: Monitor Deployment

- GitHub Actions: https://github.com/amudgal/PriceGuard/actions
- AWS ECS Console: https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster

## Option 2: Install Docker and Deploy Locally

### Step 1: Install Docker

**macOS:**
```bash
# Install Docker Desktop
brew install --cask docker

# Or download from: https://www.docker.com/products/docker-desktop
```

### Step 2: Deploy

```bash
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject/priceguard/server
./deploy.sh
```

### Step 3: Create ECS Service (if not exists)

```bash
./create-service.sh
```

## Option 3: Create ECS Service First (Manual)

If you want to create the ECS service manually before deploying:

```bash
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject/priceguard/server

# First, register a task definition (requires an image in ECR)
# Or use GitHub Actions to build and push the image first

# Then create the service
./create-service.sh
```

## Quick Deploy Script

I've created a script that will trigger deployment via GitHub Actions:

```bash
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject/priceguard/server
./deploy-without-docker.sh
```

This script will:
1. Check if you're on the main branch
2. Commit any changes
3. Push to GitHub
4. Trigger GitHub Actions workflow

## Verify Deployment

After deployment, verify:

```bash
# Check service status
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1

# Check running tasks
aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --region us-east-1

# View logs
aws logs tail /ecs/priceguard-server --follow --region us-east-1
```

## Troubleshooting

### GitHub Actions Fails

1. Check GitHub Secrets are configured
2. Check AWS credentials have proper permissions
3. Check GitHub Actions logs for errors

### ECS Service Creation Fails

1. Check task definition exists
2. Check security group allows traffic
3. Check subnets are in the same VPC
4. Check IAM roles have proper permissions

### Image Build Fails

1. Check Dockerfile syntax
2. Check dependencies in package.json
3. Check RDS CA certificate is downloaded

## Next Steps

1. ✅ Set up GitHub Secrets (if using GitHub Actions)
2. ✅ Install Docker (if deploying locally)
3. ✅ Create ECS service (if not exists)
4. ✅ Deploy via GitHub Actions or local script
5. ✅ Verify deployment
6. ✅ Set up CloudWatch alarms

## Resources

- GitHub Actions: https://github.com/amudgal/PriceGuard/actions
- AWS ECS Console: https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster
- ECR Repository: https://console.aws.amazon.com/ecr/repositories/private/us-east-1/priceguard-server
- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server

