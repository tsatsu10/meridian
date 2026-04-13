import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send } from 'lucide-react';
import EnhancedSendMessageModal from './enhanced-send-message-modal';
import useWorkspaceStore from '@/store/workspace';

interface SendMessageButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  defaultRecipients?: Array<{
    id: string;
    name: string;
    type: 'user' | 'team' | 'channel';
    email?: string;
    isOnline?: boolean;
    avatar?: string;
    memberCount?: number;
  }>;
  contextType?: 'project' | 'task' | 'general';
  contextId?: string;
  defaultMessage?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function SendMessageButton({
  variant = 'default',
  size = 'default',
  defaultRecipients = [],
  contextType = 'general',
  contextId,
  defaultMessage = '',
  className,
  children,
}: SendMessageButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { workspace } = useWorkspaceStore();

  if (!workspace?.id) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        {children || (
          <>
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </>
        )}
      </Button>

      <EnhancedSendMessageModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspace.id}
        defaultRecipients={defaultRecipients}
        contextType={contextType}
        contextId={contextId}
        defaultMessage={defaultMessage}
      />
    </>
  );
}

// Quick message button for floating action
export function QuickMessageButton({
  className,
  ...props
}: Omit<SendMessageButtonProps, 'children'>) {
  return (
    <SendMessageButton
      variant="default"
      size="lg"
      className={`fixed bottom-6 right-6 rounded-full h-14 w-14 p-0 shadow-lg hover:shadow-xl transition-shadow z-50 ${className}`}
      {...props}
    >
      <MessageCircle className="w-6 h-6" />
    </SendMessageButton>
  );
}

// Usage examples for different contexts
export function SendToUserButton({ userId, userName, userEmail }: { userId: string; userName: string; userEmail: string }) {
  return (
    <SendMessageButton
      variant="outline"
      size="sm"
      defaultRecipients={[{
        id: userId,
        name: userName,
        type: 'user',
        email: userEmail,
      }]}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Message {userName}
    </SendMessageButton>
  );
}

export function SendToTeamButton({ teamId, teamName, memberCount }: { teamId: string; teamName: string; memberCount?: number }) {
  return (
    <SendMessageButton
      variant="outline"
      size="sm"
      defaultRecipients={[{
        id: teamId,
        name: teamName,
        type: 'team',
        memberCount,
      }]}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Message Team
    </SendMessageButton>
  );
}

export function SendToChannelButton({ channelId, channelName }: { channelId: string; channelName: string }) {
  return (
    <SendMessageButton
      variant="outline"
      size="sm"
      defaultRecipients={[{
        id: channelId,
        name: channelName,
        type: 'channel',
      }]}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Message #{channelName}
    </SendMessageButton>
  );
}