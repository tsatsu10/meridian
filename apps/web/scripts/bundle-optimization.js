/**
 * Bundle Size Optimization Script
 * 
 * Comprehensive bundle analysis and optimization tool:
 * - Bundle size analysis and reporting
 * - Dependency tree analysis
 * - Code splitting recommendations
 * - Performance optimization suggestions
 * - Asset optimization checks
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { gzipSync, brotliCompressSync } from 'zlib'

const DIST_PATH = './dist'
const CHUNK_SIZE_WARNING = 500 * 1024 // 500KB
const ASSET_SIZE_WARNING = 1024 * 1024 // 1MB

class BundleAnalyzer {
  constructor() {
    this.results = {
      totalSize: 0,
      gzippedSize: 0,
      brotliSize: 0,
      chunks: [],
      assets: [],
      warnings: [],
      recommendations: [],
      performance: {
        score: 0,
        metrics: {}
      }
    }
  }

  analyze() {
    console.log('🔍 Analyzing bundle...')
    
    try {
      this.analyzeDistFolder()
      this.categorizeAssets()
      this.generateRecommendations()
      this.calculatePerformanceScore()
      this.generateReport()
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message)
      process.exit(1)
    }
  }

  analyzeDistFolder() {
    if (!require('fs').existsSync(DIST_PATH)) {
      throw new Error(`Distribution folder not found: ${DIST_PATH}`)
    }

    const files = this.getFilesRecursively(DIST_PATH)
    
    files.forEach(file => {
      const stats = statSync(file)
      const content = readFileSync(file)
      const gzipped = gzipSync(content)
      const brotli = brotliCompressSync(content)
      
      const fileInfo = {
        path: file.replace(DIST_PATH + '/', ''),
        size: stats.size,
        gzippedSize: gzipped.length,
        brotliSize: brotli.length,
        extension: extname(file),
        type: this.getFileType(file),
        compressionRatio: (1 - gzipped.length / stats.size) * 100
      }

      if (fileInfo.type === 'javascript') {
        this.results.chunks.push(fileInfo)
      } else {
        this.results.assets.push(fileInfo)
      }

      this.results.totalSize += stats.size
      this.results.gzippedSize += gzipped.length
      this.results.brotliSize += brotli.length

      // Check for oversized files
      if (stats.size > CHUNK_SIZE_WARNING && fileInfo.type === 'javascript') {
        this.results.warnings.push({
          type: 'large-chunk',
          file: fileInfo.path,
          size: stats.size,
          message: `Large JavaScript chunk detected: ${this.formatBytes(stats.size)}`
        })
      }

      if (stats.size > ASSET_SIZE_WARNING && fileInfo.type !== 'javascript') {
        this.results.warnings.push({
          type: 'large-asset',
          file: fileInfo.path,
          size: stats.size,
          message: `Large asset detected: ${this.formatBytes(stats.size)}`
        })
      }
    })
  }

  getFilesRecursively(dir) {
    const files = []
    const items = readdirSync(dir)

    items.forEach(item => {
      const fullPath = join(dir, item)
      const stats = statSync(fullPath)

      if (stats.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath))
      } else {
        files.push(fullPath)
      }
    })

    return files
  }

  getFileType(file) {
    const ext = extname(file).toLowerCase()
    
    const typeMap = {
      '.js': 'javascript',
      '.mjs': 'javascript',
      '.css': 'stylesheet',
      '.html': 'html',
      '.png': 'image',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.gif': 'image',
      '.svg': 'image',
      '.webp': 'image',
      '.avif': 'image',
      '.woff': 'font',
      '.woff2': 'font',
      '.ttf': 'font',
      '.eot': 'font',
      '.json': 'data',
      '.ico': 'icon',
      '.manifest': 'manifest'
    }

    return typeMap[ext] || 'other'
  }

  categorizeAssets() {
    // Group assets by type for analysis
    const assetsByType = this.results.assets.reduce((acc, asset) => {
      if (!acc[asset.type]) {
        acc[asset.type] = []
      }
      acc[asset.type].push(asset)
      return acc
    }, {})

    this.results.assetsByType = assetsByType
  }

  generateRecommendations() {
    const recommendations = []

    // Large chunk analysis
    const largeChunks = this.results.chunks.filter(chunk => chunk.size > CHUNK_SIZE_WARNING)
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'code-splitting',
        priority: 'high',
        message: `${largeChunks.length} large chunks detected. Consider implementing more granular code splitting.`,
        files: largeChunks.map(c => c.path),
        impact: 'Reduces initial bundle size and improves load times'
      })
    }

    // Image optimization
    const images = this.results.assets.filter(asset => asset.type === 'image')
    const unoptimizedImages = images.filter(img => 
      img.compressionRatio < 50 && img.size > 50 * 1024 // 50KB
    )
    if (unoptimizedImages.length > 0) {
      recommendations.push({
        type: 'image-optimization',
        priority: 'medium',
        message: `${unoptimizedImages.length} images could be better optimized.`,
        files: unoptimizedImages.map(i => i.path),
        impact: 'Reduces asset size and improves loading performance'
      })
    }

    // Font optimization
    const fonts = this.results.assets.filter(asset => asset.type === 'font')
    if (fonts.some(font => font.extension !== '.woff2')) {
      recommendations.push({
        type: 'font-optimization',
        priority: 'medium',
        message: 'Consider using WOFF2 format for better compression.',
        impact: 'Reduces font loading time and bandwidth usage'
      })
    }

    // CSS optimization
    const cssFiles = this.results.assets.filter(asset => asset.type === 'stylesheet')
    const totalCssSize = cssFiles.reduce((sum, css) => sum + css.size, 0)
    if (totalCssSize > 200 * 1024) { // 200KB
      recommendations.push({
        type: 'css-optimization',
        priority: 'medium',
        message: 'CSS bundle is large. Consider purging unused styles.',
        impact: 'Reduces stylesheet size and improves rendering performance'
      })
    }

    // Tree shaking opportunities
    const vendorChunks = this.results.chunks.filter(chunk => 
      chunk.path.includes('vendor') || chunk.path.includes('node_modules')
    )
    if (vendorChunks.some(chunk => chunk.size > 1024 * 1024)) { // 1MB
      recommendations.push({
        type: 'tree-shaking',
        priority: 'high',
        message: 'Large vendor chunks detected. Review imported dependencies for unused code.',
        impact: 'Eliminates dead code and reduces bundle size significantly'
      })
    }

    this.results.recommendations = recommendations
  }

  calculatePerformanceScore() {
    let score = 100
    const metrics = {}

    // Bundle size score (0-40 points)
    const totalSizeMB = this.results.totalSize / (1024 * 1024)
    if (totalSizeMB > 2) {
      score -= 40
      metrics.bundleSize = 'poor'
    } else if (totalSizeMB > 1) {
      score -= 20
      metrics.bundleSize = 'fair'
    } else {
      metrics.bundleSize = 'good'
    }

    // Compression ratio score (0-20 points)
    const compressionRatio = (1 - this.results.gzippedSize / this.results.totalSize) * 100
    if (compressionRatio < 60) {
      score -= 20
      metrics.compression = 'poor'
    } else if (compressionRatio < 70) {
      score -= 10
      metrics.compression = 'fair'
    } else {
      metrics.compression = 'good'
    }

    // Chunk distribution score (0-20 points)
    const maxChunkSize = Math.max(...this.results.chunks.map(c => c.size))
    if (maxChunkSize > CHUNK_SIZE_WARNING * 2) {
      score -= 20
      metrics.chunkDistribution = 'poor'
    } else if (maxChunkSize > CHUNK_SIZE_WARNING) {
      score -= 10
      metrics.chunkDistribution = 'fair'
    } else {
      metrics.chunkDistribution = 'good'
    }

    // Asset optimization score (0-20 points)
    const assetOptimizationIssues = this.results.warnings.filter(w => 
      w.type === 'large-asset'
    ).length
    if (assetOptimizationIssues > 5) {
      score -= 20
      metrics.assetOptimization = 'poor'
    } else if (assetOptimizationIssues > 2) {
      score -= 10
      metrics.assetOptimization = 'fair'
    } else {
      metrics.assetOptimization = 'good'
    }

    this.results.performance.score = Math.max(0, score)
    this.results.performance.metrics = metrics
  }

  generateReport() {
    const report = {
      summary: {
        totalFiles: this.results.chunks.length + this.results.assets.length,
        totalSize: this.formatBytes(this.results.totalSize),
        gzippedSize: this.formatBytes(this.results.gzippedSize),
        brotliSize: this.formatBytes(this.results.brotliSize),
        compressionSavings: `${((1 - this.results.gzippedSize / this.results.totalSize) * 100).toFixed(1)}%`,
        performanceScore: `${this.results.performance.score}/100`
      },
      chunks: this.results.chunks
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(chunk => ({
          name: chunk.path,
          size: this.formatBytes(chunk.size),
          gzipped: this.formatBytes(chunk.gzippedSize),
          compression: `${chunk.compressionRatio.toFixed(1)}%`
        })),
      warnings: this.results.warnings,
      recommendations: this.results.recommendations,
      metrics: this.results.performance.metrics
    }

    // Write detailed report to file
    writeFileSync('./bundle-analysis.json', JSON.stringify(this.results, null, 2))
    
    // Console output
    this.printReport(report)
  }

  printReport(report) {
    console.log('\n📊 Bundle Analysis Report')
    console.log('=' .repeat(50))
    
    console.log(`\n📈 Summary:`)
    console.log(`   Total Files: ${report.summary.totalFiles}`)
    console.log(`   Total Size: ${report.summary.totalSize}`)
    console.log(`   Gzipped: ${report.summary.gzippedSize} (${report.summary.compressionSavings} savings)`)
    console.log(`   Brotli: ${report.summary.brotliSize}`)
    console.log(`   Performance Score: ${report.summary.performanceScore}`)

    console.log(`\n🎯 Top Chunks by Size:`)
    report.chunks.forEach((chunk, i) => {
      console.log(`   ${i + 1}. ${chunk.name} - ${chunk.size} (${chunk.gzipped} gzipped)`)
    })

    if (report.warnings.length > 0) {
      console.log(`\n⚠️ Warnings (${report.warnings.length}):`)
      report.warnings.forEach(warning => {
        console.log(`   ${warning.type}: ${warning.message}`)
      })
    }

    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations (${report.recommendations.length}):`)
      report.recommendations.forEach(rec => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'
        console.log(`   ${priority} ${rec.type}: ${rec.message}`)
        console.log(`      Impact: ${rec.impact}`)
      })
    }

    console.log(`\n📊 Performance Metrics:`)
    Object.entries(report.metrics).forEach(([metric, value]) => {
      const emoji = value === 'good' ? '✅' : value === 'fair' ? '⚠️' : '❌'
      console.log(`   ${emoji} ${metric}: ${value}`)
    })

    console.log('\n📁 Detailed report saved to: bundle-analysis.json')
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }
}

// Bundle optimization suggestions
class BundleOptimizer {
  static generateOptimizationPlan(analysisResults) {
    const plan = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    }

    analysisResults.recommendations.forEach(rec => {
      if (rec.priority === 'high') {
        plan.immediate.push({
          action: rec.type,
          description: rec.message,
          impact: rec.impact,
          files: rec.files || []
        })
      } else if (rec.priority === 'medium') {
        plan.shortTerm.push({
          action: rec.type,
          description: rec.message,
          impact: rec.impact,
          files: rec.files || []
        })
      } else {
        plan.longTerm.push({
          action: rec.type,
          description: rec.message,
          impact: rec.impact,
          files: rec.files || []
        })
      }
    })

    return plan
  }

  static printOptimizationPlan(plan) {
    console.log('\n🎯 Optimization Action Plan')
    console.log('=' .repeat(50))

    if (plan.immediate.length > 0) {
      console.log('\n🔴 Immediate Actions:')
      plan.immediate.forEach((action, i) => {
        console.log(`   ${i + 1}. ${action.description}`)
        console.log(`      Impact: ${action.impact}`)
        if (action.files.length > 0) {
          console.log(`      Files: ${action.files.slice(0, 3).join(', ')}${action.files.length > 3 ? '...' : ''}`)
        }
      })
    }

    if (plan.shortTerm.length > 0) {
      console.log('\n🟡 Short-term Improvements:')
      plan.shortTerm.forEach((action, i) => {
        console.log(`   ${i + 1}. ${action.description}`)
        console.log(`      Impact: ${action.impact}`)
      })
    }

    if (plan.longTerm.length > 0) {
      console.log('\n🟢 Long-term Optimizations:')
      plan.longTerm.forEach((action, i) => {
        console.log(`   ${i + 1}. ${action.description}`)
        console.log(`      Impact: ${action.impact}`)
      })
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new BundleAnalyzer()
  analyzer.analyze()

  // Generate and display optimization plan
  const optimizationPlan = BundleOptimizer.generateOptimizationPlan(analyzer.results)
  BundleOptimizer.printOptimizationPlan(optimizationPlan)
}

export { BundleAnalyzer, BundleOptimizer }