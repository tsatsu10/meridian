// @epic-4.1-direct-messaging: Group API wrapper using Channel API with group semantics
// @persona-sarah: PM needs to create project groups for focused team collaboration
// @persona-david: Team lead needs to organize team members into working groups

import { 
  createChannel, 
  addChannelMember, 
  type CreateChannelRequest, 
  type Channel 
} from '@/fetchers/channel/channel-api';

export interface Group extends Channel {
  type: 'group';
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  workspaceId: string;
  createdBy: string;
  members: string[]; // Email addresses of initial members
}

// Create a new group using the channel API with group semantics
export async function createGroup(data: CreateGroupRequest): Promise<Group> {
  try {
    // Create the group as a private channel with type 'group'
    const groupChannel = await createChannel({
      name: data.name,
      description: data.description,
      type: 'group',
      workspaceId: data.workspaceId,
      isPrivate: true, // Groups are always private
      createdBy: data.createdBy,
      initialMembers: data.members,
      // Group-specific settings
      allowThreads: true,
      allowFileUploads: true,
      allowReactions: true,
      allowMentions: true,
    });

    // The backend should handle adding initial members, but we can add them manually if needed
    // This is a fallback in case the backend doesn't handle initialMembers
    try {
      for (const memberEmail of data.members) {
        if (memberEmail !== data.createdBy) { // Don't re-add the creator
          await addChannelMember(groupChannel.id, memberEmail, 'member');
        }
      }
    } catch (memberError) {
      console.warn('Some members could not be added to the group:', memberError);
      // Don't fail the group creation if member addition fails
    }

    return groupChannel as Group;
  } catch (error) {
    console.error('Failed to create group:', error);
    throw error;
  }
}

// Get all groups for a workspace (channels with type 'group')
export async function getGroups(workspaceId: string): Promise<Group[]> {
  // This would be handled by the existing useChannels hook with filtering
  // No separate API call needed
  throw new Error('Use useChannels hook with filtering by type: "group"');
}

// Export group-related types
export type { Group, CreateGroupRequest };