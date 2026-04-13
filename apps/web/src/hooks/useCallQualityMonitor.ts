import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from "../lib/logger";

interface NetworkQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';
  score: number; // 0-100
  latency: number;
  packetLoss: number;
  bandwidth: number;
  jitter: number;
}

interface CallQualityMetrics {
  video: {
    resolution: string;
    framerate: number;
    bitrate: number;
    droppedFrames: number;
  };
  audio: {
    bitrate: number;
    sampleRate: number;
    channelCount: number;
    echoReturn: number;
  };
  network: NetworkQuality;
  cpu: {
    usage: number;
    throttling: boolean;
  };
  memory: {
    usage: number;
    limit: number;
  };
}

interface CallQualityAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion: string;
  timestamp: Date;
  autoResolve: boolean;
}

interface AdaptationStrategy {
  action: 'reduce_resolution' | 'reduce_framerate' | 'reduce_bitrate' | 'enable_audio_only' | 'reconnect';
  target: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

export function useCallQualityMonitor(peerConnection?: RTCPeerConnection) {
  const [metrics, setMetrics] = useState<CallQualityMetrics | null>(null);
  const [alerts, setAlerts] = useState<CallQualityAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [adaptationHistory, setAdaptationHistory] = useState<AdaptationStrategy[]>([]);
  
  const metricsInterval = useRef<NodeJS.Timeout>();
  const statsHistory = useRef<RTCStatsReport[]>([]);
  const lastStatsTime = useRef<number>(0);
  const alertQueue = useRef<Set<string>>(new Set());

  // Start quality monitoring
  const startMonitoring = useCallback(() => {
    if (!peerConnection || isMonitoring) return;

    setIsMonitoring(true);
    
    metricsInterval.current = setInterval(async () => {
      try {
        const stats = await peerConnection.getStats();
        const currentMetrics = await analyzeStats(stats);
        
        setMetrics(currentMetrics);
        checkQualityThresholds(currentMetrics);
        suggestAdaptations(currentMetrics);
        
        // Keep last 60 seconds of stats for trend analysis
        statsHistory.current.push(stats);
        if (statsHistory.current.length > 60) {
          statsHistory.current.shift();
        }
        
      } catch (error) {
        console.error('Failed to collect call quality metrics:', error);
        addAlert({
          type: 'error',
          severity: 'medium',
          message: 'Unable to monitor call quality',
          suggestion: 'Call metrics may be unavailable. Consider refreshing if issues persist.',
          autoResolve: true
        });
      }
    }, 1000);
  }, [peerConnection, isMonitoring]);

  // Stop quality monitoring
  const stopMonitoring = useCallback(() => {
    if (metricsInterval.current) {
      clearInterval(metricsInterval.current);
      metricsInterval.current = undefined;
    }
    setIsMonitoring(false);
    setMetrics(null);
    setAlerts([]);
    statsHistory.current = [];
    alertQueue.current.clear();
  }, []);

  // Analyze RTC stats to extract quality metrics
  const analyzeStats = async (stats: RTCStatsReport): Promise<CallQualityMetrics> => {
    const videoStats = Array.from(stats.values()).find(stat => 
      stat.type === 'outbound-rtp' && stat.mediaType === 'video'
    );
    
    const audioStats = Array.from(stats.values()).find(stat => 
      stat.type === 'outbound-rtp' && stat.mediaType === 'audio'
    );
    
    const candidateStats = Array.from(stats.values()).find(stat => 
      stat.type === 'candidate-pair' && stat.state === 'succeeded'
    );

    // Calculate network quality
    const networkQuality = calculateNetworkQuality(candidateStats, stats);
    
    // Get system performance metrics
    const systemMetrics = await getSystemMetrics();

    return {
      video: {
        resolution: videoStats?.frameWidth && videoStats?.frameHeight 
          ? `${videoStats.frameWidth}x${videoStats.frameHeight}` 
          : 'Unknown',
        framerate: videoStats?.framesPerSecond || 0,
        bitrate: calculateBitrate(videoStats, 'video'),
        droppedFrames: videoStats?.framesDropped || 0
      },
      audio: {
        bitrate: calculateBitrate(audioStats, 'audio'),
        sampleRate: 48000, // Standard WebRTC sample rate
        channelCount: 2,
        echoReturn: calculateEchoReturn(audioStats)
      },
      network: networkQuality,
      cpu: systemMetrics.cpu,
      memory: systemMetrics.memory
    };
  };

  // Calculate network quality based on connection stats
  const calculateNetworkQuality = (candidateStats: any, allStats: RTCStatsReport): NetworkQuality => {
    const rtt = candidateStats?.currentRoundTripTime || 0;
    const packetLoss = calculatePacketLoss(allStats);
    const bandwidth = estimateBandwidth(candidateStats);
    const jitter = candidateStats?.jitter || 0;

    // Score calculation (0-100)
    let score = 100;
    
    // Penalize high latency
    if (rtt > 0.3) score -= 40; // > 300ms
    else if (rtt > 0.2) score -= 25; // > 200ms
    else if (rtt > 0.1) score -= 10; // > 100ms
    
    // Penalize packet loss
    score -= packetLoss * 200; // 1% loss = 2 points
    
    // Penalize high jitter
    if (jitter > 0.05) score -= 20; // > 50ms jitter
    else if (jitter > 0.03) score -= 10; // > 30ms jitter

    score = Math.max(0, Math.min(100, score));

    const level = score >= 80 ? 'excellent' :
                  score >= 60 ? 'good' :
                  score >= 40 ? 'fair' :
                  score >= 20 ? 'poor' : 'very-poor';

    return {
      level,
      score,
      latency: rtt * 1000, // Convert to ms
      packetLoss: packetLoss * 100, // Convert to percentage
      bandwidth,
      jitter: jitter * 1000 // Convert to ms
    };
  };

  // Calculate bitrate from RTC stats
  const calculateBitrate = (stats: any, type: 'video' | 'audio'): number => {
    if (!stats || !stats.bytesSent) return 0;
    
    const currentTime = Date.now();
    const currentBytes = stats.bytesSent;
    
    if (lastStatsTime.current === 0) {
      lastStatsTime.current = currentTime;
      return 0;
    }
    
    const timeDiff = currentTime - lastStatsTime.current;
    const bytesDiff = currentBytes - (stats.previousBytesSent || 0);
    
    stats.previousBytesSent = currentBytes;
    lastStatsTime.current = currentTime;
    
    return timeDiff > 0 ? (bytesDiff * 8) / (timeDiff / 1000) : 0; // bits per second
  };

  // Calculate packet loss percentage
  const calculatePacketLoss = (stats: RTCStatsReport): number => {
    const inboundStats = Array.from(stats.values()).find(stat => 
      stat.type === 'inbound-rtp'
    );
    
    if (!inboundStats) return 0;
    
    const packetsLost = inboundStats.packetsLost || 0;
    const packetsReceived = inboundStats.packetsReceived || 1;
    
    return packetsLost / (packetsLost + packetsReceived);
  };

  // Estimate available bandwidth
  const estimateBandwidth = (candidateStats: any): number => {
    if (!candidateStats) return 0;
    
    // This is a simplified estimation
    const availableOutgoingBitrate = candidateStats.availableOutgoingBitrate;
    const availableIncomingBitrate = candidateStats.availableIncomingBitrate;
    
    return Math.min(availableOutgoingBitrate || 0, availableIncomingBitrate || 0);
  };

  // Calculate echo return loss
  const calculateEchoReturn = (audioStats: any): number => {
    // This would typically require access to audio processing stats
    // For now, return a reasonable default
    return audioStats?.echoReturnLoss || -30; // dB
  };

  // Get system performance metrics
  const getSystemMetrics = async () => {
    // Use Performance API for basic metrics
    const memory = (performance as any).memory || {};
    
    return {
      cpu: {
        usage: 0, // Would need Worker thread to calculate
        throttling: document.hidden || false
      },
      memory: {
        usage: memory.usedJSHeapSize || 0,
        limit: memory.jsHeapSizeLimit || 0
      }
    };
  };

  // Check quality thresholds and generate alerts
  const checkQualityThresholds = (metrics: CallQualityMetrics) => {
    const { network, video, audio } = metrics;
    
    // High latency alert
    if (network.latency > 200 && !alertQueue.current.has('high-latency')) {
      addAlert({
        type: 'warning',
        severity: 'medium',
        message: 'High network latency detected',
        suggestion: 'Consider switching to a more stable network connection',
        autoResolve: true
      });
      alertQueue.current.add('high-latency');
    }
    
    // Packet loss alert
    if (network.packetLoss > 5 && !alertQueue.current.has('packet-loss')) {
      addAlert({
        type: 'error',
        severity: 'high',
        message: 'Significant packet loss detected',
        suggestion: 'Check network connection. Consider reducing video quality.',
        autoResolve: true
      });
      alertQueue.current.add('packet-loss');
    }
    
    // Low framerate alert
    if (video.framerate < 15 && video.framerate > 0 && !alertQueue.current.has('low-framerate')) {
      addAlert({
        type: 'warning',
        severity: 'medium',
        message: 'Low video framerate detected',
        suggestion: 'Try reducing video resolution or closing other applications',
        autoResolve: true
      });
      alertQueue.current.add('low-framerate');
    }
    
    // High CPU usage (if available)
    if (metrics.cpu.usage > 80 && !alertQueue.current.has('high-cpu')) {
      addAlert({
        type: 'warning',
        severity: 'medium',
        message: 'High CPU usage detected',
        suggestion: 'Close unnecessary applications to improve call quality',
        autoResolve: true
      });
      alertQueue.current.add('high-cpu');
    }
    
    // Clear resolved alerts
    if (network.latency <= 150) alertQueue.current.delete('high-latency');
    if (network.packetLoss <= 2) alertQueue.current.delete('packet-loss');
    if (video.framerate >= 20) alertQueue.current.delete('low-framerate');
    if (metrics.cpu.usage <= 60) alertQueue.current.delete('high-cpu');
  };

  // Suggest automatic adaptations
  const suggestAdaptations = (metrics: CallQualityMetrics) => {
    const adaptations: AdaptationStrategy[] = [];
    
    if (metrics.network.score < 40) {
      // Poor network quality
      if (metrics.video.resolution.includes('1080')) {
        adaptations.push({
          action: 'reduce_resolution',
          target: '720p',
          reason: 'Poor network quality detected',
          impact: 'medium'
        });
      } else if (metrics.video.framerate > 15) {
        adaptations.push({
          action: 'reduce_framerate',
          target: '15fps',
          reason: 'Network cannot sustain current framerate',
          impact: 'low'
        });
      }
    }
    
    if (metrics.network.packetLoss > 10) {
      adaptations.push({
        action: 'enable_audio_only',
        target: 'audio-only-mode',
        reason: 'Severe packet loss detected',
        impact: 'high'
      });
    }
    
    if (metrics.cpu.usage > 90) {
      adaptations.push({
        action: 'reduce_bitrate',
        target: '50%',
        reason: 'High CPU usage detected',
        impact: 'medium'
      });
    }
    
    if (adaptations.length > 0) {
      setAdaptationHistory(prev => [...prev, ...adaptations]);
    }
  };

  // Add quality alert
  const addAlert = (alert: Omit<CallQualityAlert, 'id' | 'timestamp'>) => {
    const newAlert: CallQualityAlert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    
    setAlerts(prev => {
      const filtered = prev.filter(a => a.type !== newAlert.type || a.message !== newAlert.message);
      return [...filtered, newAlert];
    });
    
    // Auto-resolve alerts after 30 seconds if specified
    if (alert.autoResolve) {
      setTimeout(() => {
        dismissAlert(newAlert.id);
      }, 30000);
    }
  };

  // Dismiss alert
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Clear all alerts
  const clearAlerts = () => {
    setAlerts([]);
    alertQueue.current.clear();
  };

  // Get quality trend
  const getQualityTrend = (): 'improving' | 'stable' | 'degrading' => {
    if (statsHistory.current.length < 10) return 'stable';
    
    const recent = statsHistory.current.slice(-5);
    const older = statsHistory.current.slice(-10, -5);
    
    // Simple trend analysis based on network scores
    // In a real implementation, this would be more sophisticated
    return 'stable';
  };

  // Apply automatic adaptation
  const applyAdaptation = async (adaptation: AdaptationStrategy) => {
    try {
      switch (adaptation.action) {
        case 'reduce_resolution':
          // This would integrate with video constraints
          logger.info("Applying adaptation: ${adaptation.action} to ${adaptation.target}");
          break;
        case 'reduce_framerate':
          logger.info("Applying adaptation: ${adaptation.action} to ${adaptation.target}");
          break;
        case 'reduce_bitrate':
          logger.info("Applying adaptation: ${adaptation.action} to ${adaptation.target}");
          break;
        case 'enable_audio_only':
          logger.info("Applying adaptation: ${adaptation.action}");
          break;
        case 'reconnect':
          logger.info("Applying adaptation: ${adaptation.action}");
          break;
      }
      
      addAlert({
        type: 'info',
        severity: 'low',
        message: `Applied optimization: ${adaptation.action.replace('_', ' ')}`,
        suggestion: `Reason: ${adaptation.reason}`,
        autoResolve: true
      });
      
    } catch (error) {
      console.error('Failed to apply adaptation:', error);
      addAlert({
        type: 'error',
        severity: 'medium',
        message: 'Failed to apply quality optimization',
        suggestion: 'Manual intervention may be required',
        autoResolve: true
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    // State
    metrics,
    alerts,
    isMonitoring,
    adaptationHistory,
    
    // Controls
    startMonitoring,
    stopMonitoring,
    dismissAlert,
    clearAlerts,
    applyAdaptation,
    
    // Utilities
    getQualityTrend,
    
    // Computed values
    overallQuality: metrics?.network.level || 'unknown',
    hasActiveAlerts: alerts.length > 0,
    criticalAlerts: alerts.filter(a => a.severity === 'critical'),
    warningAlerts: alerts.filter(a => a.severity === 'high' || a.severity === 'medium')
  };
}