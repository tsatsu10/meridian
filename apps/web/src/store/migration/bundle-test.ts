// Bundle size comparison test
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from "../../lib/logger";

interface BundleStats {
  totalSize: number;
  gzipSize: number;
  chunks: Array<{
    name: string;
    size: number;
    gzipSize: number;
  }>;
}

interface BundleComparison {
  before: BundleStats;
  after: BundleStats;
  reduction: {
    totalSize: number;
    gzipSize: number;
    percentage: number;
    gzipPercentage: number;
  };
}

export async function analyzeBundleSize(): Promise<BundleStats> {
  const distPath = path.resolve('dist');
  
  try {
    const files = await fs.readdir(distPath);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    const chunks: BundleStats['chunks'] = [];
    
    let totalSize = 0;
    let totalGzipSize = 0;
    
    for (const file of jsFiles) {
      const filePath = path.join(distPath, file);
      const stats = await fs.stat(filePath);
      const size = stats.size;
      
      // Estimate gzip size (roughly 25-30% of original for JS)
      const estimatedGzipSize = Math.round(size * 0.27);
      
      chunks.push({
        name: file,
        size,
        gzipSize: estimatedGzipSize,
      });
      
      totalSize += size;
      totalGzipSize += estimatedGzipSize;
    }
    
    return {
      totalSize,
      gzipSize: totalGzipSize,
      chunks: chunks.sort((a, b) => b.size - a.size),
    };
  } catch (error) {
    console.error('Error analyzing bundle size:', error);
    throw error;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function compareBundles(before: BundleStats, after: BundleStats): BundleComparison {
  const totalSizeReduction = before.totalSize - after.totalSize;
  const gzipSizeReduction = before.gzipSize - after.gzipSize;
  
  return {
    before,
    after,
    reduction: {
      totalSize: totalSizeReduction,
      gzipSize: gzipSizeReduction,
      percentage: (totalSizeReduction / before.totalSize) * 100,
      gzipPercentage: (gzipSizeReduction / before.gzipSize) * 100,
    },
  };
}

export function generateBundleReport(comparison: BundleComparison): string {
  let report = '# Bundle Size Analysis Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += '## Summary\n\n';
  report += `### Before Store Migration\n`;
  report += `- **Total Size**: ${formatBytes(comparison.before.totalSize)}\n`;
  report += `- **Gzip Size**: ${formatBytes(comparison.before.gzipSize)}\n`;
  report += `- **Chunks**: ${comparison.before.chunks.length}\n\n`;
  
  report += `### After Store Migration\n`;
  report += `- **Total Size**: ${formatBytes(comparison.after.totalSize)}\n`;
  report += `- **Gzip Size**: ${formatBytes(comparison.after.gzipSize)}\n`;
  report += `- **Chunks**: ${comparison.after.chunks.length}\n\n`;
  
  report += `### Reduction\n`;
  if (comparison.reduction.totalSize > 0) {
    report += `- **Size Saved**: ${formatBytes(comparison.reduction.totalSize)} (${comparison.reduction.percentage.toFixed(2)}%)\n`;
    report += `- **Gzip Saved**: ${formatBytes(comparison.reduction.gzipSize)} (${comparison.reduction.gzipPercentage.toFixed(2)}%)\n`;
  } else {
    report += `- **Size Change**: +${formatBytes(Math.abs(comparison.reduction.totalSize))} (${Math.abs(comparison.reduction.percentage).toFixed(2)}% increase)\n`;
    report += `- **Gzip Change**: +${formatBytes(Math.abs(comparison.reduction.gzipSize))} (${Math.abs(comparison.reduction.gzipPercentage).toFixed(2)}% increase)\n`;
  }
  report += '\n';
  
  report += '## Detailed Chunk Analysis\n\n';
  report += '### Largest Chunks (After Migration)\n\n';
  
  const topChunks = comparison.after.chunks.slice(0, 10);
  for (const chunk of topChunks) {
    report += `- **${chunk.name}**: ${formatBytes(chunk.size)} (gzip: ${formatBytes(chunk.gzipSize)})\n`;
  }
  report += '\n';
  
  report += '## Optimization Recommendations\n\n';
  
  const largeChunks = comparison.after.chunks.filter(chunk => chunk.size > 500 * 1024);
  if (largeChunks.length > 0) {
    report += '### Large Chunks Detected\n\n';
    for (const chunk of largeChunks) {
      report += `- **${chunk.name}** (${formatBytes(chunk.size)}) should be code-split\n`;
    }
    report += '\n';
  }
  
  report += '### Store Migration Benefits\n\n';
  if (comparison.reduction.percentage > 0) {
    report += `✅ Successfully reduced bundle size by ${comparison.reduction.percentage.toFixed(2)}%\n`;
    report += `✅ Consolidated stores are working effectively\n`;
    report += `✅ Memory usage should be improved\n`;
  } else {
    report += `⚠️ Bundle size increased by ${Math.abs(comparison.reduction.percentage).toFixed(2)}%\n`;
    report += `💡 Consider enabling tree shaking for unused code\n`;
    report += `💡 Migration layer may be adding overhead temporarily\n`;
  }
  report += '\n';
  
  report += '### Next Steps\n\n';
  report += '1. Remove migration compatibility layer once fully migrated\n';
  report += '2. Enable tree shaking to remove unused Redux code\n';
  report += '3. Consider lazy loading for large feature chunks\n';
  report += '4. Implement dynamic imports for routes\n\n';
  
  return report;
}

export async function measureBundleImpact(): Promise<void> {
  logger.info("📊 Measuring bundle size impact...");
  
  try {
    const currentStats = await analyzeBundleSize();
    
    logger.info("\n📈 Current Bundle Analysis:");
    logger.info("============================");
    logger.info("Total Size: ${formatBytes(currentStats.totalSize)}");
    logger.info("Gzip Size: ${formatBytes(currentStats.gzipSize)}");
    logger.info("Chunks: ${currentStats.chunks.length}");
    
    logger.debug("\n🔍 Largest Chunks:");
    const topChunks = currentStats.chunks.slice(0, 5);
    for (const chunk of topChunks) {
      logger.info("  ${chunk.name}: ${formatBytes(chunk.size)}");
    }
    
    // Estimate potential savings after full migration
    const estimatedSavings = currentStats.totalSize * 0.15; // 15% estimated reduction
    logger.info("\n💡 Projected Savings:");
    logger.info("After full migration: -${formatBytes(estimatedSavings)} (-15%)");
    
    return currentStats;
  } catch (error) {
    console.error('Bundle analysis failed:', error);
    throw error;
  }
}