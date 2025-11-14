# Next Steps: Deploy and Verify Backend on AWS

## ✅ What's Already Done

- ✅ Dockerfile created
- ✅ ECS task definition configured
- ✅ Deployment scripts created
- ✅ CORS configured for Netlify
- ✅ Health check endpoint added
- ✅ GitHub Actions workflow created

## 🚀 Deployment Steps

### Step 1: Set Up AWS Secrets

Before deploying, store your secrets in AWS Secrets Manager:

```bash
# 1. Database URL
aws secretsmanager create-secret \
  --name priceguard/database-url \
  --secret-string "postgres://appadmin:Shalini%231357@pg-dev.cy7sig6qo75s.us-east-1.rds.amazonaws.com:5432/appdb?sslmode=verify-full" \
  --region us-east-1

# 2. Allowed Origins (replace with your actual Netlify domain)
aws secretsmanager create-secret \
  --name priceguard/allowed-origins \
  --secret-string "https://your-site.netlify.app" \
  --region us-east-1
```

**Important:** Replace `https://your-site.netlify.app` with your actual Netlify domain!

### Step 2: Create IAM Roles

Create the required IAM roles if you haven't already:

```bash
# Task Execution Role
aws iam create-role --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' || echo "Role already exists"

aws iam attach-role-policy --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

# Task Role (if needed for additional permissions)
aws iam create-role --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' || echo "Role already exists"
```

### Step 3: Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/priceguard-server \
  --region us-east-1 || echo "Log group already exists"
```

### Step 4: Deploy to AWS

#### Option A: Manual Deployment (First Time)

```bash
cd server
./deploy.sh
```

If the service doesn't exist yet, create it:

```bash
./create-service.sh
```

#### Option B: Automatic Deployment via GitHub Actions

1. **Set up GitHub Secrets:**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `AWS_ACCESS_KEY_ID` - Your AWS access key
     - `AWS_SECRET_ACCESS_KEY` - Your AWS secret key

2. **Push to main branch:**
   ```bash
   git add .
   git commit -m "Configure AWS deployment"
   git push origin main
   ```

   The GitHub Actions workflow will automatically:
   - Build the Docker image
   - Push to ECR
   - Update ECS task definition
   - Deploy to your ECS service

### Step 5: Set Up API Gateway or Load Balancer

Your ECS service needs a way to be accessed from the internet. Choose one:

#### Option A: Application Load Balancer (Recommended)

1. Create an ALB in your VPC
2. Create a target group pointing to your ECS service (port 4000)
3. Configure listener rules
4. Update security group to allow traffic from ALB

#### Option B: API Gateway with VPC Link

1. Create VPC Link
2. Create REST API with integration to your ECS service
3. Configure CORS in API Gateway

### Step 6: Verify Deployment

#### Check Service Status

```bash
cd server
chmod +x verify-deployment.sh
./verify-deployment.sh
```

#### Test Health Endpoint

If you have an ALB or API Gateway URL:

```bash
# Replace with your actual API URL
./verify-deployment.sh https://your-api-url.amazonaws.com
```

Or test manually:

```bash
# Health check
curl https://your-api-url/health

# Login test
curl -X POST https://your-api-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

#### Check CloudWatch Logs

```bash
aws logs tail /ecs/priceguard-server --follow --region us-east-1
```

#### View in AWS Console

- **ECS Service:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server
- **ECR Repository:** https://console.aws.amazon.com/ecr/repositories/private/144935603834/priceguard-server

### Step 7: Update Netlify

Update your Netlify environment variable:

1. Go to Netlify Dashboard → Site settings → Environment variables
2. Add or update:
   - `VITE_API_BASE_URL` = `https://your-api-url.amazonaws.com` (your ALB or API Gateway URL)

3. Redeploy your Netlify site

## 🔍 Troubleshooting

### Service Won't Start

1. **Check CloudWatch Logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```

2. **Check Task Status:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1
   ```

3. **Common Issues:**
   - **Database connection failed:** Check security group rules and DATABASE_URL secret
   - **Secrets not found:** Verify secrets exist in Secrets Manager
   - **CORS errors:** Verify ALLOWED_ORIGINS secret matches your Netlify domain
   - **SSL certificate errors:** Ensure RDS CA bundle is in the container

### Health Check Failing

1. Check if the service is running:
   ```bash
   aws ecs list-tasks \
     --cluster priceguard-cluster \
     --service-name priceguard-server \
     --region us-east-1
   ```

2. Check task logs for errors
3. Verify database connectivity
4. Check security group rules

### CORS Errors

1. Verify `ALLOWED_ORIGINS` secret in AWS Secrets Manager
2. Check that your Netlify domain matches exactly (including https://)
3. Check CloudWatch logs for CORS error messages

## 📊 Monitoring

### Set Up CloudWatch Alarms

```bash
# Create alarm for service failures
aws cloudwatch put-metric-alarm \
  --alarm-name priceguard-server-failures \
  --alarm-description "Alert when ECS service has failures" \
  --metric-name FailedTasks \
  --namespace AWS/ECS \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --region us-east-1
```

### View Metrics

- **ECS Metrics:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server/metrics
- **CloudWatch Metrics:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2:graph=~()

## ✅ Success Criteria

Your deployment is successful when:

1. ✅ ECS service shows "ACTIVE" status
2. ✅ At least 1 task is running
3. ✅ Health endpoint returns 200: `curl https://your-api-url/health`
4. ✅ Login endpoint responds (200 or 401): `curl -X POST https://your-api-url/api/auth/login ...`
5. ✅ CloudWatch logs show "Server listening on port 4000"
6. ✅ Frontend can connect from Netlify

## Step 8: Set Up CloudWatch Alarms and Email Notifications

Set up email notifications when the service goes down:

```bash
cd server
chmod +x setup-alarms.sh
./setup-alarms.sh
```

**Important:** After running the script:
1. Check your email (amit.k.mudgal@gmail.com)
2. Confirm the SNS subscription
3. Test the alarm by stopping the service temporarily

This will create:
- ✅ SNS topic for alerts
- ✅ Email subscription to amit.k.mudgal@gmail.com
- ✅ CloudWatch alarms for:
  - Service down (no running tasks)
  - Task failures
  - High CPU utilization
  - High memory utilization
  - Unhealthy tasks

### Optional: Set Up Log-Based Alarms

For more detailed monitoring (service crashes, database errors):

```bash
chmod +x setup-log-alarm.sh
./setup-log-alarm.sh
```

See `CLOUDWATCH_ALARMS.md` for detailed documentation.

## 🎉 Next Steps After Deployment

1. ✅ Set up CloudWatch alarms and email notifications
2. ✅ Set up auto-scaling based on CPU/memory
3. ✅ Configure custom domain for API
4. ✅ Set up monitoring dashboards
5. ✅ Configure backup and disaster recovery
6. ✅ Set up staging environment
7. ✅ Add API rate limiting
8. ✅ Set up SSL/TLS certificate for custom domain

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)

