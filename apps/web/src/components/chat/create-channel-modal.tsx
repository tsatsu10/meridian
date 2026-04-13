// @epic-4.1-direct-messaging: Create channel modal component
// @persona-sarah: PM needs to create team channels for organized discussions
// @persona-david: Team lead needs to set up project-specific channels

"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Hash, Lock } from 'lucide-react'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateChannel: (channelData: {
    name: string
    description: string
    isPrivate: boolean
  }) => void
  isLoading?: boolean
}

export function CreateChannelModal({
  isOpen,
  onClose,
  onCreateChannel,
  isLoading = false
}: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Channel name is required')
      return
    }
    
    // Validate channel name format
    if (!/^[a-z0-9-_]+$/.test(trimmedName.toLowerCase())) {
      setError('Channel name can only contain lowercase letters, numbers, hyphens, and underscores')
      return
    }
    
    if (trimmedName.length < 2) {
      setError('Channel name must be at least 2 characters long')
      return
    }
    
    if (trimmedName.length > 50) {
      setError('Channel name cannot exceed 50 characters')
      return
    }

    try {
      await onCreateChannel({
        name: trimmedName.toLowerCase(),
        description: description.trim(),
        isPrivate
      })
      // handleClose will be called by parent on success
    } catch (error: any) {
      setError(error.message || 'Failed to create channel')
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setName('')
      setDescription('')
      setIsPrivate(false)
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Create Channel
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name</Label>
            <Input
              id="channel-name"
              type="text"
              placeholder="e.g., general, development, marketing"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null) // Clear error when user types
              }}
              className="lowercase"
              maxLength={50}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Channel names must be lowercase and can't contain spaces
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="channel-description">Description (Optional)</Label>
            <Textarea
              id="channel-description"
              placeholder="What's this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={250}
              disabled={isLoading}
            />
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Make private</Label>
              <p className="text-sm text-gray-500">
                {isPrivate 
                  ? "Only invited members can see this channel"
                  : "Everyone in the workspace can see this channel"
                }
              </p>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              disabled={isLoading}
            />
          </div>

          {/* Preview */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              {isPrivate ? (
                <Lock className="w-4 h-4 text-gray-500" />
              ) : (
                <Hash className="w-4 h-4 text-gray-500" />
              )}
              <span className="font-medium">
                {name || 'channel-name'}
              </span>
            </div>
            {description && (
              <p className="text-xs text-gray-500 mt-1">
                {description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}