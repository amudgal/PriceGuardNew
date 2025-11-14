# Complete Guide: Configure GitHub Secrets for Deployment

This guide will walk you through setting up GitHub Secrets so your deployment workflow can run automatically.

## 📋 Prerequisites

Before you start, make sure you have:
- Access to your GitHub repository: `https://github.com/amudgal/PriceGuard`
- AWS account access
- AWS CLI installed (optional, for creating IAM user)

---

## Step 1: Get AWS Credentials

You need AWS credentials with the following permissions:
- ✅ ECR (Elastic Container Registry) - to push Docker images
- ✅ ECS (Elastic Container Service) - to deploy containers
- ✅ CloudWatch Logs - to view logs
- ✅ Secrets Manager - to read application secrets

### Option A: Create a New IAM User (Recommended)

Run these commands in your terminal:

```bash
# 1. Create IAM user
aws iam create-user --user-name github-actions-deploy

# 2. Attach required policies
aws iam attach-user-policy \
  --user-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-user-policy \
  --user-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-user-policy \
  --user-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

aws iam attach-user-policy \
  --user-name github-actions-deploy \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

# 3. Create access key (IMPORTANT: Save the output!)
aws iam create-access-key --user-name github-actions-deploy
```

**⚠️ CRITICAL:** The last command will output something like:
```json
{
    "AccessKey": {
        "UserName": "github-actions-deploy",
        "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
        "Status": "Active",
        "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "CreateDate": "2024-01-01T00:00:00Z"
    }
}
```

**SAVE BOTH VALUES:**
- `AccessKeyId` → This is your `AWS_ACCESS_KEY_ID`
- `SecretAccessKey` → This is your `AWS_SECRET_ACCESS_KEY`

### Option B: Use Existing AWS Credentials

If you already have AWS credentials with the required permissions, you can use those instead.

---

## Step 2: Configure GitHub Secrets

### Method 1: Using GitHub Web Interface (Easiest)

1. **Navigate to your repository:**
   - Go to: `https://github.com/amudgal/PriceGuard`

2. **Open Settings:**
   - Click on the **Settings** tab (top navigation bar)

3. **Go to Secrets:**
   - In the left sidebar, click **Secrets and variables**
   - Then click **Actions**

4. **Add First Secret (`AWS_ACCESS_KEY_ID`):**
   - Click the **New repository secret** button
   - **Name:** Enter exactly: `AWS_ACCESS_KEY_ID`
   - **Secret:** Paste your AWS Access Key ID (from Step 1)
   - Click **Add secret**

5. **Add Second Secret (`AWS_SECRET_ACCESS_KEY`):**
   - Click **New repository secret** again
   - **Name:** Enter exactly: `AWS_SECRET_ACCESS_KEY`
   - **Secret:** Paste your AWS Secret Access Key (from Step 1)
   - Click **Add secret**

6. **Verify Secrets:**
   - You should now see both secrets listed:
     - ✅ `AWS_ACCESS_KEY_ID`
     - ✅ `AWS_SECRET_ACCESS_KEY`

### Method 2: Using GitHub CLI

If you have GitHub CLI installed:

```bash
# Authenticate with GitHub (if not already)
gh auth login

# Set the secrets
gh secret set AWS_ACCESS_KEY_ID --repo amudgal/PriceGuard
# (It will prompt you to enter the value)

gh secret set AWS_SECRET_ACCESS_KEY --repo amudgal/PriceGuard
# (It will prompt you to enter the value)
```

---

## Step 3: Verify Setup

1. **Check Secrets are Added:**
   - Go to: `https://github.com/amudgal/PriceGuard/settings/secrets/actions`
   - You should see both secrets listed

2. **Test the Workflow:**
   - Make a small change to any file in the `server/` directory
   - Commit and push to `main` or `master` branch
   - Go to: `https://github.com/amudgal/PriceGuard/actions`
   - You should see a workflow run start automatically

---

## Step 4: Monitor Your First Deployment

Once you push changes, the workflow will:

1. ✅ Checkout your code
2. ✅ Configure AWS credentials (using your secrets)
3. ✅ Login to Amazon ECR
4. ✅ Build and push Docker image
5. ✅ Deploy to ECS
6. ✅ Wait for service stability

**Monitor the deployment:**
- **GitHub Actions:** `https://github.com/amudgal/PriceGuard/actions`
- **AWS ECS Console:** `https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server`
- **CloudWatch Logs:** `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server`

---

## 🚨 Troubleshooting

### Secret Not Found Error

**Error:** `Error: Input required and not supplied: aws-access-key-id`

**Solution:**
- Double-check the secret names are exactly: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- Make sure there are no extra spaces or typos
- Verify secrets are added in the correct repository

### Access Denied Error

**Error:** `AccessDenied: User is not authorized to perform: ecr:GetAuthorizationToken`

**Solution:**
- Verify your IAM user has the required policies attached
- Check that the Access Key ID and Secret Access Key are correct
- Ensure the IAM user has permissions for ECR, ECS, CloudWatch, and Secrets Manager

### ECR Repository Not Found

**Error:** `RepositoryNotFoundException`

**Solution:**
```bash
# Create the ECR repository
aws ecr create-repository \
  --repository-name priceguard-server \
  --region us-east-1
```

### ECS Service Not Found

**Error:** `ServiceNotFoundException`

**Solution:**
- You need to create the ECS service first
- Run `./create-service.sh` in the `server/` directory
- Or deploy manually using `./deploy.sh`

---

## ✅ Checklist

Before your first deployment, verify:

- [ ] AWS IAM user created with required permissions
- [ ] AWS Access Key ID saved
- [ ] AWS Secret Access Key saved
- [ ] `AWS_ACCESS_KEY_ID` secret added to GitHub
- [ ] `AWS_SECRET_ACCESS_KEY` secret added to GitHub
- [ ] ECR repository exists (`priceguard-server`)
- [ ] ECS cluster exists (`priceguard-cluster`)
- [ ] ECS service exists (`priceguard-server`)
- [ ] Secrets Manager secrets exist (database-url, allowed-origins)

---

## 🔒 Security Best Practices

1. ✅ **Never commit AWS credentials to git**
2. ✅ **Use a dedicated IAM user** for GitHub Actions (not your personal AWS account)
3. ✅ **Use least-privilege policies** (only grant necessary permissions)
4. ✅ **Rotate access keys regularly** (every 90 days recommended)
5. ✅ **Enable MFA** on your AWS account
6. ✅ **Monitor access** using CloudTrail

---

## 📚 Quick Links

- **GitHub Repository:** `https://github.com/amudgal/PriceGuard`
- **GitHub Secrets:** `https://github.com/amudgal/PriceGuard/settings/secrets/actions`
- **GitHub Actions:** `https://github.com/amudgal/PriceGuard/actions`
- **AWS ECS Console:** `https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server`

---

## 🎉 Next Steps

Once secrets are configured:

1. Make a change to any file in `server/` directory
2. Commit and push to `main` or `master`
3. Watch the deployment in GitHub Actions
4. Verify your service is running in AWS ECS

The workflow will automatically run on every push to `main`/`master` that changes files in `server/`!

