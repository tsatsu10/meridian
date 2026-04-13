/**
 * Virus Scanner Service
 * Scans uploaded files for viruses using ClamAV
 * Phase 0 - Day 4 Implementation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger';

const execPromise = promisify(exec);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

export interface ScanResult {
  isClean: boolean;
  status: 'clean' | 'infected' | 'error';
  virusName?: string;
  scanTime: number;
  error?: string;
  details?: any;
}

export class VirusScanner {
  private enabled: boolean;
  private clamavSocket: string;
  private tempDir: string;

  constructor() {
    this.enabled = process.env.VIRUS_SCAN_ENABLED === 'true';
    this.clamavSocket = process.env.CLAMAV_SOCKET || '/var/run/clamav/clamd.ctl';
    this.tempDir = process.env.VIRUS_SCAN_TEMP_DIR || path.join(process.cwd(), 'temp', 'virus-scan');
    
    this.initialize();
  }

  /**
   * Initialize virus scanner
   */
  private async initialize() {
    if (!this.enabled) {
      logger.debug('⚠️  Virus scanning is disabled');
      return;
    }

    try {
      // Create temp directory
      await mkdir(this.tempDir, { recursive: true });
      
      // Check if ClamAV is available
      const isAvailable = await this.checkClamAVAvailability();
      if (isAvailable) {
        logger.debug('✅ ClamAV virus scanner initialized');
      } else {
        logger.warn('⚠️  ClamAV not available, virus scanning will be skipped');
        this.enabled = false;
      }
    } catch (error) {
      logger.error('❌ Failed to initialize virus scanner:', error);
      this.enabled = false;
    }
  }

  /**
   * Check if ClamAV is available
   */
  private async checkClamAVAvailability(): Promise<boolean> {
    try {
      const { stdout } = await execPromise('which clamscan');
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Scan file buffer
   */
  async scanBuffer(buffer: Buffer, fileName: string): Promise<ScanResult> {
    if (!this.enabled) {
      return {
        isClean: true,
        status: 'clean',
        scanTime: 0,
        details: { note: 'Virus scanning is disabled' },
      };
    }

    const startTime = Date.now();

    try {
      // Write buffer to temporary file
      const tempFilePath = path.join(this.tempDir, `scan_${Date.now()}_${fileName}`);
      await writeFile(tempFilePath, buffer);

      // Scan the file
      const result = await this.scanFile(tempFilePath);

      // Clean up temp file
      await unlink(tempFilePath);

      return result;
    } catch (error: any) {
      logger.error('❌ Virus scan error:', error);
      return {
        isClean: false,
        status: 'error',
        scanTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Scan file path
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    if (!this.enabled) {
      return {
        isClean: true,
        status: 'clean',
        scanTime: 0,
        details: { note: 'Virus scanning is disabled' },
      };
    }

    const startTime = Date.now();

    try {
      // Run ClamAV scan
      const { stdout, stderr } = await execPromise(`clamscan --no-summary "${filePath}"`);
      const scanTime = Date.now() - startTime;

      // Parse result
      if (stdout.includes('OK')) {
        logger.debug(`✅ File clean: ${path.basename(filePath)}`);
        return {
          isClean: true,
          status: 'clean',
          scanTime,
          details: { output: stdout },
        };
      } else if (stdout.includes('FOUND')) {
        // Extract virus name
        const virusMatch = stdout.match(/: (.+) FOUND/);
        const virusName = virusMatch ? virusMatch[1] : 'Unknown';
        
        logger.warn(`⚠️  Virus detected in ${path.basename(filePath)}: ${virusName}`);
        return {
          isClean: false,
          status: 'infected',
          virusName,
          scanTime,
          details: { output: stdout },
        };
      } else {
        return {
          isClean: false,
          status: 'error',
          scanTime,
          error: stderr || 'Unknown scan error',
          details: { output: stdout, stderr },
        };
      }
    } catch (error: any) {
      const scanTime = Date.now() - startTime;
      
      // Check if it's an infected file (exit code 1)
      if (error.code === 1 && error.stdout && error.stdout.includes('FOUND')) {
        const virusMatch = error.stdout.match(/: (.+) FOUND/);
        const virusName = virusMatch ? virusMatch[1] : 'Unknown';
        
        logger.warn(`⚠️  Virus detected: ${virusName}`);
        return {
          isClean: false,
          status: 'infected',
          virusName,
          scanTime,
          details: { output: error.stdout },
        };
      }

      logger.error('❌ Virus scan failed:', error);
      return {
        isClean: false,
        status: 'error',
        scanTime,
        error: error.message,
        details: { error: error.toString() },
      };
    }
  }

  /**
   * Scan multiple files
   */
  async scanFiles(filePaths: string[]): Promise<Map<string, ScanResult>> {
    const results = new Map<string, ScanResult>();

    for (const filePath of filePaths) {
      const result = await this.scanFile(filePath);
      results.set(filePath, result);
    }

    return results;
  }

  /**
   * Update virus definitions
   */
  async updateDefinitions(): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    try {
      logger.debug('📥 Updating ClamAV virus definitions...');
      await execPromise('freshclam');
      logger.debug('✅ Virus definitions updated');
      return true;
    } catch (error) {
      logger.error('❌ Failed to update virus definitions:', error);
      return false;
    }
  }

  /**
   * Get ClamAV version
   */
  async getVersion(): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const { stdout } = await execPromise('clamscan --version');
      return stdout.trim();
    } catch (error) {
      logger.error('❌ Failed to get ClamAV version:', error);
      return null;
    }
  }

  /**
   * Check if scanner is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const virusScanner = new VirusScanner();


