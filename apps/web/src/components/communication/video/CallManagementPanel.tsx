import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  UserX, 
  Crown, 
  Shield,
  Settings,
  Copy,
  Send,
  Search,
  Volume2,
  VolumeX,
  Pin,
  Camera,
  Monitor,
  Hand,
  MessageSquare,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface Participant {
  id: string;
  name?: string;
  email?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  role?: 'host' | 'co-host' | 'participant';
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  joinedAt?: Date;
}

interface CallManagementPanelProps {
  participants: Set<string>;
  currentUserId: string;
  isHost?: boolean;
  roomId: string;
  onInviteParticipant?: (email: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
  onMuteParticipant?: (participantId: string, muted: boolean) => void;
  onPromoteToCoHost?: (participantId: string) => void;
  onPinParticipant?: (participantId: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function CallManagementPanel({
  participants,
  currentUserId,
  isHost = false,
  roomId,
  onInviteParticipant,
  onRemoveParticipant,
  onMuteParticipant,
  onPromoteToCoHost,
  onPinParticipant,
  isVisible,
  onClose
}: CallManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<'participants' | 'chat' | 'settings'>('participants');
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
  }>>([]);

  // Mock participant data - in real implementation, this would come from props
  const mockParticipants: Participant[] = Array.from(participants).map((id, index) => ({
    id,
    name: id === currentUserId ? 'You' : `Participant ${index + 1}`,
    email: id === currentUserId ? 'you@example.com' : `participant${index + 1}@example.com`,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    isHandRaised: false,
    role: id === currentUserId && isHost ? 'host' : 'participant',
    connectionQuality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)] as any,
    joinedAt: new Date(Date.now() - Math.random() * 3600000)
  }));

  const filteredParticipants = mockParticipants.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = () => {
    if (inviteEmail && onInviteParticipant) {
      onInviteParticipant(inviteEmail);
      setInviteEmail('');
      toast.success(`Invitation sent to ${inviteEmail}`);
    }
  };

  const handleSendChat = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        sender: 'You',
        message: chatMessage.trim(),
        timestamp: new Date()
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatMessage('');
    }
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/video-call/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Meeting link copied to clipboard');
  };

  const getConnectionQualityColor = (quality?: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'host': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'co-host': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Call Management
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab('participants')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'participants' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Participants ({mockParticipants.length})
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'chat' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Chat ({chatMessages.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'settings' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </div>

          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div className="space-y-4">
              {/* Invite Section */}
              {isHost && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email to invite"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                  />
                  <Button onClick={handleInvite} size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search participants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Participants List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredParticipants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {participant.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{participant.name}</p>
                        {getRoleIcon(participant.role)}
                        {participant.isHandRaised && (
                          <Hand className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{participant.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn("flex gap-1", getConnectionQualityColor(participant.connectionQuality))}>
                          <div className="w-1 h-2 bg-current rounded-full"></div>
                          <div className="w-1 h-2 bg-current rounded-full"></div>
                          <div className="w-1 h-2 bg-current rounded-full opacity-70"></div>
                          <div className="w-1 h-2 bg-current rounded-full opacity-40"></div>
                        </div>
                        <span className="text-xs text-gray-400 capitalize">
                          {participant.connectionQuality}
                        </span>
                      </div>
                    </div>

                    {/* Participant Status */}
                    <div className="flex items-center gap-1">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center",
                        participant.isMuted ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                      )}>
                        {participant.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center",
                        participant.isVideoOff ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {participant.isVideoOff ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                      </div>
                      {participant.isScreenSharing && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-purple-100 text-purple-600">
                          <Monitor className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Host Actions */}
                    {isHost && participant.id !== currentUserId && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPinParticipant?.(participant.id)}
                          title="Pin participant"
                        >
                          <Pin className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMuteParticipant?.(participant.id, !participant.isMuted)}
                          title={participant.isMuted ? "Unmute" : "Mute"}
                        >
                          {participant.isMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPromoteToCoHost?.(participant.id)}
                          title="Promote to co-host"
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveParticipant?.(participant.id)}
                          title="Remove participant"
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              {/* Chat Messages */}
              <div className="border rounded-lg p-4 h-64 overflow-y-auto space-y-2">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                    <p>No messages yet</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {msg.sender.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{msg.sender}</span>
                          <span className="text-xs text-gray-400">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                />
                <Button onClick={handleSendChat} size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Meeting Link</span>
                  <Button variant="outline" size="sm" onClick={copyMeetingLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Room ID</span>
                  <Badge variant="secondary">{roomId}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Participants</span>
                  <Badge variant="outline">{mockParticipants.length}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Call Duration</span>
                  <Badge variant="outline">45:30</Badge>
                </div>

                {isHost && (
                  <>
                    <hr className="my-4" />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Host Controls</h4>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Mute all participants</span>
                        <Button variant="outline" size="sm">
                          <MicOff className="w-4 h-4 mr-2" />
                          Mute All
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Lock meeting</span>
                        <Button variant="outline" size="sm">
                          Lock Meeting
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">End meeting for all</span>
                        <Button variant="destructive" size="sm">
                          End Meeting
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}