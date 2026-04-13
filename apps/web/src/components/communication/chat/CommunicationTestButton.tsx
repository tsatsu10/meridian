import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useChannels, useCreateChannel } from "@/hooks/use-channels";
import { useSendMessage } from "@/hooks/use-messages";
import { useTeams } from "@/hooks/use-teams";
import useWorkspaceStore from "@/store/workspace";
import { toast } from "sonner";
import ChannelCreationModal from "./ChannelCreationModal";

export function CommunicationTestButton() {
  const { workspace } = useWorkspaceStore();
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const { data: channels = [], refetch: refetchChannels } = useChannels(workspace?.id || '');
  const { data: teams = [] } = useTeams(workspace?.id || '');
  const { mutate: createChannel } = useCreateChannel();
  const { mutate: sendMessage } = useSendMessage();

  const handleCreateTestChannel = async () => {
    if (!workspace?.id) {
      toast.error("No workspace selected");
      return;
    }

    setIsCreating(true);
    try {
      await createChannel({
        name: "test-channel",
        description: "Test channel for communication",
        type: "team",
        workspaceId: workspace.id,
      });
      toast.success("Test channel created!");
      await refetchChannels();
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
      await sendMessage({
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
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="font-semibold">Communication System Test</h3>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <div>Workspace: {workspace?.name || "None selected"}</div>
          <div>Channels: {channels.length}</div>
          <div>Teams: {teams.length}</div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleCreateTestChannel} 
            disabled={isCreating || !workspace?.id}
            size="sm"
          >
            {isCreating ? "Creating..." : "Create Test Channel"}
          </Button>
          
          <Button 
            onClick={() => setIsChannelModalOpen(true)}
            disabled={!workspace?.id}
            size="sm"
            variant="outline"
          >
            Create Channel (Modal)
          </Button>
          
          <Button 
            onClick={handleSendTestMessage} 
            disabled={channels.length === 0}
            size="sm"
            variant="outline"
          >
            Send Test Message
          </Button>
          
          <Button 
            onClick={() => refetchChannels()}
            size="sm"
            variant="ghost"
          >
            Refresh Channels
          </Button>
        </div>
      </div>
      
      {channels.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Available Channels:</h4>
          <div className="space-y-1">
            {channels.map(channel => (
              <div key={channel.id} className="text-sm text-muted-foreground">
                #{channel.name} ({channel.type})
              </div>
            ))}
          </div>
        </div>
      )}
      
      {teams.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Available Teams:</h4>
          <div className="space-y-1">
            {teams.map(team => (
              <div key={team.id} className="text-sm text-muted-foreground">
                {team.name} ({team.memberCount} members)
              </div>
            ))}
          </div>
        </div>
      )}

      <ChannelCreationModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
      />
    </div>
  );
} 