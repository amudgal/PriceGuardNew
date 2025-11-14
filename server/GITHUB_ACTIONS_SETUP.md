# GitHub Actions Setup for AWS Deployment

## ✅ What's Been Committed

All AWS deployment configuration has been committed and pushed to GitHub:
- ✅ Dockerfile and deployment scripts
- ✅ GitHub Actions workflow (`.github/workflows/deploy-backend.yml`)
- ✅ ECS task definition
- ✅ CloudWatch alarms setup scripts
- ✅ Documentation

## ⚠️ Important: Set Up GitHub Secrets

For the GitHub Actions workflow to deploy to AWS, you need to configure GitHub Secrets:

### Step 1: Get AWS Credentials

You need AWS credentials with permissions for:
- ECR (Elastic Container Registry)
- ECS (Elastic Container Service)
- CloudWatch Logs
- Secrets Manager

### Step 2: Create IAM User for GitHub Actions

**Recommended:** Create a dedicated IAM user for GitHub Actions:

```bash
# Create IAM user
aws iam create-user --user-name github-actions-deploy

# Attach policies
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

# Create access key
aws iam create-access-key --user-name github-actions-deploy
```

**Save the Access Key ID and Secret Access Key!**

### Step 3: Configure GitHub Secrets

1. Go to your GitHub repository: https://github.com/amudgal/PriceGuard
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

   - **Name:** `AWS_ACCESS_KEY_ID`
     **Value:** Your AWS Access Key ID

   - **Name:** `AWS_SECRET_ACCESS_KEY`
     **Value:** Your AWS Secret Access Key

### Step 4: Verify Workflow

After setting up secrets:

1. Go to **Actions** tab in GitHub
2. Check if the workflow runs on the next push to `main`
3. Monitor the workflow execution

## 🔄 Workflow Trigger

The workflow will automatically run when:
- ✅ Code is pushed to `main` or `master` branch
- ✅ Changes are made to `server/**` files
- ✅ Changes are made to `.github/workflows/deploy-backend.yml`

## 📊 Monitor Deployment

1. **GitHub Actions:** https://github.com/amudgal/PriceGuard/actions
2. **AWS ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
3. **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server

## 🚨 Troubleshooting

### Workflow Fails: "Access Denied"

**Issue:** AWS credentials don't have proper permissions

**Solution:**
1. Check IAM user permissions
2. Verify AWS credentials in GitHub Secrets
3. Check if ECR repository exists

### Workflow Fails: "ECR Repository Not Found"

**Issue:** ECR repository doesn't exist

**Solution:**
```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name priceguard-server \
  --region us-east-1
```

### Workflow Fails: "ECS Service Not Found"

**Issue:** ECS service doesn't exist

**Solution:**
1. Run `./create-service.sh` manually first
2. Or deploy manually using `./deploy.sh`

### Workflow Fails: "Secrets Not Found"

**Issue:** Secrets in Secrets Manager don't exist

**Solution:**
1. Create secrets in AWS Secrets Manager:
   ```bash
   aws secretsmanager create-secret \
     --name priceguard/database-url \
     --secret-string "your-database-url" \
     --region us-east-1
   
   aws secretsmanager create-secret \
     --name priceguard/allowed-origins \
     --secret-string "https://your-netlify-site.netlify.app" \
     --region us-east-1
   ```

## 📝 Next Steps

1. ✅ Set up GitHub Secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
2. ✅ Verify ECR repository exists
3. ✅ Verify ECS service exists (or create it manually)
4. ✅ Verify Secrets Manager secrets exist
5. ✅ Push a change to trigger the workflow
6. ✅ Monitor deployment in GitHub Actions

## 🔒 Security Best Practices

1. ✅ Use dedicated IAM user for GitHub Actions
2. ✅ Use least-privilege IAM policies
3. ✅ Rotate access keys regularly
4. ✅ Never commit AWS credentials to git
5. ✅ Use GitHub Secrets for sensitive data
6. ✅ Enable MFA for IAM user (if possible)

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

