// @epic-4.1-direct-messaging: Context menu for creating new conversations
// @persona-sarah: PM needs quick access to create different conversation types
// @persona-david: Team lead needs easy way to start channels, groups, and DMs

"use client"

import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Hash, 
  Users, 
  MessageCircle, 
  Video 
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface NewConversationContextMenuProps {
  onCreateChannel: () => void
  onCreateGroup: () => void
  onStartDirectMessage: () => void
  onStartVideoCall: () => void
  className?: string
}

export function NewConversationContextMenu({
  onCreateChannel,
  onCreateGroup,
  onStartDirectMessage,
  onStartVideoCall,
  className
}: NewConversationContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("h-8 w-8 p-0", className)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onCreateChannel} className="cursor-pointer">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <Hash className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Create Channel</div>
              <div className="text-xs text-muted-foreground">
                Public or private team discussion
              </div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onCreateGroup} className="cursor-pointer">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Create Group</div>
              <div className="text-xs text-muted-foreground">
                Small team or project group
              </div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onStartDirectMessage} className="cursor-pointer">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Start Direct Message</div>
              <div className="text-xs text-muted-foreground">
                Private 1-on-1 conversation
              </div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onStartVideoCall} className="cursor-pointer">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Start Video Call</div>
              <div className="text-xs text-muted-foreground">
                Quick video meeting
              </div>
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}