import { useTeamPresence } from '@/providers/realtime-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// @persona-david - Team Lead wants to see team activity at a glance
// @persona-jennifer - Executive wants team engagement visibility
export function OnlineUsers() {
  const { onlineUsers, teamStats } = useTeamPresence()

  const getPersonaColor = (persona?: string) => {
    switch (persona) {
      case 'sarah': return 'bg-blue-500' // PM - Blue
      case 'david': return 'bg-green-500' // Team Lead - Green  
      case 'jennifer': return 'bg-purple-500' // Executive - Purple
      case 'mike': return 'bg-orange-500' // Developer - Orange
      case 'lisa': return 'bg-pink-500' // Designer - Pink
      default: return 'bg-gray-500'
    }
  }

  const getPersonaLabel = (persona?: string) => {
    switch (persona) {
      case 'sarah': return 'PM'
      case 'david': return 'Lead'
      case 'jennifer': return 'Exec'
      case 'mike': return 'Dev'
      case 'lisa': return 'Design'
      default: return 'User'
    }
  }

  if (onlineUsers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No users online
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Team Online ({teamStats.totalOnline})</h3>
        <div className="flex gap-1">
          {Object.entries(teamStats.byPersona).map(([persona, count]) => (
            <Badge key={persona} variant="secondary" className="text-xs">
              {getPersonaLabel(persona)}: {count}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {onlineUsers.map((user) => (
          <TooltipProvider key={user.userId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Status indicator */}
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                      user.status === 'online' ? 'bg-green-500' :
                      user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                    )} />
                    
                    {/* Persona indicator */}
                    <div className={cn(
                      'absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border border-white',
                      getPersonaColor(user.persona)
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {user.username}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getPersonaLabel(user.persona)}
                      </Badge>
                    </div>
                    
                    {user.currentPage && (
                      <div className="text-xs text-muted-foreground truncate">
                        📄 {user.currentPage.replace('/', '').replace('-', ' ') || 'Dashboard'}
                      </div>
                    )}
                  </div>

                  {/* Activity indicator */}
                  {user.cursorPosition && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" 
                         title="Active" />
                  )}
                </div>
              </TooltipTrigger>
              
              <TooltipContent side="left" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: {getPersonaLabel(user.persona)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {user.status}
                  </p>
                  {user.currentPage && (
                    <p className="text-xs text-muted-foreground">
                      Page: {user.currentPage}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Last seen: {new Date(user.lastSeen).toLocaleTimeString()}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  )
} 