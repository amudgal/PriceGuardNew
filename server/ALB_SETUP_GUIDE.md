# Application Load Balancer (ALB) Setup Guide

This guide explains how to set up an Application Load Balancer (ALB) for your PriceGuard backend API running on ECS Fargate.

## Overview

The ALB provides:
- **High Availability**: Distributes traffic across multiple ECS tasks
- **Health Checks**: Automatically removes unhealthy tasks from rotation
- **HTTPS Support**: SSL/TLS termination at the load balancer
- **Public Access**: Internet-facing endpoint for your API

## Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   aws --version
   aws configure
   ```

2. **ECS Service already deployed**
   - Your ECS cluster and service should be running
   - See `AWS_DEPLOYMENT.md` for deployment instructions

3. **VPC and Networking Resources**
   - VPC ID
   - At least 2 subnets in different availability zones
   - Security group for ECS tasks

## Quick Start

### Option 1: Run from Local Machine

```bash
cd priceguard/server
./setup-alb.sh
```

### Option 2: Run from AWS CloudShell

1. Open AWS CloudShell from the AWS Console
2. Upload the script or clone your repository:
   ```bash
   git clone <your-repo-url>
   cd <repo>/priceguard/server
   chmod +x setup-alb.sh
   ./setup-alb.sh
   ```

### Option 3: Run Individual AWS CLI Commands

If you prefer to run commands manually, see the script for step-by-step commands.

## What the Script Does

1. **Validates AWS Configuration**
   - Checks AWS CLI installation
   - Verifies credentials
   - Validates VPC, subnets, and security groups

2. **Creates Application Load Balancer**
   - Internet-facing ALB
   - Configured with your VPC and subnets
   - Attached to security group

3. **Creates Target Group**
   - HTTP protocol on port 4000
   - Health check on `/health` endpoint
   - Configured for ECS service integration

4. **Updates ECS Service**
   - Automatically attaches target group to ECS service
   - Registers running tasks with the target group
   - Waits for service to stabilize

5. **Creates Listeners**
   - HTTP listener on port 80 (always created)
   - HTTPS listener on port 443 (if SSL certificate available)

6. **Updates Security Groups**
   - Adds inbound rules for ports 80 and 443
   - Allows traffic from anywhere (for public ALB)

## Configuration

Before running, you may need to update these variables in `setup-alb.sh`:

```bash
AWS_REGION="us-east-1"                    # Your AWS region
VPC_ID="vpc-xxxxx"                        # Your VPC ID
SUBNET_IDS="subnet-xxx,subnet-yyy"        # At least 2 subnets in different AZs
SECURITY_GROUP_ID="sg-xxxxx"               # Security group for ALB
ECS_CLUSTER_NAME="priceguard-cluster"      # Your ECS cluster name
ECS_SERVICE_NAME="priceguard-server"       # Your ECS service name
ALB_NAME="priceguard-alb"                 # Name for the ALB
TARGET_GROUP_NAME="priceguard-targets"     # Name for the target group
```

## SSL Certificate Setup (HTTPS)

For production, you should set up HTTPS:

### Step 1: Request Certificate from ACM

```bash
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

### Step 2: Validate Certificate

1. Go to AWS Certificate Manager (ACM) console
2. Find your certificate
3. Add the DNS validation records to your domain
4. Wait for validation (usually 5-10 minutes)

### Step 3: Create HTTPS Listener

After certificate is validated, create HTTPS listener:

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

# Get Target Group ARN
TG_ARN=$(aws elbv2 describe-target-groups \
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
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region us-east-1
```

## Verify Setup

### 1. Check ALB Status

```bash
aws elbv2 describe-load-balancers \
  --names priceguard-alb \
  --region us-east-1
```

### 2. Check Target Group Health

```bash
aws elbv2 describe-target-health \
  --target-group-arn <TARGET_GROUP_ARN> \
  --region us-east-1
```

### 3. Test Health Endpoint

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names priceguard-alb \
  --region us-east-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Test health endpoint
curl http://$ALB_DNS/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "priceguard-server",
  "database": "connected"
}
```

### 4. Test API Endpoint

```bash
curl -X POST http://$ALB_DNS/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

## Update Frontend Configuration

After ALB is set up, update your Netlify environment variables:

1. Go to Netlify Dashboard → Your Site → Site settings → Environment variables
2. Add or update:
   ```
   VITE_API_BASE_URL=http://your-alb-dns-name.us-east-1.elb.amazonaws.com
   ```
   Or for HTTPS:
   ```
   VITE_API_BASE_URL=https://your-alb-dns-name.us-east-1.elb.amazonaws.com
   ```
3. Redeploy your site

## Troubleshooting

### ALB Shows Unhealthy Targets

1. **Check ECS tasks are running:**
   ```bash
   aws ecs list-tasks \
     --cluster priceguard-cluster \
     --service-name priceguard-server \
     --region us-east-1
   ```

2. **Check security group rules:**
   - ALB security group should allow inbound on ports 80/443
   - ECS task security group should allow inbound on port 4000 from ALB security group

3. **Check health check endpoint:**
   ```bash
   # Get task IP
   TASK_IP=<task-private-ip>
   curl http://$TASK_IP:4000/health
   ```

4. **Check CloudWatch logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```

### Cannot Access ALB

1. **Check ALB is active:**
   ```bash
   aws elbv2 describe-load-balancers \
     --names priceguard-alb \
     --region us-east-1 \
     --query 'LoadBalancers[0].State.Code'
   ```
   Should return `active`

2. **Check security group:**
   - Ensure inbound rules allow ports 80/443 from 0.0.0.0/0

3. **Check DNS propagation:**
   - ALB DNS name may take a few minutes to become available

### ECS Service Not Registering with Target Group

1. **Check service configuration:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1 \
     --query 'services[0].loadBalancers'
   ```

2. **Manually update service:**
   ```bash
   aws ecs update-service \
     --cluster priceguard-cluster \
     --service priceguard-server \
     --load-balancers targetGroupArn=<TARGET_GROUP_ARN>,containerName=priceguard-server,containerPort=4000 \
     --region us-east-1
   ```

## Cost Considerations

- **ALB Cost**: ~$0.0225 per hour (~$16/month) + data transfer costs
- **Data Transfer**: First 1 GB/month free, then $0.01/GB
- **LCU (Load Balancer Capacity Units)**: Based on usage

**Cost Optimization Tips:**
- Use ALB only for production
- Consider using API Gateway for lower traffic scenarios
- Monitor ALB metrics in CloudWatch

## Security Best Practices

1. ✅ **Use HTTPS in Production**: Always use port 443 with valid SSL certificate
2. ✅ **Restrict Security Groups**: Only allow necessary ports
3. ✅ **Use WAF**: Consider AWS WAF for additional protection
4. ✅ **Enable Access Logs**: Monitor ALB access logs for security analysis
5. ✅ **Use Private Subnets**: Keep ECS tasks in private subnets when possible

## Next Steps

- [ ] Set up HTTPS with SSL certificate
- [ ] Configure custom domain name
- [ ] Set up CloudWatch alarms for ALB
- [ ] Enable ALB access logs
- [ ] Configure auto-scaling based on ALB metrics
- [ ] Set up AWS WAF rules (optional)

## Additional Resources

- [AWS ALB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [ECS Service with ALB](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html)
- [ACM Certificate Manager](https://docs.aws.amazon.com/acm/latest/userguide/)

## Support

If you encounter issues:
1. Check CloudWatch logs: `/ecs/priceguard-server`
2. Review ALB target health in AWS Console
3. Check ECS service events
4. Review security group rules

