import { useEffect, useRef, useState } from 'react'

interface PerformanceBudget {
  renderTime: number // Max render time in ms
  memoryUsage: number // Max memory usage in MB
  bundleSize: number // Max bundle size in KB
  firstContentfulPaint: number // Max FCP in ms
  largestContentfulPaint: number // Max LCP in ms
}

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  bundleSize: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  score: number // Overall performance score (0-100)
}

const DEFAULT_BUDGET: PerformanceBudget = {
  renderTime: 16, // 60fps target
  memoryUsage: 100, // 100MB
  bundleSize: 500, // 500KB
  firstContentfulPaint: 1000, // 1s
  largestContentfulPaint: 2000, // 2s
}

export function usePerformanceBudget(
  componentName: string,
  customBudget?: Partial<PerformanceBudget>
) {
  const budget = { ...DEFAULT_BUDGET, ...customBudget }
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    bundleSize: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    score: 0,
  })
  const [violations, setViolations] = useState<string[]>([])
  const renderStartTime = useRef<number>(0)

  // Measure render performance
  useEffect(() => {
    renderStartTime.current = performance.now()
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current
      
      setMetrics(prev => ({
        ...prev,
        renderTime,
      }))

      // Check render time budget
      if (renderTime > budget.renderTime) {
        setViolations(prev => [
          ...prev.filter(v => !v.includes('render time')),
          `${componentName}: Render time ${renderTime.toFixed(2)}ms exceeds budget ${budget.renderTime}ms`
        ])
      }
    }
  })

  // Measure memory usage
  useEffect(() => {
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
        
        setMetrics(prev => ({
          ...prev,
          memoryUsage,
        }))

        if (memoryUsage > budget.memoryUsage) {
          setViolations(prev => [
            ...prev.filter(v => !v.includes('memory usage')),
            `${componentName}: Memory usage ${memoryUsage.toFixed(2)}MB exceeds budget ${budget.memoryUsage}MB`
          ])
        }
      }
    }

    measureMemory()
    const interval = setInterval(measureMemory, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [componentName, budget.memoryUsage])

  // Measure Core Web Vitals
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          if (entry.name === 'first-contentful-paint') {
            const fcp = entry.startTime
            setMetrics(prev => ({ ...prev, firstContentfulPaint: fcp }))
            
            if (fcp > budget.firstContentfulPaint) {
              setViolations(prev => [
                ...prev.filter(v => !v.includes('FCP')),
                `${componentName}: FCP ${fcp.toFixed(2)}ms exceeds budget ${budget.firstContentfulPaint}ms`
              ])
            }
          }
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          const lcp = entry.startTime
          setMetrics(prev => ({ ...prev, largestContentfulPaint: lcp }))
          
          if (lcp > budget.largestContentfulPaint) {
            setViolations(prev => [
              ...prev.filter(v => !v.includes('LCP')),
              `${componentName}: LCP ${lcp.toFixed(2)}ms exceeds budget ${budget.largestContentfulPaint}ms`
            ])
          }
        }
      }
    })

    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] })
    
    return () => observer.disconnect()
  }, [componentName, budget.firstContentfulPaint, budget.largestContentfulPaint])

  // Calculate performance score
  useEffect(() => {
    const calculateScore = () => {
      let score = 100
      
      // Render time (30% weight)
      if (metrics.renderTime > 0) {
        const renderScore = Math.max(0, 100 - (metrics.renderTime / budget.renderTime) * 30)
        score -= (30 - renderScore)
      }
      
      // Memory usage (20% weight)
      if (metrics.memoryUsage > 0) {
        const memoryScore = Math.max(0, 100 - (metrics.memoryUsage / budget.memoryUsage) * 20)
        score -= (20 - memoryScore)
      }
      
      // FCP (25% weight)
      if (metrics.firstContentfulPaint > 0) {
        const fcpScore = Math.max(0, 100 - (metrics.firstContentfulPaint / budget.firstContentfulPaint) * 25)
        score -= (25 - fcpScore)
      }
      
      // LCP (25% weight)
      if (metrics.largestContentfulPaint > 0) {
        const lcpScore = Math.max(0, 100 - (metrics.largestContentfulPaint / budget.largestContentfulPaint) * 25)
        score -= (25 - lcpScore)
      }
      
      setMetrics(prev => ({ ...prev, score: Math.max(0, score) }))
    }

    calculateScore()
  }, [metrics.renderTime, metrics.memoryUsage, metrics.firstContentfulPaint, metrics.largestContentfulPaint, budget])

  // Log performance violations in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && violations.length > 0) {
      console.group(`🚨 Performance Budget Violations - ${componentName}`)
      violations.forEach(violation => console.warn(violation))
      console.groupEnd()
    }
  }, [violations, componentName])

  return {
    metrics,
    violations,
    budget,
    isWithinBudget: violations.length === 0,
    score: metrics.score,
  }
}