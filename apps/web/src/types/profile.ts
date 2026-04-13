/**
 * Unified Profile Types
 * Single source of truth for all profile-related data structures
 */

/**
 * Core user profile data
 * Used across all profile components and APIs
 */
export interface UserProfile {
  // Identity
  id: string;
  email: string;
  name: string; // Full name (standardized from displayName)
  avatar?: string | null;
  
  // Professional Information
  jobTitle?: string | null;
  company?: string | null;
  department?: string | null;
  headline?: string | null; // Professional headline/tagline
  
  // Personal Information
  bio?: string | null;
  location?: string | null;
  phone?: string | null;
  
  // Social Links
  website?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  twitterUrl?: string | null;
  
  // Localization
  timezone?: string | null;
  language?: string | null;
  
  // Skills & Expertise
  skills?: string[];
  
  // Privacy & Preferences
  isPublic?: boolean;
  allowDirectMessages?: boolean;
  showOnlineStatus?: boolean;
  
  // Status & Presence
  status?: 'available' | 'busy' | 'away' | 'offline';
  customStatus?: string | null;
  isOnline?: boolean;
  lastSeen?: string | Date | null;
  
  // Role & Permissions
  role?: string; // User role in workspace
  
  // Metadata
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Profile update payload
 * For updating user profile via API
 */
export interface ProfileUpdateData {
  name?: string;
  email?: string;
  avatar?: string;
  jobTitle?: string;
  company?: string;
  department?: string;
  headline?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  timezone?: string;
  language?: string;
  skills?: string[];
  isPublic?: boolean;
  allowDirectMessages?: boolean;
  showOnlineStatus?: boolean;
  customStatus?: string;
}

/**
 * Profile settings specific to the settings page
 */
export interface ProfileSettings extends UserProfile {
  // Additional settings-specific fields
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  weeklyDigest?: boolean;
}

/**
 * Chat user profile
 * Extended profile data for chat/messaging context
 */
export interface ChatUserProfile extends UserProfile {
  // Chat-specific fields
  isFavorite?: boolean;
  isMuted?: boolean;
  isBlocked?: boolean;
  lastMessageAt?: string | Date | null;
  unreadCount?: number;
}

/**
 * Profile form values
 * For react-hook-form and validation
 */
export interface ProfileFormValues {
  name: string;
  email: string;
  avatar?: string;
  jobTitle?: string;
  company?: string;
  department?: string;
  headline?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  timezone?: string;
  language?: string;
  skills?: string[];
  isPublic: boolean;
  allowDirectMessages: boolean;
  showOnlineStatus: boolean;
}

/**
 * Avatar upload response
 */
export interface AvatarUploadResponse {
  success: boolean;
  avatarUrl?: string;
  url?: string;
  message?: string;
}

/**
 * Profile API response
 */
export interface ProfileApiResponse<T = UserProfile> {
  success: boolean;
  data?: T;
  user?: T; // Alternative response format
  profile?: T; // Alternative response format
  message?: string;
  error?: string;
}

/**
 * Type guard to check if a profile is valid
 */
export function isValidProfile(profile: any): profile is UserProfile {
  return (
    profile &&
    typeof profile === 'object' &&
    typeof profile.id === 'string' &&
    typeof profile.email === 'string' &&
    typeof profile.name === 'string'
  );
}

/**
 * Transform legacy profile data to unified format
 * Handles name/displayName inconsistencies
 */
export function normalizeProfile(data: any): UserProfile {
  return {
    id: data.id || data.userId || '',
    email: data.email || data.userEmail || '',
    name: data.name || data.displayName || data.userName || '',
    avatar: data.avatar || data.profilePicture || data.userAvatar || null,
    jobTitle: data.jobTitle || null,
    company: data.company || null,
    department: data.department || null,
    headline: data.headline || null,
    bio: data.bio || null,
    location: data.location || null,
    phone: data.phone || null,
    website: data.website || null,
    linkedinUrl: data.linkedinUrl || null,
    githubUrl: data.githubUrl || null,
    twitterUrl: data.twitterUrl || null,
    timezone: data.timezone || null,
    language: data.language || null,
    skills: Array.isArray(data.skills) ? data.skills : [],
    isPublic: data.isPublic ?? true,
    allowDirectMessages: data.allowDirectMessages ?? true,
    showOnlineStatus: data.showOnlineStatus ?? true,
    status: data.status || 'offline',
    customStatus: data.customStatus || null,
    isOnline: data.isOnline ?? false,
    lastSeen: data.lastSeen || null,
    role: data.role || 'member',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

/**
 * Get user initials from name
 */
export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format last seen time
 */
export function formatLastSeen(lastSeen: string | Date | null): string {
  if (!lastSeen) return 'Never';
  
  const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

