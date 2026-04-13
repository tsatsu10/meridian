// @epic-4.2-presence: Example integration of enhanced presence system
// This file shows how to integrate the presence components into user profiles and chat interfaces

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  UserStatusDisplay, 
  StatusSettingPanel, 
  CustomStatusModal,
  UserStatus 
} from './index';
import { useEnhancedPresence } from '@/hooks/use-enhanced-presence';

// Example 1: User Profile Card with Status
interface UserProfileCardProps {
  user: {
    email: string;
    name: string;
    avatar?: string;
  };
  workspaceId: string;
  isCurrentUser?: boolean;
}

export function UserProfileCard({ user, workspaceId, isCurrentUser = false }: UserProfileCardProps) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  const {
    getUserPresence,
    currentUserPresence,
    setCustomUserStatus,
    clearUserCustomStatus,
  } = useEnhancedPresence({
    workspaceId,
    userEmail: user.email,
  });

  const userPresence = isCurrentUser ? currentUserPresence : getUserPresence(user.email);

  if (!userPresence) {
    return null;
  }

  const handleStatusClick = () => {
    if (isCurrentUser) {
      setShowStatusModal(true);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{user.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <UserStatusDisplay
          status={userPresence}
          userName={user.name}
          showLastSeen={true}
          showCurrentPage={true}
          showCustomMessage={true}
          onClick={isCurrentUser ? handleStatusClick : undefined}
        />
        
        {isCurrentUser && (
          <>
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowStatusModal(true)}
            >
              Update Status
            </Button>
          </>
        )}
      </CardContent>

      {isCurrentUser && (
        <CustomStatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          currentStatus={{
            message: userPresence.customStatusMessage,
            emoji: userPresence.customStatusEmoji,
            expiresAt: userPresence.statusExpiresAt,
            isVisible: userPresence.isStatusVisible,
          }}
          onSave={setCustomUserStatus}
          onClear={clearUserCustomStatus}
        />
      )}
    </Card>
  );
}

// Example 2: Team Members List with Status
interface TeamMembersListProps {
  workspaceId: string;
  currentUserEmail: string;
}

export function TeamMembersList({ workspaceId, currentUserEmail }: TeamMembersListProps) {
  const { workspacePresence, isLoadingPresence } = useEnhancedPresence({
    workspaceId,
    userEmail: currentUserEmail,
  });

  if (isLoadingPresence) {
    return <div>Loading team members...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {workspacePresence.map((presence) => (
            <div key={presence.userEmail} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  {presence.userName?.charAt(0) || presence.userEmail.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{presence.userName || presence.userEmail}</p>
                <UserStatusDisplay
                  status={presence}
                  compact={true}
                  showCustomMessage={true}
                />
              </div>
              
              {presence.userEmail === currentUserEmail && (
                <Badge variant="outline" className="text-xs">You</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Example 3: Chat User List with Online Status
interface ChatUserListProps {
  workspaceId: string;
  currentUserEmail: string;
}

export function ChatUserList({ workspaceId, currentUserEmail }: ChatUserListProps) {
  const { onlineUsers, isLoadingOnlineUsers } = useEnhancedPresence({
    workspaceId,
    userEmail: currentUserEmail,
  });

  if (isLoadingOnlineUsers) {
    return <div>Loading online users...</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Online ({onlineUsers.length})
      </h3>
      {onlineUsers.map((user) => (
        <div key={user.userEmail} className="flex items-center gap-2 p-1">
          <UserStatusDisplay
            status={user}
            compact={true}
            showCustomMessage={false}
          />
          <span className="text-sm">{user.userName || user.userEmail}</span>
        </div>
      ))}
    </div>
  );
}

// Example 4: Status Setting in User Settings
interface UserSettingsPresenceProps {
  workspaceId: string;
  userEmail: string;
}

export function UserSettingsPresence({ workspaceId, userEmail }: UserSettingsPresenceProps) {
  const {
    currentUserPresence,
    updateStatus,
    setCustomUserStatus,
    clearUserCustomStatus,
    updateUserWorkingHours,
  } = useEnhancedPresence({
    workspaceId,
    userEmail,
  });

  if (!currentUserPresence) {
    return <div>Loading your presence settings...</div>;
  }

  const handleStatusChange = (status: Partial<UserStatus>) => {
    if (status.status) {
      updateStatus(status.status);
    }
  };

  return (
    <div className="space-y-6">
      <StatusSettingPanel
        currentStatus={currentUserPresence}
        onStatusChange={handleStatusChange}
        onCustomStatusUpdate={setCustomUserStatus}
        onCustomStatusClear={clearUserCustomStatus}
      />
      
      {/* Additional settings could go here */}
      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Set your working hours to help team members know when you're available.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              // This would open a working hours configuration modal
              const workingHours = JSON.stringify({
                monday: { start: '09:00', end: '17:00' },
                tuesday: { start: '09:00', end: '17:00' },
                wednesday: { start: '09:00', end: '17:00' },
                thursday: { start: '09:00', end: '17:00' },
                friday: { start: '09:00', end: '17:00' },
                saturday: null,
                sunday: null,
              });
              updateUserWorkingHours(workingHours, Intl.DateTimeFormat().resolvedOptions().timeZone);
            }}
          >
            Configure Working Hours
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default {
  UserProfileCard,
  TeamMembersList,
  ChatUserList,
  UserSettingsPresence,
};