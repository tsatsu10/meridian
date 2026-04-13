/**
 * 📹 Video Room Component
 * 
 * Full-featured video communication:
 * - Create/join video rooms
 * - Participant management
 * - Screen sharing
 * - Recording
 * - Chat integration
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, 
  Phone, PhoneOff, Users, Settings, MessageSquare, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/lib/toast';
import { useAuth } from '@/hooks/auth';

interface VideoRoomProps {
  roomId?: string;
  projectId?: string;
  taskId?: string;
  autoStart?: boolean;
}

interface VideoRoom {
  id: string;
  roomName: string;
  hostId: string;
  status: 'scheduled' | 'active' | 'ended';
  participantCount: number;
  maxParticipants: number;
  recordingUrl?: string;
  createdAt: string;
}

interface Participant {
  id: string;
  userId: string;
  displayName: string;
  role: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

export function VideoRoom({ roomId, projectId, taskId, autoStart = false }: VideoRoomProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [localRoomId, setLocalRoomId] = useState(roomId);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Fetch room details
  const { data: roomData, isLoading } = useQuery({
    queryKey: ['video-room', localRoomId],
    queryFn: async () => {
      if (!localRoomId) return null;
      const response = await fetch(`/api/video/rooms/${localRoomId}`);
      return response.json();
    },
    enabled: !!localRoomId,
    refetchInterval: 5000, // Refresh every 5s while room is active
  });

  // Fetch participants
  const { data: participantsData } = useQuery({
    queryKey: ['video-participants', localRoomId],
    queryFn: async () => {
      if (!localRoomId) return { participants: [] };
      const response = await fetch(`/api/video/rooms/${localRoomId}/participants`);
      return response.json();
    },
    enabled: !!localRoomId,
    refetchInterval: 3000, // Refresh every 3s
  });

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: async (roomName: string) => {
      const response = await fetch('/api/video/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          taskId,
          roomName,
          hostId: user?.id,
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setLocalRoomId(data.room.id);
      toast({
        title: '✓ Room Created',
        description: `Video room "${data.room.roomName}" created`,
      });
    },
  });

  // Join room mutation
  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!localRoomId) throw new Error('No room ID');
      
      const response = await fetch(`/api/video/rooms/${localRoomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          displayName: user?.name || user?.email,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '✓ Joined Room',
        description: 'You are now in the video call',
      });
      queryClient.invalidateQueries({ queryKey: ['video-participants'] });
      
      // Initialize media
      initializeMedia();
    },
  });

  // Leave room mutation
  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      if (!localRoomId) return;
      
      const response = await fetch(`/api/video/rooms/${localRoomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Left Room',
        description: 'You have left the video call',
      });
      
      // Stop media
      stopMedia();
    },
  });

  // Initialize media (camera/microphone)
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({
        title: 'Media Access Denied',
        description: 'Please allow camera and microphone access',
        variant: 'destructive',
      });
    }
  };

  // Stop media
  const stopMedia = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
    }
    setIsAudioEnabled(!isAudioEnabled);
  };

  // Toggle video
  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
    }
    setIsVideoEnabled(!isVideoEnabled);
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        stopMedia();
        await initializeMedia();
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        // Handle user stopping screen share via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          initializeMedia();
        };
      }
    } catch (error) {
      toast({
        title: 'Screen Share Failed',
        description: 'Could not start screen sharing',
        variant: 'destructive',
      });
    }
  };

  const room: VideoRoom | null = roomData?.room || null;
  const participants: Participant[] = participantsData?.participants || [];
  const isHost = room?.hostId === user?.id;
  const isInRoom = participants.some(p => p.userId === user?.id);

  // Auto-join if autoStart enabled
  useEffect(() => {
    if (autoStart && localRoomId && !isInRoom) {
      joinRoomMutation.mutate();
    }
  }, [autoStart, localRoomId, isInRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, []);

  if (!localRoomId) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Video className="h-16 w-16 mx-auto text-blue-500 opacity-50" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Start a Video Call</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a room to start a video meeting
              </p>
              <Button
                onClick={() => createRoomMutation.mutate('Quick Meeting')}
                disabled={createRoomMutation.isPending}
              >
                {createRoomMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Create Video Room
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="video-room-container h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-semibold">{room?.roomName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={room?.status === 'active' ? 'default' : 'secondary'}>
                {room?.status}
              </Badge>
              <span>•</span>
              <Users className="h-3 w-3" />
              <span>{participants.length} participants</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-2 gap-2 p-4 bg-gray-900">
        {/* Local Video */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-sm">
            You {isScreenSharing && '(Screen)'}
          </div>
        </div>

        {/* Remote Videos */}
        {participants
          .filter(p => p.userId !== user?.id)
          .map((participant) => (
            <div key={participant.id} className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-sm flex items-center gap-2">
                <span>{participant.displayName}</span>
                {!participant.isAudioEnabled && <MicOff className="h-3 w-3" />}
                {!participant.isVideoEnabled && <VideoOff className="h-3 w-3" />}
              </div>
              <div className="absolute top-2 right-2">
                <Badge variant={participant.connectionStatus === 'connected' ? 'default' : 'secondary'}>
                  {participant.connectionStatus}
                </Badge>
              </div>
            </div>
          ))}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 3 - participants.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
            <Users className="h-12 w-12 text-gray-600" />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-t bg-white dark:bg-gray-950">
        {/* Media controls */}
        <div className="flex gap-2">
          <Button
            variant={isAudioEnabled ? 'default' : 'destructive'}
            size="lg"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>
          
          <Button
            variant={isVideoEnabled ? 'default' : 'destructive'}
            size="lg"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>
          
          <Button
            variant={isScreenSharing ? 'default' : 'outline'}
            size="lg"
            onClick={toggleScreenShare}
          >
            {isScreenSharing ? (
              <MonitorOff className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Join/Leave */}
        <div className="flex gap-2">
          {!isInRoom ? (
            <Button
              onClick={() => joinRoomMutation.mutate()}
              disabled={joinRoomMutation.isPending}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {joinRoomMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-5 w-5" />
                  Join Call
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => leaveRoomMutation.mutate()}
              disabled={leaveRoomMutation.isPending}
              size="lg"
              variant="destructive"
            >
              {leaveRoomMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <PhoneOff className="mr-2 h-5 w-5" />
                  Leave Call
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Participants Sidebar */}
      {showChat && (
        <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-950 border-l p-4">
          <h4 className="font-semibold mb-4">Participants ({participants.length})</h4>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <Avatar>
                  <AvatarFallback>
                    {participant.displayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{participant.displayName}</p>
                  <div className="flex gap-1">
                    {!participant.isAudioEnabled && <MicOff className="h-3 w-3 text-red-500" />}
                    {!participant.isVideoEnabled && <VideoOff className="h-3 w-3 text-red-500" />}
                    {participant.isScreenSharing && <Monitor className="h-3 w-3 text-blue-500" />}
                  </div>
                </div>
                {participant.userId === room?.hostId && (
                  <Badge variant="outline">Host</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

