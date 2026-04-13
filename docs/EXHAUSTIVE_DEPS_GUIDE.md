# 🔧 React exhaustive-deps ESLint Rule Guide

**Task**: Enable React exhaustive-deps ESLint rule and fix dependency warnings  
**Priority**: 🔵 LOW  
**Estimated Time**: 2-3 hours  
**Risk Level**: LOW (improves code quality, prevents bugs)  
**Status**: 📋 **READY TO IMPLEMENT**

---

## 📊 **Current State**

### **ESLint Configuration**
The `react-hooks/exhaustive-deps` rule is currently **disabled or set to warning**.

### **Expected Issues**
Based on the task description, there are approximately **20 useEffect dependency warnings** in the codebase.

---

## 🎯 **Goals**

### **Primary Objectives**
✅ Enable `exhaustive-deps` rule as an error  
✅ Fix all dependency warnings  
✅ Prevent future dependency bugs  
✅ Improve component reliability  
✅ Document common patterns  

### **Success Criteria**
- [ ] ESLint rule enabled and set to "error"
- [ ] All `useEffect` hooks have correct dependencies
- [ ] No ESLint warnings or errors
- [ ] All tests pass after changes
- [ ] No infinite render loops introduced

---

## ⚙️ **Implementation Steps**

### **Phase 1: Enable the Rule** (5 minutes)

#### **1.1 Update ESLint Configuration**

**File**: `apps/web/.eslintrc.cjs` or `apps/web/.eslintrc.json`

```javascript
module.exports = {
  // ... existing config
  rules: {
    // ... existing rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error', // Change from 'warn' or 'off'
  },
}
```

#### **1.2 Run ESLint to Find All Issues**

```bash
cd apps/web
npm run lint 2>&1 | grep "exhaustive-deps" > exhaustive-deps-report.txt
```

This will create a report of all violations.

---

### **Phase 2: Categorize and Fix Issues** (2-3 hours)

#### **2.1 Find All useEffect Warnings**

```bash
# Count total warnings
npm run lint 2>&1 | grep -c "exhaustive-deps"

# List all files with warnings
npm run lint 2>&1 | grep "exhaustive-deps" | cut -d: -f1 | sort -u
```

#### **2.2 Common Patterns and Fixes**

##### **Pattern 1: Missing Dependencies**

**Problem**:
```typescript
// ❌ BAD
useEffect(() => {
  fetchData(userId);
}, []); // userId should be in deps
```

**Solution**:
```typescript
// ✅ GOOD
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

##### **Pattern 2: Function Dependencies**

**Problem**:
```typescript
// ❌ BAD
function MyComponent() {
  const fetchData = () => {
    // fetch logic
  };
  
  useEffect(() => {
    fetchData();
  }, []); // fetchData should be in deps
}
```

**Solution 1: useCallback**:
```typescript
// ✅ GOOD
function MyComponent() {
  const fetchData = useCallback(() => {
    // fetch logic
  }, []); // Add dependencies here if needed
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
}
```

**Solution 2: Move function inside useEffect**:
```typescript
// ✅ BETTER
function MyComponent() {
  useEffect(() => {
    const fetchData = () => {
      // fetch logic
    };
    fetchData();
  }, []); // No external dependencies
}
```

##### **Pattern 3: Object Dependencies**

**Problem**:
```typescript
// ❌ BAD
function MyComponent({ filters }) {
  useEffect(() => {
    fetchData(filters);
  }, [filters]); // Object reference changes every render
}
```

**Solution 1: useMemo for stable reference**:
```typescript
// ✅ GOOD
function MyComponent({ filters }) {
  const stableFilters = useMemo(() => filters, [
    filters.status,
    filters.priority,
    // list specific properties
  ]);
  
  useEffect(() => {
    fetchData(stableFilters);
  }, [stableFilters]);
}
```

**Solution 2: Destructure in dependency array**:
```typescript
// ✅ BETTER (if filters properties are primitives)
function MyComponent({ filters }) {
  useEffect(() => {
    fetchData(filters);
  }, [filters.status, filters.priority]); // Individual properties
}
```

##### **Pattern 4: Redux Selectors**

**Problem**:
```typescript
// ❌ BAD
function MyComponent() {
  const data = useSelector(state => state.data);
  
  useEffect(() => {
    processData(data);
  }, []); // data should be in deps
}
```

**Solution**:
```typescript
// ✅ GOOD
function MyComponent() {
  const data = useSelector(state => state.data);
  
  useEffect(() => {
    processData(data);
  }, [data]);
}
```

##### **Pattern 5: Intentional One-Time Effects**

**Problem**:
```typescript
// ❌ Will get warning
useEffect(() => {
  initializeApp(config);
}, []); // config not in deps but we only want to run once
```

**Solution 1: ESLint disable comment** (use sparingly):
```typescript
// ✅ OK (with good reason)
useEffect(() => {
  initializeApp(config);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Intentionally run once on mount
```

**Solution 2: useRef for stable reference**:
```typescript
// ✅ BETTER
const configRef = useRef(config);

useEffect(() => {
  initializeApp(configRef.current);
}, []); // No dependencies needed
```

**Solution 3: Split into multiple effects**:
```typescript
// ✅ BEST
// One-time initialization
useEffect(() => {
  initializeApp();
}, []);

// Reactive to config changes
useEffect(() => {
  updateConfig(config);
}, [config]);
```

##### **Pattern 6: Async Functions**

**Problem**:
```typescript
// ❌ BAD
useEffect(async () => {
  const data = await fetchData();
  setData(data);
}, []);
```

**Solution**:
```typescript
// ✅ GOOD
useEffect(() => {
  const fetchAndSetData = async () => {
    const data = await fetchData();
    setData(data);
  };
  
  fetchAndSetData();
}, []);
```

##### **Pattern 7: Event Handlers**

**Problem**:
```typescript
// ❌ BAD
function MyComponent({ onDataChange }) {
  useEffect(() => {
    const handleChange = (data) => {
      onDataChange(data);
    };
    
    subscribe(handleChange);
    return () => unsubscribe(handleChange);
  }, []); // onDataChange should be in deps
}
```

**Solution**:
```typescript
// ✅ GOOD
function MyComponent({ onDataChange }) {
  const handleChange = useCallback((data) => {
    onDataChange(data);
  }, [onDataChange]);
  
  useEffect(() => {
    subscribe(handleChange);
    return () => unsubscribe(handleChange);
  }, [handleChange]);
}
```

---

### **Phase 3: Testing** (30 minutes)

#### **3.1 Run ESLint**
```bash
npm run lint
# Should show 0 exhaustive-deps warnings
```

#### **3.2 Run Tests**
```bash
npm run test
# Ensure no tests break
```

#### **3.3 Check for Infinite Loops**

**Identify potential infinite loops**:
- Effects that update state they depend on
- Effects with object/array dependencies that recreate every render

**Test manually**:
1. Open components with changed `useEffect` hooks
2. Check browser console for warnings
3. Verify no infinite re-renders
4. Test component functionality

#### **3.4 Performance Check**

Use React DevTools Profiler:
1. Record component interactions
2. Look for excessive re-renders
3. Optimize if necessary with `useMemo`/`useCallback`

---

## 🔍 **Common Files to Check**

Based on typical patterns, check these files:

```bash
# State management components
apps/web/src/store/**/*.tsx

# Dashboard components
apps/web/src/pages/dashboard/**/*.tsx

# Complex forms
apps/web/src/components/**/forms/*.tsx

# WebSocket/real-time components
apps/web/src/components/realtime/**/*.tsx

# Data fetching hooks
apps/web/src/hooks/**/*.ts
```

---

## ⚠️ **Common Pitfalls**

### **1. Creating Infinite Loops**

**Problem**:
```typescript
// ❌ INFINITE LOOP
const [data, setData] = useState({});

useEffect(() => {
  setData({ ...data, newProp: value });
}, [data]); // Updates data, triggers effect, updates data...
```

**Solution**:
```typescript
// ✅ GOOD
useEffect(() => {
  setData(prev => ({ ...prev, newProp: value }));
}, [value]); // Only depend on value
```

### **2. Over-using eslint-disable**

**Problem**:
```typescript
// ❌ BAD
useEffect(() => {
  doSomething(prop1, prop2, prop3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**Solution**:
```typescript
// ✅ GOOD
useEffect(() => {
  doSomething(prop1, prop2, prop3);
}, [prop1, prop2, prop3]);
```

### **3. Not Using useCallback for Functions**

**Problem**:
```typescript
// ❌ BAD - New function every render
const handleClick = () => {
  doSomething();
};

useEffect(() => {
  element.addEventListener('click', handleClick);
  return () => element.removeEventListener('click', handleClick);
}, [handleClick]); // Runs every render!
```

**Solution**:
```typescript
// ✅ GOOD
const handleClick = useCallback(() => {
  doSomething();
}, []);

useEffect(() => {
  element.addEventListener('click', handleClick);
  return () => element.removeEventListener('click', handleClick);
}, [handleClick]); // Only runs when dependencies change
```

---

## 📋 **Checklist**

### **Pre-Implementation**
- [ ] Backup current code or create feature branch
- [ ] Run full test suite to establish baseline
- [ ] Document current ESLint config

### **Implementation**
- [ ] Enable `exhaustive-deps` rule
- [ ] Run ESLint to generate report
- [ ] Fix all warnings systematically
- [ ] Add `useCallback` where needed
- [ ] Add `useMemo` where needed
- [ ] Document intentional `eslint-disable` comments

### **Testing**
- [ ] Run ESLint - 0 warnings
- [ ] Run tests - all pass
- [ ] Manual testing - no infinite loops
- [ ] Performance check - no excessive re-renders
- [ ] Code review - patterns look correct

### **Cleanup**
- [ ] Remove debug code
- [ ] Update documentation
- [ ] Commit changes

---

## 🎯 **Expected Results**

### **Before**
```bash
$ npm run lint
⚠ 20 warnings (react-hooks/exhaustive-deps)
```

### **After**
```bash
$ npm run lint
✓ 0 errors, 0 warnings
```

---

## 📊 **Benefits**

### **Code Quality**
- ✅ Prevents stale closure bugs
- ✅ Ensures effects run when they should
- ✅ Makes component behavior predictable
- ✅ Easier to debug and maintain

### **Developer Experience**
- ✅ Clear dependency tracking
- ✅ Better IDE suggestions
- ✅ Fewer runtime bugs
- ✅ Consistent patterns across codebase

### **Performance**
- ✅ Fewer unnecessary re-renders (with proper `useCallback`/`useMemo`)
- ✅ More predictable performance
- ✅ Easier to optimize

---

## 🔄 **Rollback Plan**

If issues arise:

```javascript
// Temporarily set to 'warn'
module.exports = {
  rules: {
    'react-hooks/exhaustive-deps': 'warn', // Back to warning
  },
}
```

Then fix issues incrementally.

---

## 📚 **Resources**

- [React Hooks Documentation](https://react.dev/reference/react)
- [ESLint React Hooks Plugin](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/)
- [When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback)

---

## 🎓 **Best Practices**

1. **Always include all dependencies** unless you have a very good reason
2. **Document exceptions** with clear comments when using `eslint-disable`
3. **Use `useCallback`** for functions passed as dependencies
4. **Use `useMemo`** for complex objects/arrays passed as dependencies
5. **Split complex effects** into multiple smaller effects
6. **Move functions inside effects** when possible
7. **Test thoroughly** after enabling the rule

---

**Implementation Status**: 📋 **READY TO IMPLEMENT**  
**Estimated Time**: 2-3 hours  
**Risk Level**: LOW  
**Recommended By**: Code Quality Team  
**Priority**: LOW (not blocking deployment)

---

**This improvement is OPTIONAL for production deployment** but will significantly prevent future bugs and improve code quality.

