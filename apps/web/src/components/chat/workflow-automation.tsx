// Phase 2.3: Workflow Automation Components
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus,
  Calendar,
  User,
  Target,
  Zap,
  CheckSquare,
  Clock,
  AlertCircle,
  Lightbulb
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkflowSuggestion {
  type: 'task' | 'reminder' | 'follow-up' | 'milestone'
  title: string
  description: string
  confidence: number
  extractedText: string
  suggestedAssignee?: string
  suggestedDueDate?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

interface WorkflowAutomationProps {
  messageId: string
  messageContent: string
  messageAuthor: string
  onCreateTask?: (task: any) => void
  onCreateReminder?: (reminder: any) => void
  onDismiss?: () => void
}

// Detect actionable content in messages
export function detectWorkflowSuggestions(content: string, author: string): WorkflowSuggestion[] {
  const suggestions: WorkflowSuggestion[] = []
  const lowerContent = content.toLowerCase()

  // Task creation patterns
  const taskPatterns = [
    /(?:need to|should|must|have to|let's|we should)\s+([^.!?]+)/gi,
    /(?:todo|to-do|task):\s*([^.!?]+)/gi,
    /(?:action item|action):\s*([^.!?]+)/gi,
    /(?:please|can you|could you)\s+([^.!?]+)/gi,
  ]

  taskPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const extractedText = match[1].trim()
      if (extractedText.length > 5 && extractedText.length < 100) {
        suggestions.push({
          type: 'task',
          title: `Task: ${extractedText}`,
          description: `Create a task based on the message content`,
          confidence: 0.8,
          extractedText,
          priority: lowerContent.includes('urgent') || lowerContent.includes('asap') ? 'high' : 'medium'
        })
      }
    }
  })

  // Deadline/reminder patterns
  const deadlinePatterns = [
    /(?:by|due|deadline|before)\s+(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})/gi,
    /(?:remind me|reminder|follow up)\s+(?:in|after)?\s*(\d+\s*(?:days?|weeks?|hours?))/gi,
  ]

  deadlinePatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      suggestions.push({
        type: 'reminder',
        title: `Reminder: Follow up on this message`,
        description: `Set a reminder based on the mentioned timeframe`,
        confidence: 0.7,
        extractedText: match[0],
        suggestedDueDate: match[1]
      })
    }
  })

  // Meeting/follow-up patterns
  const meetingPatterns = [
    /(?:let's meet|schedule|meeting|call|discuss)/gi,
    /(?:follow up|check in|touch base)/gi,
  ]

  meetingPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      suggestions.push({
        type: 'follow-up',
        title: `Follow-up: ${content.substring(0, 50)}...`,
        description: `Schedule a follow-up based on this conversation`,
        confidence: 0.6,
        extractedText: content.substring(0, 100)
      })
    }
  })

  // Milestone patterns
  const milestonePatterns = [
    /(?:milestone|goal|objective|target|deadline)/gi,
    /(?:launch|release|deploy|go live)/gi,
  ]

  milestonePatterns.forEach(pattern => {
    if (pattern.test(content)) {
      suggestions.push({
        type: 'milestone',
        title: `Milestone: ${content.substring(0, 50)}...`,
        description: `Create a milestone based on this discussion`,
        confidence: 0.5,
        extractedText: content.substring(0, 100)
      })
    }
  })

  // Remove duplicates and sort by confidence
  return suggestions
    .filter((suggestion, index, self) => 
      index === self.findIndex(s => s.type === suggestion.type && s.extractedText === suggestion.extractedText)
    )
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3) // Limit to top 3 suggestions
}

export function WorkflowSuggestionCard({ suggestion, onAccept, onDismiss }: {
  suggestion: WorkflowSuggestion
  onAccept: () => void
  onDismiss: () => void
}) {
  const getIcon = () => {
    switch (suggestion.type) {
      case 'task': return <CheckSquare className="w-4 h-4" />
      case 'reminder': return <Clock className="w-4 h-4" />
      case 'follow-up': return <Calendar className="w-4 h-4" />
      case 'milestone': return <Target className="w-4 h-4" />
      default: return <Lightbulb className="w-4 h-4" />
    }
  }

  const getColor = () => {
    switch (suggestion.type) {
      case 'task': return 'bg-green-50 border-green-200 text-green-700'
      case 'reminder': return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      case 'follow-up': return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'milestone': return 'bg-purple-50 border-purple-200 text-purple-700'
      default: return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", getColor())}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-sm font-medium">{suggestion.title}</span>
          <Badge variant="secondary" className="text-xs">
            {Math.round(suggestion.confidence * 100)}% match
          </Badge>
        </div>
        <Zap className="w-3 h-3 opacity-50" />
      </div>
      
      <p className="text-xs opacity-75">{suggestion.description}</p>
      
      <div className="text-xs font-mono bg-white/50 rounded p-2 border">
        "{suggestion.extractedText}"
      </div>
      
      <div className="flex gap-2">
        <Button size="sm" onClick={onAccept} className="text-xs h-7">
          <Plus className="w-3 h-3 mr-1" />
          Create {suggestion.type}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="text-xs h-7">
          Dismiss
        </Button>
      </div>
    </div>
  )
}

export function CreateTaskModal({ 
  suggestion, 
  isOpen, 
  onClose, 
  onConfirm 
}: {
  suggestion: WorkflowSuggestion | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (taskData: any) => void
}) {
  const [taskData, setTaskData] = useState({
    title: suggestion?.extractedText || '',
    description: suggestion ? `Created from chat message: "${suggestion.extractedText}"` : '',
    priority: suggestion?.priority || 'medium',
    assignee: suggestion?.suggestedAssignee || '',
    dueDate: suggestion?.suggestedDueDate || '',
  })
  
  // Update task data when suggestion changes
  useEffect(() => {
    if (suggestion) {
      setTaskData({
        title: suggestion.extractedText,
        description: `Created from chat message: "${suggestion.extractedText}"`,
        priority: suggestion.priority || 'medium',
        assignee: suggestion.suggestedAssignee || '',
        dueDate: suggestion.suggestedDueDate || '',
      })
    }
  }, [suggestion])

  const handleSubmit = () => {
    onConfirm(taskData)
    onClose()
  }

  // Don't render if no suggestion
  if (!suggestion) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Create Task from Message
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Task Title</label>
            <Input
              value={taskData.title}
              onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={taskData.description}
              onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Task description..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select 
                value={taskData.priority} 
                onValueChange={(value) => setTaskData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Due Date</label>
              <Input
                type="date"
                value={taskData.dueDate}
                onChange={(e) => setTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}