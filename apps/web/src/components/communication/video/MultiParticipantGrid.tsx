import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX,
  User,
  Pin,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Participant {
  id: string;
  stream: MediaStream;
  name?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

interface MultiParticipantGridProps {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  participants: Set<string>;
  currentUserId?: string;
  className?: string;
}

export function MultiParticipantGrid({ 
  localStream, 
  remoteStreams, 
  participants,
  currentUserId = 'local',
  className 
}: MultiParticipantGridProps) {
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null);
  const [showControls, setShowControls] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});

  // Calculate grid layout based on participant count
  const totalParticipants = participants.size + (localStream ? 1 : 0);
  const getGridConfig = (count: number) => {
    if (count <= 2) return { cols: count === 1 ? 1 : 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    if (count <= 12) return { cols: 4, rows: 3 };
    return { cols: 4, rows: Math.ceil(count / 4) };
  };

  const gridConfig = getGridConfig(totalParticipants);

  // Set up video streams
  useEffect(() => {
    // Set local stream
    if (localStream && videoRefs.current['local']) {
      videoRefs.current['local'].srcObject = localStream;
    }

    // Set remote streams
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      if (videoRefs.current[peerId]) {
        videoRefs.current[peerId].srcObject = stream;
      }
    });
  }, [localStream, remoteStreams]);

  const togglePin = (participantId: string) => {
    setPinnedParticipant(prev => prev === participantId ? null : participantId);
  };

  const handleMouseEnter = (participantId: string) => {
    setShowControls(prev => ({ ...prev, [participantId]: true }));
  };

  const handleMouseLeave = (participantId: string) => {
    setShowControls(prev => ({ ...prev, [participantId]: false }));
  };

  const renderParticipantVideo = (participantId: string, stream: MediaStream | null, isLocal = false) => {
    const isPinned = pinnedParticipant === participantId;
    const shouldShowControls = showControls[participantId];
    
    return (
      <div
        key={participantId}
        className={cn(
          "relative bg-gray-900 rounded-lg overflow-hidden transition-all duration-300",
          isPinned && pinnedParticipant ? "col-span-2 row-span-2" : "",
          "hover:ring-2 hover:ring-blue-500"
        )}
        onMouseEnter={() => handleMouseEnter(participantId)}
        onMouseLeave={() => handleMouseLeave(participantId)}
      >
        {/* Video Element */}
        <video
          ref={(el) => {
            if (el) videoRefs.current[participantId] = el;
          }}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local stream to prevent feedback
          className="w-full h-full object-cover"
        />
        
        {/* Video Placeholder */}
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-white text-sm">
                {isLocal ? 'You' : `Participant ${participantId}`}
              </p>
            </div>
          </div>
        )}

        {/* Participant Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">
                {isLocal ? 'You' : `Participant ${participantId}`}
              </span>
              {isLocal && (
                <span className="text-xs text-gray-300 bg-black/40 px-2 py-1 rounded">
                  LOCAL
                </span>
              )}
            </div>
            
            {/* Audio/Video Status */}
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Mic className="w-3 h-3 text-white" />
              </div>
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Video className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Hover Controls */}
        {shouldShowControls && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              className="w-8 h-8 p-0 bg-black/40 hover:bg-black/60"
              onClick={() => togglePin(participantId)}
            >
              <Pin className={cn("w-4 h-4", isPinned ? "text-yellow-500" : "text-white")} />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="w-8 h-8 p-0 bg-black/40 hover:bg-black/60"
            >
              <MoreHorizontal className="w-4 h-4 text-white" />
            </Button>
          </div>
        )}

        {/* Connection Quality Indicator */}
        <div className="absolute top-2 left-2">
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-green-500 rounded-full"></div>
            <div className="w-1 h-3 bg-green-500 rounded-full"></div>
            <div className="w-1 h-3 bg-green-500 rounded-full"></div>
            <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  };

  if (totalParticipants === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-gray-900 rounded-lg", className)}>
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-white text-lg mb-2">Waiting for participants...</p>
          <p className="text-gray-400 text-sm">Your video call will start when someone joins</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full", className)}>
      {/* Pinned View */}
      {pinnedParticipant && (
        <div className="flex h-full gap-2">
          {/* Main pinned video */}
          <div className="flex-1">
            {pinnedParticipant === 'local' ? 
              renderParticipantVideo('local', localStream, true) :
              renderParticipantVideo(pinnedParticipant, remoteStreams[pinnedParticipant])
            }
          </div>
          
          {/* Sidebar with other participants */}
          <div className="w-48 space-y-2 overflow-y-auto">
            {/* Local stream (if not pinned) */}
            {localStream && pinnedParticipant !== 'local' && (
              <div className="aspect-video">
                {renderParticipantVideo('local', localStream, true)}
              </div>
            )}
            
            {/* Remote streams (if not pinned) */}
            {Array.from(participants).map(peerId => {
              if (peerId === pinnedParticipant) return null;
              return (
                <div key={peerId} className="aspect-video">
                  {renderParticipantVideo(peerId, remoteStreams[peerId])}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid View */}
      {!pinnedParticipant && (
        <div 
          className={cn(
            "grid gap-2 h-full",
            `grid-cols-${gridConfig.cols}`,
            totalParticipants > 4 && "grid-rows-2"
          )}
          style={{
            gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
            gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`
          }}
        >
          {/* Local video */}
          {localStream && renderParticipantVideo('local', localStream, true)}
          
          {/* Remote videos */}
          {Array.from(participants).map(peerId => 
            renderParticipantVideo(peerId, remoteStreams[peerId])
          )}
        </div>
      )}

      {/* Participant Counter */}
      <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
        {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
      </div>
    </div>
  );
}