// Task Assignment Handler for Chat Messages
import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  UserPlus,
  ArrowRight,
  CheckSquare,
  User,
  Clock,
  X,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTaskIntegration } from '@/hooks/use-task-integration'
import { useRealTimeNotifications } from '@/hooks/use-real-time-notifications'
import useWorkspaceStore from '@/store/workspace'
import { getAvatarSrc, getUserInitials } from '@/utils/avatar-utils'

interface TaskAssignmentPattern {
  taskId: string
  assigneeEmail?: string
  assigneeName?: string
  confidence: number
  extractedText: string
}

interface TaskAssignmentHandlerProps {
  message: string
  messageId: string
  channelId: string
  authorEmail: string
  className?: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  selectedAvatarId?: string
  role: string
}

export function TaskAssignmentHandler({
  message,
  messageId,
  channelId,
  authorEmail,
  className,
}: TaskAssignmentHandlerProps) {
  const { workspace } = useWorkspaceStore()
  const { assignTaskFromChat, parseTaskMentions } = useTaskIntegration()
  const notifications = useRealTimeNotifications()
  
  const [assignmentPatterns, setAssignmentPatterns] = useState<TaskAssignmentPattern[]>([])
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<TaskAssignmentPattern | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)

  // Mock team members - in production, fetch from API
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      avatar: 'https://avatar.vercel.sh/sarah@example.com',
      role: 'Project Manager',
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike@example.com',
      avatar: 'https://avatar.vercel.sh/mike@example.com',
      role: 'Senior Developer',
    },
    {
      id: '3',
      name: 'Lisa Wang',
      email: 'lisa@example.com',
      avatar: 'https://avatar.vercel.sh/lisa@example.com',
      role: 'UX Designer',
    },
    {
      id: '4',
      name: 'David Kim',
      email: 'david@example.com',
      avatar: 'https://avatar.vercel.sh/david@example.com',
      role: 'Team Lead',
    },
  ])

  // Detect task assignment patterns in the message
  const detectAssignmentPatterns = useCallback((content: string): TaskAssignmentPattern[] => {
    const patterns: TaskAssignmentPattern[] = []
    
    // Pattern 1: "assign #123 to @sarah" or "assign task #123 to sarah"
    const assignPattern1 = /assign\s+(?:task\s+)?#(\d+)\s+to\s+@?(\w+)/gi
    let match1
    while ((match1 = assignPattern1.exec(content)) !== null) {
      patterns.push({
        taskId: match1[1],
        assigneeName: match1[2],
        confidence: 0.95,
        extractedText: match1[0],
      })
    }

    // Pattern 2: "#123 -> @sarah" or "#123 → sarah"
    const assignPattern2 = /#(\d+)\s*(?:->|→|→)\s*@?(\w+)/gi
    let match2
    while ((match2 = assignPattern2.exec(content)) !== null) {
      patterns.push({
        taskId: match2[1],
        assigneeName: match2[2],
        confidence: 0.85,
        extractedText: match2[0],
      })
    }

    // Pattern 3: "@sarah can you handle #123" or "sarah, please take #123"
    const assignPattern3 = /@?(\w+)[,\s]+(?:can you handle|please take|take care of)\s+#(\d+)/gi
    let match3
    while ((match3 = assignPattern3.exec(content)) !== null) {
      patterns.push({
        taskId: match3[2],
        assigneeName: match3[1],
        confidence: 0.75,
        extractedText: match3[0],
      })
    }

    // Pattern 4: "#123 needs to be assigned to @sarah"
    const assignPattern4 = /#(\d+)\s+(?:needs to be assigned to|should be assigned to)\s+@?(\w+)/gi
    let match4
    while ((match4 = assignPattern4.exec(content)) !== null) {
      patterns.push({
        taskId: match4[1],
        assigneeName: match4[2],
        confidence: 0.90,
        extractedText: match4[0],
      })
    }

    // Pattern 5: Simple mention of task and user together in same sentence
    const taskMentions = parseTaskMentions(content)
    const userMentions = content.match(/@(\w+)/g) || []
    
    if (taskMentions.length > 0 && userMentions.length > 0) {
      // If there's a task and user mention in the same message, suggest assignment
      taskMentions.forEach(taskId => {
        userMentions.forEach(userMention => {
          const userName = userMention.replace('@', '')
          if (!patterns.some(p => p.taskId === taskId && p.assigneeName === userName)) {
            patterns.push({
              taskId,
              assigneeName: userName,
              confidence: 0.60,
              extractedText: `#${taskId} and @${userName}`,
            })
          }
        })
      })
    }

    return patterns.filter(p => p.confidence > 0.5) // Only show patterns with reasonable confidence
  }, [parseTaskMentions])

  // Analyze the message for assignment patterns
  useEffect(() => {
    const patterns = detectAssignmentPatterns(message)
    setAssignmentPatterns(patterns)
  }, [message, detectAssignmentPatterns])

  // Find team member by name or email
  const findTeamMember = (identifier: string): TeamMember | undefined => {
    const lowerIdentifier = identifier.toLowerCase()
    return teamMembers.find(member => 
      member.name.toLowerCase().includes(lowerIdentifier) ||
      member.email.toLowerCase().includes(lowerIdentifier) ||
      member.email.split('@')[0].toLowerCase() === lowerIdentifier
    )
  }

  // Handle assignment confirmation
  const handleAssignTask = async () => {
    if (!selectedPattern || !selectedAssignee) return

    setIsAssigning(true)
    try {
      const success = await assignTaskFromChat(
        selectedPattern.taskId,
        selectedAssignee,
        messageId,
        channelId
      )

      if (success) {
        setShowAssignmentModal(false)
        setSelectedPattern(null)
        setSelectedAssignee('')
        
        // Remove the pattern from the list since it's been handled
        setAssignmentPatterns(prev => 
          prev.filter(p => p !== selectedPattern)
        )
      }
    } catch (error) {
      console.error('Failed to assign task:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  // Handle quick assignment (auto-detected assignee)
  const handleQuickAssign = async (pattern: TaskAssignmentPattern) => {
    if (!pattern.assigneeName) return

    const assignee = findTeamMember(pattern.assigneeName)
    if (!assignee) {
      // Open modal for manual selection
      setSelectedPattern(pattern)
      setShowAssignmentModal(true)
      return
    }

    setIsAssigning(true)
    try {
      const success = await assignTaskFromChat(
        pattern.taskId,
        assignee.id,
        messageId,
        channelId
      )

      if (success) {
        // Remove the pattern from the list
        setAssignmentPatterns(prev => prev.filter(p => p !== pattern))
      }
    } catch (error) {
      console.error('Failed to assign task:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  // Handle manual assignment
  const handleManualAssign = (pattern: TaskAssignmentPattern) => {
    setSelectedPattern(pattern)
    setSelectedAssignee(pattern.assigneeName ? findTeamMember(pattern.assigneeName)?.id || '' : '')
    setShowAssignmentModal(true)
  }

  // Dismiss assignment suggestion
  const handleDismiss = (pattern: TaskAssignmentPattern) => {
    setAssignmentPatterns(prev => prev.filter(p => p !== pattern))
  }

  if (assignmentPatterns.length === 0) {
    return null
  }

  return (
    <>
      <div className={cn("mt-3 space-y-2", className)}>
        {assignmentPatterns.map((pattern, index) => {
          const suggestedAssignee = pattern.assigneeName ? findTeamMember(pattern.assigneeName) : null
          
          return (
            <div
              key={`${pattern.taskId}-${pattern.assigneeName}-${index}`}
              className="p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      Task Assignment Detected
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(pattern.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <span className="font-medium">#{pattern.taskId}</span>
                    <ArrowRight className="w-3 h-3" />
                    {suggestedAssignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={getAvatarSrc(suggestedAssignee)} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(suggestedAssignee)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{suggestedAssignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-green-600">@{pattern.assigneeName}</span>
                    )}
                  </div>
                  
                  <p className="text-xs text-green-600 mt-1">
                    "{pattern.extractedText}"
                  </p>
                </div>

                <div className="flex items-center gap-1 ml-3">
                  {suggestedAssignee ? (
                    <Button
                      size="sm"
                      onClick={() => handleQuickAssign(pattern)}
                      disabled={isAssigning}
                      className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
                    >
                      {isAssigning ? (
                        <Clock className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <CheckSquare className="w-3 h-3 mr-1" />
                      )}
                      Assign
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManualAssign(pattern)}
                      className="h-7 px-3 text-xs border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <User className="w-3 h-3 mr-1" />
                      Choose Assignee
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(pattern)}
                    className="h-7 w-7 p-0 text-green-600 hover:bg-green-100"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Assignment Modal */}
      <Dialog open={showAssignmentModal} onOpenChange={setShowAssignmentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              Assign Task #{selectedPattern?.taskId}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Assignee
              </label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose team member..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={getAvatarSrc(member)} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.role}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowAssignmentModal(false)}
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAssignTask}
                disabled={!selectedAssignee || isAssigning}
              >
                {isAssigning ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Assign Task
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}