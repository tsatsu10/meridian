// @epic-4.1-direct-messaging: Create group modal component
// @persona-sarah: PM needs to create project groups for focused team collaboration
// @persona-david: Team lead needs to organize team members into working groups

"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, X, Search } from 'lucide-react'
import { useDirectMessaging } from '@/hooks/use-direct-messaging'
import { useAuth } from '@/components/providers/unified-context-provider'
import useWorkspaceStore from '@/store/workspace'
import { cn } from '@/lib/cn'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGroup: (groupData: {
    name: string
    description: string
    members: string[]
  }) => Promise<void>
  isLoading?: boolean
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
  isLoading = false
}: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Array<{
    email: string
    name: string
    avatar?: string
    status: 'online' | 'away' | 'busy' | 'offline'
  }>>([])
  const [isSearching, setIsSearching] = useState(false)

  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const { searchUsers } = useDirectMessaging()

  // Search users when query changes
  useEffect(() => {
    if (!searchQuery.trim() || !workspace?.id) {
      setSearchResults([])
      return
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchUsers({
          query: searchQuery,
          workspaceId: workspace.id,
          excludeUserEmail: user?.email
        })
        setSearchResults(results)
      } catch (error) {
        console.error('Failed to search users:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [searchQuery, workspace?.id, user?.email, searchUsers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Group name is required')
      return
    }
    
    if (selectedMembers.length === 0) {
      setError('Please select at least one member')
      return
    }
    
    if (trimmedName.length < 2) {
      setError('Group name must be at least 2 characters long')
      return
    }
    
    if (trimmedName.length > 50) {
      setError('Group name cannot exceed 50 characters')
      return
    }

    try {
      await onCreateGroup({
        name: trimmedName,
        description: description.trim(),
        members: selectedMembers
      })
      // handleClose will be called by parent on success
    } catch (error: any) {
      setError(error.message || 'Failed to create group')
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setName('')
      setDescription('')
      setSelectedMembers([])
      setSearchQuery('')
      setError(null)
      onClose()
    }
  }

  const toggleMember = (email: string) => {
    setSelectedMembers(prev =>
      prev.includes(email)
        ? prev.filter(m => m !== email)
        : [...prev, email]
    )
  }

  const removeMember = (email: string) => {
    setSelectedMembers(prev => prev.filter(m => m !== email))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500'
      case 'away': return 'text-yellow-500'
      case 'busy': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Create Group
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              type="text"
              placeholder="e.g., Frontend Team, Design Squad"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null) // Clear error when user types
              }}
              maxLength={50}
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="group-description">Description (Optional)</Label>
            <Textarea
              id="group-description"
              placeholder="What's this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={250}
              disabled={isLoading}
            />
          </div>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Members ({selectedMembers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map(email => {
                  const member = searchResults.find(m => m.email === email)
                  return (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1">
                      {member?.name || email.split('@')[0]}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeMember(email)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Member Search */}
          <div className="space-y-2">
            <Label>Add Members</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Member List */}
          <div className="space-y-2">
            <ScrollArea className="h-32 border rounded-md">
              <div className="p-2 space-y-1">
                {isSearching ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))
                ) : searchResults.length > 0 ? (
                  searchResults.map(member => (
                  <div
                    key={member.email}
                    className={cn(
                      "flex items-center space-x-3 p-2 rounded-lg transition-colors",
                      isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-gray-50"
                    )}
                    onClick={() => !isLoading && toggleMember(member.email)}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.email}`} />
                        <AvatarFallback className="text-xs">
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {selectedMembers.includes(member.email) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.email}
                      </p>
                      <p className={cn("text-xs", getStatusColor(member.status))}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </p>
                    </div>
                  </div>
                  ))
                ) : searchQuery ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No users found</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Search for users to add to the group</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || selectedMembers.length === 0 || isLoading}>
              {isLoading ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}