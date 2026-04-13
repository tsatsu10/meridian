// @epic-3.1-messaging: Reaction Picker Component
// @persona-sarah: PM needs quick reactions to acknowledge messages
// @persona-david: Team lead needs efficient communication with emoji reactions

import React, { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

interface ReactionPickerProps {
  onReactionSelect: (emoji: string) => void
  onClose: () => void
}

const QUICK_REACTIONS = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😮', label: 'Surprised' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '✅', label: 'Check' },
]

export function ReactionPicker({ onReactionSelect, onClose }: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex gap-1">
        {QUICK_REACTIONS.map(({ emoji, label }) => (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-xl hover:scale-125 transition-transform"
            onClick={() => {
              onReactionSelect(emoji)
              onClose()
            }}
            title={label}
          >
            {emoji}
          </Button>
        ))}
      </div>
      <div className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-1">
        Click to react
      </div>
    </div>
  )
}

