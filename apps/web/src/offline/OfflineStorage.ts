import { offlineManager } from '../mobile/OfflineManager';
import { logger } from "../lib/logger";

export interface StorageConfig {
  maxStorageSize: number; // in bytes
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  autoCleanup: boolean;
  cleanupThreshold: number; // percentage
  backupInterval: number; // milliseconds
}

export interface StorageStats {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  itemCount: number;
  lastBackup: number;
  compressionRatio: number;
}

export interface StorageItem {
  key: string;
  value: any;
  timestamp: number;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  ttl?: number; // time to live in milliseconds
}

export class OfflineStorage {
  private static instance: OfflineStorage;
  private config: StorageConfig;
  private storage: Map<string, StorageItem> = new Map();
  private stats: StorageStats;
  private backupInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      maxStorageSize: 100 * 1024 * 1024, // 100MB
      compressionEnabled: true,
      encryptionEnabled: false,
      autoCleanup: true,
      cleanupThreshold: 80, // 80%
      backupInterval: 3600000 // 1 hour
    };

    this.stats = {
      totalSize: this.config.maxStorageSize,
      usedSize: 0,
      availableSize: this.config.maxStorageSize,
      itemCount: 0,
      lastBackup: 0,
      compressionRatio: 1
    };

    this.initializeStorage();
  }

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Load existing data from IndexedDB
      await this.loadFromIndexedDB();

      // Start backup interval
      this.startBackupInterval();

      // Start cleanup interval
      this.startCleanupInterval();

      // Update stats
      this.updateStats();

      logger.info("Offline Storage initialized successfully");
    } catch (error) {
      console.error('Failed to initialize Offline Storage:', error);
    }
  }

  private async loadFromIndexedDB(): Promise<void> {
    try {
      // Load from IndexedDB backup
      const backup = await offlineManager.getData('offlineData', 'storage-backup');
      if (backup && backup.data) {
        this.storage = new Map(Object.entries(backup.data));
        this.updateStats();
      }
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
    }
  }

  private startBackupInterval(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    this.backupInterval = setInterval(() => {
      this.backup();
    }, this.config.backupInterval);
  }

  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000); // 5 minutes
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      // Check storage limit
      const estimatedSize = this.estimateSize(value);
      if (this.stats.usedSize + estimatedSize > this.config.maxStorageSize) {
        await this.cleanup();
        
        // Check again after cleanup
        if (this.stats.usedSize + estimatedSize > this.config.maxStorageSize) {
          throw new Error('Storage limit exceeded');
        }
      }

      // Compress if enabled
      let processedValue = value;
      let compressed = false;
      if (this.config.compressionEnabled && this.shouldCompress(value)) {
        processedValue = await this.compress(value);
        compressed = true;
      }

      // Encrypt if enabled
      let encrypted = false;
      if (this.config.encryptionEnabled) {
        processedValue = await this.encrypt(processedValue);
        encrypted = true;
      }

      const item: StorageItem = {
        key,
        value: processedValue,
        timestamp: Date.now(),
        size: this.estimateSize(processedValue),
        compressed,
        encrypted,
        ttl
      };

      this.storage.set(key, item);
      this.updateStats();

      // Save to IndexedDB
      await this.saveToIndexedDB();
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const item = this.storage.get(key);
      if (!item) {
        return null;
      }

      // Check TTL
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.storage.delete(key);
        this.updateStats();
        return null;
      }

      let value = item.value;

      // Decrypt if encrypted
      if (item.encrypted) {
        value = await this.decrypt(value);
      }

      // Decompress if compressed
      if (item.compressed) {
        value = await this.decompress(value);
      }

      return value;
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const deleted = this.storage.delete(key);
      if (deleted) {
        this.updateStats();
        await this.saveToIndexedDB();
      }
      return deleted;
    } catch (error) {
      console.error(`Failed to delete item ${key}:`, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      this.storage.clear();
      this.updateStats();
      await this.saveToIndexedDB();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    const item = this.storage.get(key);
    if (!item) return false;

    // Check TTL
    if (item.ttl && Date.now() - item.timestamp > item.ttl) {
      this.storage.delete(key);
      this.updateStats();
      return false;
    }

    return true;
  }

  async keys(): Promise<string[]> {
    // Clean expired items first
    await this.cleanupExpired();
    return Array.from(this.storage.keys());
  }

  async values(): Promise<any[]> {
    // Clean expired items first
    await this.cleanupExpired();
    const values: any[] = [];
    
    for (const item of this.storage.values()) {
      let value = item.value;

      // Decrypt if encrypted
      if (item.encrypted) {
        value = await this.decrypt(value);
      }

      // Decompress if compressed
      if (item.compressed) {
        value = await this.decompress(value);
      }

      values.push(value);
    }

    return values;
  }

  async entries(): Promise<[string, any][]> {
    // Clean expired items first
    await this.cleanupExpired();
    const entries: [string, any][] = [];
    
    for (const [key, item] of this.storage.entries()) {
      let value = item.value;

      // Decrypt if encrypted
      if (item.encrypted) {
        value = await this.decrypt(value);
      }

      // Decompress if compressed
      if (item.compressed) {
        value = await this.decompress(value);
      }

      entries.push([key, value]);
    }

    return entries;
  }

  async size(): Promise<number> {
    await this.cleanupExpired();
    return this.storage.size;
  }

  private estimateSize(value: any): number {
    try {
      const jsonString = JSON.stringify(value);
      return new Blob([jsonString]).size;
    } catch (error) {
      // Fallback estimation
      return 1024; // 1KB default
    }
  }

  private shouldCompress(value: any): boolean {
    const size = this.estimateSize(value);
    return size > 1024; // Compress items larger than 1KB
  }

  private async compress(data: any): Promise<any> {
    try {
      const jsonString = JSON.stringify(data);
      const blob = new Blob([jsonString]);
      
      // Use CompressionStream if available
      if ('CompressionStream' in window) {
        const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
        const compressedBlob = await new Response(stream).blob();
        return await this.blobToBase64(compressedBlob);
      } else {
        // Fallback: simple compression for strings
        if (typeof data === 'string') {
          return this.simpleCompress(data);
        }
        return data;
      }
    } catch (error) {
      console.error('Compression failed:', error);
      return data;
    }
  }

  private async decompress(data: any): Promise<any> {
    try {
      // Check if it's base64 encoded compressed data
      if (typeof data === 'string' && data.startsWith('data:application/gzip;base64,')) {
        const base64 = data.split(',')[1];
        const blob = await this.base64ToBlob(base64, 'application/gzip');
        
        if ('DecompressionStream' in window) {
          const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
          const decompressedBlob = await new Response(stream).blob();
          const text = await decompressedBlob.text();
          return JSON.parse(text);
        }
      }
      
      // Fallback: simple decompression
      if (typeof data === 'string') {
        return this.simpleDecompress(data);
      }
      
      return data;
    } catch (error) {
      console.error('Decompression failed:', error);
      return data;
    }
  }

  private simpleCompress(str: string): string {
    // Simple run-length encoding for demonstration
    let compressed = '';
    let count = 1;
    let current = str[0];

    for (let i = 1; i < str.length; i++) {
      if (str[i] === current) {
        count++;
      } else {
        compressed += count + current;
        count = 1;
        current = str[i];
      }
    }
    compressed += count + current;

    return compressed.length < str.length ? compressed : str;
  }

  private simpleDecompress(str: string): string {
    // Simple run-length decoding
    if (!/^\d+[^\d]/.test(str)) {
      return str; // Not compressed
    }

    let decompressed = '';
    let i = 0;
    while (i < str.length) {
      let count = '';
      while (i < str.length && /\d/.test(str[i])) {
        count += str[i];
        i++;
      }
      if (i < str.length) {
        decompressed += str[i].repeat(parseInt(count));
        i++;
      }
    }
    return decompressed;
  }

  private async encrypt(data: any): Promise<any> {
    // Simple encryption for demonstration
    // In production, use proper encryption libraries
    const jsonString = JSON.stringify(data);
    return btoa(jsonString); // Base64 encoding as simple encryption
  }

  private async decrypt(data: any): Promise<any> {
    // Simple decryption for demonstration
    try {
      const jsonString = atob(data); // Base64 decoding
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Decryption failed:', error);
      return data;
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
    const response = await fetch(`data:${mimeType};base64,${base64}`);
    return response.blob();
  }

  private async cleanup(): Promise<void> {
    if (!this.config.autoCleanup) return;

    const usagePercentage = (this.stats.usedSize / this.stats.totalSize) * 100;
    if (usagePercentage < this.config.cleanupThreshold) return;

    // Remove oldest items first
    const items = Array.from(this.storage.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const targetSize = this.stats.totalSize * (this.config.cleanupThreshold / 100);
    let currentSize = this.stats.usedSize;

    for (const [key, item] of items) {
      if (currentSize <= targetSize) break;
      
      this.storage.delete(key);
      currentSize -= item.size;
    }

    this.updateStats();
    await this.saveToIndexedDB();
  }

  private async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.storage.entries()) {
      if (item.ttl && now - item.timestamp > item.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.storage.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.updateStats();
      await this.saveToIndexedDB();
    }
  }

  private updateStats(): void {
    let usedSize = 0;
    let itemCount = 0;

    for (const item of this.storage.values()) {
      usedSize += item.size;
      itemCount++;
    }

    this.stats = {
      ...this.stats,
      usedSize,
      availableSize: this.config.maxStorageSize - usedSize,
      itemCount
    };
  }

  private async saveToIndexedDB(): Promise<void> {
    try {
      const data = Object.fromEntries(this.storage);
      await offlineManager.saveData('offlineData', {
        key: 'storage-backup',
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to save to IndexedDB:', error);
    }
  }

  private async backup(): Promise<void> {
    try {
      await this.saveToIndexedDB();
      this.stats.lastBackup = Date.now();
      logger.info("Storage backup completed");
    } catch (error) {
      console.error('Storage backup failed:', error);
    }
  }

  getConfig(): StorageConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart intervals if needed
    if (newConfig.backupInterval) {
      this.startBackupInterval();
    }
  }

  getStats(): StorageStats {
    return { ...this.stats };
  }

  async exportData(): Promise<string> {
    const data = Object.fromEntries(this.storage);
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      this.storage = new Map(Object.entries(data));
      this.updateStats();
      await this.saveToIndexedDB();
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  async getStorageUsage(): Promise<{
    used: number;
    available: number;
    percentage: number;
  }> {
    return {
      used: this.stats.usedSize,
      available: this.stats.availableSize,
      percentage: (this.stats.usedSize / this.stats.totalSize) * 100
    };
  }
}

export const offlineStorage = OfflineStorage.getInstance(); 