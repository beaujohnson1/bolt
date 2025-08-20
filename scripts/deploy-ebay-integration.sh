#!/bin/bash

# eBay API Integration Deployment Script
# Purpose: Deploy hendt/ebay-api integration to production

set -e

echo "🚀 Starting eBay API Integration Deployment"
echo "=========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Step 1: Check prerequisites
echo ""
echo "Step 1: Checking prerequisites..."
echo "---------------------------------"

if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi
print_status "Node.js installed"

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi
print_status "npm installed"

if ! command_exists netlify; then
    print_warning "Netlify CLI not installed. Installing..."
    npm install -g netlify-cli
fi
print_status "Netlify CLI ready"

# Step 2: Check environment variables
echo ""
echo "Step 2: Checking environment variables..."
echo "-----------------------------------------"

REQUIRED_VARS=(
    "EBAY_APP_ID"
    "EBAY_CERT_ID"
    "EBAY_DEV_ID"
    "EBAY_RU_NAME"
    "ENCRYPTION_KEY"
    "SUPABASE_URL"
    "SUPABASE_SERVICE_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=($var)
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please set these in your .env file or Netlify dashboard"
    exit 1
fi
print_status "All required environment variables set"

# Step 3: Run tests
echo ""
echo "Step 3: Running tests..."
echo "------------------------"

if npm test 2>/dev/null; then
    print_status "All tests passed"
else
    print_warning "Some tests failed. Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 4: Build the application
echo ""
echo "Step 4: Building application..."
echo "--------------------------------"

npm run build
if [ $? -eq 0 ]; then
    print_status "Build successful"
else
    print_error "Build failed"
    exit 1
fi

# Step 5: Run database migrations
echo ""
echo "Step 5: Database migrations..."
echo "-------------------------------"

print_warning "Please run the following SQL migration in your Supabase dashboard:"
echo ""
echo "supabase/migrations/20250820_ebay_api_schema.sql"
echo ""
echo "Have you run the migration? (y/n)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    print_error "Please run the migration before continuing"
    exit 1
fi
print_status "Database migration confirmed"

# Step 6: Deploy to Netlify
echo ""
echo "Step 6: Deploying to Netlify..."
echo "--------------------------------"

# Check if we're in production or staging
echo "Deploy to production or staging? (p/s)"
read -r env_choice

if [[ "$env_choice" =~ ^[Pp]$ ]]; then
    echo "Deploying to PRODUCTION..."
    netlify deploy --prod
    DEPLOY_URL="https://easyflip.ai"
else
    echo "Deploying to staging..."
    DEPLOY_RESULT=$(netlify deploy)
    DEPLOY_URL=$(echo "$DEPLOY_RESULT" | grep -oP 'Website URL:\s+\K.*')
fi

if [ $? -eq 0 ]; then
    print_status "Deployment successful"
    echo ""
    echo "🎉 Deployment URL: $DEPLOY_URL"
else
    print_error "Deployment failed"
    exit 1
fi

# Step 7: Verify deployment
echo ""
echo "Step 7: Verifying deployment..."
echo "--------------------------------"

# Test OAuth endpoint
OAUTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/.netlify/functions/ebay-api-oauth/health")
if [ "$OAUTH_TEST" = "200" ]; then
    print_status "OAuth endpoint responding"
else
    print_warning "OAuth endpoint not responding (HTTP $OAUTH_TEST)"
fi

# Step 8: Post-deployment tasks
echo ""
echo "Step 8: Post-deployment checklist..."
echo "-------------------------------------"

echo "Please complete the following tasks:"
echo ""
echo "[ ] Update eBay Application Settings:"
echo "    - Set OAuth Redirect URI to: $DEPLOY_URL/.netlify/functions/ebay-api-oauth/callback"
echo "    - Verify RuName matches EBAY_RU_NAME environment variable"
echo ""
echo "[ ] Test OAuth Flow:"
echo "    1. Navigate to $DEPLOY_URL"
echo "    2. Click 'Connect eBay Account'"
echo "    3. Complete OAuth authorization"
echo "    4. Verify tokens are stored"
echo ""
echo "[ ] Test Listing Creation:"
echo "    1. Upload test images"
echo "    2. Verify AI processing"
echo "    3. Create test listing"
echo "    4. Confirm listing appears on eBay"
echo ""
echo "[ ] Monitor for errors:"
echo "    - Check Netlify Functions logs"
echo "    - Monitor Supabase logs"
echo "    - Review any error reports"

# Step 9: Generate deployment report
echo ""
echo "Step 9: Generating deployment report..."
echo "----------------------------------------"

REPORT_FILE="deployment-report-$(date +%Y%m%d-%H%M%S).txt"
{
    echo "eBay API Integration Deployment Report"
    echo "======================================="
    echo ""
    echo "Date: $(date)"
    echo "Environment: $([[ "$env_choice" =~ ^[Pp]$ ]] && echo "Production" || echo "Staging")"
    echo "URL: $DEPLOY_URL"
    echo ""
    echo "Components Deployed:"
    echo "- hendt/ebay-api OAuth implementation"
    echo "- Token encryption service (AES-256-GCM)"
    echo "- Rate limiting with circuit breaker"
    echo "- AI to eBay listing pipeline"
    echo ""
    echo "Database Changes:"
    echo "- user_oauth_tokens table"
    echo "- oauth_states table"
    echo "- ebay_listings table"
    echo "- audit_logs table"
    echo "- rate_limit_tracking table"
    echo "- listing_metrics table"
    echo ""
    echo "API Endpoints:"
    echo "- GET  /.netlify/functions/ebay-api-oauth/auth-url"
    echo "- POST /.netlify/functions/ebay-api-oauth/callback"
    echo "- POST /.netlify/functions/ebay-api-oauth/refresh"
    echo "- GET  /.netlify/functions/ebay-api-oauth/status"
    echo ""
    echo "Next Steps:"
    echo "1. Test OAuth flow end-to-end"
    echo "2. Verify token encryption"
    echo "3. Test listing creation"
    echo "4. Monitor rate limits"
    echo "5. Check error logs"
} > "$REPORT_FILE"

print_status "Deployment report saved to: $REPORT_FILE"

# Final summary
echo ""
echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
echo "Your hendt/ebay-api integration is now live at:"
echo "$DEPLOY_URL"
echo ""
echo "Remember to:"
echo "1. Test the OAuth flow thoroughly"
echo "2. Monitor the first few listing creations"
echo "3. Check rate limit status regularly"
echo "4. Review audit logs for any issues"
echo ""
echo "For support, check:"
echo "- Documentation: /docs/EBAY_API_MIGRATION.md"
echo "- Logs: Netlify Functions dashboard"
echo "- Database: Supabase dashboard"

exit 0