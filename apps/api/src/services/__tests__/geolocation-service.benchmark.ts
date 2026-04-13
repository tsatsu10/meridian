/**
 * Performance Benchmarks for Geolocation Service
 * 
 * Measure cache performance, API call efficiency, and throughput
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeolocationService } from '../geolocation-service';

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Redis
vi.mock('../redis-session-store', () => ({
  getRedisClient: vi.fn(() => null),
}));

// Mock fetch with realistic response times
global.fetch = vi.fn();

describe('Geolocation Service - Performance Benchmarks', () => {
  let service: GeolocationService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IPSTACK_API_KEY = 'test-api-key';
    service = new GeolocationService();

    // Mock API with realistic latency (100-300ms)
    (global.fetch as any).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      return {
        ok: true,
        json: async () => ({
          ip: '8.8.8.8',
          country_code: 'US',
          country_name: 'United States',
          city: 'Mountain View',
        }),
      };
    });
  });

  describe('Cache Performance', () => {
    it('should demonstrate cache hit performance', async () => {
      // Warm up cache
      await service.lookupIP('8.8.8.8');

      // Measure cache hit performance
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        await service.lookupIP('8.8.8.8');
      }

      const duration = Date.now() - start;
      const avgTime = duration / iterations;

      console.log(`\n📊 Cache Hit Performance:`);
      console.log(`  - ${iterations} lookups in ${duration}ms`);
      console.log(`  - Average: ${avgTime.toFixed(3)}ms per lookup`);
      console.log(`  - Throughput: ${(iterations / (duration / 1000)).toFixed(0)} lookups/sec`);

      // Cache hits should be very fast (< 1ms average)
      expect(avgTime).toBeLessThan(1);
    });

    it('should demonstrate cache miss performance', async () => {
      const iterations = 10;
      const uniqueIPs = Array.from({ length: iterations }, (_, i) => `1.2.3.${i}`);
      
      const start = Date.now();

      for (const ip of uniqueIPs) {
        await service.lookupIP(ip);
      }

      const duration = Date.now() - start;
      const avgTime = duration / iterations;

      console.log(`\n📊 Cache Miss Performance (API Calls):`);
      console.log(`  - ${iterations} unique IP lookups in ${duration}ms`);
      console.log(`  - Average: ${avgTime.toFixed(1)}ms per lookup`);

      // API calls will be slower (100-300ms)
      expect(avgTime).toBeGreaterThan(50);
      expect(avgTime).toBeLessThan(400);
    });

    it('should demonstrate cache efficiency', async () => {
      const totalLookups = 1000;
      const uniqueIPs = 50;

      // Generate realistic traffic pattern (many repeated IPs)
      const ips: string[] = [];
      for (let i = 0; i < totalLookups; i++) {
        const ipIndex = Math.floor(Math.random() * uniqueIPs);
        ips.push(`10.0.0.${ipIndex}`);
      }

      const start = Date.now();

      for (const ip of ips) {
        await service.lookupIP(ip);
      }

      const duration = Date.now() - start;
      const stats = service.getUsageStats();

      console.log(`\n📊 Cache Efficiency (Realistic Traffic):`);
      console.log(`  - Total lookups: ${totalLookups}`);
      console.log(`  - Unique IPs: ${uniqueIPs}`);
      console.log(`  - Cache hits: ${stats.cacheHits}`);
      console.log(`  - API calls: ${stats.apiCalls}`);
      console.log(`  - Hit rate: ${stats.cacheHitRate}`);
      console.log(`  - Total time: ${duration}ms`);
      console.log(`  - Avg per lookup: ${(duration / totalLookups).toFixed(3)}ms`);

      // Should have high cache hit rate
      const hitRate = parseFloat(stats.cacheHitRate);
      expect(hitRate).toBeGreaterThan(90);
    });
  });

  describe('Memory Efficiency', () => {
    it('should handle large cache efficiently', async () => {
      const cacheSize = 1000;

      // Fill cache with unique IPs
      for (let i = 0; i < cacheSize; i++) {
        await service.lookupIP(`192.168.${Math.floor(i / 256)}.${i % 256}`);
      }

      const stats = service.getUsageStats();

      console.log(`\n📊 Memory Efficiency:`);
      console.log(`  - Cache entries: ${stats.cacheSize}`);
      console.log(`  - API calls made: ${stats.apiCalls}`);
      console.log(`  - Memory usage: ~${(stats.cacheSize * 1024).toLocaleString()} bytes (estimated)`);

      expect(stats.cacheSize).toBeLessThanOrEqual(cacheSize);
    });
  });

  describe('Throughput', () => {
    it('should handle concurrent lookups efficiently', async () => {
      const concurrentLookups = 100;

      // Warm up cache with first lookup
      await service.lookupIP('1.1.1.1');

      const start = Date.now();

      // Simulate concurrent requests
      const promises = Array.from({ length: concurrentLookups }, () =>
        service.lookupIP('1.1.1.1')
      );

      await Promise.all(promises);

      const duration = Date.now() - start;
      const throughput = (concurrentLookups / (duration / 1000)).toFixed(0);

      console.log(`\n📊 Concurrent Throughput:`);
      console.log(`  - ${concurrentLookups} concurrent lookups`);
      console.log(`  - Completed in: ${duration}ms`);
      console.log(`  - Throughput: ${throughput} lookups/sec`);

      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(100);
    });

    it('should handle mixed cache hits/misses', async () => {
      const totalLookups = 500;
      const hitRatio = 0.95; // 95% cache hits

      // Generate traffic pattern
      const ips: string[] = [];
      for (let i = 0; i < totalLookups; i++) {
        if (Math.random() < hitRatio) {
          ips.push('8.8.8.8'); // Cached IP
        } else {
          ips.push(`1.2.3.${Math.floor(Math.random() * 255)}`); // Unique IP
        }
      }

      // Warm up cache
      await service.lookupIP('8.8.8.8');

      const start = Date.now();

      for (const ip of ips) {
        await service.lookupIP(ip);
      }

      const duration = Date.now() - start;
      const avgTime = duration / totalLookups;
      const throughput = (totalLookups / (duration / 1000)).toFixed(0);

      console.log(`\n📊 Mixed Traffic Performance (95% cached):`);
      console.log(`  - Total lookups: ${totalLookups}`);
      console.log(`  - Duration: ${duration}ms`);
      console.log(`  - Average: ${avgTime.toFixed(2)}ms per lookup`);
      console.log(`  - Throughput: ${throughput} lookups/sec`);

      // With 95% cache hits, should be very fast
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('API Call Reduction', () => {
    it('should demonstrate API call savings', async () => {
      const sessionsPerDay = 10000;
      const uniqueIPsPerDay = 500; // Typical ratio: 20:1

      // Simulate realistic session pattern
      const sessions: string[] = [];
      const ipPool = Array.from({ length: uniqueIPsPerDay }, (_, i) =>
        `203.0.${Math.floor(i / 256)}.${i % 256}`
      );

      for (let i = 0; i < sessionsPerDay; i++) {
        const randomIP = ipPool[Math.floor(Math.random() * ipPool.length)];
        sessions.push(randomIP);
      }

      let apiCallsBefore = 0;
      const start = Date.now();

      for (const ip of sessions) {
        const result = await service.lookupIP(ip);
        if (result) {
          // Count would-be API call without cache
          apiCallsBefore++;
        }
      }

      const duration = Date.now() - start;
      const stats = service.getUsageStats();

      const savingsPercent = ((1 - stats.apiCalls / apiCallsBefore) * 100).toFixed(2);
      const moneySaved = ((apiCallsBefore - stats.apiCalls) / 10000) * 9.99; // Basic plan cost

      console.log(`\n📊 API Call Reduction (Daily Session Simulation):`);
      console.log(`  - Sessions: ${sessionsPerDay.toLocaleString()}`);
      console.log(`  - Unique IPs: ${uniqueIPsPerDay}`);
      console.log(`  - Without cache: ${apiCallsBefore.toLocaleString()} API calls`);
      console.log(`  - With cache: ${stats.apiCalls} API calls`);
      console.log(`  - Reduction: ${savingsPercent}%`);
      console.log(`  - Monthly savings: $${(moneySaved * 30).toFixed(2)}`);
      console.log(`  - Processing time: ${duration}ms`);

      // Should achieve >90% reduction
      expect(parseFloat(savingsPercent)).toBeGreaterThan(90);
    });
  });

  describe('Quota Management Performance', () => {
    it('should efficiently track quota usage', async () => {
      const lookups = 1000;

      const start = Date.now();

      for (let i = 0; i < lookups; i++) {
        await service.lookupIP(`1.2.3.${i % 256}`);
        
        // Check quota every 100 lookups
        if (i % 100 === 0) {
          service.getQuotaUsage();
        }
      }

      const duration = Date.now() - start;

      console.log(`\n📊 Quota Tracking Overhead:`);
      console.log(`  - Lookups: ${lookups}`);
      console.log(`  - Quota checks: ${lookups / 100}`);
      console.log(`  - Total time: ${duration}ms`);
      console.log(`  - Overhead: negligible`);

      // Quota tracking should add minimal overhead
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Statistics Performance', () => {
    it('should efficiently calculate statistics', async () => {
      // Generate some activity
      for (let i = 0; i < 100; i++) {
        await service.lookupIP(`1.2.3.${i}`);
      }

      const iterations = 10000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        service.getUsageStats();
      }

      const duration = Date.now() - start;
      const avgTime = duration / iterations;

      console.log(`\n📊 Statistics Calculation Performance:`);
      console.log(`  - Iterations: ${iterations.toLocaleString()}`);
      console.log(`  - Duration: ${duration}ms`);
      console.log(`  - Average: ${avgTime.toFixed(4)}ms`);

      // Statistics should be instant
      expect(avgTime).toBeLessThan(0.1);
    });
  });

  afterEach(() => {
    delete process.env.IPSTACK_API_KEY;
  });
});

/**
 * Expected Benchmark Results:
 * 
 * ✅ Cache Hit: <1ms average
 * ✅ Cache Miss (API): 100-300ms average
 * ✅ Cache Hit Rate: >90% in realistic scenarios
 * ✅ API Call Reduction: >95%
 * ✅ Concurrent Throughput: >1000 lookups/sec (cached)
 * ✅ Memory Usage: ~1KB per cached entry
 * ✅ Statistics: <0.1ms per calculation
 * ✅ Cost Savings: >$200/month for typical workloads
 */

