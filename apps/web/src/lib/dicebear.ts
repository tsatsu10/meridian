/**
 * 🎨 DiceBear Avatar Generation Library
 * 
 * Generates unique, deterministic avatars for users, workspaces, and projects
 * using the DiceBear Avatar API
 * 
 * @see https://www.dicebear.com/
 * 
 * Features:
 * - 30+ avatar styles
 * - Deterministic generation (same seed = same avatar)
 * - Role-based color coding
 * - Customization options
 * - SVG format (scales perfectly)
 * - Zero cost (free unlimited API)
 * - Privacy-friendly (no data storage)
 */

/**
 * Available DiceBear avatar styles
 * Each style has a unique aesthetic
 */
export type DiceBearStyle =
  // Professional & Minimalist
  | 'personas'           // Clean minimal faces - BEST for business
  | 'notionists'         // Notion-style avatars - Professional
  | 'lorelei'           // Illustrated people - Friendly professional
  
  // Friendly & Approachable
  | 'adventurer'         // Cartoon characters - Great for teams
  | 'adventurer-neutral' // Gender-neutral cartoons
  | 'avataaars'         // Sketch-style faces
  | 'avataaars-neutral'  // Gender-neutral sketches
  | 'big-ears'          // Fun cartoon style
  | 'big-ears-neutral'   // Gender-neutral fun
  | 'big-smile'         // Happy faces
  
  // Tech & Modern
  | 'bottts'            // Robot characters - Tech vibe
  | 'bottts-neutral'     // Gender-neutral robots
  | 'pixel-art'         // 8-bit style - Retro gaming
  | 'pixel-art-neutral'  // Gender-neutral 8-bit
  
  // Abstract & Geometric
  | 'shapes'            // Geometric patterns - Modern
  | 'identicon'         // GitHub-style - Familiar to devs
  | 'rings'             // Circular patterns
  | 'thumbs'            // Thumbprint style
  
  // Fun & Playful
  | 'croodles'          // Doodle style
  | 'croodles-neutral'   // Gender-neutral doodles
  | 'fun-emoji'         // Emoji-based
  | 'icons'             // Simple icons
  | 'initials'          // Enhanced initials
  | 'micah'             // Illustrated style
  | 'miniavs'           // Minimal avatars
  | 'open-peeps'        // Illustrated people
  | 'Dylan'             // Comic book style;

/**
 * Avatar generation options
 */
export interface DiceBearOptions {
  /** Seed for avatar generation (email, username, ID) */
  seed: string;
  
  /** Avatar style */
  style?: DiceBearStyle;
  
  /** Background color (hex without #) */
  backgroundColor?: string | string[];
  
  /** Size in pixels (SVG scales, but sets viewBox) */
  size?: number;
  
  /** Flip the avatar horizontally */
  flip?: boolean;
  
  /** Rotate the avatar (0-360 degrees) */
  rotate?: number;
  
  /** Scale the avatar (10-200%) */
  scale?: number;
  
  /** Radius for rounded corners (0-50) */
  radius?: number;
  
  /** Output format */
  format?: 'svg' | 'png' | 'jpg' | 'webp';
  
  /** Additional style-specific options */
  customOptions?: Record<string, string | number | boolean>;
}

/**
 * Role-based avatar configuration
 */
export interface RoleAvatarConfig {
  backgroundColor: string;
  style?: DiceBearStyle;
  scale?: number;
}

/**
 * Role color mapping based on Meridian's role system
 * Colors chosen for visual distinction and hierarchy
 */
export const ROLE_AVATAR_COLORS: Record<string, string> = {
  // Management Roles (Purple/Red tones - Authority)
  'workspace-manager': 'c084fc',  // Purple - Highest authority
  'admin': 'ef4444',              // Red - Administration
  'department-head': 'f59e0b',    // Amber - Department scope
  
  // Coordination Roles (Blue tones - Leadership)
  'team-lead': '3b82f6',          // Blue - Team coordination
  'project-manager': '10b981',    // Green - Project scope
  
  // Standard Roles (Indigo/Gray tones - Members)
  'member': '6366f1',             // Indigo - Default/PRIMARY
  'project-viewer': '8b5cf6',     // Violet - Read-only
  'guest': '64748b',              // Gray - External access
};

/**
 * Default avatar style for the entire platform
 * Can be overridden by user preferences
 */
export const DEFAULT_AVATAR_STYLE: DiceBearStyle = 'personas'; // Professional minimalist

/**
 * Style recommendations by use case
 */
export const STYLE_RECOMMENDATIONS = {
  users: 'personas',           // Professional for team members
  workspaces: 'shapes',        // Abstract for workspaces
  projects: 'identicon',       // GitHub-style for projects
  guests: 'initials',          // Simple for external users
  bots: 'bottts',              // Robots for automation
} as const;

/**
 * Generate a DiceBear avatar URL
 * 
 * @param options - Avatar generation options
 * @returns URL to avatar image
 * 
 * @example
 * ```typescript
 * const avatarUrl = generateDiceBearAvatar({
 *   seed: 'john@example.com',
 *   style: 'personas',
 *   backgroundColor: '6366f1'
 * });
 * ```
 */
export function generateDiceBearAvatar(options: DiceBearOptions): string {
  const {
    seed,
    style = DEFAULT_AVATAR_STYLE,
    backgroundColor,
    size,
    flip,
    rotate,
    scale,
    radius,
    format = 'svg',
    customOptions = {},
  } = options;

  // Base URL
  const baseUrl = `https://api.dicebear.com/9.x/${style}/${format}`;
  
  // Build query parameters
  const params = new URLSearchParams();
  
  // Required: seed
  params.set('seed', seed);
  
  // Optional parameters
  if (backgroundColor) {
    const bgColor = Array.isArray(backgroundColor) 
      ? backgroundColor.join(',') 
      : backgroundColor;
    params.set('backgroundColor', bgColor);
  }
  
  if (size) params.set('size', size.toString());
  if (flip) params.set('flip', 'true');
  if (rotate) params.set('rotate', rotate.toString());
  if (scale) params.set('scale', scale.toString());
  if (radius) params.set('radius', radius.toString());
  
  // Add custom style-specific options
  Object.entries(customOptions).forEach(([key, value]) => {
    params.set(key, String(value));
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate avatar with role-based styling
 * Automatically applies appropriate colors and styles based on user role
 * 
 * @param user - User object with email and role
 * @returns Avatar URL
 * 
 * @example
 * ```typescript
 * const avatar = getRoleBasedAvatar({ 
 *   email: 'john@example.com', 
 *   role: 'team-lead' 
 * });
 * // Returns blue-tinted avatar for team lead
 * ```
 */
export function getRoleBasedAvatar(user: {
  email: string;
  role?: string;
  style?: DiceBearStyle;
}): string {
  const role = user.role || 'member';
  const backgroundColor = ROLE_AVATAR_COLORS[role] || ROLE_AVATAR_COLORS['member'];
  
  return generateDiceBearAvatar({
    seed: user.email,
    style: user.style || DEFAULT_AVATAR_STYLE,
    backgroundColor,
  });
}

/**
 * Generate workspace avatar
 * Uses abstract/geometric style for workspace identity
 * 
 * @param workspace - Workspace object with ID
 * @returns Avatar URL
 */
export function getWorkspaceAvatar(workspace: {
  id: string;
  name?: string;
  color?: string;
}): string {
  return generateDiceBearAvatar({
    seed: workspace.name || workspace.id,
    style: 'shapes',
    backgroundColor: workspace.color?.replace('#', '') || '6366f1',
  });
}

/**
 * Generate project avatar
 * Uses identicon style (GitHub-like) for project identity
 * 
 * @param project - Project object with ID
 * @returns Avatar URL
 */
export function getProjectAvatar(project: {
  id: string;
  name?: string;
  color?: string;
}): string {
  return generateDiceBearAvatar({
    seed: project.name || project.id,
    style: 'identicon',
    backgroundColor: project.color?.replace('#', '') || '10b981',
  });
}

/**
 * Generate guest user avatar
 * Uses simpler style with gray tones for external users
 * 
 * @param guest - Guest user object
 * @returns Avatar URL
 */
export function getGuestAvatar(guest: {
  email: string;
  name?: string;
}): string {
  return generateDiceBearAvatar({
    seed: guest.email || guest.name || 'guest',
    style: 'initials',
    backgroundColor: '64748b', // Gray for guests
  });
}

/**
 * Get avatar URL for any entity type
 * Smart function that determines the best avatar style based on entity type
 * 
 * @param entity - Any entity that needs an avatar
 * @returns Avatar URL
 */
export function getSmartAvatar(entity: {
  type: 'user' | 'workspace' | 'project' | 'guest' | 'bot';
  id: string;
  email?: string;
  name?: string;
  role?: string;
  color?: string;
  customAvatar?: string;
  style?: DiceBearStyle;
}): string {
  // If custom avatar exists, use it
  if (entity.customAvatar) {
    return entity.customAvatar;
  }
  
  // Generate based on type
  switch (entity.type) {
    case 'user':
      return getRoleBasedAvatar({
        email: entity.email || entity.id,
        role: entity.role,
        style: entity.style,
      });
      
    case 'workspace':
      return getWorkspaceAvatar({
        id: entity.id,
        name: entity.name,
        color: entity.color,
      });
      
    case 'project':
      return getProjectAvatar({
        id: entity.id,
        name: entity.name,
        color: entity.color,
      });
      
    case 'guest':
      return getGuestAvatar({
        email: entity.email || entity.id,
        name: entity.name,
      });
      
    case 'bot':
      return generateDiceBearAvatar({
        seed: entity.id,
        style: 'bottts',
        backgroundColor: '8b5cf6',
      });
      
    default:
      return generateDiceBearAvatar({
        seed: entity.id,
        style: DEFAULT_AVATAR_STYLE,
      });
  }
}

/**
 * Avatar URL cache to avoid regenerating same URLs
 * Uses Map for O(1) lookup performance
 */
const avatarCache = new Map<string, string>();

/**
 * Get cached avatar URL or generate new one
 * Improves performance by caching generated URLs
 * 
 * @param key - Unique cache key
 * @param generator - Function to generate avatar URL
 * @returns Cached or newly generated avatar URL
 */
export function getCachedAvatar(key: string, generator: () => string): string {
  if (!avatarCache.has(key)) {
    avatarCache.set(key, generator());
  }
  return avatarCache.get(key)!;
}

/**
 * Clear the avatar cache
 * Useful when user changes avatar preferences
 */
export function clearAvatarCache(): void {
  avatarCache.clear();
}

/**
 * Get all available avatar styles with metadata
 * Useful for style selector UI
 */
export function getAvailableStyles(): Array<{
  value: DiceBearStyle;
  label: string;
  description: string;
  category: 'professional' | 'friendly' | 'tech' | 'abstract' | 'fun';
  preview: string;
}> {
  return [
    // Professional & Minimalist
    {
      value: 'personas',
      label: 'Professional',
      description: 'Clean, minimal faces - perfect for business',
      category: 'professional',
      preview: generateDiceBearAvatar({ seed: 'preview-personas', style: 'personas' }),
    },
    {
      value: 'notionists',
      label: 'Notion Style',
      description: 'Modern illustrated avatars',
      category: 'professional',
      preview: generateDiceBearAvatar({ seed: 'preview-notionists', style: 'notionists' }),
    },
    {
      value: 'lorelei',
      label: 'Illustrated',
      description: 'Friendly illustrated people',
      category: 'professional',
      preview: generateDiceBearAvatar({ seed: 'preview-lorelei', style: 'lorelei' }),
    },
    
    // Friendly & Approachable
    {
      value: 'adventurer',
      label: 'Adventurer',
      description: 'Colorful cartoon characters - great for teams',
      category: 'friendly',
      preview: generateDiceBearAvatar({ seed: 'preview-adventurer', style: 'adventurer' }),
    },
    {
      value: 'avataaars',
      label: 'Sketch Style',
      description: 'Hand-drawn sketch characters',
      category: 'friendly',
      preview: generateDiceBearAvatar({ seed: 'preview-avataaars', style: 'avataaars' }),
    },
    {
      value: 'big-smile',
      label: 'Big Smile',
      description: 'Happy, cheerful faces',
      category: 'friendly',
      preview: generateDiceBearAvatar({ seed: 'preview-big-smile', style: 'big-smile' }),
    },
    
    // Tech & Modern
    {
      value: 'bottts',
      label: 'Robots',
      description: 'Futuristic robot characters - tech teams',
      category: 'tech',
      preview: generateDiceBearAvatar({ seed: 'preview-bottts', style: 'bottts' }),
    },
    {
      value: 'pixel-art',
      label: 'Pixel Art',
      description: '8-bit retro style - gaming vibe',
      category: 'tech',
      preview: generateDiceBearAvatar({ seed: 'preview-pixel-art', style: 'pixel-art' }),
    },
    
    // Abstract & Geometric
    {
      value: 'shapes',
      label: 'Geometric',
      description: 'Abstract geometric patterns - modern',
      category: 'abstract',
      preview: generateDiceBearAvatar({ seed: 'preview-shapes', style: 'shapes' }),
    },
    {
      value: 'identicon',
      label: 'Identicon',
      description: 'GitHub-style patterns - familiar',
      category: 'abstract',
      preview: generateDiceBearAvatar({ seed: 'preview-identicon', style: 'identicon' }),
    },
    {
      value: 'rings',
      label: 'Rings',
      description: 'Circular patterns - unique',
      category: 'abstract',
      preview: generateDiceBearAvatar({ seed: 'preview-rings', style: 'rings' }),
    },
    
    // Fun & Playful
    {
      value: 'fun-emoji',
      label: 'Fun Emoji',
      description: 'Emoji-based avatars - playful',
      category: 'fun',
      preview: generateDiceBearAvatar({ seed: 'preview-fun-emoji', style: 'fun-emoji' }),
    },
    {
      value: 'croodles',
      label: 'Doodles',
      description: 'Hand-drawn doodle style',
      category: 'fun',
      preview: generateDiceBearAvatar({ seed: 'preview-croodles', style: 'croodles' }),
    },
    {
      value: 'initials',
      label: 'Enhanced Initials',
      description: 'Styled letter avatars',
      category: 'fun',
      preview: generateDiceBearAvatar({ seed: 'preview-initials', style: 'initials' }),
    },
  ];
}

/**
 * Get styles by category
 */
export function getStylesByCategory(category: 'professional' | 'friendly' | 'tech' | 'abstract' | 'fun'): DiceBearStyle[] {
  return getAvailableStyles()
    .filter(style => style.category === category)
    .map(style => style.value);
}

/**
 * Get recommended style for entity type
 */
export function getRecommendedStyle(entityType: 'user' | 'workspace' | 'project' | 'guest' | 'bot'): DiceBearStyle {
  const recommendations: Record<string, DiceBearStyle> = {
    user: 'personas',
    workspace: 'shapes',
    project: 'identicon',
    guest: 'initials',
    bot: 'bottts',
  };
  
  return recommendations[entityType] || 'personas';
}

/**
 * Validate if a style name is valid
 */
export function isValidStyle(style: string): style is DiceBearStyle {
  const validStyles = getAvailableStyles().map(s => s.value);
  return validStyles.includes(style as DiceBearStyle);
}

/**
 * Get avatar URL with fallback chain
 * Priority: customAvatar > userPreferredStyle > roleBasedStyle > default
 * 
 * @param user - User object
 * @returns Best available avatar URL
 */
export function getUserAvatarUrl(user: {
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
  avatarStyle?: DiceBearStyle;
  avatarBackgroundColor?: string;
}): string {
  // 1. If user uploaded custom avatar, use it
  if (user.avatar && !user.avatar.includes('dicebear') && !user.avatar.includes('avatar.vercel')) {
    return user.avatar;
  }
  
  // 2. If user has style preference, use it
  if (user.avatarStyle) {
    return generateDiceBearAvatar({
      seed: user.email,
      style: user.avatarStyle,
      backgroundColor: user.avatarBackgroundColor || ROLE_AVATAR_COLORS[user.role || 'member'],
    });
  }
  
  // 3. Use role-based avatar
  return getRoleBasedAvatar({
    email: user.email,
    role: user.role,
  });
}

/**
 * Generate initials from name
 * Fallback for when avatar fails to load
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Batch generate avatars for multiple users
 * Useful for team views
 */
export function generateBatchAvatars(users: Array<{
  email: string;
  role?: string;
  style?: DiceBearStyle;
}>): Map<string, string> {
  const avatars = new Map<string, string>();
  
  users.forEach(user => {
    const cacheKey = `${user.email}-${user.style || 'default'}`;
    const avatarUrl = getCachedAvatar(cacheKey, () => 
      getRoleBasedAvatar({
        email: user.email,
        role: user.role,
        style: user.style,
      })
    );
    avatars.set(user.email, avatarUrl);
  });
  
  return avatars;
}

/**
 * Export utility object for convenience
 */
export const DiceBear = {
  generate: generateDiceBearAvatar,
  getRoleBased: getRoleBasedAvatar,
  getWorkspace: getWorkspaceAvatar,
  getProject: getProjectAvatar,
  getGuest: getGuestAvatar,
  getSmart: getSmartAvatar,
  getCached: getCachedAvatar,
  getUser: getUserAvatarUrl,
  getInitials,
  clearCache: clearAvatarCache,
  styles: getAvailableStyles,
  validate: isValidStyle,
  recommended: getRecommendedStyle,
} as const;

export default DiceBear;

