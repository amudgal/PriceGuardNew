#!/bin/bash
# Script to fix database SSL certificate issue by updating ECS task definition

set -e

AWS_REGION="us-east-1"
TASK_FAMILY="priceguard-server"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Fixing Database SSL Certificate Issue${NC}"
echo ""

# Validate AWS CLI
if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI is not installed${NC}"
  exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}❌ AWS credentials not configured${NC}"
  exit 1
fi

# Find the script directory and task definition file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASK_DEF_FILE="$SCRIPT_DIR/ecs-task-definition.json"

# If not found in script directory, try current directory
if [ ! -f "$TASK_DEF_FILE" ]; then
  TASK_DEF_FILE="$(pwd)/ecs-task-definition.json"
fi

# If still not found, search for it
if [ ! -f "$TASK_DEF_FILE" ]; then
  # Try to find it in common locations
  if [ -f "priceguard/server/ecs-task-definition.json" ]; then
    TASK_DEF_FILE="$(pwd)/priceguard/server/ecs-task-definition.json"
  elif [ -f "server/ecs-task-definition.json" ]; then
    TASK_DEF_FILE="$(pwd)/server/ecs-task-definition.json"
  else
    # Search for it
    FOUND_FILE=$(find . -name "ecs-task-definition.json" -type f 2>/dev/null | head -1)
    if [ -n "$FOUND_FILE" ]; then
      TASK_DEF_FILE="$FOUND_FILE"
    fi
  fi
fi

# Check if task definition file exists
if [ ! -f "$TASK_DEF_FILE" ]; then
  echo -e "${RED}❌ Task definition file not found: ecs-task-definition.json${NC}"
  echo ""
  echo "   Please run this script from the priceguard/server directory, or"
  echo "   ensure ecs-task-definition.json is in the current directory."
  exit 1
fi

echo -e "${GREEN}✅ Found task definition: $TASK_DEF_FILE${NC}"
echo ""

echo -e "${YELLOW}1️⃣  Updating task definition SSL configuration...${NC}"

# Create a temporary Python script to update the task definition
export TASK_DEF_FILE_PATH="$TASK_DEF_FILE"
python3 << 'PYTHON_SCRIPT'
import json
import sys
import os

task_def_file = os.environ.get('TASK_DEF_FILE_PATH')
if not task_def_file:
    print("❌ TASK_DEF_FILE_PATH environment variable not set", file=sys.stderr)
    sys.exit(1)

try:
    with open(task_def_file, 'r') as f:
        task_def = json.load(f)
    
    # Find and update PGSSLMODE
    updated = False
    for container in task_def.get('containerDefinitions', []):
        for env in container.get('environment', []):
            if env.get('name') == 'PGSSLMODE':
                old_value = env.get('value')
                # Change from verify-full to require (uses SSL but doesn't verify cert)
                env['value'] = 'require'
                print(f"✅ Updated PGSSLMODE: {old_value} -> require", file=sys.stderr)
                updated = True
                break
    
    if not updated:
        print("⚠️  PGSSLMODE not found in task definition", file=sys.stderr)
        # Add it if missing
        for container in task_def.get('containerDefinitions', []):
            container.setdefault('environment', []).append({
                'name': 'PGSSLMODE',
                'value': 'require'
            })
            print("✅ Added PGSSLMODE=require", file=sys.stderr)
            updated = True
            break
    
    # Write updated task definition
    with open(task_def_file, 'w') as f:
        json.dump(task_def, f, indent=2)
    
    if updated:
        print("✅ Task definition updated successfully", file=sys.stderr)
    else:
        print("⚠️  No changes made", file=sys.stderr)
        sys.exit(1)

except Exception as e:
    print(f"❌ Error updating task definition: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_SCRIPT

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to update task definition${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}2️⃣  Registering updated task definition...${NC}"

# Register the updated task definition
TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json file://$TASK_DEF_FILE \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text 2>&1)

if [ $? -eq 0 ] && [ -n "$TASK_DEF_ARN" ] && [ "$TASK_DEF_ARN" != "None" ]; then
  echo -e "${GREEN}✅ Task definition registered: $TASK_DEF_ARN${NC}"
else
  echo -e "${RED}❌ Failed to register task definition${NC}"
  echo "$TASK_DEF_ARN"
  exit 1
fi

echo ""
echo -e "${YELLOW}3️⃣  Updating ECS service to use new task definition...${NC}"

# Get cluster and service name
CLUSTER_NAME="priceguard-cluster"
SERVICE_NAME="priceguard-server"

# Update the service
UPDATE_OUTPUT=$(aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $TASK_DEF_ARN \
  --region $AWS_REGION \
  --query 'service.serviceName' \
  --output text 2>&1)

if [ $? -eq 0 ] && [ -n "$UPDATE_OUTPUT" ]; then
  echo -e "${GREEN}✅ Service update initiated${NC}"
  echo ""
  echo -e "${YELLOW}⏳ Waiting for service to stabilize (this may take a few minutes)...${NC}"
  
  # Wait for service to stabilize (with timeout)
  aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $AWS_REGION 2>/dev/null || echo -e "${YELLOW}⚠️  Service update in progress (check status manually)${NC}"
  
  echo ""
  echo -e "${GREEN}🎉 SSL Configuration Updated!${NC}"
  echo ""
  echo -e "${BLUE}📋 What Changed:${NC}"
  echo "   - PGSSLMODE changed from 'verify-full' to 'require'"
  echo "   - This uses SSL encryption but doesn't verify the certificate"
  echo "   - This is less secure but will work immediately"
  echo ""
  echo -e "${YELLOW}⚠️  Note: For production, you should:${NC}"
  echo "   1. Ensure rds-ca-bundle.pem is in your Docker image"
  echo "   2. Change PGSSLMODE back to 'verify-full'"
  echo "   3. Redeploy with the certificate included"
  echo ""
  echo -e "${BLUE}🔍 Check service status:${NC}"
  echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION"
  echo ""
else
  echo -e "${RED}❌ Failed to update service${NC}"
  echo "$UPDATE_OUTPUT"
  exit 1
fi

