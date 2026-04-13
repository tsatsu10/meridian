import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/constants/urls';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Eye, Edit, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/use-socket';

interface ActiveUser {
  userEmail: string;
  userName: string;
  activityType: string;
  startedAt: Date;
  lastActive: Date;
}

interface LiveCollaborationBadgeProps {
  resourceType: 'task' | 'project';
  resourceId: string;
}

const activityIcons = {
  editing: Edit,
  viewing: Eye,
  commenting: MessageSquare,
};

const activityColors = {
  editing: 'bg-green-500',
  viewing: 'bg-blue-500',
  commenting: 'bg-purple-500',
};

export function LiveCollaborationBadge({ resourceType, resourceId }: LiveCollaborationBadgeProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  
  const fetchActiveUsers = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/activity/resource/${resourceType}/${resourceId}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      
      if (data.success) {
        setActiveUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch active users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchActiveUsers();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchActiveUsers, 30000);
    
    return () => clearInterval(interval);
  }, [resourceType, resourceId]);
  
  // Listen to WebSocket for real-time updates
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;
    
    const handleActivityUpdate = () => {
      fetchActiveUsers();
    };
    
    socket.on('activity:started', handleActivityUpdate);
    socket.on('activity:updated', handleActivityUpdate);
    socket.on('activity:ended', handleActivityUpdate);
    
    return () => {
      socket.off('activity:started', handleActivityUpdate);
      socket.off('activity:updated', handleActivityUpdate);
      socket.off('activity:ended', handleActivityUpdate);
    };
  }, [socket]);
  
  if (loading) {
    return null;
  }
  
  if (activeUsers.length === 0) {
    return null;
  }
  
  // Take first 3 users, show "+X" for others
  const displayUsers = activeUsers.slice(0, 3);
  const remainingCount = activeUsers.length - 3;
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5 animate-pulse">
          <Users className="h-3 w-3" />
          <span>Live</span>
        </Badge>
        
        <div className="flex -space-x-2">
          <AnimatePresence>
            {displayUsers.map((user) => {
              const Icon = activityIcons[user.activityType as keyof typeof activityIcons] || Eye;
              const colorClass = activityColors[user.activityType as keyof typeof activityColors] || 'bg-gray-500';
              
              return (
                <motion.div
                  key={user.userEmail}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Avatar className="h-8 w-8 border-2 border-background">
                          <AvatarFallback className="text-xs">
                            {user.userName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${colorClass} border-2 border-background flex items-center justify-center`}
                        >
                          <Icon className="h-2 w-2 text-white" />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{user.userName}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user.activityType}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="text-xs bg-muted">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{remainingCount} more active</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

