import { useLiveActivity } from '@/hooks/use-live-activity';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClickableUserProfile } from '@/components/user/clickable-user-profile';

export interface LiveActivityIndicatorProps {
  taskId?: string;
  projectId?: string;
  className?: string;
}

export function LiveActivityIndicator({
  taskId,
  projectId,
  className,
}: LiveActivityIndicatorProps) {
  const { activeSessions } = useLiveActivity();
  
  // Filter sessions for this specific task/project
  const relevantSessions = activeSessions.filter((session) => {
    if (taskId) return session.currentTaskId === taskId;
    if (projectId) return session.currentProjectId === projectId;
    return false;
  });
  
  if (relevantSessions.length === 0) return null;
  
  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'editing':
        return <Pencil className="h-3 w-3" />;
      case 'viewing':
        return <Eye className="h-3 w-3" />;
      case 'commenting':
        return <MessageSquare className="h-3 w-3" />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };
  
  const getActivityLabel = (activityType: string) => {
    switch (activityType) {
      case 'editing':
        return 'Editing';
      case 'viewing':
        return 'Viewing';
      case 'commenting':
        return 'Commenting';
      default:
        return 'Active';
    }
  };
  
  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex -space-x-2">
          {relevantSessions.slice(0, 3).map((session) => (
            <Tooltip key={session.userEmail}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <ClickableUserProfile
                    userId={session.userId}
                    userEmail={session.userEmail}
                    userName={session.userName || session.userEmail}
                    userAvatar={session.userAvatar}
                    size="sm"
                    openMode="both"
                    showName={false}
                    avatarClassName="border-2 border-background hover:z-10 transition-all"
                  />
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-medium">
                    {session.userName || session.userEmail}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {getActivityIcon(session.activityType)}
                    <span>{getActivityLabel(session.activityType)}</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        
        {relevantSessions.length > 3 && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary" className="text-xs h-6 px-2">
                +{relevantSessions.length - 3}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-1">
                {relevantSessions.slice(3).map((session) => (
                  <div key={session.userEmail} className="flex items-center gap-2 text-xs">
                    <span>{session.userName || session.userEmail}</span>
                    <span className="text-muted-foreground">
                      {getActivityLabel(session.activityType)}
                    </span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

