// Advanced Team Presence and Status System
import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SmartAvatar } from '@/components/avatar/smart-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Circle,
  Clock,
  Moon,
  Minus,
  Zap,
  Coffee,
  Plane,
  Home,
  Briefcase,
  Users,
  Settings,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Phone,
  Video,
  MessageSquare,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/components/providers/unified-context-provider'
import useWorkspaceStore from '@/store/workspace'
import { useUnifiedWebSocketSingleton } from '@/hooks/useUnifiedWebSocketSingleton'
import { logger } from "../../lib/logger";

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'
export type ActivityStatus = 'active' | 'idle' | 'focus' | 'meeting' | 'break' | 'travel'

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
  department?: string
  timezone?: string
  presence: PresenceStatus
  activity: ActivityStatus
  customStatus?: string
  lastSeen?: Date
  currentProject?: string
  isTyping?: boolean
  typingChannel?: string
  location?: string
  skills?: string[]
  workingHours?: {
    start: string
    end: string
    timezone: string
  }
}

interface TeamPresenceSystemProps {
  onMemberClick?: (member: TeamMember) => void
  onStartChat?: (member: TeamMember) => void
  onStartCall?: (member: TeamMember) => void
  onStartVideo?: (member: TeamMember) => void
  showOfflineMembers?: boolean
  compact?: boolean
}

export function TeamPresenceSystem({
  onMemberClick,
  onStartChat,
  onStartCall,
  onStartVideo,
  showOfflineMembers = false,
  compact = false,
}: TeamPresenceSystemProps) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [myStatus, setMyStatus] = useState<PresenceStatus>('online')
  const [myActivity, setMyActivity] = useState<ActivityStatus>('active')
  const [customStatus, setCustomStatus] = useState('')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [localShowOfflineMembers, setShowOfflineMembers] = useState(showOfflineMembers)

  // Status configurations
  const PRESENCE_CONFIG = {
    online: {
      icon: Circle,
      color: 'text-green-500',
      bg: 'bg-green-100',
      label: 'Online',
      description: 'Available for communication',
    },
    away: {
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-100',
      label: 'Away',
      description: 'Stepped away from the desk',
    },
    busy: {
      icon: Minus,
      color: 'text-red-500',
      bg: 'bg-red-100',
      label: 'Busy',
      description: 'Do not disturb',
    },
    offline: {
      icon: Circle,
      color: 'text-gray-400',
      bg: 'bg-gray-100',
      label: 'Offline',
      description: 'Not available',
    },
  }

  const ACTIVITY_CONFIG = {
    active: {
      icon: Zap,
      color: 'text-blue-500',
      label: 'Active',
      description: 'Currently working',
    },
    idle: {
      icon: Clock,
      color: 'text-gray-500',
      label: 'Idle',
      description: 'Away from keyboard',
    },
    focus: {
      icon: Eye,
      color: 'text-purple-500',
      label: 'Focusing',
      description: 'In deep work mode',
    },
    meeting: {
      icon: Users,
      color: 'text-orange-500',
      label: 'In Meeting',
      description: 'Currently in a meeting',
    },
    break: {
      icon: Coffee,
      color: 'text-green-500',
      label: 'On Break',
      description: 'Taking a break',
    },
    travel: {
      icon: Plane,
      color: 'text-indigo-500',
      label: 'Traveling',
      description: 'Currently traveling',
    },
  }

  // WebSocket integration for real-time presence using singleton
  const websocket = useUnifiedWebSocketSingleton({
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    enabled: user !== undefined && !!user?.email && !!workspace?.id, // Wait for auth to complete
    onMessage: (wsMessage) => {
      if (wsMessage.type === 'presence' && wsMessage.data) {
        handlePresenceUpdate(wsMessage.data)
      }
    },
    onUserJoined: (data) => {
      // Update user online status
      if (data.userEmail) {
        setTeamMembers(prev => 
          prev.map(member => 
            member.email === data.userEmail 
              ? { ...member, presence: 'online', lastSeen: new Date() }
              : member
          )
        )
      }
    },
    onUserLeft: (data) => {
      // Update user offline status (with delay)
      if (data.userEmail) {
        setTimeout(() => {
          setTeamMembers(prev => 
            prev.map(member => 
              member.email === data.userEmail 
                ? { ...member, presence: 'offline', lastSeen: new Date() }
                : member
            )
          )
        }, 30000) // 30 second delay before marking offline
      }
    },
  })

  // Handle presence updates from WebSocket
  const handlePresenceUpdate = useCallback((data: any) => {
    if (data.userEmail && data.userEmail !== user?.email) {
      setTeamMembers(prev => 
        prev.map(member => 
          member.email === data.userEmail 
            ? {
                ...member,
                presence: data.presence || member.presence,
                activity: data.activity || member.activity,
                customStatus: data.customStatus || member.customStatus,
                lastSeen: new Date(),
                isTyping: data.isTyping || false,
                typingChannel: data.typingChannel || undefined,
              }
            : member
        )
      )
    }
  }, [user?.email])

  // Fetch real team members from workspace API
  useEffect(() => {
    const fetchTeamMembers = async () => {
      // Get workspace from localStorage or store
      const workspaceStore = localStorage.getItem('meridian-workspace');
      if (!workspaceStore) {
        console.warn('No workspace found for team presence');
        return;
      }

      try {
        const { state } = JSON.parse(workspaceStore);
        const workspaceId = state?.workspace?.id;
        
        if (!workspaceId) {
          console.warn('No workspace ID found');
          return;
        }

        // Fetch workspace users
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3005'}/api/workspace-users/${workspaceId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch workspace users');
          return;
        }

        const users = await response.json();
        
        // Transform API data to TeamMember format
        const members: TeamMember[] = users.map((u: any) => ({
          id: u.id || u.userId,
          name: u.name || u.userName || u.email?.split('@')[0] || 'Unknown User',
          email: u.email || u.userEmail,
          avatar: u.avatar || `https://avatar.vercel.sh/${u.email || u.userEmail}`,
          role: u.role || 'member',
          department: u.department || 'General',
          presence: u.presence || 'offline',
          activity: u.activity || 'inactive',
          customStatus: u.customStatus || '',
          lastSeen: u.lastSeen ? new Date(u.lastSeen) : new Date(),
          currentProject: u.currentProject || '',
          location: u.location || '',
          skills: u.skills || [],
          workingHours: u.workingHours || { start: '09:00', end: '17:00', timezone: 'UTC' },
        }));

        setTeamMembers(members);
      } catch (error) {
        console.error('Error fetching team members:', error);
        // Fallback to empty array instead of mock data
        setTeamMembers([]);
      }
    };

    fetchTeamMembers();
  }, [])

  // Broadcast status changes
  const broadcastStatusChange = useCallback((presence: PresenceStatus, activity: ActivityStatus, customStatus: string) => {
    if (websocket.connectionState.isConnected) {
      // Send presence update via WebSocket
      const presenceData = {
        userEmail: user?.email,
        presence,
        activity,
        customStatus,
        timestamp: Date.now(),
      }
      
      // This would typically be sent to all channels/rooms the user is in
      logger.info("Broadcasting presence update:")
    }
  }, [websocket.connectionState.isConnected, user?.email])

  // Update my status
  const updateMyStatus = (presence: PresenceStatus, activity: ActivityStatus, customStatus: string) => {
    setMyStatus(presence)
    setMyActivity(activity)
    setCustomStatus(customStatus)
    broadcastStatusChange(presence, activity, customStatus)
  }

  // Filter members based on settings
  const visibleMembers = teamMembers.filter(member => {
    if (!localShowOfflineMembers && member.presence === 'offline') {
      return false
    }
    return true
  })

  const onlineCount = teamMembers.filter(m => m.presence === 'online').length
  const totalCount = teamMembers.length

  // Member item component
  const MemberItem = ({ member }: { member: TeamMember }) => {
    const presenceConfig = PRESENCE_CONFIG[member.presence]
    const activityConfig = ACTIVITY_CONFIG[member.activity]
    const PresenceIcon = presenceConfig.icon
    const ActivityIcon = activityConfig.icon

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors",
                compact && "p-2 gap-2"
              )}
              onClick={() => onMemberClick?.(member)}
            >
              {/* Avatar with presence indicator */}
              <SmartAvatar
                user={{
                  email: member.email,
                  name: member.name,
                  role: member.role,
                  avatar: member.avatar,
                }}
                size={compact ? "sm" : "md"}
                showStatus={true}
                isOnline={member.presence === 'online'}
              />
                
                {/* Additional presence indicator (for activity status) */}
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white flex items-center justify-center",
                  presenceConfig.bg
                )}>
                  <PresenceIcon className={cn("w-2 h-2", presenceConfig.color)} />
                </div>
              </div>

              {/* Member info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-gray-900 truncate",
                      compact ? "text-sm" : "text-sm"
                    )}>
                      {member.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <ActivityIcon className={cn("w-3 h-3", activityConfig.color)} />
                        <span className={cn(
                          "text-gray-500",
                          compact ? "text-xs" : "text-xs"
                        )}>
                          {activityConfig.label}
                        </span>
                      </div>
                      {member.customStatus && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className={cn(
                            "text-gray-500 truncate",
                            compact ? "text-xs" : "text-xs"
                          )}>
                            {member.customStatus}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {!compact && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartChat?.(member)
                        }}
                      >
                        <MessageSquare className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartCall?.(member)
                        }}
                      >
                        <Phone className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartVideo?.(member)
                        }}
                      >
                        <Video className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Typing indicator */}
                {member.isTyping && member.typingChannel && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <span className="text-xs text-blue-600">
                      typing in #{member.typingChannel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>
          
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-2">
              <div className="font-medium">{member.name}</div>
              <div className="text-sm text-gray-600">{member.role}</div>
              {member.currentProject && (
                <div className="text-sm">
                  <span className="font-medium">Project:</span> {member.currentProject}
                </div>
              )}
              {member.location && (
                <div className="text-sm">
                  <span className="font-medium">Location:</span> {member.location}
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium">Status:</span> {presenceConfig.label} • {activityConfig.label}
              </div>
              {member.lastSeen && member.presence !== 'online' && (
                <div className="text-sm">
                  <span className="font-medium">Last seen:</span> {formatDistanceToNow(member.lastSeen, { addSuffix: true })}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Team</h3>
          <Badge variant="secondary" className="text-xs">
            {onlineCount}/{totalCount} online
          </Badge>
          <div className={cn(
            "flex items-center gap-1 text-xs",
            websocket.connectionState.isConnected ? "text-green-600" : "text-orange-600"
          )}>
            {websocket.connectionState.isConnected ? (
              <><Wifi className="w-3 h-3" /> Live</>
            ) : (
              <><WifiOff className="w-3 h-3" /> Offline</>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Settings className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>View Options</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setShowOfflineMembers(!localShowOfflineMembers)}>
              {localShowOfflineMembers ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {localShowOfflineMembers ? 'Hide Offline' : 'Show Offline'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowStatusModal(true)}>
              <Circle className="w-4 h-4 mr-2" />
              Set Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* My Status */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 cursor-pointer"
        onClick={() => setShowStatusModal(true)}
      >
        <SmartAvatar
          user={{
            email: user?.email || '',
            name: user?.name || 'User',
            role: user?.role,
            avatar: user?.avatar,
          }}
          size="md"
          showStatus={true}
          isOnline={currentPresence === 'online'}
        />
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white flex items-center justify-center",
            PRESENCE_CONFIG[myStatus].bg
          )}>
            <Circle className={cn("w-2 h-2", PRESENCE_CONFIG[myStatus].color)} />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">You</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600">
              {PRESENCE_CONFIG[myStatus].label} • {ACTIVITY_CONFIG[myActivity].label}
            </span>
            {customStatus && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-sm text-gray-600 truncate">{customStatus}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {visibleMembers.slice(0, showAllMembers ? undefined : 8).map(member => (
          <MemberItem key={member.id} member={member} />
        ))}
        
        {visibleMembers.length > 8 && !showAllMembers && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setShowAllMembers(true)}
          >
            Show {visibleMembers.length - 8} more members
          </Button>
        )}
      </div>

      {/* Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Your Status</DialogTitle>
            <DialogDescription>
              Choose your presence status, activity, and set a custom message to let your team know what you're working on.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Presence Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Presence</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PRESENCE_CONFIG).filter(([key]) => key !== 'offline').map(([key, config]) => {
                  const IconComponent = config.icon
                  return (
                    <Button
                      key={key}
                      variant={myStatus === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMyStatus(key as PresenceStatus)}
                      className="justify-start"
                    >
                      <IconComponent className={cn("w-4 h-4 mr-2", config.color)} />
                      {config.label}
                    </Button>
                  )
                })}
              </div>
            </div>
            
            {/* Activity Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Activity</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ACTIVITY_CONFIG).map(([key, config]) => {
                  const IconComponent = config.icon
                  return (
                    <Button
                      key={key}
                      variant={myActivity === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMyActivity(key as ActivityStatus)}
                      className="justify-start"
                    >
                      <IconComponent className={cn("w-4 h-4 mr-2", config.color)} />
                      {config.label}
                    </Button>
                  )
                })}
              </div>
            </div>
            
            {/* Custom Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Custom Status</label>
              <Input
                placeholder="What's your status?"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                maxLength={100}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                updateMyStatus(myStatus, myActivity, customStatus)
                setShowStatusModal(false)
              }}>
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}