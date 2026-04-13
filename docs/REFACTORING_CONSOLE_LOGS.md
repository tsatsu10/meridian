# 🔧 Refactoring Console Logs to Logger

**Status**: 🟡 **HIGH PRIORITY**  
**Estimated Time**: 2-4 hours  
**Files Affected**: 272 TypeScript files  
**Console Statements**: 1,664 total

---

## 📊 **Current Status**

Found **1,664 console statements** across **272 files** in `apps/api/src`:
- `console.log`: ~1,400 instances
- `console.error`: ~200 instances  
- `console.warn`: ~50 instances
- `console.info`: ~14 instances

---

## 🎯 **Goal**

Replace all `console.*` statements with the proper `logger` instance from `utils/logger.ts` to:
- Enable proper log levels (debug, info, warn, error)
- Support structured logging
- Enable log aggregation
- Improve production observability

---

## 🛠️ **Solution Options**

### **Option 1: Automated Script (Recommended)**

#### **PowerShell (Windows)**
```powershell
# From project root
.\scripts\clean-console.ps1
```

#### **Node.js (Cross-platform)**
```bash
# From project root (requires Node.js in PATH)
node scripts/clean-console.cjs
```

#### **Bash (Linux/macOS)**
```bash
# From project root
./scripts/clean-console.sh
```

### **Option 2: Manual Replacement**

1. **Find and Replace** (per file):
   - `console.log(` → `logger.debug(`
   - `console.error(` → `logger.error(`
   - `console.warn(` → `logger.warn(`
   - `console.info(` → `logger.info(`

2. **Add Logger Import** (if missing):
   ```typescript
   import logger from './utils/logger';           // Same directory
   import logger from '../utils/logger';          // One level up
   import logger from '../../utils/logger';       // Two levels up
   import logger from '../../../utils/logger';    // Three levels up
   ```

---

## 📋 **Step-by-Step Process**

### **1. Backup First** ✅
Scripts automatically create a backup, but you can also:
```bash
# Create manual backup
cd apps/api
cp -r src src-backup-manual
```

### **2. Run Script**
Choose your platform's script above.

### **3. Review Changes**
```bash
# See all changes
git diff apps/api/src

# Review specific files
git diff apps/api/src/index.ts
```

### **4. Test Everything**
```bash
# Type check
npm run lint

# Run tests
npm run test

# Build
npm run build
```

### **5. Fix Any Issues**

**Common Issues**:

- **Missing logger import**: Script should handle this, but verify:
  ```typescript
  import logger from './utils/logger';
  ```

- **Test files**: May intentionally use console for output:
  ```typescript
  // Keep console in test files if needed
  // Or replace with test-specific logging
  ```

- **Startup logs**: Some console.log at startup are intentional:
  ```typescript
  // apps/api/src/index.ts line 1
  logger.info('🚀 Starting Meridian API server...');
  ```

### **6. Commit**
```bash
git add apps/api/src
git commit -m "refactor: replace console statements with logger

- Replaced 1,664 console.log/error/warn/info with logger equivalents
- Added logger imports where needed
- Improves structured logging and production observability"
```

---

## 🔍 **Manual Verification Checklist**

After running the script:

- [ ] All TypeScript files compile (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors related to logger
- [ ] Logger imports are correct (relative paths)
- [ ] Test files still work (if they use console intentionally)

---

## ⚠️ **Special Cases**

### **1. Test Files**
Test files may intentionally use `console.log` for test output:
```typescript
// In test files, you might want to keep console or use a test logger
describe('something', () => {
  it('should work', () => {
    console.log('Test output'); // Maybe keep this?
  });
});
```

### **2. Startup Messages**
Critical startup messages might be better as `logger.info`:
```typescript
// Before
console.log('🚀 Starting Meridian API server...');

// After  
logger.info('🚀 Starting Meridian API server...');
```

### **3. Error Logging**
`console.error` with stack traces should become `logger.error`:
```typescript
// Before
console.error('Error:', error);

// After
logger.error('Error occurred', { error: error.message, stack: error.stack });
```

---

## 📊 **Expected Results**

### **Before**
```typescript
console.log('Processing request:', requestId);
console.error('Failed to connect:', error);
console.warn('Rate limit approaching');
```

### **After**
```typescript
import logger from './utils/logger';

logger.debug('Processing request:', { requestId });
logger.error('Failed to connect', { error: error.message });
logger.warn('Rate limit approaching');
```

---

## 🎯 **Benefits**

✅ **Structured Logging**: All logs go through centralized logger  
✅ **Log Levels**: Proper debug/info/warn/error levels  
✅ **Production Ready**: Logs can be aggregated and analyzed  
✅ **Performance**: Logger can be configured to disable debug in production  
✅ **Consistency**: All logging follows same patterns  

---

## 🚨 **Troubleshooting**

### **Script Fails on Windows**
- Use PowerShell script (`clean-console.ps1`)
- Ensure you have execution policy set:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### **Node.js Not Found**
- Install Node.js or use PowerShell script instead
- Or run script from project root with full path

### **TypeScript Errors After Replacement**
- Verify logger import path is correct
- Check that `utils/logger.ts` exports default logger
- Run `npm run lint` to see specific errors

### **Backup Restore**
```bash
# Restore from backup (PowerShell)
Remove-Item apps\api\src -Recurse -Force
Copy-Item apps\api\src-backup-* apps\api\src -Recurse

# Or restore from manual backup
cd apps/api
rm -rf src
cp -r src-backup-manual src
```

---

## 📝 **Post-Refactoring Checklist**

After completing the refactoring:

- [ ] ✅ All console statements replaced
- [ ] ✅ Logger imports added correctly
- [ ] ✅ TypeScript compiles without errors
- [ ] ✅ Tests pass
- [ ] ✅ Build succeeds
- [ ] ✅ Review git diff for any issues
- [ ] ✅ Commit changes
- [ ] ✅ Update documentation if needed

---

## 🔗 **Related Files**

- `apps/api/src/utils/logger.ts` - Logger implementation
- `apps/api/src/config/logging.ts` - Logging configuration
- `scripts/clean-console.js` - Node.js script
- `scripts/clean-console.ps1` - PowerShell script
- `scripts/clean-console.sh` - Bash script

---

**Status**: Ready to execute  
**Priority**: High (code quality)  
**Blocking**: No (non-critical for deployment)


