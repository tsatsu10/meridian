// @epic-3.6-communication: Enhanced channel management component
// @persona-sarah: PM needs comprehensive channel management interface
// @persona-david: Team lead needs member and permission management

"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  Settings, 
  Shield, 
  UserPlus, 
  UserMinus, 
  Crown,
  Lock,
  Unlock,
  MessageSquare,
  Pin,
  Trash2,
  Edit,
  MoreVertical,
  Search,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDistanceToNow } from 'date-fns'
import { Channel, ChannelMember } from '@/types/communication'
import { useChannels } from '@/hooks/use-channels'
import { useActiveWorkspaceUsers } from '@/hooks/use-active-workspace-users'
import useAuth from '@/components/providers/auth-provider/hooks/use-auth'
import useWorkspaceStore from '@/store/workspace'

interface ChannelManagementProps {
  channel: Channel
  onClose: () => void
  onChannelUpdated: (channel: Channel) => void
}

interface MemberWithPermissions extends ChannelMember {
  permissions: {
    canSendMessages: boolean
    canEditMessages: boolean
    canDeleteMessages: boolean
    canPinMessages: boolean
    canInviteMembers: boolean
    canRemoveMembers: boolean
    canManageChannel: boolean
    canManagePermissions: boolean
  }
  isMuted: boolean
  mutedUntil?: Date
}

export function ChannelManagement({ channel, onClose, onChannelUpdated }: ChannelManagementProps) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'permissions' | 'settings'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'joined'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberWithPermissions | null>(null)

  const { data: members = [], isLoading: membersLoading } = useChannels(channel.id)
  const { data: workspaceUsers = [] } = useActiveWorkspaceUsers(workspace?.id || '')

  // Filter and sort members
  const filteredMembers = members
    .filter(member => 
      member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.user.name.localeCompare(b.user.name)
          break
        case 'role':
          comparison = a.role.localeCompare(b.role)
          break
        case 'joined':
          comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />
      case 'moderator':
        return <Settings className="w-4 h-4 text-green-500" />
      case 'member':
        return <Users className="w-4 h-4 text-gray-500" />
      case 'viewer':
        return <MessageSquare className="w-4 h-4 text-gray-400" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'moderator':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'member':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'viewer':
        return 'bg-gray-50 text-gray-600 border-gray-100'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const canManageChannel = members.find(m => m.user.email === user?.email)?.role === 'owner' || 
                          members.find(m => m.user.email === user?.email)?.role === 'admin'

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {channel.isPrivate ? (
              <Lock className="w-5 h-5 text-gray-500" />
            ) : (
              <Unlock className="w-5 h-5 text-green-500" />
            )}
            <h2 className="text-lg font-semibold">{channel.name}</h2>
          </div>
          <Badge variant="outline" className={cn(
            "text-xs",
            channel.isPrivate ? "border-red-200 text-red-700" : "border-green-200 text-green-700"
          )}>
            {channel.isPrivate ? 'Private' : 'Public'}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'overview' && (
          <ChannelOverview 
            channel={channel} 
            members={members}
            canManageChannel={canManageChannel}
            onChannelUpdated={onChannelUpdated}
          />
        )}

        {activeTab === 'members' && (
          <ChannelMembers 
            members={filteredMembers}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            canManageChannel={canManageChannel}
            onShowInviteModal={() => setShowInviteModal(true)}
            onShowPermissionsModal={(member) => {
              setSelectedMember(member)
              setShowPermissionsModal(true)
            }}
          />
        )}

        {activeTab === 'permissions' && (
          <ChannelPermissions 
            channel={channel}
            members={members}
            canManageChannel={canManageChannel}
          />
        )}

        {activeTab === 'settings' && (
          <ChannelSettings 
            channel={channel}
            canManageChannel={canManageChannel}
            onChannelUpdated={onChannelUpdated}
          />
        )}
      </div>
    </div>
  )
}

// Channel Overview Component
function ChannelOverview({ 
  channel, 
  members, 
  canManageChannel, 
  onChannelUpdated 
}: {
  channel: Channel
  members: ChannelMember[]
  canManageChannel: boolean
  onChannelUpdated: (channel: Channel) => void
}) {
  return (
    <div className="space-y-6">
      {/* Channel Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Channel Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-sm">{channel.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="text-sm capitalize">{channel.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Privacy</label>
              <p className="text-sm">{channel.isPrivate ? 'Private' : 'Public'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Members</label>
              <p className="text-sm">{members.length}</p>
            </div>
          </div>
          {channel.description && (
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-sm text-gray-700">{channel.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Features */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">Threading</span>
              <Badge variant={channel.allowThreads ? "default" : "secondary"}>
                {channel.allowThreads ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Pin className="w-4 h-4" />
              <span className="text-sm">Reactions</span>
              <Badge variant={channel.allowReactions ? "default" : "secondary"}>
                {channel.allowReactions ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Mentions</span>
              <Badge variant={channel.allowMentions ? "default" : "secondary"}>
                {channel.allowMentions ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="text-sm">File Uploads</span>
              <Badge variant={channel.allowFileUploads ? "default" : "secondary"}>
                {channel.allowFileUploads ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Channel Members Component
function ChannelMembers({
  members,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  canManageChannel,
  onShowInviteModal,
  onShowPermissionsModal
}: {
  members: ChannelMember[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  sortBy: string
  setSortBy: (sort: string) => void
  sortOrder: string
  setSortOrder: (order: string) => void
  canManageChannel: boolean
  onShowInviteModal: () => void
  onShowPermissionsModal: (member: MemberWithPermissions) => void
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </Button>
        </div>
        {canManageChannel && (
          <Button onClick={onShowInviteModal} size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Members
          </Button>
        )}
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.user.email}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={member.user.avatarUrl} />
                <AvatarFallback>
                  {member.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{member.user.name}</p>
                <p className="text-xs text-gray-500">{member.user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={getRoleColor(member.role)}>
                <div className="flex items-center space-x-1">
                  {getRoleIcon(member.role)}
                  <span className="capitalize">{member.role}</span>
                </div>
              </Badge>
              {canManageChannel && member.role !== 'owner' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShowPermissionsModal(member as MemberWithPermissions)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Channel Permissions Component
function ChannelPermissions({
  channel,
  members,
  canManageChannel
}: {
  channel: Channel
  members: ChannelMember[]
  canManageChannel: boolean
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['owner', 'admin', 'moderator', 'member', 'viewer'].map(role => (
              <div key={role} className="border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  {getRoleIcon(role)}
                  <h3 className="font-medium capitalize">{role}</h3>
                  <Badge variant="outline" className={getRoleColor(role)}>
                    {members.filter(m => m.role === role).length} members
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Send Messages</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Edit Messages</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Messages</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Pin className="w-4 h-4" />
                    <span>Pin Messages</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Invite Members</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <UserMinus className="w-4 h-4" />
                    <span>Remove Members</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Channel Settings Component
function ChannelSettings({
  channel,
  canManageChannel,
  onChannelUpdated
}: {
  channel: Channel
  canManageChannel: boolean
  onChannelUpdated: (channel: Channel) => void
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Channel Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Channel settings management will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 