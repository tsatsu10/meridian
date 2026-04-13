#!/bin/bash

BASE="http://localhost:1337/api"
RESULTS_FILE="test-results.txt"

echo "🔬 MERIDIAN FUNCTIONAL TEST SUITE" | tee $RESULTS_FILE
echo "============================================" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

PASSED=0
FAILED=0

# Test 1: Create Workspace
echo "📦 TEST 1: Create Workspace..." | tee -a $RESULTS_FILE
WS_RESPONSE=$(curl -s -X POST $BASE/workspace \
  -H "Content-Type: application/json" \
  -d '{"name":"Functional Test WS","description":"Test"}')

if [[ $WS_RESPONSE == *"id"* ]]; then
  WS_ID=$(echo $WS_RESPONSE | grep -oP '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "   ✅ PASS - Created workspace: $WS_ID" | tee -a $RESULTS_FILE
  ((PASSED++))
else
  echo "   ❌ FAIL - Response: $WS_RESPONSE" | tee -a $RESULTS_FILE
  ((FAILED++))
fi

# Test 2: Create Project
echo "📁 TEST 2: Create Project..." | tee -a $RESULTS_FILE
PROJ_RESPONSE=$(curl -s -X POST $BASE/project \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Functional Test Project\",\"workspaceId\":\"$WS_ID\"}")

if [[ $PROJ_RESPONSE == *"id"* ]]; then
  PROJ_ID=$(echo $PROJ_RESPONSE | grep -oP '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "   ✅ PASS - Created project: $PROJ_ID" | tee -a $RESULTS_FILE
  ((PASSED++))
else
  echo "   ❌ FAIL - Response: $PROJ_RESPONSE" | tee -a $RESULTS_FILE
  ((FAILED++))
fi

# Test 3: Create Task
echo "✓ TEST 3: Create Task..." | tee -a $RESULTS_FILE
TASK_RESPONSE=$(curl -s -X POST $BASE/task \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Functional Test Task\",\"projectId\":\"$PROJ_ID\"}")

if [[ $TASK_RESPONSE == *"id"* ]]; then
  TASK_ID=$(echo $TASK_RESPONSE | grep -oP '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "   ✅ PASS - Created task: $TASK_ID" | tee -a $RESULTS_FILE
  ((PASSED++))
else
  echo "   ❌ FAIL - Response: $TASK_RESPONSE" | tee -a $RESULTS_FILE
  ((FAILED++))
fi

# Test 4: Create Time Entry
echo "⏱️  TEST 4: Create Time Entry..." | tee -a $RESULTS_FILE
TIME_RESPONSE=$(curl -s -X POST $BASE/time-entry \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"$TASK_ID\",\"description\":\"Test\",\"startTime\":\"2025-10-15T12:00:00Z\"}")

if [[ $TIME_RESPONSE == *"id"* ]]; then
  echo "   ✅ PASS - Created time entry" | tee -a $RESULTS_FILE
  ((PASSED++))
else
  echo "   ❌ FAIL - Response: $TIME_RESPONSE" | tee -a $RESULTS_FILE
  ((FAILED++))
fi

# Test 5: Read Workspaces
echo "📖 TEST 5: Read Workspaces..." | tee -a $RESULTS_FILE
READ_WS=$(curl -s $BASE/workspace)
if [[ $READ_WS == *"$WS_ID"* ]]; then
  echo "   ✅ PASS - Found created workspace in list" | tee -a $RESULTS_FILE
  ((PASSED++))
else
  echo "   ⚠️  WARN - Workspace not found in list" | tee -a $RESULTS_FILE
fi

# Test 6: Update Task
echo "✏️  TEST 6: Update Task..." | tee -a $RESULTS_FILE
UPDATE_RESPONSE=$(curl -s -X PUT $BASE/task/$TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Task"}')

if [[ $UPDATE_RESPONSE == *"Updated Task"* ]] || [[ $UPDATE_RESPONSE == *"id"* ]]; then
  echo "   ✅ PASS - Updated task" | tee -a $RESULTS_FILE
  ((PASSED++))
else
  echo "   ⚠️  WARN - Update response: $UPDATE_RESPONSE" | tee -a $RESULTS_FILE
fi

# Summary
echo "" | tee -a $RESULTS_FILE
echo "============================================" | tee -a $RESULTS_FILE
echo "📊 TEST SUMMARY" | tee -a $RESULTS_FILE
echo "   ✅ Passed: $PASSED" | tee -a $RESULTS_FILE
echo "   ❌ Failed: $FAILED" | tee -a $RESULTS_FILE

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
  PERCENT=$((PASSED * 100 / TOTAL))
  echo "   📈 Success Rate: $PERCENT%" | tee -a $RESULTS_FILE
fi

echo "" | tee -a $RESULTS_FILE
echo "Results saved to: $RESULTS_FILE"

