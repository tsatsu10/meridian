#!/bin/bash
# Manual Security Testing Scripts for Meridian
# Run against staging environment

BASE_URL="${STAGING_URL:-https://staging.meridian.app}"
API_URL="${BASE_URL}/api"
OUTPUT_DIR="./security-test-results/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$OUTPUT_DIR"

echo "🔒 Meridian Security Testing Suite"
echo "================================"
echo "Target: $BASE_URL"
echo "Output: $OUTPUT_DIR"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
  local test_name=$1
  local command=$2
  local expected_pattern=$3
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -n "Testing: $test_name... "
  
  result=$(eval "$command" 2>&1)
  
  if echo "$result" | grep -q "$expected_pattern"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "$result" > "$OUTPUT_DIR/${test_name// /_}.pass.txt"
  else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo "$result" > "$OUTPUT_DIR/${test_name// /_}.fail.txt"
  fi
}

echo "📋 1. Authentication & Authorization Tests"
echo "=========================================="

# Test 1: SQL Injection in Login
run_test "SQL Injection - Login" \
  "curl -s -X POST '$API_URL/auth/signin' -H 'Content-Type: application/json' -d '{\"email\":\"admin@meridian.app\",\"password\":\"\\\" OR \\\"1\\\"=\\\"1\"}'" \
  "error"

# Test 2: No Auth Access to Protected Endpoint
run_test "No Auth - Protected Endpoint" \
  "curl -s -X GET '$API_URL/projects' -w '%{http_code}'" \
  "401"

# Test 3: Expired Token
run_test "Expired Token" \
  "curl -s -X GET '$API_URL/user/me' -H 'Authorization: Bearer expired.token.here' -w '%{http_code}'" \
  "401"

# Test 4: Manipulated JWT (alg: none)
run_test "JWT Manipulation" \
  "curl -s -X GET '$API_URL/user/me' -H 'Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhZG1pbiJ9.' -w '%{http_code}'" \
  "401"

echo ""
echo "📋 2. Input Validation Tests"
echo "============================="

# Test 5: XSS in Task Title
run_test "XSS - Task Title" \
  "curl -s -X POST '$API_URL/tasks' -H 'Content-Type: application/json' -H 'Authorization: Bearer \$VALID_TOKEN' -d '{\"title\":\"<script>alert(\\\"XSS\\\")</script>\",\"projectId\":\"proj-1\"}'" \
  "error\\|sanitized"

# Test 6: Path Traversal in File Download
run_test "Path Traversal - File" \
  "curl -s -X GET '$API_URL/files/../../etc/passwd' -w '%{http_code}'" \
  "400\\|403\\|404"

# Test 7: Large Payload (>10MB)
run_test "Large Payload" \
  "curl -s -X POST '$API_URL/tasks' -H 'Content-Type: application/json' -d '{\"title\":\"'$(head -c 11000000 </dev/urandom | base64)'\"}' -w '%{http_code}'" \
  "413\\|400"

echo ""
echo "📋 3. CSRF Tests"
echo "================"

# Test 8: CSRF on Task Creation (no CSRF token)
run_test "CSRF - No Token" \
  "curl -s -X POST '$API_URL/tasks' -H 'Content-Type: application/json' -H 'Cookie: session=valid_session' -d '{\"title\":\"Test\",\"projectId\":\"proj-1\"}' -w '%{http_code}'" \
  "403\\|401"

echo ""
echo "📋 4. Rate Limiting Tests"
echo "========================="

# Test 9: Rate Limit on Login (5 attempts in 1 second)
echo -n "Testing: Rate Limit - Login... "
rate_limit_passed=0
for i in {1..10}; do
  response=$(curl -s -X POST "$API_URL/auth/signin" \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w '%{http_code}' -o /dev/null)
  
  if [ "$response" = "429" ]; then
    rate_limit_passed=1
    break
  fi
done

if [ $rate_limit_passed -eq 1 ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}✗ FAIL (no rate limit detected)${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
echo "📋 5. Security Headers Tests"
echo "==========================="

# Test 10: Security Headers Present
headers=$(curl -s -I "$BASE_URL" | tee "$OUTPUT_DIR/security_headers.txt")

check_header() {
  local header_name=$1
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -n "Checking: $header_name... "
  if echo "$headers" | grep -qi "$header_name"; then
    echo -e "${GREEN}✓ Present${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗ Missing${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

check_header "X-Frame-Options"
check_header "X-Content-Type-Options"
check_header "Content-Security-Policy"
check_header "Strict-Transport-Security"
check_header "X-XSS-Protection"

echo ""
echo "📋 6. HTTPS/TLS Tests"
echo "===================="

# Test 11: HTTP to HTTPS Redirect
run_test "HTTP Redirect" \
  "curl -s -I 'http://staging.meridian.app' -w '%{http_code}'" \
  "301\\|302\\|308"

# Test 12: HSTS Header
run_test "HSTS Header" \
  "curl -s -I '$BASE_URL' | grep -i strict-transport-security" \
  "max-age"

echo ""
echo "📋 7. File Upload Tests"
echo "======================="

# Test 13: Executable File Upload
run_test "Executable Upload" \
  "curl -s -X POST '$API_URL/upload' -F 'file=@/dev/null;filename=malware.exe' -w '%{http_code}'" \
  "400\\|415"

# Test 14: Oversized File Upload (>10MB)
run_test "Oversized File" \
  "curl -s -X POST '$API_URL/upload' -F 'file=@<(head -c 11000000 </dev/urandom);filename=large.jpg' -w '%{http_code}'" \
  "413\\|400"

echo ""
echo "📋 8. CORS Tests"
echo "================"

# Test 15: CORS from Unauthorized Origin
run_test "CORS - Evil Origin" \
  "curl -s -H 'Origin: https://evil.com' '$API_URL/user/me' -I -w '%{http_code}'" \
  "403\\|No 'Access-Control-Allow-Origin'"

echo ""
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ All security tests passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Review results in $OUTPUT_DIR${NC}"
  exit 1
fi

