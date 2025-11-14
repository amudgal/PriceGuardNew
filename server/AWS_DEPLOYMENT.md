# AWS Container Deployment Guide

This guide walks you through deploying the PriceGuard backend to AWS ECS Fargate with exclusive connectivity to your Netlify frontend.

## Prerequisites

1. AWS CLI installed and configured (`aws configure`)
2. Docker installed locally
3. AWS account with permissions for:
   - ECS (Elastic Container Service)
   - ECR (Elastic Container Registry)
   - Secrets Manager
   - VPC/Networking
   - IAM (for task execution roles)

## CI/CD with GitHub Actions

This repository includes automatic deployment via GitHub Actions. When you push changes to the `master` or `main` branch, the workflow will automatically:

1. Build the Docker image
2. Push to Amazon ECR
3. Update the ECS task definition
4. Deploy to your ECS service

**Setup Instructions**: See [.github/README.md](../.github/README.md) for configuring GitHub Secrets and IAM permissions.

---

## Step 1: Prepare AWS Resources

### 1.1 Create IAM Roles

**Task Execution Role** (for pulling images and secrets):
```bash
aws iam create-role --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

**Task Role** (for application permissions):
```bash
aws iam create-role --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

### 1.2 Create Secrets in AWS Secrets Manager

Store your sensitive configuration:

```bash
# Database URL
aws secretsmanager create-secret \
  --name priceguard/database-url \
  --secret-string "postgres://appadmin:Shalini%231357@pg-dev.cy7sig6qo75s.us-east-1.rds.amazonaws.com:5432/appdb?sslmode=verify-full" \
  --region us-east-1

# Allowed Origins (your Netlify domain)
aws secretsmanager create-secret \
  --name priceguard/allowed-origins \
  --secret-string "https://your-netlify-site.netlify.app,https://www.your-domain.com" \
  --region us-east-1
```

**Replace `your-netlify-site.netlify.app` with your actual Netlify domain.**

### 1.3 Create CloudWatch Log Group

```bash
aws logs create-log-group --log-group-name /ecs/priceguard-server --region us-east-1
```

### 1.4 Set Up VPC and Networking

Your ECS tasks need to run in a VPC with:
- **Private subnets** (recommended for security)
- **Security group** that allows:
  - Outbound HTTPS (443) to RDS
  - Outbound HTTPS (443) for Secrets Manager
  - Inbound HTTP (4000) from your ALB/API Gateway (if using)

Example security group rules:
```bash
# Allow outbound to RDS
aws ec2 authorize-security-group-egress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --source-group sg-rds-security-group

# Allow outbound HTTPS for Secrets Manager
aws ec2 authorize-security-group-egress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

## Step 2: Update Configuration Files

### 2.1 Update `ecs-task-definition.json`

Replace placeholders:
- `YOUR_ACCOUNT_ID` - Your AWS account ID
- Update subnet IDs and security group ID in `create-service.sh`

### 2.2 Update `deploy.sh` and `create-service.sh`

Update the following variables if needed:
- `AWS_REGION` (default: us-east-1)
- `ECS_CLUSTER_NAME` (default: priceguard-cluster)
- `SUBNET_IDS` in `create-service.sh`
- `SECURITY_GROUP_ID` in `create-service.sh`

## Step 3: Deploy

### 3.1 Make Scripts Executable

```bash
chmod +x deploy.sh create-service.sh
```

### 3.2 Build and Push Docker Image

```bash
cd server
./deploy.sh
```

This script will:
1. Login to ECR
2. Create ECR repository (if needed)
3. Download RDS CA certificate
4. Build Docker image
5. Push to ECR
6. Register/update ECS task definition
7. Update ECS service (if it exists)

### 3.3 Create ECS Service (First Time Only)

If this is your first deployment:

```bash
./create-service.sh
```

**Important:** Update `SUBNET_IDS` and `SECURITY_GROUP_ID` in the script first!

## Step 4: Set Up API Gateway or Application Load Balancer

### Option A: Application Load Balancer (Recommended)

1. Create an ALB in your VPC
2. Create a target group pointing to your ECS service (port 4000)
3. Configure listener rules
4. Update security group to allow traffic from ALB

### Option B: API Gateway with VPC Link

1. Create VPC Link
2. Create REST API with integration to your ECS service
3. Configure CORS in API Gateway

## Step 5: Update Frontend

Update your Netlify environment variables:

```bash
# In Netlify dashboard → Site settings → Environment variables
VITE_API_BASE_URL=https://your-alb-or-api-gateway-url.amazonaws.com
```

## Step 6: Verify Deployment

1. Check ECS service status in AWS Console
2. View CloudWatch logs: `/ecs/priceguard-server`
3. Test API endpoint:
   ```bash
   curl https://your-api-url/api/auth/login \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"tester@example.com","password":"TestPass123!"}'
   ```

## Monitoring and Troubleshooting

### View Logs
```bash
aws logs tail /ecs/priceguard-server --follow --region us-east-1
```

### Check Service Status
```bash
aws ecs describe-services \
  --cluster priceguard-cluster \
  --services priceguard-server \
  --region us-east-1
```

### Common Issues

1. **Task fails to start**: Check CloudWatch logs and task definition
2. **Cannot connect to database**: Verify security group rules and RDS endpoint
3. **CORS errors**: Verify `ALLOWED_ORIGINS` secret matches your Netlify domain
4. **SSL certificate errors**: Ensure `rds-ca-bundle.pem` is in the container

## Security Best Practices

1. ✅ Use private subnets for ECS tasks
2. ✅ Store secrets in AWS Secrets Manager (not environment variables)
3. ✅ Use security groups to restrict network access
4. ✅ Enable SSL/TLS for database connections
5. ✅ Restrict CORS to only your Netlify domain
6. ✅ Use least-privilege IAM roles
7. ✅ Enable CloudWatch logging and monitoring

## Cost Optimization

- Use Fargate Spot for non-production workloads
- Right-size CPU/memory (start with 256 CPU, 512 MB memory)
- Set up auto-scaling based on CPU/memory metrics
- Use Application Load Balancer with connection draining

## Next Steps

- Set up auto-scaling policies
- Configure health checks and alarms
- ✅ CI/CD pipeline (GitHub Actions) - Already configured!
- Add API rate limiting
- Set up monitoring dashboards

