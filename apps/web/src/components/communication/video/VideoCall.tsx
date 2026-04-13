import React, { useRef, useEffect, useState } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  Phone, 
  PhoneOff,
  Users,
  Settings,
  MessageSquare,
  AlertCircle,
  Wifi,
  WifiOff,
  Circle,
  Square,
  Image,
  Palette,
  Volume2,
  VolumeX,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';
import { useMeetingAnalytics } from '@/hooks/useMeetingAnalytics';
import { MeetingAnalytics } from './MeetingAnalytics';

export function VideoCall({ roomId }: { roomId: string }) {
  const { 
    startCall, 
    leaveCall, 
    localStream, 
    remoteStreams, 
    connected,
    startRecording,
    stopRecording,
    isRecording,
    recordingTime
  } = useWebRTC(roomId);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [virtualBackground, setVirtualBackground] = useState<string | null>(null);
  const [showBackgroundOptions, setShowBackgroundOptions] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Analytics integration
  const analytics = useMeetingAnalytics(roomId);

  // Virtual background options
  const backgroundOptions = [
    { name: 'None', value: null, preview: null },
    { name: 'Blur', value: 'blur', preview: '🔵' },
    { name: 'Office', value: '/backgrounds/office.jpg', preview: '🏢' },
    { name: 'Nature', value: '/backgrounds/nature.jpg', preview: '🌲' },
    { name: 'Abstract', value: '/backgrounds/abstract.jpg', preview: '🎨' },
  ];

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (!connected) return;
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [connected, showControls]);

  // Attach local/camera or screen stream to video element
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = screenStream || localStream;
    }
  }, [localStream, screenStream]);

  // Toggle audio/video tracks
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => (track.enabled = audioEnabled));
      localStream.getVideoTracks().forEach(track => (track.enabled = videoEnabled));
    }
  }, [audioEnabled, videoEnabled, localStream]);

  // Audio level monitoring
  useEffect(() => {
    if (!localStream || !audioEnabled) return;
    
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(localStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average);
    };
    
    const interval = setInterval(updateAudioLevel, 100);
    return () => {
      clearInterval(interval);
      audioContext.close();
    };
  }, [localStream, audioEnabled]);

  // Error handling for media access
  const handleStartCall = async () => {
    try {
      setConnectionError(null);
      await startCall();
      analytics.startTracking();
      analytics.updateParticipantCount(1);
      toast.success('Call started successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start call';
      setConnectionError(errorMessage);
      analytics.trackError(errorMessage);
      toast.error(`Call failed: ${errorMessage}`);
    }
  };

  // Screen sharing logic with better error handling
  const handleShareScreen = async () => {
    if (!connected) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          displaySurface: 'monitor'
        } 
      });
      setScreenStream(stream);
      setIsSharing(true);
      analytics.trackScreenShare(true);
      toast.success('Screen sharing started');
      
      // Replace video track in all peer connections
      stream.getVideoTracks().forEach(screenTrack => {
        if (localStream) {
          localStream.getVideoTracks().forEach(camTrack => camTrack.enabled = false);
        }
      });
      
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setIsSharing(false);
        analytics.trackScreenShare(false);
        if (localStream) {
          localStream.getVideoTracks().forEach(camTrack => camTrack.enabled = videoEnabled);
        }
        toast.info('Screen sharing stopped');
      };
    } catch (error) {
      toast.error('Failed to start screen sharing');
      console.error('Screen sharing error:', error);
    }
  };

  const handleStopSharing = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsSharing(false);
      analytics.trackScreenShare(false);
      if (localStream) {
        localStream.getVideoTracks().forEach(camTrack => camTrack.enabled = videoEnabled);
      }
      toast.info('Screen sharing stopped');
    }
  };

  const handleLeaveCall = () => {
    if (isRecording) {
      stopRecording();
    }
    analytics.stopTracking();
    handleStopSharing();
    leaveCall();
    toast.info('Call ended');
  };

  const handleToggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    toast.info(audioEnabled ? 'Microphone muted' : 'Microphone unmuted');
  };

  const handleToggleVideo = () => {
    setVideoEnabled(!videoEnabled);
    toast.info(videoEnabled ? 'Camera turned off' : 'Camera turned on');
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      analytics.trackRecording(false);
      toast.success('Recording stopped');
    } else {
      startRecording();
      analytics.trackRecording(true);
      toast.success('Recording started');
    }
  };

  const handleBackgroundChange = (background: string | null) => {
    setVirtualBackground(background);
    setShowBackgroundOptions(false);
    toast.info(background ? `Background changed to ${background}` : 'Background removed');
  };

  const participantCount = 1 + remoteStreams.length;

  return (
    <div
      className="relative flex flex-col h-full bg-gradient-to-br from-slate-900 to-slate-800 text-white"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => connected && setShowControls(false)}
    >
      {/* Connection Status */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className={cn(
          "w-3 h-3 rounded-full",
          connected ? "bg-green-500 animate-pulse" : "bg-red-500"
        )} />
        <span className="text-sm font-medium">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        {connectionError && (
          <Badge badgeColor="red" className="text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            {connectionError}
          </Badge>
        )}
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">REC {recordingTime}</span>
        </div>
      )}

      {/* Participant Count */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <Badge variant="secondary" className="bg-black/50 text-white">
          <Users className="w-3 h-3 mr-1" />
          {participantCount} participant{participantCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Main Video Grid */}
      <div className="flex-1 relative overflow-hidden">
        {!connected ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Video className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold mb-2">Ready to Join</h3>
              <p className="text-slate-400 mb-4">Click start to begin your video call</p>
              <Button onClick={handleStartCall} className="bg-green-600 hover:bg-green-700">
                <Phone className="w-4 h-4 mr-2" />
                Start Call
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            {/* Local Video */}
            <div className="relative rounded-lg overflow-hidden bg-slate-800">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={cn(
                  "w-full h-full object-cover",
                  virtualBackground && "filter backdrop-blur-sm"
                )}
                style={{
                  backgroundImage: virtualBackground && virtualBackground !== 'blur' 
                    ? `url(${virtualBackground})` 
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              {virtualBackground && (
                <div className="absolute inset-0 bg-black/20" />
              )}
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary" className="bg-black/50">
                  You
                </Badge>
              </div>
              {!videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <VideoOff className="w-12 h-12 text-slate-400" />
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {remoteStreams.map((stream, index) => (
              <div key={index} className="relative rounded-lg overflow-hidden bg-slate-800">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(el) => {
                    if (el) el.srcObject = stream;
                  }}
                />
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="bg-black/50">
                    Participant {index + 1}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Controls */}
      {connected && (
        <div className={cn(
          "absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          {/* Audio Control */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleAudio}
            className={cn(
              "h-12 w-12 rounded-full",
              !audioEnabled && "bg-red-600 hover:bg-red-700"
            )}
          >
            {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          {/* Video Control */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleVideo}
            className={cn(
              "h-12 w-12 rounded-full",
              !videoEnabled && "bg-red-600 hover:bg-red-700"
            )}
          >
            {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* Screen Share */}
          <Button
            variant="secondary"
            size="sm"
            onClick={isSharing ? handleStopSharing : handleShareScreen}
            className={cn(
              "h-12 w-12 rounded-full",
              isSharing && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </Button>

          {/* Recording */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleRecording}
            className={cn(
              "h-12 w-12 rounded-full",
              isRecording && "bg-red-600 hover:bg-red-700"
            )}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
          </Button>

          {/* Virtual Background */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBackgroundOptions(!showBackgroundOptions)}
              className="h-12 w-12 rounded-full"
            >
              <Image className="w-5 h-5" />
            </Button>
            {showBackgroundOptions && (
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 rounded-lg p-2 shadow-lg">
                {backgroundOptions.map((bg) => (
                  <button
                    key={bg.value || 'none'}
                    onClick={() => handleBackgroundChange(bg.value)}
                    className={cn(
                      "block w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-sm",
                      virtualBackground === bg.value && "bg-blue-600"
                    )}
                  >
                    <span className="mr-2">{bg.preview || '🚫'}</span>
                    {bg.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Analytics */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAnalytics(true)}
            className="h-12 w-12 rounded-full"
          >
            <BarChart3 className="w-5 h-5" />
          </Button>

          {/* Leave Call */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLeaveCall}
            className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Audio Level Indicator */}
      {connected && audioEnabled && (
        <div className="absolute bottom-20 left-4 z-10">
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
            <Volume2 className="w-4 h-4" />
            <div className="w-16 h-2 bg-slate-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${(audioLevel / 255) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Meeting Analytics Modal */}
      <MeetingAnalytics 
        roomId={roomId}
        isVisible={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />
    </div>
  );
}

// Video player component for individual streams
function VideoPlayer({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-cover rounded-lg"
    />
  );
} 