import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChannels, useCreateChannel } from "@/hooks/use-channels";
import { useMessages, useSendMessage } from "@/hooks/use-messages";
import { useTeams } from "@/hooks/use-teams";
import useWorkspaceStore from "@/store/workspace";
import { toast } from "sonner";
import { useQuickActions } from "@/hooks/use-quick-actions";

export function SimpleCommunicationTest() {
  const { workspace } = useWorkspaceStore();
  const [channelName, setChannelName] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  // API hooks
  const { data: channels = [], refetch: refetchChannels, isLoading: channelsLoading } = useChannels(workspace?.id || '');
  const { data: teams = [], isLoading: teamsLoading } = useTeams(workspace?.id || '');
  const { data: messages = [], refetch: refetchMessages } = useMessages(selectedChannelId);
  const { mutate: createChannel, isPending: isCreatingChannel } = useCreateChannel();
  const { mutate: sendMessage, isPending: isSendingMessage } = useSendMessage();

  // Quick actions
  const {
    handleScheduleMeeting,
    handleCreateReport,
    handleViewAnalytics,
    handleTeamSettings,
    handleStartVideoCall,
    handleStartPhoneCall,
  } = useQuickActions();

  const handleCreateChannel = async () => {
    if (!workspace?.id || !channelName.trim()) {
      toast.error("Please enter a channel name and select a workspace");
      return;
    }

    try {
      await createChannel({
        name: channelName.trim(),
        description: `Test channel created for ${channelName}`,
        type: "team",
        workspaceId: workspace.id,
        teamId: selectedTeamId || undefined,
      });
      
      toast.success("Channel created successfully!");
      setChannelName("");
      await refetchChannels();
    } catch (error) {
      console.error('Failed to create channel:', error);
      toast.error("Failed to create channel");
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChannelId || !messageContent.trim()) {
      toast.error("Please select a channel and enter a message");
      return;
    }

    try {
      await sendMessage({
        channelId: selectedChannelId,
        content: messageContent.trim(),
      });
      
      toast.success("Message sent!");
      setMessageContent("");
      await refetchMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="p-6 border rounded-lg space-y-6 max-w-4xl">
      <h2 className="text-xl font-semibold">🚀 Meridian Communication System Test</h2>
      
      {/* Status Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
        <div>
          <div className="text-sm font-medium">Workspace</div>
          <div className="text-sm text-muted-foreground">{workspace?.name || "None selected"}</div>
        </div>
        <div>
          <div className="text-sm font-medium">Channels</div>
          <div className="text-sm text-muted-foreground">
            {channelsLoading ? "Loading..." : `${channels.length} available`}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium">Teams</div>
          <div className="text-sm text-muted-foreground">
            {teamsLoading ? "Loading..." : `${teams.length} available`}
          </div>
        </div>
      </div>

      {/* Channel Creation */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">✅ Create Channel (FIXED)</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Channel Name</label>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Enter channel name"
              disabled={isCreatingChannel}
            />
          </div>
          
          {teams.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Team (Optional)</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full p-2 border border-input rounded-lg bg-background"
                disabled={isCreatingChannel}
              >
                <option value="">Choose a team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.memberCount} members)
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <Button 
            onClick={handleCreateChannel}
            disabled={!channelName.trim() || !workspace?.id || isCreatingChannel}
          >
            {isCreatingChannel ? "Creating..." : "Create Channel"}
          </Button>
        </div>
      </div>

      {/* Message Sending */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">💬 Send Message (FIXED)</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Select Channel</label>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="w-full p-2 border border-input rounded-lg bg-background"
              disabled={isSendingMessage}
            >
              <option value="">Choose a channel...</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name} ({channel.type})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Message Content</label>
            <Input
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Enter your message"
              disabled={isSendingMessage}
            />
          </div>
          
          <Button 
            onClick={handleSendMessage}
            disabled={!selectedChannelId || !messageContent.trim() || isSendingMessage}
          >
            {isSendingMessage ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">⚡ Quick Actions (FIXED)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={handleScheduleMeeting}>
            📅 Schedule Meeting
          </Button>
          <Button variant="outline" size="sm" onClick={handleCreateReport}>
            📊 Create Report
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewAnalytics}>
            📈 View Analytics
          </Button>
          <Button variant="outline" size="sm" onClick={handleTeamSettings}>
            ⚙️ Team Settings
          </Button>
          <Button variant="outline" size="sm" onClick={handleStartVideoCall}>
            📹 Video Call
          </Button>
          <Button variant="outline" size="sm" onClick={handleStartPhoneCall}>
            📞 Phone Call
          </Button>
        </div>
      </div>

      {/* Messages Display */}
      {selectedChannelId && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">💾 Messages (Persistent)</h3>
          <div className="space-y-2 p-4 bg-muted rounded-lg max-h-60 overflow-y-auto">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div key={message.id} className="p-2 bg-background rounded border">
                  <div className="text-sm font-medium">{message.userEmail}</div>
                  <div className="text-sm">{message.content}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No messages yet. Send one above!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Available Data Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Available Channels:</h4>
            <div className="space-y-1 text-xs">
              {channels.map(channel => (
                <div key={channel.id} className="text-muted-foreground">
                  #{channel.name} - {channel.type} - {channel.archived ? 'Archived' : 'Active'}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {teams.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Available Teams:</h4>
            <div className="space-y-1 text-xs">
              {teams.map(team => (
                <div key={team.id} className="text-muted-foreground">
                  {team.name} - {team.type} - {team.memberCount} members
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 