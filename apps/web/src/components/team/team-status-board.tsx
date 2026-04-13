import { useTeamStatus, UserStatus } from '@/hooks/use-team-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  Clock,
  Focus,
  LogOut,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ClickableUserProfile } from '@/components/user/clickable-user-profile';

const statusConfig: Record<UserStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}> = {
  available: {
    label: 'Available',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  in_meeting: {
    label: 'In Meeting',
    icon: Clock,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
  },
  focus_mode: {
    label: 'Focus Mode',
    icon: Focus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
  away: {
    label: 'Away',
    icon: LogOut,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
  },
};

export function TeamStatusBoard() {
  const { teamStatuses, loading } = useTeamStatus();
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  // Group by status
  const statusGroups = teamStatuses.reduce((acc, member) => {
    const status = member.status || 'available';
    if (!acc[status]) acc[status] = [];
    acc[status].push(member);
    return acc;
  }, {} as Record<UserStatus, typeof teamStatuses>);
  
  // Sort order for status display
  const statusOrder: UserStatus[] = ['available', 'in_meeting', 'focus_mode', 'away'];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Status
          </div>
          <Badge variant="secondary">
            {teamStatuses.length} {teamStatuses.length === 1 ? 'member' : 'members'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {teamStatuses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No team members yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {statusOrder.map((statusKey) => {
              const members = statusGroups[statusKey];
              if (!members || members.length === 0) return null;
              
              const config = statusConfig[statusKey];
              const StatusIcon = config.icon;
              
              return (
                <div key={statusKey} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <StatusIcon className={cn('h-4 w-4', config.color)} />
                    <span>{config.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {members.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 pl-6">
                    {members.map((member) => (
                      <div
                        key={member.userEmail}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg transition-colors',
                          config.bgColor
                        )}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <ClickableUserProfile
                            userId={member.userId}
                            userEmail={member.userEmail}
                            userName={member.userName || member.userEmail}
                            userAvatar={member.userAvatar}
                            size="sm"
                            openMode="both"
                          />
                          
                          {member.statusMessage && (
                            <p className="text-xs text-muted-foreground truncate pl-8">
                              {member.emoji && `${member.emoji} `}
                              {member.statusMessage}
                            </p>
                          )}
                          {member.expiresAt && (
                            <p className="text-xs text-muted-foreground pl-8">
                              Expires {formatDistanceToNow(new Date(member.expiresAt), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

