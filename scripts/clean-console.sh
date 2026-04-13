#!/bin/bash

# Script to replace console statements with proper logger
# Run from project root: ./scripts/clean-console.sh

echo "🧹 Starting console.log cleanup..."

cd apps/api/src

# Backup before making changes
echo "📦 Creating backup of src directory..."
tar -czf "../../api-src-backup-$(date +%Y%m%d-%H%M%S).tar.gz" .

# Count before
BEFORE_LOG=$(grep -r "console\.log(" . --include="*.ts" | wc -l)
BEFORE_ERROR=$(grep -r "console\.error(" . --include="*.ts" | wc -l)
BEFORE_WARN=$(grep -r "console\.warn(" . --include="*.ts" | wc -l)

echo "📊 Before: $BEFORE_LOG console.log, $BEFORE_ERROR console.error, $BEFORE_WARN console.warn"

# Replace console.log with logger.debug
find . -name "*.ts" -type f -exec sed -i.bak 's/console\.log(/logger.debug(/g' {} +

# Replace console.error with logger.error  
find . -name "*.ts" -type f -exec sed -i.bak 's/console\.error(/logger.error(/g' {} +

# Replace console.warn with logger.warn
find . -name "*.ts" -type f -exec sed -i.bak 's/console\.warn(/logger.warn(/g' {} +

# Remove backup files
find . -name "*.bak" -delete

# Count after
AFTER_LOG=$(grep -r "console\.log(" . --include="*.ts" | wc -l)
AFTER_ERROR=$(grep -r "console\.error(" . --include="*.ts" | wc -l)
AFTER_WARN=$(grep -r "console\.warn(" . --include="*.ts" | wc -l)

echo "📊 After: $AFTER_LOG console.log, $AFTER_ERROR console.error, $AFTER_WARN console.warn"

REPLACED=$((BEFORE_LOG + BEFORE_ERROR + BEFORE_WARN - AFTER_LOG - AFTER_ERROR - AFTER_WARN))

echo "✅ Replaced $REPLACED console statements with logger"
echo ""
echo "⚠️  WARNING: Review changes before committing!"
echo "   Some console statements might be intentional (e.g., in tests)"
echo "   Restore backup if needed: tar -xzf ../../api-src-backup-*.tar.gz"
echo ""
echo "📝 Next steps:"
echo "   1. Review changes: git diff apps/api/src"
echo "   2. Run tests: npm test"
echo "   3. Check TypeScript: npm run lint"
echo "   4. Commit: git add . && git commit -m 'refactor: replace console with logger'"

