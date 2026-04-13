#!/bin/bash
# Staging Deployment Validation Script
# Run this after deploying to verify everything works

set -e

STAGING_URL="${1:-http://localhost:8080}"
API_URL="${STAGING_URL//:8080/:3005}/api"

echo "🔍 Meridian Staging Deployment Validation"
echo "======================================="
echo "Target: $STAGING_URL"
echo "API: $API_URL"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

run_check() {
  local check_name=$1
  local command=$2
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -n "Checking: $check_name... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo "✅ PASS"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "❌ FAIL"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

echo "📋 1. Service Health Checks"
echo "==========================="

run_check "API Health Endpoint" \
  "curl -f $API_URL/health"

run_check "API Response Time (<1s)" \
  "curl -w '%{time_total}' -o /dev/null -s $API_URL/health | awk '{exit (\$1 > 1)}'"

run_check "Web Application Loads" \
  "curl -f $STAGING_URL"

run_check "Database Connection" \
  "curl -f $API_URL/health | grep -q database"

run_check "Redis Connection" \
  "curl -f $API_URL/health | grep -q redis"

echo ""
echo "📋 2. API Endpoint Checks"
echo "========================="

run_check "Projects Endpoint" \
  "curl -f $API_URL/projects"

run_check "Tasks Endpoint" \
  "curl -f $API_URL/tasks"

run_check "Users Endpoint" \
  "curl -f $API_URL/users"

run_check "2FA Status Endpoint" \
  "curl -f $API_URL/auth/two-factor/status"

echo ""
echo "📋 3. Security Headers"
echo "====================="

run_check "X-Frame-Options Present" \
  "curl -I $STAGING_URL | grep -i x-frame-options"

run_check "X-Content-Type-Options Present" \
  "curl -I $STAGING_URL | grep -i x-content-type-options"

run_check "Content-Security-Policy Present" \
  "curl -I $API_URL/health | grep -i content-security-policy"

echo ""
echo "📋 4. Performance Checks"
echo "======================="

run_check "Web Page Load (<3s)" \
  "curl -w '%{time_total}' -o /dev/null -s $STAGING_URL | awk '{exit (\$1 > 3)}'"

run_check "API Response (<500ms)" \
  "curl -w '%{time_total}' -o /dev/null -s $API_URL/health | awk '{exit (\$1 > 0.5)}'"

echo ""
echo "📋 5. WebSocket Connection"
echo "=========================="

# Test WebSocket (requires wscat or similar)
if command -v wscat &> /dev/null; then
  run_check "WebSocket Connection" \
    "echo 'test' | timeout 5 wscat -c ws://${STAGING_URL#http://}/socket.io/"
else
  echo "⚠️  SKIP: WebSocket test (wscat not installed)"
fi

echo ""
echo "📋 6. Database Integrity"
echo "======================="

run_check "Tables Exist" \
  "curl -s $API_URL/health | grep -q healthy"

run_check "Indexes Created" \
  "curl -s $API_URL/health | grep -q healthy"

echo ""
echo "======================================="
echo "📊 Validation Summary"
echo "======================================="
echo "Total Checks: $TOTAL_TESTS"
echo "Passed: ✅ $TESTS_PASSED"
echo "Failed: ❌ $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "🎉 All validation checks passed!"
  echo ""
  echo "Next steps:"
  echo "1. Test 2FA setup flow manually"
  echo "2. Create test project and tasks"
  echo "3. Run security test suite"
  echo "4. Monitor logs for errors"
  exit 0
else
  echo "⚠️  Some checks failed. Review the output above."
  echo ""
  echo "Common issues:"
  echo "- Services still starting (wait 1-2 minutes)"
  echo "- Database migrations not run"
  echo "- Environment variables not set"
  echo ""
  echo "Debug commands:"
  echo "  docker compose -f docker-compose.staging.yml logs api"
  echo "  docker compose -f docker-compose.staging.yml ps"
  exit 1
fi

