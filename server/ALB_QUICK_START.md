# ALB Quick Start

## Run from Local Machine

```bash
cd priceguard/server
./setup-alb.sh
```

## Run from AWS CloudShell

1. Open [AWS CloudShell](https://console.aws.amazon.com/cloudshell/home)
2. Run:
```bash
git clone <your-repo-url> && cd <repo>/priceguard/server && chmod +x setup-alb.sh && ./setup-alb.sh
```

Or use the simplified version:
```bash
# Copy and paste setup-alb-cloudshell.sh content into CloudShell
```

## What You'll Get

- ✅ Application Load Balancer (ALB)
- ✅ Target Group configured for ECS
- ✅ HTTP listener on port 80
- ✅ ECS service automatically updated
- ✅ Security group rules updated

## After Setup

1. **Get ALB DNS:**
   ```bash
   aws elbv2 describe-load-balancers \
     --names priceguard-alb \
     --region us-east-1 \
     --query 'LoadBalancers[0].DNSName' \
     --output text
   ```

2. **Test Health Endpoint:**
   ```bash
   curl http://<ALB_DNS>/health
   ```

3. **Update Netlify Environment Variable:**
   - Go to Netlify Dashboard → Site settings → Environment variables
   - Set: `VITE_API_BASE_URL=http://<ALB_DNS>`

## For HTTPS (Production)

1. Request certificate from ACM:
   ```bash
   aws acm request-certificate \
     --domain-name api.yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. After validation, create HTTPS listener:
   ```bash
   CERT_ARN=$(aws acm list-certificates --region us-east-1 --query 'CertificateSummaryList[0].CertificateArn' --output text)
   ALB_ARN=$(aws elbv2 describe-load-balancers --names priceguard-alb --region us-east-1 --query 'LoadBalancers[0].LoadBalancerArn' --output text)
   TG_ARN=$(aws elbv2 describe-target-groups --names priceguard-targets --region us-east-1 --query 'TargetGroups[0].TargetGroupArn' --output text)
   
   aws elbv2 create-listener \
     --load-balancer-arn $ALB_ARN \
     --protocol HTTPS \
     --port 443 \
     --certificates CertificateArn=$CERT_ARN \
     --default-actions Type=forward,TargetGroupArn=$TG_ARN \
     --region us-east-1
   ```

## Troubleshooting

**ALB shows unhealthy targets:**
- Check ECS tasks are running
- Verify security group allows port 4000 from ALB
- Check `/health` endpoint works on tasks

**Cannot access ALB:**
- Wait 2-3 minutes for DNS propagation
- Check security group allows ports 80/443
- Verify ALB state is "active"

## View in Console

- **ALB Console:** https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#LoadBalancers:
- **ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server

