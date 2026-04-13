import React, { useState, useMemo } from 'react'
import { Avatar, DEFAULT_AVATARS, AVATAR_CATEGORIES, getAvatarsByCategory, searchAvatars } from '@/constants/avatars'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Check, User, Palette, Briefcase, Heart, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AvatarSelectorProps {
  selectedAvatarId?: string
  onAvatarSelect: (avatar: Avatar) => void
  trigger?: React.ReactNode
}

const categoryIcons = {
  professional: Briefcase,
  casual: Heart,
  creative: Palette,
  diverse: Users
}

export function AvatarSelector({ selectedAvatarId, onAvatarSelect, trigger }: AvatarSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof AVATAR_CATEGORIES>('professional')

  const filteredAvatars = useMemo(() => {
    if (searchQuery.trim()) {
      return searchAvatars(searchQuery)
    }
    return getAvatarsByCategory(selectedCategory)
  }, [searchQuery, selectedCategory])

  const handleAvatarSelect = (avatar: Avatar) => {
    onAvatarSelect(avatar)
    setOpen(false)
  }

  const selectedAvatar = DEFAULT_AVATARS.find(avatar => avatar.id === selectedAvatarId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full">
            <User className="h-4 w-4 mr-2" />
            Choose Avatar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Choose Your Avatar
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search avatars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          {!searchQuery.trim() && (
            <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as keyof typeof AVATAR_CATEGORIES)}>
              <TabsList className="grid w-full grid-cols-4">
                {Object.entries(AVATAR_CATEGORIES).map(([key, label]) => {
                  const Icon = categoryIcons[key as keyof typeof categoryIcons]
                  return (
                    <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          )}

          {/* Avatar Grid */}
          <div className="max-h-96 overflow-y-auto">
            <motion.div 
              className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 p-1"
              layout
            >
              <AnimatePresence>
                {filteredAvatars.map((avatar) => (
                  <motion.div
                    key={avatar.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                        selectedAvatarId === avatar.id 
                          ? 'ring-2 ring-primary ring-offset-2 shadow-lg' 
                          : 'hover:ring-1 hover:ring-muted-foreground/20'
                      }`}
                      onClick={() => handleAvatarSelect(avatar)}
                    >
                      <CardContent className="p-2 relative">
                        <div className="aspect-square relative overflow-hidden rounded-md">
                          <img
                            src={avatar.url}
                            alt={avatar.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {selectedAvatarId === avatar.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1"
                            >
                              <Check className="h-3 w-3" />
                            </motion.div>
                          )}
                        </div>
                        <div className="mt-2 text-center">
                          <p className="text-xs font-medium truncate">{avatar.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1 justify-center">
                            {avatar.tags.slice(0, 2).map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-[10px] px-1 py-0"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {filteredAvatars.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No avatars found matching your search.</p>
                <p className="text-sm mt-1">Try different keywords or browse categories.</p>
              </div>
            )}
          </div>

          {/* Selected Avatar Preview */}
          {selectedAvatar && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border"
            >
              <img 
                src={selectedAvatar.url} 
                alt={selectedAvatar.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1">
                <h4 className="font-medium">{selectedAvatar.name}</h4>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedAvatar.category} • {selectedAvatar.tags.join(', ')}
                </p>
              </div>
              <Badge variant="outline">Selected</Badge>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground self-center">
              {filteredAvatars.length} avatars available
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              {selectedAvatar && (
                <Button onClick={() => setOpen(false)}>
                  Use Selected Avatar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Avatar Preview Component for displaying selected avatar
interface AvatarPreviewProps {
  avatarId?: string
  fallbackSrc?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24'
}

export function AvatarPreview({ avatarId, fallbackSrc, size = 'md', className = '' }: AvatarPreviewProps) {
  const avatar = avatarId ? DEFAULT_AVATARS.find(a => a.id === avatarId) : null
  const avatarSrc = avatar?.url || fallbackSrc

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-muted flex items-center justify-center ${className}`}>
      {avatarSrc ? (
        <img 
          src={avatarSrc} 
          alt={avatar?.name || 'Profile Avatar'}
          className="w-full h-full object-cover"
        />
      ) : (
        <User className="h-1/2 w-1/2 text-muted-foreground" />
      )}
    </div>
  )
}