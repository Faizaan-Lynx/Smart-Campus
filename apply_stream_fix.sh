#!/bin/bash

# Smart Campus Stream Fix - Quick Implementation Script
# This script automates the process of applying stream display fixes

set -e

echo "=================================================="
echo "Smart Campus Stream Display Fix"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get camera count from user
read -p "How many cameras do you have in your system? " CAMERA_COUNT

# Calculate recommended FEED_WORKERS
if [ "$CAMERA_COUNT" -le 10 ]; then
    RECOMMENDED_WORKERS=1
elif [ "$CAMERA_COUNT" -le 20 ]; then
    RECOMMENDED_WORKERS=2
elif [ "$CAMERA_COUNT" -le 30 ]; then
    RECOMMENDED_WORKERS=3
elif [ "$CAMERA_COUNT" -le 50 ]; then
    RECOMMENDED_WORKERS=4
else
    RECOMMENDED_WORKERS=$(( ($CAMERA_COUNT + 9) / 10 ))
fi

echo ""
echo -e "${BLUE}Camera Count: $CAMERA_COUNT${NC}"
echo -e "${GREEN}Recommended FEED_WORKERS: $RECOMMENDED_WORKERS${NC}"
echo ""

# Ask if user wants to proceed
read -p "Do you want to apply the fix with $RECOMMENDED_WORKERS feed workers? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found in current directory${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 1: Backing up .env file...${NC}"
cp .env .env.backup
echo -e "${GREEN}✓ Backup created: .env.backup${NC}"

echo ""
echo -e "${YELLOW}Step 2: Updating FEED_WORKERS configuration...${NC}"

# Update FEED_WORKERS in .env
if grep -q "^FEED_WORKERS=" .env; then
    # Use sed to replace the value
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/^FEED_WORKERS=.*/FEED_WORKERS=$RECOMMENDED_WORKERS/" .env
    else
        # Linux
        sed -i "s/^FEED_WORKERS=.*/FEED_WORKERS=$RECOMMENDED_WORKERS/" .env
    fi
    echo -e "${GREEN}✓ Updated FEED_WORKERS to $RECOMMENDED_WORKERS${NC}"
else
    echo "FEED_WORKERS=$RECOMMENDED_WORKERS" >> .env
    echo -e "${GREEN}✓ Added FEED_WORKERS=$RECOMMENDED_WORKERS${NC}"
fi

# Show current configuration
echo ""
echo -e "${YELLOW}Step 3: Current configuration:${NC}"
echo ""
echo "DATABASE_HOST: $(grep -oP '(?<=^DATABASE_HOST=)\S+' .env)"
echo "REDIS_URL: $(grep -oP '(?<=^REDIS_URL=)\S+' .env)"
echo "FEED_WORKERS: $(grep -oP '(?<=^FEED_WORKERS=)\S+' .env)"
echo "MODEL_WORKERS: $(grep -oP '(?<=^MODEL_WORKERS=)\S+' .env)"
echo "LICENSE_WORKERS: $(grep -oP '(?<=^LICENSE_WORKERS=)\S+' .env)"
echo ""

# Ask about deployment method
echo -e "${YELLOW}Step 4: Choose deployment method:${NC}"
echo "1) Docker Compose"
echo "2) Manual (local workers)"
echo "3) Skip (manual restart)"
read -p "Select option (1-3): " DEPLOY_METHOD

case $DEPLOY_METHOD in
    1)
        echo ""
        echo -e "${YELLOW}Restarting with Docker Compose...${NC}"
        if command -v docker-compose &> /dev/null; then
            echo "Bringing down services..."
            docker-compose down
            echo "Bringing up services..."
            docker-compose up -d
            echo -e "${GREEN}✓ Docker Compose restarted${NC}"
            sleep 5
        else
            echo -e "${RED}Docker Compose not found. Please restart manually.${NC}"
        fi
        ;;
    2)
        echo ""
        echo -e "${YELLOW}Restarting workers manually...${NC}"
        echo "Stopping existing workers..."
        pkill -f "celery -A core.celery.full_feed_worker" || true
        sleep 2
        echo "Starting new workers..."
        bash start_workers.sh 1 "$RECOMMENDED_WORKERS" 3
        echo -e "${GREEN}✓ Workers restarted${NC}"
        ;;
    3)
        echo -e "${YELLOW}Configuration updated. Please restart workers manually.${NC}"
        echo "Commands to run:"
        echo "  Docker: docker-compose down && docker-compose up -d"
        echo "  Manual: bash start_workers.sh 1 $RECOMMENDED_WORKERS 3"
        ;;
esac

echo ""
echo -e "${YELLOW}Step 5: Waiting for services to stabilize...${NC}"
sleep 10

# Provide next steps
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Fix Applied Successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start all camera feeds (via API):"
echo "   curl -X GET 'http://localhost:8000/intrusions/start_all_feed_workers' \\"
echo "     -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'"
echo ""
echo "2. Check feed health status:"
echo "   curl -X GET 'http://localhost:8000/intrusions/feed_health_check' \\"
echo "     -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'"
echo ""
echo "3. Enable auto-recovery (optional):"
echo "   Add this to crontab to check every minute:"
echo "   */1 * * * * curl -X POST 'http://localhost:8000/intrusions/restart_failed_feeds' \\"
echo "     -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'"
echo ""
echo -e "${YELLOW}Configuration saved to: .env${NC}"
echo -e "${YELLOW}Backup saved to: .env.backup${NC}"
echo ""
echo "For detailed information, see: STREAM_FIX_GUIDE.md"
echo ""
