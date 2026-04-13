// Enhanced Task Creation Modal with API Integration
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  CheckSquare,
  Calendar,
  User,
  Tag,
  Clock,
  Sparkles,
  X,
  Check,
  ChevronsUpDown,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkflowSuggestion } from './workflow-automation'
import { TaskCreationData, useTaskIntegration } from '@/hooks/use-task-integration'
import useWorkspaceStore from '@/store/workspace'
import { useAuth } from '@/components/providers/unified-context-provider'

interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
}

interface EnhancedTaskCreationModalProps {
  suggestion: WorkflowSuggestion | null
  isOpen: boolean
  onClose: () => void
  messageId?: string
  channelId?: string
  onTaskCreated?: (taskId: string) => void
}

export function EnhancedTaskCreationModal({
  suggestion,
  isOpen,
  onClose,
  messageId,
  channelId,
  onTaskCreated,
}: EnhancedTaskCreationModalProps) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const { createTaskFromChat, generateTaskSuggestion, isCreatingTask } = useTaskIntegration()

  // Form state
  const [taskData, setTaskData] = useState<TaskCreationData>({
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
  })

  // UI state
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')

  // Mock data - in production, fetch from API
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
  ])

  const [projects] = useState<Project[]>([
    { id: '1', name: 'Mobile App Redesign', status: 'active' },
    { id: '2', name: 'Backend Optimization', status: 'active' },
    { id: '3', name: 'Design System', status: 'active' },
  ])

  // Initialize form data from suggestion
  useEffect(() => {
    if (suggestion) {
      setTaskData({
        title: suggestion.extractedText,
        description: `Created from chat message: "${suggestion.extractedText}"`,
        priority: suggestion.priority || 'medium',
        dueDate: suggestion.suggestedDueDate,
        assigneeId: suggestion.suggestedAssignee,
        tags: ['chat-generated'],
        channelId,
        sourceMessageId: messageId,
      })
    }
  }, [suggestion, messageId, channelId])

  // Handle form submission
  const handleSubmit = async () => {
    if (!taskData.title.trim()) {
      return
    }

    try {
      const taskId = await createTaskFromChat(taskData)
      if (taskId) {
        onTaskCreated?.(taskId)
        onClose()
        // Reset form
        setTaskData({
          title: '',
          description: '',
          priority: 'medium',
          tags: [],
        })
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  // Add tag
  const addTag = (tag: string) => {
    if (tag && !taskData.tags?.includes(tag)) {
      setTaskData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }))
      setTagInput('')
    }
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTaskData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }))
  }

  // Get selected assignee
  const selectedAssignee = teamMembers.find(member => member.id === taskData.assigneeId)
  const selectedProject = projects.find(project => project.id === taskData.projectId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {suggestion ? (
              <>
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Task Suggestion
              </>
            ) : (
              <>
                <CheckSquare className="w-5 h-5" />
                Create New Task
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {suggestion 
              ? "Review and customize the AI-suggested task before creating it."
              : "Create a new task with all the necessary details and assignments."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Suggestion Indicator */}
          {suggestion && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-900">
                    AI detected a potential task in your message
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    "{suggestion.extractedText}"
                  </p>
                  <p className="text-xs text-purple-600 mt-2">
                    Confidence: {Math.round(suggestion.confidence * 100)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={taskData.title}
                onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={taskData.description}
                onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the task in detail..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          {/* Project Selection */}
          <div>
            <Label>Project</Label>
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={projectOpen}
                  className="w-full justify-between mt-1"
                >
                  {selectedProject ? selectedProject.name : "Select project..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search projects..." />
                  <CommandEmpty>No project found.</CommandEmpty>
                  <CommandGroup>
                    {projects.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={project.id}
                        onSelect={() => {
                          setTaskData(prev => ({ ...prev, projectId: project.id }))
                          setProjectOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            taskData.projectId === project.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {project.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Task Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={taskData.priority}
                onValueChange={(value: any) => setTaskData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={taskData.dueDate || ''}
                onChange={(e) => setTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          {/* Assignee Selection */}
          <div>
            <Label>Assignee</Label>
            <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={assigneeOpen}
                  className="w-full justify-between mt-1"
                >
                  {selectedAssignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={selectedAssignee.avatar} />
                        <AvatarFallback>{selectedAssignee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {selectedAssignee.name}
                    </div>
                  ) : (
                    "Select assignee..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search team members..." />
                  <CommandEmpty>No team member found.</CommandEmpty>
                  <CommandGroup>
                    {teamMembers.map((member) => (
                      <CommandItem
                        key={member.id}
                        value={member.id}
                        onSelect={() => {
                          setTaskData(prev => ({ ...prev, assigneeId: member.id }))
                          setAssigneeOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            taskData.assigneeId === member.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.role}</div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="mt-1 space-y-2">
              {taskData.tags && taskData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {taskData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tags..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(tagInput)}
                  disabled={!tagInput.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Time Estimate */}
          <div>
            <Label htmlFor="estimatedHours">Estimated Hours</Label>
            <Input
              id="estimatedHours"
              type="number"
              min="0"
              step="0.5"
              value={taskData.estimatedHours || ''}
              onChange={(e) => setTaskData(prev => ({ 
                ...prev, 
                estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
              placeholder="e.g., 2.5"
              className="mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isCreatingTask}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!taskData.title.trim() || isCreatingTask}>
              {isCreatingTask ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}