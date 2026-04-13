/**
 * Video Call Interface Component
 * WebRTC video conferencing UI
 * Phase 4.1 - Video Communication System
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Users,
  Settings,
  MoreVertical,
  Record,
  StopCircle,
} from 'lucide-react';

interface Participant {
  id: string;
  userId: string;
  displayName: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  isSharingScreen: boolean;
  connectionStatus: string;
}

interface VideoCallInterfaceProps {
  roomId: string;
  userId: string;
  displayName: string;
  onLeave: () => void;
}

export function VideoCallInterface({
  roomId,
  userId,
  displayName,
  onLeave,
}: VideoCallInterfaceProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Initialize video call
    initializeCall();
    loadParticipants();

    // Cleanup on unmount
    return () => {
      cleanupCall();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Join room via API
      const response = await fetch(`/api/video/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          displayName,
          role: 'participant',
        }),
      });

      const data = await response.json();

      // Initialize WebRTC with token
      // This would integrate with Agora/Twilio SDK
      // const webrtcToken = data.token;

      // Get local media stream
      if (navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
    } catch (error) {
      console.error('Failed to initialize call:', error);
    }
  };

  const cleanupCall = async () => {
    try {
      // Stop local streams
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }

      // Leave room
      await fetch(`/api/video/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  const loadParticipants = async () => {
    try {
      const response = await fetch(`/api/video/rooms/${roomId}/participants`);
      const data = await response.json();
      setParticipants(data.participants || []);
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  };

  const toggleCamera = async () => {
    const newState = !isCameraOn;
    setIsCameraOn(newState);

    // Update local stream
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
    }

    // Update server
    await updateParticipantStatus({ isCameraOn: newState });
  };

  const toggleMic = async () => {
    const newState = !isMicOn;
    setIsMicOn(newState);

    // Update local stream
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
    }

    // Update server
    await updateParticipantStatus({ isMicOn: newState });
  };

  const toggleScreenShare = async () => {
    try {
      if (!isSharingScreen) {
        // Start screen share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }

        setIsSharingScreen(true);
        await updateParticipantStatus({ isSharingScreen: true });
      } else {
        // Stop screen share
        if (screenShareRef.current && screenShareRef.current.srcObject) {
          const stream = screenShareRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          screenShareRef.current.srcObject = null;
        }

        setIsSharingScreen(false);
        await updateParticipantStatus({ isSharingScreen: false });
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  };

  const updateParticipantStatus = async (updates: any) => {
    try {
      await fetch(`/api/video/rooms/${roomId}/participant`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const toggleRecording = async () => {
    try {
      if (!isRecording) {
        await fetch(`/api/video/rooms/${roomId}/recording/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startedBy: userId }),
        });
        setIsRecording(true);
      } else {
        await fetch(`/api/video/rooms/${roomId}/recording/stop`, {
          method: 'POST',
        });
        setIsRecording(false);
      }
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const handleLeave = async () => {
    await cleanupCall();
    onLeave();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Main Video Grid */}
      <div className="flex-1 relative">
        {/* Screen Share (if active) */}
        {isSharingScreen && (
          <div className="absolute inset-0">
            <video
              ref={screenShareRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Participant Videos */}
        <div className={`grid ${participants.length === 1 ? 'grid-cols-1' : participants.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2 p-4 h-full`}>
          {/* Local Video */}
          <Card className="bg-gray-800 border-gray-700 relative overflow-hidden">
            <CardContent className="p-0 h-full">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-2">
                      <span className="text-3xl font-bold text-white">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-white font-medium">{displayName} (You)</p>
                  </div>
                </div>
              )}

              {/* Participant Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{displayName} (You)</span>
                  <div className="flex items-center gap-1">
                    {!isMicOn && <MicOff className="w-4 h-4 text-red-500" />}
                    {!isCameraOn && <VideoOff className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remote Participants */}
          {participants.filter(p => p.userId !== userId).map((participant) => (
            <Card key={participant.id} className="bg-gray-800 border-gray-700 relative overflow-hidden">
              <CardContent className="p-0 h-full">
                {participant.isCameraOn ? (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    {/* WebRTC remote video would go here */}
                    <p className="text-gray-400">Video stream</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center mx-auto mb-2">
                        <span className="text-3xl font-bold text-white">
                          {participant.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-white font-medium">{participant.displayName}</p>
                    </div>
                  </div>
                )}

                {/* Participant Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{participant.displayName}</span>
                    <div className="flex items-center gap-1">
                      {!participant.isMicOn && <MicOff className="w-4 h-4 text-red-500" />}
                      {participant.isSharingScreen && <Monitor className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <span className="text-white font-medium mr-4">Video Call</span>
            {isRecording && (
              <div className="flex items-center gap-2 text-red-500">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium">Recording</span>
              </div>
            )}
          </div>

          {/* Center Controls */}
          <div className="flex items-center gap-3">
            <Button
              onClick={toggleCamera}
              variant={isCameraOn ? 'default' : 'destructive'}
              size="lg"
              className="rounded-full w-14 h-14"
              title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            <Button
              onClick={toggleMic}
              variant={isMicOn ? 'default' : 'destructive'}
              size="lg"
              className="rounded-full w-14 h-14"
              title={isMicOn ? 'Mute' : 'Unmute'}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>

            <Button
              onClick={toggleScreenShare}
              variant={isSharingScreen ? 'default' : 'secondary'}
              size="lg"
              className="rounded-full w-14 h-14"
              title={isSharingScreen ? 'Stop sharing' : 'Share screen'}
            >
              {isSharingScreen ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>

            <Button
              onClick={handleLeave}
              variant="destructive"
              size="lg"
              className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
              title="Leave call"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowParticipants(!showParticipants)}
              variant="secondary"
              size="lg"
              className="rounded-full"
              title="Participants"
            >
              <Users className="w-5 h-5" />
              <span className="ml-2">{participants.length}</span>
            </Button>

            <Button
              onClick={toggleRecording}
              variant={isRecording ? 'destructive' : 'secondary'}
              size="lg"
              className="rounded-full"
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <StopCircle className="w-5 h-5" /> : <Record className="w-5 h-5" />}
            </Button>

            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="secondary"
              size="lg"
              className="rounded-full"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Participants Panel */}
      {showParticipants && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <h3 className="text-white font-semibold mb-4">
            Participants ({participants.length})
          </h3>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {participant.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {participant.displayName}
                      {participant.userId === userId && ' (You)'}
                    </p>
                    <p className="text-gray-400 text-xs">{participant.connectionStatus}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!participant.isMicOn && <MicOff className="w-4 h-4 text-red-500" />}
                  {!participant.isCameraOn && <VideoOff className="w-4 h-4 text-red-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

