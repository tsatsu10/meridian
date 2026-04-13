import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Send,
  Volume2,
  Download
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface VoiceRecorderProps {
  onVoiceMessage: (audioBlob: Blob, duration: number) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  maxDuration?: number; // in seconds
}

interface VoiceRecording {
  blob: Blob;
  url: string;
  duration: number;
}

export default function VoiceRecorder({ 
  onVoiceMessage, 
  trigger, 
  disabled = false,
  className,
  maxDuration = 300 // 5 minutes default
}: VoiceRecorderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentRecording, setCurrentRecording] = useState<VoiceRecording | null>(null);
  const [volume, setVolume] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" disabled={disabled} title="Record voice message">
      <Mic className="w-4 h-4" />
    </Button>
  );

  // Check microphone permission
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Microphone permission denied:', error);
        setHasPermission(false);
      }
    };

    if (isOpen && hasPermission === null) {
      checkPermission();
    }
  }, [isOpen, hasPermission]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      
      // Set up audio context for volume visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Volume visualization
      volumeIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setVolume(average / 255);
        }
      }, 100);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setCurrentRecording({
          blob: audioBlob,
          url: audioUrl,
          duration: recordingTime
        });
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (volumeIntervalRef.current) {
          clearInterval(volumeIntervalRef.current);
        }
        
        setVolume(0);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            toast.warning(`Recording stopped: Maximum duration (${maxDuration / 60} minutes) reached`);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to access microphone. Please check permissions.');
      setHasPermission(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  // Pause/Resume recording
  const togglePauseRecording = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        
        intervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }
  };

  // Play/Pause playback
  const togglePlayback = () => {
    if (!currentRecording || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Delete recording
  const deleteRecording = () => {
    if (currentRecording) {
      URL.revokeObjectURL(currentRecording.url);
      setCurrentRecording(null);
    }
    setRecordingTime(0);
  };

  // Send voice message
  const sendVoiceMessage = () => {
    if (currentRecording) {
      onVoiceMessage(currentRecording.blob, currentRecording.duration);
      setIsOpen(false);
      deleteRecording();
      toast.success('Voice message sent!');
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (currentRecording) {
        URL.revokeObjectURL(currentRecording.url);
      }
    };
  }, [currentRecording]);

  if (hasPermission === false) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {trigger || <Button variant="ghost" size="sm" disabled title="Microphone access required">
            <MicOff className="w-4 h-4" />
          </Button>}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <div className="text-center space-y-3">
            <MicOff className="h-8 w-8 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium">Microphone Access Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please allow microphone access to record voice messages.
              </p>
            </div>
            <Button onClick={() => setHasPermission(null)} size="sm">
              Try Again
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className={cn("w-80 p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700", className)} align="start">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-red-500" />
            <h3 className="font-medium">Voice Message</h3>
          </div>

          {!isRecording && !currentRecording && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <Mic className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Tap to start recording your voice message
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum duration: {Math.floor(maxDuration / 60)} minutes
                </p>
              </div>
              <Button onClick={startRecording} className="w-full">
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            </div>
          )}

          {isRecording && (
            <div className="space-y-4">
              <div className="text-center">
                <div className={cn(
                  "w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors",
                  isPaused ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-red-50 dark:bg-red-900/20 animate-pulse"
                )}>
                  <Mic className={cn(
                    "h-8 w-8",
                    isPaused ? "text-yellow-500" : "text-red-500"
                  )} />
                </div>
                
                <div className="mt-2">
                  <div className="text-lg font-mono">{formatTime(recordingTime)}</div>
                  <div className="text-xs text-muted-foreground">
                    {isPaused ? 'Paused' : 'Recording...'}
                  </div>
                </div>

                {/* Volume visualization */}
                <div className="flex justify-center items-center gap-1 mt-2">
                  <Volume2 className="h-3 w-3 text-muted-foreground" />
                  <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 transition-all duration-100"
                      style={{ width: `${volume * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePauseRecording}
                  className="flex-1"
                >
                  {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopRecording}
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </div>
            </div>
          )}

          {currentRecording && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <Volume2 className="h-8 w-8 text-green-500" />
                </div>
                <div className="mt-2">
                  <div className="text-lg font-mono">{formatTime(currentRecording.duration)}</div>
                  <div className="text-xs text-muted-foreground">Recording complete</div>
                </div>
              </div>

              <audio
                ref={audioRef}
                src={currentRecording.url}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePlayback}
                  className="flex-1"
                >
                  {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteRecording}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={sendVoiceMessage} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Send Voice Message
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
            💡 Voice messages are great for quick explanations, feedback, or when typing isn't convenient.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}