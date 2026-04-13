// @epic-3.5-communication: User list component for channel members
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import getWorkspaceUsers from "@/fetchers/workspace-user/get-workspace-users";
import { usePresence } from "@/hooks/use-presence";
import { ClickableUserProfile } from "@/components/user/clickable-user-profile";

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  isOnline?: boolean;
  role?: string;
}

interface UserListProps {
  channelId: string | null;
  workspaceId?: string;
  className?: string;
}

export function UserList({ channelId, workspaceId, className }: UserListProps) {
  // Fetch real workspace users
  const { data: workspaceUsersData, isLoading } = useQuery({
    queryKey: ['workspace-users', workspaceId],
    queryFn: () => getWorkspaceUsers({ param: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId && !!channelId,
  });

  // Fetch real-time presence data
  const { isUserOnline } = usePresence(workspaceId);

  // Map API response to User format with real presence
  const users: User[] = (workspaceUsersData?.users || []).map((user: any) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    isOnline: isUserOnline(user.email), // ✅ Now using real presence data!
    role: user.role,
  }));

  const getInitials = (email: string, name?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const onlineUsers = users.filter(u => u.isOnline);
  const offlineUsers = users.filter(u => !u.isOnline);

  if (!channelId) {
    return (
      <div className={cn("h-full border-l bg-muted/30 flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <div className="text-sm">Select a channel to view members</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full border-l bg-muted/30 flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">
          Members ({users.length})
        </h3>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading members...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No members found</p>
          </div>
        ) : (
          <>
        {/* Original content continues here */}
        {/* Online Users */}
        {onlineUsers.length > 0 && (
          <div>
            <div className="px-2 pb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Online — {onlineUsers.length}
              </span>
            </div>
            <div className="space-y-1">
              {onlineUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="relative">
                    <ClickableUserProfile
                      userId={user.id}
                      userEmail={user.email}
                      userName={user.name || user.email.split('@')[0]}
                      userAvatar={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
                      size="sm"
                      openMode="both"
                    >
                      {user.role === 'admin' && (
                        <Badge variant="secondary" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </ClickableUserProfile>
                    <div className="absolute top-6 left-6 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline Users */}
        {offlineUsers.length > 0 && (
          <div>
            <div className="px-2 pb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Offline — {offlineUsers.length}
              </span>
            </div>
            <div className="space-y-1">
              {offlineUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors opacity-60"
                >
                  <ClickableUserProfile
                    userId={user.id}
                    userEmail={user.email}
                    userName={user.name || user.email.split('@')[0]}
                    userAvatar={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
                    size="sm"
                    openMode="both"
                  >
                    {user.role === 'admin' && (
                      <Badge variant="outline" className="text-xs">
                        Admin
                      </Badge>
                    )}
                  </ClickableUserProfile>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
} 