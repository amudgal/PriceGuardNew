#!/bin/bash
# Download RDS CA certificate bundle

set -e

echo "📥 Downloading RDS CA Certificate Bundle..."

# Download the global RDS CA bundle
curl -o rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

if [ $? -eq 0 ]; then
  echo "✅ RDS CA certificate bundle downloaded successfully"
  echo "   File: rds-ca-bundle.pem"
  echo ""
  echo "📝 Next steps:"
  echo "   1. Rebuild your Docker image:"
  echo "      docker build -t priceguard-server ."
  echo "   2. Push to ECR:"
  echo "      aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-ecr-repo>"
  echo "      docker tag priceguard-server:latest <your-ecr-repo>:latest"
  echo "      docker push <your-ecr-repo>:latest"
  echo "   3. Force new deployment:"
  echo "      aws ecs update-service --cluster priceguard-cluster --service priceguard-server --force-new-deployment --region us-east-1"
else
  echo "❌ Failed to download RDS CA certificate bundle"
  exit 1
fi

