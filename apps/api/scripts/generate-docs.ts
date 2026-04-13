#!/usr/bin/env tsx

/**
 * 📚 Documentation Generation Script
 * Generates comprehensive OpenAPI documentation for the Meridian API
 */

import { generateAPIDocs } from '../src/docs/openapi-generator';
import { logger } from '../src/utils/logger';

async function main() {
  try {
    logger.info('🚀 Starting documentation generation...');
    
    const result = await generateAPIDocs();
    
    logger.success('✅ Documentation generation completed!');
    logger.info('📋 Generated files:', result);
    
    logger.info('\n🌐 To view the documentation:');
    logger.info('  • Start the API server: npm run dev');
    logger.info('  • Visit: http://localhost:3005/api/docs');
    logger.info('  • Or open: docs/index.html in your browser');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Documentation generation failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}