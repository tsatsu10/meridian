export interface Avatar {
  id: string
  name: string
  url: string
  category: 'professional' | 'casual' | 'creative' | 'diverse'
  tags: string[]
}

export const AVATAR_CATEGORIES = {
  professional: 'Professional',
  casual: 'Casual',
  creative: 'Creative',
  diverse: 'Diverse'
} as const

export const DEFAULT_AVATARS: Avatar[] = [
  // Professional avatars - using minimal, guaranteed-working parameters
  {
    id: 'prof-1',
    name: 'Professional Male 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=professional-male-1&backgroundColor=b6e3f4',
    category: 'professional',
    tags: ['male', 'business', 'professional']
  },
  {
    id: 'prof-2',
    name: 'Professional Female 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=professional-female-1&backgroundColor=c0aede',
    category: 'professional',
    tags: ['female', 'business', 'professional']
  },
  {
    id: 'prof-3',
    name: 'Professional Male 2',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=professional-male-2&backgroundColor=d1d4f9',
    category: 'professional',
    tags: ['male', 'corporate', 'clean']
  },
  {
    id: 'prof-4',
    name: 'Professional Female 2',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=professional-female-2&backgroundColor=e8f4f8',
    category: 'professional',
    tags: ['female', 'executive', 'professional']
  },
  {
    id: 'prof-5',
    name: 'Executive 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=executive-1&backgroundColor=f0e6ff',
    category: 'professional',
    tags: ['executive', 'leadership', 'formal']
  },
  {
    id: 'prof-6',
    name: 'Manager 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager-1&backgroundColor=fff2e6',
    category: 'professional',
    tags: ['manager', 'senior', 'professional']
  },

  // Casual avatars
  {
    id: 'casual-1',
    name: 'Casual Male 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=casual-male-1&backgroundColor=ffd93d',
    category: 'casual',
    tags: ['male', 'relaxed', 'friendly']
  },
  {
    id: 'casual-2',
    name: 'Casual Female 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=casual-female-1&backgroundColor=6bcf7f',
    category: 'casual',
    tags: ['female', 'approachable', 'happy']
  },
  {
    id: 'casual-3',
    name: 'Casual Male 2',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=casual-male-2&backgroundColor=ffb3ba',
    category: 'casual',
    tags: ['male', 'casual', 'friendly']
  },
  {
    id: 'casual-4',
    name: 'Casual Female 2',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=casual-female-2&backgroundColor=a8e6cf',
    category: 'casual',
    tags: ['female', 'relaxed', 'casual']
  },

  // Creative avatars
  {
    id: 'creative-1',
    name: 'Creative Artist 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creative-artist-1&backgroundColor=ff6b6b',
    category: 'creative',
    tags: ['artist', 'creative', 'unique']
  },
  {
    id: 'creative-2',
    name: 'Creative Designer 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creative-designer-1&backgroundColor=4ecdc4',
    category: 'creative',
    tags: ['designer', 'innovative', 'creative']
  },
  {
    id: 'creative-3',
    name: 'Developer 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer-1&backgroundColor=45b7d1',
    category: 'creative',
    tags: ['developer', 'tech', 'programmer']
  },
  {
    id: 'creative-4',
    name: 'Creative Writer 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creative-writer-1&backgroundColor=9b59b6',
    category: 'creative',
    tags: ['writer', 'creative', 'thoughtful']
  },
  {
    id: 'creative-5',
    name: 'Creative Director 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creative-director-1&backgroundColor=ff9a8b',
    category: 'creative',
    tags: ['director', 'visionary', 'leadership']
  },
  {
    id: 'creative-6',
    name: 'UX Designer 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ux-designer-1&backgroundColor=f39c12',
    category: 'creative',
    tags: ['ux', 'designer', 'innovative']
  },

  // Diverse avatars
  {
    id: 'diverse-1',
    name: 'Team Leader 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team-leader-1&backgroundColor=27ae60',
    category: 'diverse',
    tags: ['leader', 'team', 'confident']
  },
  {
    id: 'diverse-2',
    name: 'Team Member 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team-member-1&backgroundColor=8e44ad',
    category: 'diverse',
    tags: ['team', 'collaborative', 'friendly']
  },
  {
    id: 'diverse-3',
    name: 'Consultant 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=consultant-1&backgroundColor=16a085',
    category: 'diverse', 
    tags: ['consultant', 'expert', 'advisor']
  },
  {
    id: 'diverse-4',
    name: 'Specialist 1',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=specialist-1&backgroundColor=e67e22',
    category: 'diverse',
    tags: ['specialist', 'expert', 'focused']
  }
]

export const getAvatarsByCategory = (category: keyof typeof AVATAR_CATEGORIES) => {
  return DEFAULT_AVATARS.filter(avatar => avatar.category === category)
}

export const getAvatarById = (id: string) => {
  return DEFAULT_AVATARS.find(avatar => avatar.id === id)
}

export const searchAvatars = (query: string) => {
  const lowerQuery = query.toLowerCase()
  return DEFAULT_AVATARS.filter(avatar => 
    avatar.name.toLowerCase().includes(lowerQuery) ||
    avatar.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}