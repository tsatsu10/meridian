// @epic-3.1-messaging: Channel Settings Modal
// @persona-sarah: PM needs to manage channel settings and permissions
// @persona-david: Team lead needs to configure team channels

import React, { useState } from 'react'
import { API_BASE_URL, API_URL } from '@/constants/urls'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Settings,
  Users,
  Shield,
  Archive,
  Trash2,
  Hash,
  Lock,
  Globe,
  Save,
  X,
  UserPlus,
  UserMinus,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface ChannelSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  channelId: string
  channelName: string
  isOwner?: boolean
}

export function ChannelSettingsModal({
  isOpen,
  onClose,
  channelId,
  channelName: initialChannelName,
  isOwner = false
}: ChannelSettingsModalProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  
  // Form state
  const [name, setName] = useState(initialChannelName)
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Fetch channel details
  const { data: channelData, isLoading, error } = useQuery({
    queryKey: ['channel-settings', channelId],
    queryFn: async () => {
      if (!channelId) {
        throw new Error('Channel ID is required')
      }
      
      const response = await fetch(`${API_BASE_URL}/channel/${channelId}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to load channel' }))
        
        // If channel doesn't exist (404), close modal and invalidate cache
        if (response.status === 404) {
          toast.error('This channel no longer exists')
          queryClient.invalidateQueries({ queryKey: ['channels'] })
          onClose()
          throw new Error('Channel not found')
        }
        
        throw new Error(error.error || 'Failed to load channel')
      }
      
      const data = await response.json()
      
      // Ensure we have channel data
      if (!data?.channel) {
        throw new Error('Invalid channel data received')
      }
      
      // Update form state with fetched data
      setName(data.channel.name || initialChannelName)
      setDescription(data.channel.description || '')
      setIsPrivate(data.channel.type === 'private')
      
      return data.channel
    },
    enabled: isOpen && Boolean(channelId),
    retry: 1,
    staleTime: 30000, // Consider data fresh for 30 seconds
  })

  // Update channel mutation
  const updateChannel = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch(`${API_BASE_URL}/channel/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update channel')
      return response.json()
    },
    onSuccess: () => {
      toast.success('Channel updated successfully')
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      onClose()
    },
    onError: () => {
      toast.error('Failed to update channel')
    },
  })

  // Delete channel mutation
  const deleteChannel = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/channel/${channelId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete channel' }))
        throw new Error(error.error || 'Failed to delete channel')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Channel deleted successfully')
      // Invalidate all channel-related queries
      queryClient.invalidateQueries({ queryKey: ['channels'] }) // Catches all variations
      queryClient.invalidateQueries({ queryKey: ['channel', channelId] })
      queryClient.invalidateQueries({ queryKey: ['channel-settings', channelId] })
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete channel')
    },
  })

  const handleSave = () => {
    updateChannel.mutate({
      name: name.trim(),
      description: description.trim(),
      type: isPrivate ? 'private' : 'public',
    })
  }

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteChannel.mutate()
    } else {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 5000)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Channel Settings
          </DialogTitle>
          <DialogDescription>
            Manage settings for #{channelData?.name || initialChannelName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="gap-2">
              <Hash className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2" disabled={!isOwner}>
              <Shield className="w-4 h-4" />
              Permissions
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 mt-4">
            {/* General Tab */}
            <TabsContent value="general" className="h-full m-0">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* Channel Name */}
                  <div className="space-y-2">
                    <Label htmlFor="channel-name">Channel Name</Label>
                    <Input
                      id="channel-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., general, announcements"
                      disabled={!isOwner}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      The name of your channel. Use lowercase and hyphens.
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="channel-description">Description</Label>
                    <Textarea
                      id="channel-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What's this channel about?"
                      rows={3}
                      disabled={!isOwner}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Help others understand the purpose of this channel.
                    </p>
                  </div>

                  <Separator />

                  {/* Privacy Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isPrivate ? (
                          <Lock className="w-5 h-5 text-red-500" />
                        ) : (
                          <Globe className="w-5 h-5 text-green-500" />
                        )}
                        <div>
                          <div className="font-medium">
                            {isPrivate ? 'Private Channel' : 'Public Channel'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {isPrivate 
                              ? 'Only invited members can access'
                              : 'Anyone in the workspace can join'
                            }
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={isPrivate}
                        onCheckedChange={setIsPrivate}
                        disabled={!isOwner}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Channel Stats */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Channel Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {channelData?.memberCount || 0}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Members
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {channelData?.messageCount || 0}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Messages
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  {isOwner && (
                    <>
                      <Separator />
                      <div className="space-y-4 p-4 border-2 border-red-200 dark:border-red-900 rounded-lg bg-red-50/50 dark:bg-red-950/20">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-5 h-5" />
                          <h4 className="font-semibold">Danger Zone</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2 border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20"
                          >
                            <Archive className="w-4 h-4" />
                            Archive Channel
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={handleDelete}
                            disabled={deleteChannel.isPending}
                            className={cn(
                              "w-full justify-start gap-2",
                              showDeleteConfirm
                                ? "border-red-500 bg-red-500 text-white hover:bg-red-600"
                                : "border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20"
                            )}
                          >
                            <Trash2 className="w-4 h-4" />
                            {showDeleteConfirm 
                              ? deleteChannel.isPending 
                                ? 'Deleting...' 
                                : 'Click again to confirm deletion'
                              : 'Delete Channel Permanently'
                            }
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="h-full m-0">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Channel Members</h4>
                    {isOwner && (
                      <Button size="sm" className="gap-2">
                        <UserPlus className="w-4 h-4" />
                        Add Members
                      </Button>
                    )}
                  </div>

                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                    Member management coming soon...
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="h-full m-0">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  <h4 className="font-medium">Channel Permissions</h4>
                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                    Permission settings coming soon...
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          {isOwner && (
            <Button 
              onClick={handleSave}
              disabled={updateChannel.isPending || !name.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateChannel.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

