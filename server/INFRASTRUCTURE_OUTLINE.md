# PriceGuard Infrastructure Outline

Complete overview of the AWS infrastructure setup for PriceGuard application.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────┐                      ┌──────────────────┐
│   Netlify     │                      │   Custom Domain  │
│  Frontend     │                      │ api.priceguard   │
│  (Static)     │                      │ backend.live     │
│  (Vite/React) │                      │  (ALB Endpoint)  │
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
┌──────────────────┐          ┌──────────────────┐                     ┌──────────────────────┐
│   ECS Fargate    │          │   ECS Fargate    │   PostgreSQL (SSL)  │   RDS PostgreSQL     │
│   Task 1         │          │   Task 2         │──────────────────── │   Database           │
│  (Container)     │          │  (Container)     │   Port 5432         │   pg-dev.cy7sig6... │
│  Port 4000       │          │  Port 4000       │                     │   Database: appdb   │
└────────┬─────────┘          └────────┬─────────┘                     └──────────────────────┘
         │                             │
         ├─────────────────────────────┤
         │                             │
         │ HTTPS (API)                 │ HTTPS (Webhooks)
         ▼                             ▼
┌──────────────┐              ┌──────────────┐
│   Stripe     │              │   Stripe     │
│   API        │              │   Webhooks   │
│ (Payments)   │              │  (Events)    │
└──────────────┘              └──────────────┘
    
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
  - `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key for frontend
  - `VITE_STRIPE_PRICE_BASIC`: Stripe Price ID for Basic plan (optional)
  - `VITE_STRIPE_PRICE_PREMIUM`: Stripe Price ID for Premium plan (optional)
  - `VITE_STRIPE_PRICE_ENTERPRISE`: Stripe Price ID for Enterprise plan (optional)
- Build: Vite-based React/TypeScript application
- Deployment: Automatic on git push
- Payment Processing: Uses Stripe Elements (client-side) for secure card collection

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
- **HTTPS (Port 443):** Active ✅
  - Certificate: `arn:aws:acm:us-east-1:144935603834:certificate/21664430-e1db-449b-9dfe-a900c96a2b28`
  - Domain: `api.priceguardbackend.live` (Status: ISSUED ✅)
  - Forwards to target group

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
- `STRIPE_SECRET_KEY`: Stripe secret API key (from Stripe Dashboard)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret (for webhook verification)

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

**Database Schema (Stripe Integration):**
- Additional columns for Stripe integration:
  - `stripe_customer_id`: Stripe Customer ID
  - `stripe_default_payment_method_id`: Default payment method ID
  - `stripe_subscription_id`: Active subscription ID
  - `subscription_status`: Current subscription status
  - `stripe_price_id`: Stripe Price ID for the plan
  - `stripe_latest_invoice_id`: Latest invoice ID
  - `stripe_latest_invoice_status`: Latest invoice status

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

3. **Stripe Secret Key:**
   - **Name:** `priceguard/stripe-secret-key` (if stored in Secrets Manager)
   - **Contains:** Stripe secret API key (starts with `sk_`)
   - **Usage:** Server-side Stripe API calls

4. **Stripe Webhook Secret:**
   - **Name:** `priceguard/stripe-webhook-secret` (if stored in Secrets Manager)
   - **Contains:** Stripe webhook signing secret (starts with `whsec_`)
   - **Usage:** Verifying webhook event signatures

---

### 9. **Stripe Payment Integration**

**Service:** Stripe Payment Processing  
**Integration Type:** API-based payments with webhooks

#### 9.1 Stripe API Integration

**Purpose:**
- Secure payment method collection (no card data touches our servers)
- Subscription management
- Invoice generation and tracking
- Payment processing

**Client Library:**
- `stripe` npm package (server-side)
- `@stripe/react-stripe-js` and `@stripe/stripe-js` (frontend)

**Key Features:**
- **PCI Compliance:** Card data never touches our servers - handled directly by Stripe Elements
- **Setup Intents:** Secure method to save payment methods for future use
- **Subscriptions:** Automatic recurring billing management
- **Webhooks:** Real-time event notifications for subscription changes

#### 9.2 Stripe Endpoints (Backend)

**Billing Routes:** `/api/billing/*`

1. **POST `/api/billing/create-setup-intent`**
   - Creates a SetupIntent for saving payment methods
   - Returns client_secret for frontend Stripe Elements
   - Automatically creates Stripe Customer if needed

2. **POST `/api/billing/save-payment-method`**
   - Saves payment method after SetupIntent confirmation
   - Attaches payment method to Stripe Customer
   - Sets as default payment method
   - Stores payment method ID in database

3. **POST `/api/billing/create-subscription`**
   - Creates a subscription with the saved payment method
   - Processes immediate payment
   - Updates subscription status in database

4. **POST `/api/billing/cancel-subscription`**
   - Cancels subscription (immediately or at period end)
   - Updates subscription status
   - Maintains access until period end if canceled at period end

5. **GET `/api/billing/subscription`**
   - Retrieves current subscription information
   - Returns plan, status, payment method details

6. **GET `/api/billing/billing-history`**
   - Fetches invoices, payment intents, and charges from last 12 months
   - Returns both processed and processing transactions
   - Includes invoice PDF links and payment status

#### 9.3 Stripe Webhooks

**Endpoint:** `POST /api/stripe/webhook`  
**Verification:** Signature verification using webhook secret

**Event Types Handled:**

1. **`payment_method.attached`**
   - Triggered when a payment method is attached to a customer
   - Updates `stripe_default_payment_method_id` in database
   - Updates `card_last4` for display

2. **`customer.subscription.created`**
3. **`customer.subscription.updated`**
4. **`customer.subscription.deleted`**
   - Updates subscription status and details in database
   - Tracks subscription lifecycle changes
   - Updates `stripe_subscription_id`, `subscription_status`, `stripe_price_id`

5. **`invoice.payment_succeeded`**
   - Marks account as current (not past due)
   - Updates latest invoice information
   - Resets `past_due` flag

6. **`invoice.payment_failed`**
   - Marks account as past due
   - Updates invoice status
   - Sets `past_due` flag to true

**Webhook Configuration:**
- Webhook URL: `https://api.priceguardbackend.live/api/stripe/webhook`
- Must be configured in Stripe Dashboard
- Requires HTTPS endpoint
- Signature verification ensures events are from Stripe

#### 9.4 Frontend Integration

**Stripe Elements:**
- Card input handled directly by Stripe.js (no card data to backend)
- SetupIntent confirmation on frontend
- Secure tokenization of payment methods

**Components:**
- `BillingCardForm.tsx`: Secure card collection using Stripe Elements
- Integrated in Dashboard Account Settings
- Real-time validation and error handling

#### 9.5 Database Schema (Stripe)

**Accounts Table Extensions:**
```sql
ALTER TABLE accounts
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_default_payment_method_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN subscription_status TEXT,
  ADD COLUMN stripe_price_id TEXT,
  ADD COLUMN stripe_latest_invoice_id TEXT,
  ADD COLUMN stripe_latest_invoice_status TEXT;
```

#### 9.6 Security & Compliance

**PCI Compliance:**
- ✅ No card data (PAN, CVV, expiry) stored on our servers
- ✅ Card data handled directly by Stripe over HTTPS
- ✅ Payment methods stored as tokens only
- ✅ Stripe Elements provides PCI-compliant card input

**Data Security:**
- ✅ Stripe API keys stored as environment variables/secrets
- ✅ Webhook signature verification prevents unauthorized events
- ✅ Only last 4 digits of card stored for display purposes
- ✅ All Stripe API calls use HTTPS

**Access Control:**
- ✅ Customer creation tied to account email
- ✅ Payment methods scoped to specific Stripe Customer
- ✅ Subscription actions require authenticated account

---

### 10. **CloudWatch Logs**

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

### 11. **IAM Roles & Policies**

#### 11.1 ECS Task Execution Role

**Name:** `ecsTaskExecutionRole`  
**ARN:** `arn:aws:iam::144935603834:role/ecsTaskExecutionRole`

**Policies:**
- `AmazonECSTaskExecutionRolePolicy` (pull images from ECR)
- `SecretsManagerReadWrite` (read secrets)

#### 11.2 ECS Task Role

**Name:** `ecsTaskRole`  
**ARN:** `arn:aws:iam::144935603834:role/ecsTaskRole`

**Policies:**
- Application-specific permissions (if needed)

#### 11.3 GitHub Actions IAM User (if configured)

**Name:** `github-actions-deploy`  
**Policies:**
- `AmazonEC2ContainerRegistryPowerUser` (push images to ECR)
- `AmazonECS_FullAccess` (deploy to ECS)
- `CloudWatchLogsFullAccess` (view logs)
- `SecretsManagerReadWrite` (read secrets)

---

### 12. **CI/CD Pipeline (GitHub Actions)**

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

**Environment Variables (if needed):**
- `STRIPE_SECRET_KEY`: For Stripe API operations (if not in Secrets Manager)
- `STRIPE_WEBHOOK_SECRET`: For webhook verification (if not in Secrets Manager)

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

### Payment Flow (Stripe):

1. **User** → Enters card details in frontend (Stripe Elements)
2. **Frontend** → Creates SetupIntent via `/api/billing/create-setup-intent`
3. **Backend** → Creates SetupIntent in Stripe API
4. **Backend** → Returns client_secret to frontend
5. **Frontend** → Confirms SetupIntent with Stripe.js (card data goes directly to Stripe)
6. **Stripe** → Validates card and returns payment method ID
7. **Frontend** → Calls `/api/billing/save-payment-method` with payment method ID
8. **Backend** → Attaches payment method to Stripe Customer, saves to database
9. **Frontend** → Calls `/api/billing/create-subscription` (if plan selected)
10. **Backend** → Creates subscription in Stripe, processes payment
11. **Stripe** → Sends webhook events (`subscription.created`, `invoice.payment_succeeded`)
12. **Backend** → Webhook handler updates database with subscription status
13. **Frontend** → Displays subscription confirmation

### Webhook Flow (Stripe Events):

1. **Stripe** → Event occurs (subscription change, payment, etc.)
2. **Stripe** → Sends POST request to `/api/stripe/webhook` endpoint
3. **ALB** → Routes webhook request to ECS task
4. **Backend** → Verifies webhook signature using webhook secret
5. **Backend** → Processes event type (subscription, invoice, payment_method)
6. **Backend** → Updates database with latest subscription/payment status
7. **Backend** → Returns 200 OK to acknowledge receipt

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
- ✅ Payment processing via Stripe (PCI compliant - no card data stored)
- ✅ Stripe API keys stored as secrets/environment variables
- ✅ Webhook signature verification prevents unauthorized events
- ✅ Only last 4 digits of card stored for display (never full card number)
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
  - `POST /api/auth/register` - Register new account
  - `POST /api/auth/login` - Authenticate user

- **Billing Endpoints:**
  - `POST /api/billing/create-setup-intent` - Create SetupIntent for saving payment methods
  - `POST /api/billing/save-payment-method` - Save payment method after confirmation
  - `POST /api/billing/create-subscription` - Create subscription with saved payment method
  - `POST /api/billing/cancel-subscription` - Cancel subscription (immediate or at period end)
  - `GET /api/billing/subscription?email=...` - Get subscription information
  - `GET /api/billing/billing-history?email=...` - Get billing history (last 12 months)
  - `POST /api/stripe/webhook` - Stripe webhook endpoint for event processing

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
- `src/routes/billing.ts` - Billing and subscription endpoints
- `src/routes/stripeWebhook.ts` - Stripe webhook event handler
- `src/stripeClient.ts` - Stripe API client initialization
- `src/migrations.ts` - Database schema (includes Stripe columns)

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
- ✅ ECS Service: Running (1 task, can scale to 2+ for HA)
- ✅ ALB: Active with HTTP and HTTPS listeners
- ✅ Target Group: Healthy targets
- ✅ SSL Certificate: Issued for `api.priceguardbackend.live`
- ✅ HTTPS Listener: Active (Port 443)
- ✅ Database: Connected (with SSL)
- ✅ CI/CD: Configured and working
- ✅ Logging: Active in CloudWatch
- ✅ Stripe Integration: Fully implemented
  - ✅ Payment method management
  - ✅ Subscription creation and cancellation
  - ✅ Billing history tracking
  - ✅ Webhook event processing
  - ✅ Frontend integration with Stripe Elements

---

## 🔄 Next Steps

1. **Set up HTTPS Listener** on ALB with SSL certificate
2. **Configure DNS** in Netlify to point `api.priceguardbackend.live` to ALB
3. **Update Frontend** environment variable to use HTTPS URL
4. **Configure Stripe Webhook** in Stripe Dashboard:
   - Webhook URL: `https://api.priceguardbackend.live/api/stripe/webhook`
   - Events to listen: `payment_method.attached`, `customer.subscription.*`, `invoice.payment_*`
   - Copy webhook secret to Secrets Manager
5. **Set up CloudWatch Alarms** for monitoring (including Stripe webhook failures)
6. **Enable Auto Scaling** if needed
7. **Set up WAF** for additional security (optional)
8. **Configure Stripe Price IDs** in environment variables for subscription plans

---

## 💳 Stripe Configuration

### Required Stripe Keys

**Frontend (Netlify Environment Variables):**
- `VITE_STRIPE_PUBLISHABLE_KEY`: Publishable key (starts with `pk_`)
- `VITE_STRIPE_PRICE_BASIC`: Price ID for Basic plan (optional)
- `VITE_STRIPE_PRICE_PREMIUM`: Price ID for Premium plan (optional)
- `VITE_STRIPE_PRICE_ENTERPRISE`: Price ID for Enterprise plan (optional)

**Backend (AWS Secrets Manager or Environment Variables):**
- `STRIPE_SECRET_KEY`: Secret key (starts with `sk_`)
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret (starts with `whsec_`)

### Stripe Dashboard Setup

1. **Create Products and Prices:**
   - Create products for each plan (Basic, Premium, Enterprise)
   - Create recurring prices (monthly/yearly)
   - Copy Price IDs to environment variables

2. **Configure Webhook:**
   - URL: `https://api.priceguardbackend.live/api/stripe/webhook`
   - Events: Select required events (subscription, invoice, payment_method)
   - Copy webhook signing secret

3. **Test Mode vs Production:**
   - Use test keys during development
   - Switch to live keys for production
   - Test webhooks using Stripe CLI

### Stripe API Usage

**Client-Side (Frontend):**
- Stripe.js loaded via CDN or npm package
- Stripe Elements for secure card input
- No card data sent to our servers

**Server-Side (Backend):**
- Stripe Node.js SDK for API calls
- Customer management
- Subscription lifecycle
- Invoice and payment tracking
- Webhook signature verification

---

*Last Updated: December 2024*

