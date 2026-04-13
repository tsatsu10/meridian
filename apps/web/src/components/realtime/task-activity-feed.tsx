import { useTaskRealtime } from '@/providers/realtime-provider'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistance } from 'date-fns'
import { FileEdit, Plus, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface TaskActivityFeedProps {
  projectId: string
  className?: string
}

// @persona-sarah - PM wants to track all task changes in real-time
// @persona-david - Team Lead needs visibility into team productivity
export function TaskActivityFeed({ projectId, className }: TaskActivityFeedProps) {
  const { taskUpdates, isConnected } = useTaskRealtime(projectId)

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'INSERT':
        return Plus
      case 'UPDATE':
        return FileEdit
      case 'DELETE':
        return Trash2
      default:
        return Clock
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'INSERT':
        return 'text-green-600 bg-green-50'
      case 'UPDATE':
        return 'text-blue-600 bg-blue-50'
      case 'DELETE':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'done':
        return CheckCircle2
      case 'in_progress':
        return Clock
      case 'todo':
        return AlertCircle
      default:
        return Clock
    }
  }

  const formatEventDescription = (update: any) => {
    const eventType = update.eventType
    const newData = update.new
    const oldData = update.old

    switch (eventType) {
      case 'INSERT':
        return `New task "${newData?.title}" was created`
      case 'UPDATE':
        if (oldData?.status !== newData?.status) {
          return `Task "${newData?.title}" moved from ${oldData?.status} to ${newData?.status}`
        }
        if (oldData?.assigned_to !== newData?.assigned_to) {
          return `Task "${newData?.title}" was reassigned`
        }
        if (oldData?.priority !== newData?.priority) {
          return `Task "${newData?.title}" priority changed to ${newData?.priority}`
        }
        return `Task "${newData?.title}" was updated`
      case 'DELETE':
        return `Task "${oldData?.title}" was deleted`
      default:
        return 'Task activity'
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 mr-2" />
        Connecting to real-time updates...
      </div>
    )
  }

  if (taskUpdates.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        No recent activity. Create or update tasks to see live updates here.
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Live Activity Feed</h3>
        <Badge variant="secondary" className="text-xs">
          {taskUpdates.length} recent updates
        </Badge>
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-3">
          {taskUpdates.map((update, index) => {
            const EventIcon = getEventIcon(update.eventType)
            const StatusIcon = getStatusIcon(update.new?.status || update.old?.status)
            const timestamp = update.commit_timestamp || new Date().toISOString()

            return (
              <div
                key={`${update.eventType}-${update.new?.id || update.old?.id}-${index}`}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className={`p-1.5 rounded-full ${getEventColor(update.eventType)}`}>
                  <EventIcon className="h-3 w-3" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {formatEventDescription(update)}
                    </p>
                    {update.new?.status && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {update.new.status.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {formatDistance(new Date(timestamp), new Date(), { addSuffix: true })}
                    </span>
                    
                    {update.new?.priority && (
                      <>
                        <span>•</span>
                        <Badge 
                          variant={update.new.priority === 'high' ? 'destructive' : 
                                 update.new.priority === 'medium' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {update.new.priority} priority
                        </Badge>
                      </>
                    )}

                    {update.new?.assigned_to && (
                      <>
                        <span>•</span>
                        <span>Assigned to {update.new.assigned_to}</span>
                      </>
                    )}
                  </div>

                  {update.eventType === 'UPDATE' && update.old && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <strong>Changes:</strong>
                      {Object.entries(update.new || {}).map(([key, value]) => {
                        const oldValue = update.old?.[key]
                        if (oldValue !== value && key !== 'updated_at' && key !== 'id') {
                          return (
                            <div key={key} className="mt-1">
                              <span className="font-medium">{key.replace('_', ' ')}:</span>{' '}
                              <span className="line-through text-red-600">{oldValue}</span>{' '}
                              → <span className="text-green-600">{value}</span>
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
} 