import { DEFAULT_AVATARS, getAvatarById } from '@/constants/avatars'

export interface UserWithAvatar {
  id?: string
  name?: string
  email?: string
  avatar?: string // Custom uploaded image
  selectedAvatarId?: string // Selected avatar from collection
}

/**
 * Validates if an avatar URL is accessible (not from invalid domains)
 */
function isValidAvatarUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.origin)
    // Block known invalid domains
    const invalidDomains = ['meridian-images.example.com', 'example.com']
    const isInvalid = invalidDomains.some(domain => urlObj.hostname.includes(domain))
    
    if (isInvalid) {
      console.warn(`[Avatar] Blocked invalid avatar URL: ${url}`)
    }
    
    return !isInvalid
  } catch {
    // If URL parsing fails, treat relative paths as valid
    return !url.startsWith('http')
  }
}

/**
 * Resolves the avatar source URL for a user based on priority:
 * 1. Custom uploaded image (highest priority)
 * 2. Selected avatar from collection
 * 3. null (will fallback to initials)
 */
export function getAvatarSrc(user?: UserWithAvatar): string | undefined {
  if (!user) return undefined
  
  // Priority 1: Custom uploaded image (but validate URL)
  if (user.avatar) {
    // Handle data URLs (base64 images) which are valid
    if (user.avatar.startsWith('data:image/')) {
      return user.avatar
    }
    
    // Validate other URLs
    if (isValidAvatarUrl(user.avatar)) {
      return user.avatar
    }
  }
  
  // Priority 2: Selected avatar from collection
  if (user.selectedAvatarId) {
    const avatar = getAvatarById(user.selectedAvatarId)
    if (avatar?.url && isValidAvatarUrl(avatar.url)) {
      return avatar.url
    }
  }
  
  // Priority 3: No avatar (will use initials fallback)
  return undefined
}

/**
 * Gets user initials for avatar fallback
 */
export function getUserInitials(user?: UserWithAvatar): string {
  if (!user) return 'U'
  
  // Use name if available
  if (user.name) {
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  // Use email if name not available
  if (user.email) {
    return user.email[0].toUpperCase()
  }
  
  return 'U'
}

/**
 * Gets a consistent avatar color based on user ID or email
 */
export function getAvatarColor(user?: UserWithAvatar): string {
  if (!user) return 'bg-gradient-to-br from-blue-500 to-purple-500'
  
  const seed = user.id || user.email || user.name || 'default'
  const colors = [
    'bg-gradient-to-br from-blue-500 to-purple-500',
    'bg-gradient-to-br from-green-500 to-teal-500',
    'bg-gradient-to-br from-purple-500 to-pink-500',
    'bg-gradient-to-br from-orange-500 to-red-500',
    'bg-gradient-to-br from-indigo-500 to-blue-500',
    'bg-gradient-to-br from-pink-500 to-rose-500',
    'bg-gradient-to-br from-teal-500 to-cyan-500',
    'bg-gradient-to-br from-yellow-500 to-orange-500',
  ]
  
  // Simple hash function to get consistent color
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) & 0xffffffff
  }
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Checks if user has any avatar (custom upload or selected)
 */
export function hasAvatar(user?: UserWithAvatar): boolean {
  return !!(user?.avatar || user?.selectedAvatarId)
}

/**
 * Gets avatar type for analytics/debugging
 */
export function getAvatarType(user?: UserWithAvatar): 'custom' | 'selected' | 'initials' {
  if (!user) return 'initials'
  
  if (user.avatar) return 'custom'
  if (user.selectedAvatarId) return 'selected'
  return 'initials'
}

/**
 * Enhanced Avatar component props resolver
 */
export interface ResolvedAvatarProps {
  src?: string
  fallback: string
  className?: string
  alt: string
}

export function resolveAvatarProps(
  user?: UserWithAvatar, 
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md',
  className?: string
): ResolvedAvatarProps {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  }
  
  return {
    src: getAvatarSrc(user),
    fallback: getUserInitials(user),
    className: `${sizeClasses[size]} ${className || ''}`.trim(),
    alt: user?.name || user?.email || 'User Avatar'
  }
}

/**
 * Utility for updating user avatar in various contexts
 */
export function updateUserAvatar(
  user: UserWithAvatar, 
  update: { avatar?: string | null; selectedAvatarId?: string | null }
): UserWithAvatar {
  return {
    ...user,
    avatar: update.avatar !== undefined ? update.avatar || undefined : user.avatar,
    selectedAvatarId: update.selectedAvatarId !== undefined ? update.selectedAvatarId || undefined : user.selectedAvatarId
  }
}