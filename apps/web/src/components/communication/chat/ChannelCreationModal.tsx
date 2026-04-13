import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { useCreateChannel } from "@/hooks/use-channels";
import { useTeams } from "@/hooks/use-teams";
import useWorkspaceStore from "@/store/workspace";
import { toast } from "sonner";

interface ChannelCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreateChannelData {
  name: string;
  description?: string;
  type: 'team' | 'project' | 'announcement' | 'private';
  workspaceId: string;
  teamId?: string;
  projectId?: string;
}

export default function ChannelCreationModal({ isOpen, onClose }: ChannelCreationModalProps) {
  const { workspace } = useWorkspaceStore();
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [channelType, setChannelType] = useState<'team' | 'project' | 'announcement' | 'private'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: teams = [] } = useTeams(workspace?.id || '');
  const { mutate: createChannel } = useCreateChannel();

  const resetForm = () => {
    setChannelName("");
    setChannelDescription("");
    setChannelType('team');
    setSelectedTeamId("");
    setSelectedProjectId("");
    setSelectedMembers([]);
  };

  const handleCreateChannel = async () => {
    if (!workspace?.id) {
      toast.error("No workspace selected");
      return;
    }

    if (!channelName.trim()) {
      toast.error("Channel name is required");
      return;
    }

    if (channelType === 'team' && !selectedTeamId) {
      toast.error("Please select a team for team channels");
      return;
    }

    setIsCreating(true);
    try {
      const channelData: CreateChannelData = {
        name: channelName.trim(),
        description: channelDescription.trim() || undefined,
        type: channelType,
        workspaceId: workspace.id,
        teamId: channelType === 'team' ? selectedTeamId : undefined,
        projectId: channelType === 'project' ? selectedProjectId : undefined,
      };

      await createChannel(channelData);
      toast.success("Channel created successfully!");
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create channel:', error);
      toast.error("Failed to create channel");
    } finally {
      setIsCreating(false);
    }
  };

  const isValidName = channelName.length >= 2 && channelName.length <= 50;
  const isValidDescription = channelDescription.length <= 500;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Set up a new channel for team communication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Channel Name</label>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Enter channel name"
              className={cn(!isValidName && channelName && "border-destructive")}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {channelName.length}/50 characters (minimum 2)
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <textarea
              value={channelDescription}
              onChange={(e) => setChannelDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full p-3 border border-input rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {channelDescription.length}/500 characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Channel Type</label>
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value as any)}
              className="w-full p-3 border border-input rounded-lg bg-background"
            >
              <option value="team">Team Channel</option>
              <option value="project">Project Channel</option>
              <option value="announcement">Announcement Channel</option>
              <option value="private">Private Channel</option>
            </select>
          </div>

          {channelType === 'team' && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Team</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full p-3 border border-input rounded-lg bg-background"
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

          {channelType === 'project' && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full p-3 border border-input rounded-lg bg-background"
              >
                <option value="">Choose a project...</option>
                {teams
                  .filter(team => team.type === 'project' && team.projectId)
                  .map((team) => (
                    <option key={team.projectId} value={team.projectId}>
                      {team.projectName} ({team.memberCount} members)
                    </option>
                  ))}
              </select>
            </div>
          )}

          {(channelType === 'private' && selectedTeamId) && (
            <div>
              <label className="block text-sm font-medium mb-2">Add Members</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-input rounded-lg p-3">
                {teams
                  .find(team => team.id === selectedTeamId)?.members
                  .map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers(prev => [...prev, member.id]);
                          } else {
                            setSelectedMembers(prev => prev.filter(id => id !== member.id));
                          }
                        }}
                      />
                      <Avatar className="w-6 h-6">
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {member.name.charAt(0)}
                        </div>
                      </Avatar>
                      <span className="text-sm">{member.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateChannel}
              disabled={!isValidName || !isValidDescription || isCreating}
            >
              {isCreating ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 