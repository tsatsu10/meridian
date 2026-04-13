/**
 * TypeScript types for DiceBear avatar system
 */

import type { DiceBearStyle } from '@/lib/dicebear';

/**
 * User avatar preferences
 */
export interface UserAvatarPreferences {
  /** Custom uploaded avatar URL (takes priority) */
  customAvatar?: string;
  
  /** Preferred DiceBear style */
  avatarStyle?: DiceBearStyle;
  
  /** Custom background color (hex without #) */
  avatarBackgroundColor?: string;
  
  /** Avatar scale (10-200%) */
  avatarScale?: number;
  
  /** Avatar rotation (0-360 degrees) */
  avatarRotation?: number;
  
  /** Flip avatar horizontally */
  avatarFlip?: boolean;
  
  /** Use role-based colors */
  useRoleBasedColors?: boolean;
}

/**
 * Avatar configuration for different entity types
 */
export interface AvatarConfig {
  /** DiceBear style to use */
  style: DiceBearStyle;
  
  /** Background color */
  backgroundColor?: string;
  
  /** Size in pixels */
  size?: number;
  
  /** Additional options */
  options?: Record<string, any>;
}

/**
 * Avatar metadata
 */
export interface AvatarMetadata {
  /** Avatar URL */
  url: string;
  
  /** Source type */
  source: 'custom' | 'dicebear' | 'fallback';
  
  /** DiceBear style used (if applicable) */
  style?: DiceBearStyle;
  
  /** Seed used for generation */
  seed?: string;
  
  /** Generated timestamp */
  generatedAt?: Date;
}

/**
 * Avatar style category
 */
export type AvatarStyleCategory = 
  | 'professional'
  | 'friendly'
  | 'tech'
  | 'abstract'
  | 'fun';

/**
 * Avatar style option for UI
 */
export interface AvatarStyleOption {
  value: DiceBearStyle;
  label: string;
  description: string;
  category: AvatarStyleCategory;
  preview: string;
  isPremium?: boolean;
  recommended?: boolean;
}

/**
 * Entity that can have an avatar
 */
export interface AvatarEntity {
  id: string;
  type: 'user' | 'workspace' | 'project' | 'guest' | 'bot';
  name?: string;
  email?: string;
  role?: string;
  color?: string;
  avatar?: string;
  avatarStyle?: DiceBearStyle;
}

/**
 * Avatar generation result
 */
export interface AvatarGenerationResult {
  url: string;
  metadata: AvatarMetadata;
  cached: boolean;
}

/**
 * Avatar cache entry
 */
export interface AvatarCacheEntry {
  url: string;
  timestamp: number;
  hits: number;
}

/**
 * Avatar statistics
 */
export interface AvatarStats {
  totalGenerated: number;
  cacheHits: number;
  cacheMisses: number;
  styleUsage: Record<DiceBearStyle, number>;
  averageGenerationTime: number;
}

