# PriceGuard Infrastructure Outline

Complete overview of the AWS infrastructure setup for PriceGuard application.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌──────────────────┐
│   Netlify     │                      │   Custom Domain  │
│  Frontend     │                      │ priceguardbackend│
│  (Static)     │                      │     .live        │
└───────┬───────┘                      └────────┬─────────┘
        │                                       │
        │ HTTPS                                 │ HTTPS
        │                                       │
        └───────────────┬───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Application Load     │
            │  Balancer (ALB)       │
            │  priceguard-alb       │
            └───────────┬───────────┘
                        │
                        │ HTTP (Port 80)
                        │ HTTPS (Port 443)
                        │
                        ▼
            ┌───────────────────────┐
            │   Target Group        │
            │  priceguard-targets   │
            └───────────┬───────────┘
                        │
                        │ HTTP (Port 4000)
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   ECS Fargate    │          │   ECS Fargate    │
│   Task 1         │          │   Task 2         │
│  (Container)     │          │  (Container)    │
└────────┬─────────┘          └────────┬─────────┘
         │                            │
         └────────────┬───────────────┘
                      │
                      │ PostgreSQL (SSL)
                      │
                      ▼
         ┌──────────────────────┐
         │   RDS PostgreSQL     │
         │   Database           │
         └──────────────────────┘
```

---

## 📦 Components

### 1. **Frontend (Netlify)**

**Type:** Static Site Hosting  
**Domain:** Netlify-hosted domain  
**Custom Domain:** `www.priceguardbackend.live` (configured in Netlify)

**Configuration:**
- Environment Variables:
  - `VITE_API_BASE_URL`: Points to ALB endpoint
- Build: Vite-based React/TypeScript application
- Deployment: Automatic on git push

**Location:** External (Netlify CDN)

---

### 2. **Application Load Balancer (ALB)**

**Name:** `priceguard-alb`  
**DNS:** `priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`  
**ARN:** `arn:aws:elasticloadbalancing:us-east-1:144935603834:loadbalancer/app/priceguard-alb/4175d67c0071a951`  
**Scheme:** Internet-facing  
**Region:** `us-east-1`

**Listeners:**
- **HTTP (Port 80):** Active
  - Forwards to target group
- **HTTPS (Port 443):** Pending SSL certificate setup
  - Certificate: `arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28`
  - Domain: `api.priceguardbackend.live` (Status: ISSUED)

**Target Group:**
- **Name:** `priceguard-targets`
- **Protocol:** HTTP
- **Port:** 4000
- **Health Check:** `/health` endpoint
- **Health Check Interval:** 30 seconds
- **Unhealthy Threshold:** 3 consecutive failures

**Security Group:**
- **ID:** `sg-0d20af83680061442`
- **Inbound Rules:**
  - Port 80 (HTTP) from 0.0.0.0/0
  - Port 443 (HTTPS) from 0.0.0.0/0
- **Outbound Rules:**
  - All traffic allowed

---

### 3. **ECS (Elastic Container Service)**

#### 3.1 ECS Cluster

**Name:** `priceguard-cluster`  
**Launch Type:** Fargate (serverless containers)

#### 3.2 ECS Service

**Name:** `priceguard-server`  
**Task Definition:** `priceguard-server` (latest: v23)  
**Desired Count:** 1  
**Running Count:** 1  
**Status:** ACTIVE

**Network Configuration:**
- **Network Mode:** `awsvpc`
- **VPC:** `vpc-6fa24512`
- **Subnets:** 
  - `subnet-4854cf05`
  - `subnet-f8e531a7`
- **Security Group:** `sg-0d20af83680061442`
- **Public IP:** Enabled (for internet access)

**Load Balancer Integration:**
- **Target Group:** `priceguard-targets`
- **Container Port:** 4000
- **Container Name:** `priceguard-server`

#### 3.3 Task Definition

**Family:** `priceguard-server`  
**CPU:** 256 (0.25 vCPU)  
**Memory:** 512 MB  
**Network Mode:** `awsvpc`  
**Requires Compatibilities:** FARGATE

**Container Configuration:**
- **Name:** `priceguard-server`
- **Image:** `144935603834.dkr.ecr.us-east-1.amazonaws.com/priceguard-server:latest`
- **Port:** 4000 (TCP)
- **Essential:** Yes

**Environment Variables:**
- `NODE_ENV`: `production`
- `PORT`: `4000`
- `PGSSLMODE`: `allow` (SSL mode for database connection)

**Secrets (from AWS Secrets Manager):**
- `DATABASE_URL`: `arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/database-url-gVnioM`
- `ALLOWED_ORIGINS`: `arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/allowed-origins-yBKnxy`

**Health Check:**
- **Command:** `wget --no-verbose --tries=1 --spider http://localhost:4000/health?simple=1 || exit 1`
- **Interval:** 30 seconds
- **Timeout:** 5 seconds
- **Retries:** 3
- **Start Period:** 120 seconds

**Logging:**
- **Log Driver:** `awslogs`
- **Log Group:** `/ecs/priceguard-server`
- **Region:** `us-east-1`
- **Stream Prefix:** `ecs`

**IAM Roles:**
- **Execution Role:** `arn:aws:iam::144935603834:role/ecsTaskExecutionRole`
  - Permissions: Pull images from ECR, read secrets from Secrets Manager
- **Task Role:** `arn:aws:iam::144935603834:role/ecsTaskRole`
  - Permissions: Application-specific permissions

---

### 4. **ECR (Elastic Container Registry)**

**Repository Name:** `priceguard-server`  
**Region:** `us-east-1`  
**URI:** `144935603834.dkr.ecr.us-east-1.amazonaws.com/priceguard-server`

**Images:**
- `latest`: Latest deployed version
- Tagged with Git SHA: `{github-sha}`

**Build Process:**
- Automated via GitHub Actions
- Dockerfile: Multi-stage build
- Includes: Node.js 20, application code, RDS CA certificate

---

### 5. **RDS (Relational Database Service)**

**Engine:** PostgreSQL  
**Endpoint:** `pg-dev.cy7sig6qo75s.us-east-1.rds.amazonaws.com`  
**Port:** 5432  
**Database:** `appdb`  
**SSL Mode:** Required (with certificate validation)

**Connection:**
- Stored in AWS Secrets Manager
- Format: `postgres://user:password@host:port/database?sslmode=verify-full`
- SSL Certificate: RDS CA bundle included in Docker image

**Security:**
- Accessible only from ECS tasks in VPC
- Security group restricts access to ECS security group

---

### 6. **VPC & Networking**

**VPC ID:** `vpc-6fa24512`  
**Region:** `us-east-1`

**Subnets:**
- `subnet-4854cf05` (Availability Zone 1)
- `subnet-f8e531a7` (Availability Zone 2)

**Security Groups:**

**ALB Security Group:** `sg-0d20af83680061442`
- Inbound: Port 80, 443 from 0.0.0.0/0
- Outbound: All traffic

**ECS Task Security Group:** (Same as ALB for simplicity)
- Inbound: Port 4000 from ALB security group
- Outbound: HTTPS (443) to RDS, Secrets Manager

**NAT Gateway:** (If using private subnets)
- Required for outbound internet access from ECS tasks

---

### 7. **AWS Certificate Manager (ACM)**

**Region:** `us-east-1` (must match ALB region)

**Certificates:**

1. **Certificate 1:**
   - **ARN:** `arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28`
   - **Domain:** `api.priceguardbackend.live`
   - **Additional Domains:** `priceguardbackend.live`, `www.priceguardbackend.live`
   - **Status:** ISSUED ✅
   - **Validation:** DNS validation (records in Netlify)

2. **Certificate 2:**
   - **ARN:** `arn:aws:acm:us-east-1:144935603834:certificate/76095cd5-a4df-4a3c-9e52-dcbcd6a8ffea`
   - **Domain:** `priceguard.ai`
   - **Status:** PENDING_VALIDATION

---

### 8. **AWS Secrets Manager**

**Region:** `us-east-1`

**Secrets:**

1. **Database URL:**
   - **Name:** `priceguard/database-url`
   - **ARN:** `arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/database-url-gVnioM`
   - **Contains:** PostgreSQL connection string with credentials

2. **Allowed Origins:**
   - **Name:** `priceguard/allowed-origins`
   - **ARN:** `arn:aws:secretsmanager:us-east-1:144935603834:secret:priceguard/allowed-origins-yBKnxy`
   - **Contains:** Comma-separated list of allowed CORS origins (Netlify domains)

---

### 9. **CloudWatch Logs**

**Log Group:** `/ecs/priceguard-server`  
**Region:** `us-east-1`  
**Retention:** Default (never expire)

**Log Streams:**
- One per ECS task
- Prefix: `ecs`
- Contains: Application logs, database connection logs, health check logs

**Monitoring:**
- CloudWatch Alarms can be configured for:
  - Service errors
  - High CPU/Memory usage
  - Unhealthy targets

---

### 10. **IAM Roles & Policies**

#### 10.1 ECS Task Execution Role

**Name:** `ecsTaskExecutionRole`  
**ARN:** `arn:aws:iam::144935603834:role/ecsTaskExecutionRole`

**Policies:**
- `AmazonECSTaskExecutionRolePolicy` (pull images from ECR)
- `SecretsManagerReadWrite` (read secrets)

#### 10.2 ECS Task Role

**Name:** `ecsTaskRole`  
**ARN:** `arn:aws:iam::144935603834:role/ecsTaskRole`

**Policies:**
- Application-specific permissions (if needed)

#### 10.3 GitHub Actions IAM User (if configured)

**Name:** `github-actions-deploy`  
**Policies:**
- `AmazonEC2ContainerRegistryPowerUser` (push images to ECR)
- `AmazonECS_FullAccess` (deploy to ECS)
- `CloudWatchLogsFullAccess` (view logs)
- `SecretsManagerReadWrite` (read secrets)

---

### 11. **CI/CD Pipeline (GitHub Actions)**

**Workflow File:** `.github/workflows/deploy-backend.yml`

**Triggers:**
- Push to `main` or `master` branch
- Changes to `priceguard/server/**` files
- Manual trigger via `workflow_dispatch`

**Steps:**
1. Checkout code
2. Configure AWS credentials
3. Login to ECR
4. Download RDS CA certificate
5. Build Docker image
6. Tag and push to ECR
7. Update ECS task definition with new image
8. Deploy to ECS service
9. Wait for service stability
10. Verify deployment

**Secrets Required:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

---

## 🔄 Data Flow

### Request Flow:

1. **User** → Accesses frontend on Netlify
2. **Frontend** → Makes API call to `api.priceguardbackend.live` (or ALB DNS)
3. **DNS** → Resolves to ALB IP address
4. **ALB** → Routes request to healthy target in target group
5. **Target Group** → Forwards to ECS task on port 4000
6. **ECS Container** → Express.js server processes request
7. **Application** → Connects to RDS PostgreSQL (via SSL)
8. **Database** → Returns data
9. **Application** → Returns JSON response
10. **ALB** → Returns response to frontend
11. **Frontend** → Displays data to user

### Health Check Flow:

1. **ECS** → Runs health check command every 30 seconds
2. **Health Check** → `wget http://localhost:4000/health?simple=1`
3. **Application** → Returns 200 OK (doesn't check DB for simple checks)
4. **ECS** → Marks task as healthy
5. **ALB** → Also checks `/health` endpoint (checks DB connection)

---

## 🔐 Security

### Network Security:
- ✅ ECS tasks in VPC with security groups
- ✅ ALB as public entry point
- ✅ Database in private subnet (if configured)
- ✅ SSL/TLS for database connections
- ✅ SSL/TLS for API (HTTPS listener)

### Application Security:
- ✅ Secrets stored in AWS Secrets Manager (not in code)
- ✅ CORS configured to allow only Netlify domains
- ✅ Passwords hashed with Argon2id
- ✅ Credit card tokens stored securely
- ✅ Environment variables for sensitive config

### Access Control:
- ✅ IAM roles with least privilege
- ✅ ECR images require authentication
- ✅ Secrets Manager access restricted to ECS tasks

---

## 📊 Monitoring & Logging

### CloudWatch Logs:
- Application logs: `/ecs/priceguard-server`
- Real-time log streaming available
- Log retention: Configurable

### CloudWatch Metrics:
- ECS service metrics (CPU, memory, task count)
- ALB metrics (request count, latency, error rates)
- Target group health metrics

### Health Checks:
- **ECS Container Health Check:** Every 30 seconds
- **ALB Target Health Check:** Every 30 seconds
- **Health Endpoint:** `/health` (simple) or `/health` (detailed)

---

## 💰 Cost Estimation

### Monthly Costs (Approximate):

- **ALB:** ~$16/month (base cost)
- **ECS Fargate:** ~$15/month (1 task, 0.25 vCPU, 512 MB)
- **ECR:** ~$0.10/month (storage)
- **RDS:** Varies by instance type
- **Data Transfer:** First 1 GB free, then $0.01/GB
- **Secrets Manager:** $0.40/month per secret
- **CloudWatch Logs:** $0.50/GB ingested

**Total (excluding RDS):** ~$32-35/month

---

## 🗺️ AWS Account & Region

**AWS Account ID:** `144935603834`  
**Region:** `us-east-1` (N. Virginia)

---

## 📝 Key Endpoints

### API Endpoints:
- **HTTP:** `http://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`
- **HTTPS (Custom Domain):** `https://api.priceguardbackend.live` (pending DNS setup)
- **Health Check:** `/health`
- **Auth Endpoints:**
  - `POST /api/auth/register`
  - `POST /api/auth/login`

### Management Console Links:
- **ECS Cluster:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster
- **ECS Service:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
- **ALB:** https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LoadBalancers:
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server
- **Secrets Manager:** https://console.aws.amazon.com/secretsmanager/home?region=us-east-1

---

## 🔧 Configuration Files

### Infrastructure as Code:
- `ecs-task-definition.json` - ECS task configuration
- `.github/workflows/deploy-backend.yml` - CI/CD pipeline
- `setup-alb.sh` - ALB setup script
- `Dockerfile` - Container image definition

### Application Configuration:
- `src/index.ts` - Express server setup
- `src/db.ts` - Database connection with SSL
- `src/routes/auth.ts` - Authentication endpoints
- `src/migrations.ts` - Database schema

---

## 🚀 Deployment Process

1. **Code Push** → GitHub repository
2. **GitHub Actions** → Triggers automatically
3. **Build** → Docker image built
4. **Push** → Image pushed to ECR
5. **Update** → ECS task definition updated
6. **Deploy** → New tasks started
7. **Health Check** → Tasks verified healthy
8. **Traffic** → Old tasks drained, new tasks receive traffic
9. **Complete** → Deployment successful

**Deployment Time:** ~5-10 minutes

---

## 📚 Documentation Files

- `AWS_DEPLOYMENT.md` - Complete deployment guide
- `ALB_SETUP_GUIDE.md` - Load balancer setup
- `SETUP_DOMAIN_SSL.md` - SSL certificate setup
- `GITHUB_ACTIONS_SETUP.md` - CI/CD configuration
- `FIX_DATABASE_SSL.md` - Database SSL troubleshooting
- `TROUBLESHOOT_DEPLOYMENT.md` - Common issues and solutions

---

## ✅ Current Status

- ✅ ECS Cluster: Active
- ✅ ECS Service: Running (1 task)
- ✅ ALB: Active with HTTP listener
- ✅ Target Group: Healthy targets
- ✅ SSL Certificate: Issued for `api.priceguardbackend.live`
- ⚠️ HTTPS Listener: Pending setup
- ✅ Database: Connected (with SSL)
- ✅ CI/CD: Configured and working
- ✅ Logging: Active in CloudWatch

---

## 🔄 Next Steps

1. **Set up HTTPS Listener** on ALB with SSL certificate
2. **Configure DNS** in Netlify to point `api.priceguardbackend.live` to ALB
3. **Update Frontend** environment variable to use HTTPS URL
4. **Set up CloudWatch Alarms** for monitoring
5. **Enable Auto Scaling** if needed
6. **Set up WAF** for additional security (optional)

---

*Last Updated: November 15, 2025*

