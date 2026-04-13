// @epic-4.1-direct-messaging: Channel API fetcher functions
// @persona-sarah: PM needs to create and manage team channels
// @persona-david: Team lead needs channel management capabilities

import { fetchApi } from '@/lib/fetch';
import { logger } from "../../lib/logger";

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: 'team' | 'announcement' | 'dm' | 'private' | 'project';
  workspaceId: string;
  teamId?: string;
  projectId?: string;
  isPrivate: boolean;
  allowThreads: boolean;
  allowFileUploads: boolean;
  allowReactions: boolean;
  allowMentions: boolean;
  archived: boolean;
  memberCount: number;
  lastActivityAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number; // Number of unread messages for current user
}

export interface CreateChannelRequest {
  name: string;
  description?: string;
  type?: 'team' | 'announcement' | 'private' | 'project' | 'group';
  workspaceId: string;
  teamId?: string;
  projectId?: string;
  isPrivate: boolean;
  allowThreads?: boolean;
  allowFileUploads?: boolean;
  allowReactions?: boolean;
  allowMentions?: boolean;
  createdBy: string;
  initialMembers?: string[]; // For groups - initial member emails
}

export interface UpdateChannelRequest {
  channelId: string;
  name?: string;
  description?: string;
  isPrivate?: boolean;
  allowThreads?: boolean;
  allowFileUploads?: boolean;
  allowReactions?: boolean;
  allowMentions?: boolean;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userEmail: string;
  role: 'owner' | 'admin' | 'moderator' | 'member' | 'viewer';
  canSendMessages: boolean;
  canEditMessages: boolean;
  canDeleteMessages: boolean;
  canPinMessages: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canManageChannel: boolean;
  canManagePermissions: boolean;
  isMuted: boolean;
  mutedUntil: string | null;
  notificationsEnabled: boolean;
  joinedAt: string;
}

// Get all channels for a workspace
export async function getChannels(workspaceId: string): Promise<Channel[]> {
  try {
    const response = await fetchApi(`/channel/${workspaceId}`);
    return response.channels || [];
  } catch (error) {
    console.error('Failed to fetch channels:', error);
    throw error;
  }
}

// Get a single channel by ID
export async function getChannel(channelId: string): Promise<Channel> {
  try {
    const response = await fetchApi(`/channel/channel/${channelId}`);
    return response.channel;
  } catch (error) {
    console.error('Failed to fetch channel:', error);
    throw error;
  }
}

// Create a new channel
export async function createChannel(data: CreateChannelRequest): Promise<Channel> {
  try {
    const response = await fetchApi('/channel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name.toLowerCase().replace(/\s+/g, '-'), // Ensure lowercase and no spaces
        description: data.description,
        type: data.type || 'team',
        workspaceId: data.workspaceId,
        teamId: data.teamId,
        projectId: data.projectId,
        isPrivate: data.isPrivate,
        allowThreads: data.allowThreads ?? true,
        allowFileUploads: data.allowFileUploads ?? true,
        allowReactions: data.allowReactions ?? true,
        allowMentions: data.allowMentions ?? true,
        createdBy: data.createdBy,
        initialMembers: data.initialMembers,
      }),
    });
    
    logger.debug("🔍 Create channel API response:");
    logger.debug("🔍 Channel from response:");
    
    return response.channel;
  } catch (error) {
    console.error('Failed to create channel:', error);
    throw error;
  }
}

// Update an existing channel
export async function updateChannel(data: UpdateChannelRequest): Promise<Channel> {
  try {
    const response = await fetchApi(`/channel/${data.channelId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name?.toLowerCase().replace(/\s+/g, '-'),
        description: data.description,
        isPrivate: data.isPrivate,
        allowThreads: data.allowThreads,
        allowFileUploads: data.allowFileUploads,
        allowReactions: data.allowReactions,
        allowMentions: data.allowMentions,
      }),
    });
    return response.channel;
  } catch (error) {
    console.error('Failed to update channel:', error);
    throw error;
  }
}

// Archive/delete a channel
export async function deleteChannel(channelId: string): Promise<void> {
  try {
    await fetchApi(`/channel/${channelId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to delete channel:', error);
    throw error;
  }
}

// Join a channel
export async function joinChannel(channelId: string, userEmail: string): Promise<void> {
  try {
    await fetchApi(`/channel/${channelId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userEmail }),
    });
  } catch (error) {
    console.error('Failed to join channel:', error);
    throw error;
  }
}

// Leave a channel
export async function leaveChannel(channelId: string, userEmail: string): Promise<void> {
  try {
    await fetchApi(`/channel/${channelId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userEmail }),
    });
  } catch (error) {
    console.error('Failed to leave channel:', error);
    throw error;
  }
}

// Get channel members
export async function getChannelMembers(channelId: string): Promise<ChannelMember[]> {
  try {
    // Try the new management path first
    let response = await fetchApi(`/channel/management/${channelId}/members`);
    if (!response.members) {
      // Fallback to legacy path if needed
      response = await fetchApi(`/channel/${channelId}/members`);
    }
    return response.members || [];
  } catch (error) {
    console.error('Failed to fetch channel members:', error);
    // Return empty array instead of throwing to prevent runtime errors
    return [];
  }
}

// Add member to channel
export async function addChannelMember(
  channelId: string, 
  userEmail: string, 
  role: ChannelMember['role'] = 'member'
): Promise<ChannelMember> {
  try {
    // Use management path for add
    const response = await fetchApi(`/channel/management/${channelId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userEmail, role }),
    });
    return response.member;
  } catch (error) {
    console.error('Failed to add channel member:', error);
    throw error;
  }
}

// Remove member from channel
export async function removeChannelMember(channelId: string, memberEmail: string): Promise<void> {
  try {
    // Use management path for remove
    await fetchApi(`/channel/management/${channelId}/members/${encodeURIComponent(memberEmail)}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to remove channel member:', error);
    throw error;
  }
}