import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useChannels, useCreateChannel } from "@/hooks/use-channels";
import { useSendMessage } from "@/hooks/use-messages";
import useWorkspaceStore from "@/store/workspace";
import { toast } from "sonner";

export function ChatTestButton() {
  const { workspace } = useWorkspaceStore();
  const [isCreating, setIsCreating] = useState(false);
  
  const { data: channels = [] } = useChannels(workspace?.id || '');
  const { mutate: createChannel } = useCreateChannel();
  const { mutate: sendMessage } = useSendMessage();

  const handleCreateTestChannel = async () => {
    if (!workspace?.id) {
      toast.error("No workspace selected");
      return;
    }

    setIsCreating(true);
    try {
      createChannel({
        name: "test-channel",
        description: "Test channel for communication",
        type: "team",
        workspaceId: workspace.id,
      });
      toast.success("Test channel created!");
    } catch (error) {
      console.error("Failed to create test channel:", error);
      toast.error("Failed to create test channel");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (channels.length === 0) {
      toast.error("No channels available. Create a channel first.");
      return;
    }

    const testChannel = channels[0];
    try {
      sendMessage({
        channelId: testChannel.id,
        content: "Hello! This is a test message from the new chat system.",
      });
      toast.success("Test message sent!");
    } catch (error) {
      console.error("Failed to send test message:", error);
      toast.error("Failed to send test message");
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <h3 className="font-semibold">Chat System Test</h3>
      <div className="space-y-2">
        <Button 
          onClick={handleCreateTestChannel} 
          disabled={isCreating}
          size="sm"
        >
          {isCreating ? "Creating..." : "Create Test Channel"}
        </Button>
        <Button 
          onClick={handleSendTestMessage} 
          disabled={channels.length === 0}
          size="sm"
          variant="outline"
        >
          Send Test Message
        </Button>
        <div className="text-sm text-muted-foreground">
          Channels: {channels.length}
        </div>
      </div>
    </div>
  );
} 