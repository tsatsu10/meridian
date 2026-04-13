// Phase 2.3: Smart Message Composer with AI suggestions
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Lightbulb,
  Users,
  Calendar,
  Tag,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageSuggestion {
  type: 'mention' | 'deadline' | 'action' | 'clarity' | 'tone'
  title: string
  description: string
  suggestion: string
  severity: 'info' | 'warning' | 'success'
}

interface SmartComposerProps {
  message: string
  onSuggestionApply?: (suggestion: string) => void
  className?: string
}

export function analyzeMessage(content: string): MessageSuggestion[] {
  const suggestions: MessageSuggestion[] = []
  const lowerContent = content.toLowerCase()

  // Check for missing mentions when asking someone to do something
  const actionPatterns = /(?:can you|could you|please|need you to|ask|tell|remind)\s+(\w+)/gi
  let match
  while ((match = actionPatterns.exec(content)) !== null) {
    const person = match[1]
    if (!content.includes(`@${person}`) && person.length > 2) {
      suggestions.push({
        type: 'mention',
        title: 'Consider adding a mention',
        description: `You're asking ${person} to do something. Consider @mentioning them.`,
        suggestion: content.replace(match[0], `${match[0]} @${person}`),
        severity: 'info'
      })
    }
  }

  // Check for vague deadlines
  const vagueDeadlines = ['soon', 'later', 'sometime', 'eventually', 'when you can']
  vagueDeadlines.forEach(vague => {
    if (lowerContent.includes(vague)) {
      suggestions.push({
        type: 'deadline',
        title: 'Specify a deadline',
        description: `"${vague}" is vague. Consider specifying a concrete deadline.`,
        suggestion: content.replace(new RegExp(vague, 'gi'), 'by [specific date]'),
        severity: 'warning'
      })
    }
  })

  // Check for action items without clear ownership
  const actionWords = ['implement', 'create', 'fix', 'update', 'review', 'test']
  actionWords.forEach(action => {
    if (lowerContent.includes(action) && !content.includes('@') && content.length > 20) {
      suggestions.push({
        type: 'action',
        title: 'Assign ownership',
        description: `You mentioned "${action}" but didn't specify who should do it.`,
        suggestion: content + ' @[person] can you handle this?',
        severity: 'info'
      })
    }
  })

  // Check for unclear pronouns
  const unclearPronouns = ['it', 'this', 'that', 'they']
  unclearPronouns.forEach(pronoun => {
    const pronounCount = (lowerContent.match(new RegExp(`\\b${pronoun}\\b`, 'g')) || []).length
    if (pronounCount > 2) {
      suggestions.push({
        type: 'clarity',
        title: 'Be more specific',
        description: `You used "${pronoun}" ${pronounCount} times. Consider being more specific.`,
        suggestion: 'Consider replacing pronouns with specific nouns for clarity',
        severity: 'info'
      })
    }
  })

  // Check for overly urgent tone
  const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency']
  const urgentCount = urgentWords.filter(word => lowerContent.includes(word)).length
  if (urgentCount > 1) {
    suggestions.push({
      type: 'tone',
      title: 'Consider tone',
      description: 'This message might come across as very urgent or demanding.',
      suggestion: 'Consider softening the tone while maintaining importance',
      severity: 'warning'
    })
  }

  return suggestions.slice(0, 3) // Limit to top 3 suggestions
}

export function SmartComposer({ message, onSuggestionApply, className }: SmartComposerProps) {
  const [suggestions, setSuggestions] = useState<MessageSuggestion[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (message.length > 10) {
      const newSuggestions = analyzeMessage(message)
      setSuggestions(newSuggestions)
      setIsVisible(newSuggestions.length > 0)
    } else {
      setSuggestions([])
      setIsVisible(false)
    }
  }, [message])

  if (!isVisible) return null

  const getIcon = (type: MessageSuggestion['type']) => {
    switch (type) {
      case 'mention': return <Users className="w-3 h-3" />
      case 'deadline': return <Calendar className="w-3 h-3" />
      case 'action': return <CheckCircle className="w-3 h-3" />
      case 'clarity': return <Lightbulb className="w-3 h-3" />
      case 'tone': return <AlertTriangle className="w-3 h-3" />
      default: return <Tag className="w-3 h-3" />
    }
  }

  const getColor = (severity: MessageSuggestion['severity']) => {
    switch (severity) {
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      case 'success': return 'border-green-200 bg-green-50'
      default: return 'border-blue-200 bg-blue-50'
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className={cn(
            "flex items-start gap-2 p-2 rounded-md border text-xs",
            getColor(suggestion.severity)
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(suggestion.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{suggestion.title}</span>
              <Badge variant="secondary" className="text-xs">
                {suggestion.type}
              </Badge>
            </div>
            <p className="text-gray-600 mb-2">{suggestion.description}</p>
            
            {suggestion.type !== 'clarity' && suggestion.type !== 'tone' && (
              <div className="bg-white/50 rounded p-1 font-mono text-xs border">
                {suggestion.suggestion}
              </div>
            )}
          </div>
          
          {suggestion.type !== 'clarity' && suggestion.type !== 'tone' && onSuggestionApply && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSuggestionApply(suggestion.suggestion)}
              className="h-6 px-2 text-xs"
            >
              Apply
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}