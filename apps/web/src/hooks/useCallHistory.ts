import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';

interface CallHistoryEntry {
  id: string;
  roomId: string;
  title?: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  participants: {
    id: string;
    name?: string;
    email?: string;
    joinTime: Date;
    leaveTime?: Date;
  }[];
  recordings: {
    id: string;
    filename: string;
    size: number;
    duration: number;
    format: string;
    path?: string;
  }[];
  notes?: string;
  meetingType: 'scheduled' | 'instant' | 'recurring';
  quality: {
    avgAudioQuality: number;
    avgVideoQuality: number;
    connectionIssues: number;
  };
  chatMessages: {
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
  }[];
  screenShareEvents: {
    participantId: string;
    startTime: Date;
    endTime?: Date;
  }[];
  createdBy: string;
  status: 'completed' | 'ongoing' | 'failed' | 'cancelled';
}

interface CallHistoryFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  participants?: string[];
  duration?: {
    min: number;
    max: number;
  };
  hasRecordings?: boolean;
  hasNotes?: boolean;
  meetingType?: string;
}

interface CallHistorySort {
  field: 'startTime' | 'duration' | 'participants' | 'title';
  direction: 'asc' | 'desc';
}

export function useCallHistory() {
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<CallHistoryFilters>({});
  const [sort, setSort] = useState<CallHistorySort>({ field: 'startTime', direction: 'desc' });
  const [currentCall, setCurrentCall] = useState<CallHistoryEntry | null>(null);

  // Load call history from storage
  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load from localStorage (in real app, this would be from API)
      const stored = localStorage.getItem('call-history');
      if (stored) {
        const parsed = JSON.parse(stored).map((entry: any) => ({
          ...entry,
          startTime: new Date(entry.startTime),
          endTime: entry.endTime ? new Date(entry.endTime) : undefined,
          participants: entry.participants.map((p: any) => ({
            ...p,
            joinTime: new Date(p.joinTime),
            leaveTime: p.leaveTime ? new Date(p.leaveTime) : undefined
          })),
          chatMessages: entry.chatMessages?.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })) || [],
          screenShareEvents: entry.screenShareEvents?.map((e: any) => ({
            ...e,
            startTime: new Date(e.startTime),
            endTime: e.endTime ? new Date(e.endTime) : undefined
          })) || []
        }));
        setCallHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load call history:', error);
      toast.error('Failed to load call history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save call history to storage
  const saveCallHistory = useCallback((history: CallHistoryEntry[]) => {
    try {
      localStorage.setItem('call-history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save call history:', error);
      toast.error('Failed to save call history');
    }
  }, []);

  // Start tracking a new call
  const startCall = useCallback((roomId: string, createdBy: string, participants: string[], title?: string) => {
    const newCall: CallHistoryEntry = {
      id: `call-${Date.now()}`,
      roomId,
      title: title || `Call ${roomId}`,
      startTime: new Date(),
      duration: 0,
      participants: participants.map(id => ({
        id,
        name: id === 'local' ? 'You' : `Participant ${id}`,
        joinTime: new Date()
      })),
      recordings: [],
      meetingType: 'instant',
      quality: {
        avgAudioQuality: 0,
        avgVideoQuality: 0,
        connectionIssues: 0
      },
      chatMessages: [],
      screenShareEvents: [],
      createdBy,
      status: 'ongoing'
    };
    
    setCurrentCall(newCall);
    return newCall.id;
  }, []);

  // End call and save to history
  const endCall = useCallback((callId: string, recordings: any[] = []) => {
    if (!currentCall || currentCall.id !== callId) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - currentCall.startTime.getTime()) / 1000);
    
    const completedCall: CallHistoryEntry = {
      ...currentCall,
      endTime,
      duration,
      status: 'completed',
      recordings: recordings.map(rec => ({
        id: rec.id,
        filename: rec.name,
        size: rec.size,
        duration: rec.duration,
        format: rec.format,
        path: rec.path
      }))
    };

    const updatedHistory = [completedCall, ...callHistory];
    setCallHistory(updatedHistory);
    saveCallHistory(updatedHistory);
    setCurrentCall(null);
    
    toast.success('Call ended and saved to history');
  }, [currentCall, callHistory, saveCallHistory]);

  // Update current call (add participant, chat message, etc.)
  const updateCurrentCall = useCallback((updates: Partial<CallHistoryEntry>) => {
    if (!currentCall) return;
    
    setCurrentCall({ ...currentCall, ...updates });
  }, [currentCall]);

  // Add participant to current call
  const addParticipant = useCallback((participantId: string, name?: string, email?: string) => {
    if (!currentCall) return;
    
    const newParticipant = {
      id: participantId,
      name: name || `Participant ${participantId}`,
      email,
      joinTime: new Date()
    };
    
    updateCurrentCall({
      participants: [...currentCall.participants, newParticipant]
    });
  }, [currentCall, updateCurrentCall]);

  // Remove participant from current call
  const removeParticipant = useCallback((participantId: string) => {
    if (!currentCall) return;
    
    const updatedParticipants = currentCall.participants.map(p => 
      p.id === participantId ? { ...p, leaveTime: new Date() } : p
    );
    
    updateCurrentCall({ participants: updatedParticipants });
  }, [currentCall, updateCurrentCall]);

  // Add chat message to current call
  const addChatMessage = useCallback((sender: string, message: string) => {
    if (!currentCall) return;
    
    const newMessage = {
      id: `msg-${Date.now()}`,
      sender,
      message,
      timestamp: new Date()
    };
    
    updateCurrentCall({
      chatMessages: [...currentCall.chatMessages, newMessage]
    });
  }, [currentCall, updateCurrentCall]);

  // Track screen share event
  const trackScreenShare = useCallback((participantId: string, isSharing: boolean) => {
    if (!currentCall) return;
    
    const updatedEvents = [...currentCall.screenShareEvents];
    
    if (isSharing) {
      // Start screen share
      updatedEvents.push({
        participantId,
        startTime: new Date()
      });
    } else {
      // End screen share
      const lastEvent = updatedEvents
        .filter(e => e.participantId === participantId && !e.endTime)
        .pop();
      
      if (lastEvent) {
        lastEvent.endTime = new Date();
      }
    }
    
    updateCurrentCall({ screenShareEvents: updatedEvents });
  }, [currentCall, updateCurrentCall]);

  // Update call quality metrics
  const updateQualityMetrics = useCallback((audioQuality: number, videoQuality: number, hasIssues: boolean) => {
    if (!currentCall) return;
    
    updateCurrentCall({
      quality: {
        avgAudioQuality: audioQuality,
        avgVideoQuality: videoQuality,
        connectionIssues: currentCall.quality.connectionIssues + (hasIssues ? 1 : 0)
      }
    });
  }, [currentCall, updateCurrentCall]);

  // Add notes to call
  const addNotes = useCallback((callId: string, notes: string) => {
    const updatedHistory = callHistory.map(call => 
      call.id === callId ? { ...call, notes } : call
    );
    setCallHistory(updatedHistory);
    saveCallHistory(updatedHistory);
    toast.success('Notes saved');
  }, [callHistory, saveCallHistory]);

  // Delete call from history
  const deleteCall = useCallback((callId: string) => {
    const updatedHistory = callHistory.filter(call => call.id !== callId);
    setCallHistory(updatedHistory);
    saveCallHistory(updatedHistory);
    toast.success('Call deleted from history');
  }, [callHistory, saveCallHistory]);

  // Get filtered and sorted history
  const getFilteredHistory = useCallback(() => {
    let filtered = [...callHistory];

    // Apply filters
    if (filters.dateRange) {
      filtered = filtered.filter(call => 
        call.startTime >= filters.dateRange!.start &&
        call.startTime <= filters.dateRange!.end
      );
    }

    if (filters.participants?.length) {
      filtered = filtered.filter(call =>
        filters.participants!.some(p => 
          call.participants.some(participant => participant.id === p)
        )
      );
    }

    if (filters.duration) {
      filtered = filtered.filter(call =>
        call.duration >= filters.duration!.min &&
        call.duration <= filters.duration!.max
      );
    }

    if (filters.hasRecordings !== undefined) {
      filtered = filtered.filter(call =>
        filters.hasRecordings ? call.recordings.length > 0 : call.recordings.length === 0
      );
    }

    if (filters.hasNotes !== undefined) {
      filtered = filtered.filter(call =>
        filters.hasNotes ? !!call.notes : !call.notes
      );
    }

    if (filters.meetingType) {
      filtered = filtered.filter(call => call.meetingType === filters.meetingType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sort.field];
      let bValue: any = b[sort.field];

      if (sort.field === 'participants') {
        aValue = a.participants.length;
        bValue = b.participants.length;
      }

      if (aValue instanceof Date) {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sort.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [callHistory, filters, sort]);

  // Get call statistics
  const getStatistics = useCallback(() => {
    const totalCalls = callHistory.length;
    const totalDuration = callHistory.reduce((sum, call) => sum + call.duration, 0);
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
    const totalRecordings = callHistory.reduce((sum, call) => sum + call.recordings.length, 0);
    const totalParticipants = callHistory.reduce((sum, call) => sum + call.participants.length, 0);
    const avgParticipants = totalCalls > 0 ? totalParticipants / totalCalls : 0;

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const callsThisMonth = callHistory.filter(call => call.startTime >= thisMonth).length;

    return {
      totalCalls,
      totalDuration,
      avgDuration,
      totalRecordings,
      avgParticipants,
      callsThisMonth
    };
  }, [callHistory]);

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, []);

  return {
    // State
    callHistory: getFilteredHistory(),
    currentCall,
    isLoading,
    filters,
    sort,
    
    // Actions
    startCall,
    endCall,
    addParticipant,
    removeParticipant,
    addChatMessage,
    trackScreenShare,
    updateQualityMetrics,
    addNotes,
    deleteCall,
    
    // Filters and sorting
    setFilters,
    setSort,
    
    // Utilities
    getStatistics,
    formatDuration,
    loadCallHistory
  };
}