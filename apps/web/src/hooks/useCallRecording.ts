import { useState, useRef, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { formatFileSize } from '@/lib/utils/file';

interface RecordingOptions {
  quality: 'high' | 'medium' | 'low';
  includeAudio: boolean;
  includeVideo: boolean;
  saveLocation: 'browser' | 'local' | 'cloud';
  format: 'webm' | 'mp4' | 'mov';
  splitDuration?: number; // in minutes
}

interface RecordingFile {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  duration: number;
  timestamp: Date;
  participants: string[];
  roomId: string;
  format: string;
}

export function useCallRecording(roomId: string, participants: string[]) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedFiles, setRecordedFiles] = useState<RecordingFile[]>([]);
  const [recordingOptions, setRecordingOptions] = useState<RecordingOptions>({
    quality: 'high',
    includeAudio: true,
    includeVideo: true,
    saveLocation: 'local',
    format: 'webm'
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentRecordingIdRef = useRef<string | null>(null);

  // Get quality settings based on option
  const getQualitySettings = useCallback((quality: string) => {
    switch (quality) {
      case 'high':
        return {
          videoBitsPerSecond: 5000000, // 5 Mbps
          audioBitsPerSecond: 256000,  // 256 kbps
          width: 1920,
          height: 1080,
          frameRate: 30
        };
      case 'medium':
        return {
          videoBitsPerSecond: 2500000, // 2.5 Mbps
          audioBitsPerSecond: 128000,  // 128 kbps
          width: 1280,
          height: 720,
          frameRate: 24
        };
      case 'low':
        return {
          videoBitsPerSecond: 1000000, // 1 Mbps
          audioBitsPerSecond: 64000,   // 64 kbps
          width: 854,
          height: 480,
          frameRate: 15
        };
      default:
        return {
          videoBitsPerSecorder: 2500000,
          audioBitsPerSecond: 128000,
          width: 1280,
          height: 720,
          frameRate: 24
        };
    }
  }, []);

  // Create combined stream from all sources
  const createCombinedStream = useCallback((localStream: MediaStream | null, remoteStreams: Record<string, MediaStream>) => {
    const combinedStream = new MediaStream();
    
    if (localStream && recordingOptions.includeVideo) {
      localStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
    }
    
    if (localStream && recordingOptions.includeAudio) {
      localStream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
    }

    // Add remote streams
    Object.values(remoteStreams).forEach(stream => {
      if (recordingOptions.includeVideo) {
        stream.getVideoTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      }
      if (recordingOptions.includeAudio) {
        stream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      }
    });

    return combinedStream;
  }, [recordingOptions]);

  // Start recording
  const startRecording = useCallback(async (localStream: MediaStream | null, remoteStreams: Record<string, MediaStream>) => {
    if (isRecording) return;

    try {
      const combinedStream = createCombinedStream(localStream, remoteStreams);
      const qualitySettings = getQualitySettings(recordingOptions.quality);
      
      // Determine MIME type based on format preference
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (recordingOptions.format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (recordingOptions.format === 'mov' && MediaRecorder.isTypeSupported('video/quicktime')) {
        mimeType = 'video/quicktime';
      }

      const options = {
        mimeType,
        videoBitsPerSecond: qualitySettings.videoBitsPerSecond,
        audioBitsPerSecond: qualitySettings.audioBitsPerSecond,
      };

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];
      currentRecordingIdRef.current = `recording-${Date.now()}`;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        finishRecording();
      };

      // Start recording with time slicing if split duration is specified
      const timeSlice = recordingOptions.splitDuration ? recordingOptions.splitDuration * 60 * 1000 : undefined;
      mediaRecorder.start(timeSlice);
      
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
    }
  }, [isRecording, recordingOptions, createCombinedStream, getQualitySettings]);

  // Pause/Resume recording
  const pauseRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      toast.info('Recording resumed');
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      toast.info('Recording paused');
    }
  }, [isRecording, isPaused]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setIsPaused(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, [isRecording]);

  // Finish recording and save file
  const finishRecording = useCallback(() => {
    if (!currentRecordingIdRef.current) return;

    const blob = new Blob(recordingChunksRef.current, { 
      type: mediaRecorderRef.current?.mimeType || 'video/webm' 
    });
    
    const recordingFile: RecordingFile = {
      id: currentRecordingIdRef.current,
      name: `call-${roomId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${recordingOptions.format}`,
      blob,
      size: blob.size,
      duration: recordingTime,
      timestamp: new Date(),
      participants: [...participants],
      roomId,
      format: recordingOptions.format
    };

    setRecordedFiles(prev => [...prev, recordingFile]);
    
    // Handle different save options
    handleSaveFile(recordingFile);
    
    // Clear references
    recordingChunksRef.current = [];
    currentRecordingIdRef.current = null;
    
    toast.success('Recording saved successfully');
  }, [roomId, recordingTime, participants, recordingOptions.format]);

  // Handle file saving based on options
  const handleSaveFile = useCallback(async (file: RecordingFile) => {
    switch (recordingOptions.saveLocation) {
      case 'browser':
        // Keep in memory/IndexedDB (handled by recordedFiles state)
        break;
        
      case 'local':
        // Download to local drive
        downloadFile(file);
        break;
        
      case 'cloud':
        // Upload to cloud storage (implementation would depend on cloud provider)
        await uploadToCloud(file);
        break;
    }
  }, [recordingOptions.saveLocation]);

  // Download file to local drive
  const downloadFile = useCallback((file: RecordingFile) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Upload to cloud (placeholder implementation)
  const uploadToCloud = useCallback(async (file: RecordingFile) => {
    // This would integrate with your cloud storage provider
    // For now, just simulate upload
    toast.info('Cloud upload would be implemented here');
  }, []);

  // Delete recording
  const deleteRecording = useCallback((recordingId: string) => {
    setRecordedFiles(prev => prev.filter(file => file.id !== recordingId));
    toast.success('Recording deleted');
  }, []);

  // Export recording in different format
  const exportRecording = useCallback(async (recordingId: string, format: 'webm' | 'mp4' | 'mov') => {
    const file = recordedFiles.find(f => f.id === recordingId);
    if (!file) return;

    // For now, just download as-is since format conversion requires additional libraries
    // In a full implementation, you'd use FFmpeg.js or similar
    const exportedFile = {
      ...file,
      name: file.name.replace(/\.[^/.]+$/, `.${format}`),
      format
    };
    
    downloadFile(exportedFile);
    toast.success(`Recording exported as ${format.toUpperCase()}`);
  }, [recordedFiles, downloadFile]);

  // Format recording time
  const formatRecordingTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // formatFileSize now imported from shared utilities

  return {
    // Recording state
    isRecording,
    isPaused,
    recordingTime: formatRecordingTime(recordingTime),
    recordedFiles,
    recordingOptions,
    
    // Recording controls
    startRecording,
    pauseRecording,
    stopRecording,
    setRecordingOptions,
    
    // File management
    deleteRecording,
    downloadFile,
    exportRecording,
    
    // Utilities
    formatFileSize,
    formatRecordingTime
  };
}