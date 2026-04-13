import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { emergencyMemoryCleanup } from '@/utils/emergency-memory-cleanup';

// @epic-3.2-time: Memory status monitoring for performance awareness
// @persona-mike: Developer needs quick access to memory status and cleanup

interface MemoryStatusBadgeProps {
  className?: string;
}

export function MemoryStatusBadge({ className }: MemoryStatusBadgeProps) {
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize / memory.totalJSHeapSize;
        setMemoryUsage(usage);
      }
    };

    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (usage: number) => {
    if (usage > 0.9) return 'bg-red-500 text-white';
    if (usage > 0.8) return 'bg-orange-500 text-white';
    if (usage > 0.6) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  const getStatusText = (usage: number) => {
    if (usage > 0.9) return 'CRITICAL';
    if (usage > 0.8) return 'HIGH';
    if (usage > 0.6) return 'MEDIUM';
    return 'OK';
  };

  const handleEmergencyCleanup = () => {
    emergencyMemoryCleanup();
    setIsOpen(false);
  };

  const usagePercent = Math.round(memoryUsage * 100);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`
            ${getStatusColor(memoryUsage)} 
            hover:opacity-80 
            text-xs font-mono
            min-w-[80px]
            ${className}
          `}
        >
          🧠 {usagePercent}%
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Memory Usage</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    memoryUsage > 0.9 ? 'bg-red-500' :
                    memoryUsage > 0.8 ? 'bg-orange-500' :
                    memoryUsage > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <span className="text-sm font-mono">{usagePercent}%</span>
            </div>
            <p className="text-sm text-gray-600">
              Status: <span className="font-medium">{getStatusText(memoryUsage)}</span>
            </p>
          </div>

          {('memory' in performance) && (
            <div className="space-y-1 text-xs text-gray-500">
              <div>Used: {Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB</div>
              <div>Total: {Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024)}MB</div>
              <div>Limit: {Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)}MB</div>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleEmergencyCleanup}
              variant={memoryUsage > 0.8 ? "destructive" : "outline"}
              size="sm"
              className="w-full"
              disabled={memoryUsage < 0.5}
            >
              {memoryUsage > 0.9 ? '🚨 Emergency Cleanup' : 
               memoryUsage > 0.8 ? '🧹 Memory Cleanup' : 
               '🧹 Cleanup (Low Usage)'}
            </Button>
            
            <div className="text-xs text-gray-500 text-center">
              {memoryUsage > 0.8 ? 
                'High memory usage detected - cleanup recommended' :
                'Memory usage is normal'
              }
            </div>
          </div>

          <div className="text-xs text-gray-400 border-t pt-2">
            <div>🔍 Console: monitorMemory()</div>
            <div>🚨 Emergency: emergencyMemoryCleanup()</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 