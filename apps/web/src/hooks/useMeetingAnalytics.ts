import { useState, useEffect, useRef, useCallback } from 'react';

interface CallMetrics {
  duration: number;
  participants: number;
  audioQuality: number;
  videoQuality: number;
  connectionStability: number;
  screenShareTime: number;
  recordingTime: number;
  bandwidth: {
    audio: number;
    video: number;
  };
  errors: string[];
}

interface AnalyticsEvent {
  type: 'call_started' | 'call_ended' | 'participant_joined' | 'participant_left' | 'screen_shared' | 'recording_started' | 'recording_stopped' | 'error';
  timestamp: number;
  data?: any;
}

export function useMeetingAnalytics(roomId: string) {
  const [metrics, setMetrics] = useState<CallMetrics>({
    duration: 0,
    participants: 0,
    audioQuality: 100,
    videoQuality: 100,
    connectionStability: 100,
    screenShareTime: 0,
    recordingTime: 0,
    bandwidth: { audio: 0, video: 0 },
    errors: []
  });

  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const startTimeRef = useRef<number>(0);
  const screenShareStartRef = useRef<number>(0);
  const recordingStartRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start analytics tracking
  const startTracking = useCallback(() => {
    startTimeRef.current = Date.now();
    addEvent('call_started', { roomId });
    
    // Update duration every second
    intervalRef.current = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000)
      }));
    }, 1000);
  }, [roomId]);

  // Stop analytics tracking
  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    addEvent('call_ended', { 
      roomId, 
      finalMetrics: metrics 
    });
  }, [roomId, metrics]);

  // Add analytics event
  const addEvent = useCallback((type: AnalyticsEvent['type'], data?: any) => {
    const event: AnalyticsEvent = {
      type,
      timestamp: Date.now(),
      data
    };
    setEvents(prev => [...prev, event]);
  }, []);

  // Update participant count
  const updateParticipantCount = useCallback((count: number) => {
    setMetrics(prev => {
      const newMetrics = { ...prev, participants: count };
      if (count > prev.participants) {
        addEvent('participant_joined', { count });
      } else if (count < prev.participants) {
        addEvent('participant_left', { count });
      }
      return newMetrics;
    });
  }, [addEvent]);

  // Track screen sharing
  const trackScreenShare = useCallback((isSharing: boolean) => {
    if (isSharing) {
      screenShareStartRef.current = Date.now();
      addEvent('screen_shared', { started: true });
    } else if (screenShareStartRef.current > 0) {
      const duration = Date.now() - screenShareStartRef.current;
      setMetrics(prev => ({ 
        ...prev, 
        screenShareTime: prev.screenShareTime + duration 
      }));
      screenShareStartRef.current = 0;
      addEvent('screen_shared', { started: false, duration });
    }
  }, [addEvent]);

  // Track recording
  const trackRecording = useCallback((isRecording: boolean) => {
    if (isRecording) {
      recordingStartRef.current = Date.now();
      addEvent('recording_started');
    } else if (recordingStartRef.current > 0) {
      const duration = Date.now() - recordingStartRef.current;
      setMetrics(prev => ({ 
        ...prev, 
        recordingTime: prev.recordingTime + duration 
      }));
      recordingStartRef.current = 0;
      addEvent('recording_stopped', { duration });
    }
  }, [addEvent]);

  // Update connection quality
  const updateConnectionQuality = useCallback((audioQuality: number, videoQuality: number, stability: number) => {
    setMetrics(prev => ({
      ...prev,
      audioQuality,
      videoQuality,
      connectionStability: stability
    }));
  }, []);

  // Track bandwidth usage
  const updateBandwidth = useCallback((audio: number, video: number) => {
    setMetrics(prev => ({
      ...prev,
      bandwidth: { audio, video }
    }));
  }, []);

  // Track errors
  const trackError = useCallback((error: string) => {
    setMetrics(prev => ({
      ...prev,
      errors: [...prev.errors, error]
    }));
    addEvent('error', { error });
  }, [addEvent]);

  // Get analytics summary
  const getAnalyticsSummary = useCallback(() => {
    const totalEvents = events.length;
    const errorCount = metrics.errors.length;
    const avgAudioQuality = metrics.audioQuality;
    const avgVideoQuality = metrics.videoQuality;
    const avgStability = metrics.connectionStability;

    return {
      callDuration: metrics.duration,
      participantCount: metrics.participants,
      screenSharePercentage: metrics.duration > 0 ? (metrics.screenShareTime / metrics.duration) * 100 : 0,
      recordingPercentage: metrics.duration > 0 ? (metrics.recordingTime / metrics.duration) * 100 : 0,
      avgAudioQuality,
      avgVideoQuality,
      avgStability,
      totalEvents,
      errorCount,
      bandwidth: metrics.bandwidth
    };
  }, [metrics, events]);

  // Export analytics data
  const exportAnalytics = useCallback(() => {
    const summary = getAnalyticsSummary();
    const data = {
      roomId,
      summary,
      events,
      metrics,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-analytics-${roomId}-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [roomId, getAnalyticsSummary, events, metrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    metrics,
    events,
    startTracking,
    stopTracking,
    updateParticipantCount,
    trackScreenShare,
    trackRecording,
    updateConnectionQuality,
    updateBandwidth,
    trackError,
    getAnalyticsSummary,
    exportAnalytics
  };
} 