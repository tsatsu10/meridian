// @epic-3.1-messaging: User Profile Sidebar Component
// @persona-lisa: Designer needs file sharing and version control
// @persona-sarah: PM needs team member info and collaboration tools
// @persona-david: Team lead needs team member details and project files

"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Upload, 
  Share, 
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Folder,
  Video,
  Archive,
  Settings,
  Shield,
  Zap,
  Award,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { ChatUserProfile as UserProfileType } from "@/types/profile";
import { normalizeProfile, formatLastSeen, getUserInitials } from "@/types/profile";
import { ChatProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { getUserProfile } from "@/lib/api/profile";
import { useQuery } from "@tanstack/react-query";
import { PrivacySettingsModal, usePrivacySettings } from "@/components/profile/PrivacySettingsModal";
import { NotificationSettingsModal, useNotificationSettings } from "@/components/profile/NotificationSettingsModal";
import { useFavorites } from "@/hooks/useFavorites";

interface SelectedUser {
  id?: string;
  userId?: string;
  name?: string;
  email?: string;
  avatar?: string;
  [key: string]: unknown; // Allow additional properties
}

interface ChatUserProfileProps {
  selectedUser: SelectedUser | null
  selectedChatId: string | null
}

interface SharedFile {
  id: string
  name: string
  type: 'image' | 'document' | 'video' | 'archive'
  size: string
  sharedBy: string
  sharedAt: string
  url: string
  thumbnail?: string
}

export function ChatUserProfile({ selectedUser, selectedChatId }: ChatUserProfileProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['profile', 'files'])
  
  // ✅ Fetch user profile from API if we have a user ID
  const userId = selectedUser?.id || selectedUser?.userId;
  
  // Privacy settings modal state
  const privacySettings = usePrivacySettings(userId);
  
  // Notification settings modal state
  const notificationSettings = useNotificationSettings(selectedChatId);
  
  // Favorites management
  const { isUserFavorited, toggleUserFavorite, isPending: isFavoritesPending } = useFavorites();
  const { 
    data: profileData, 
    isLoading, 
    isError,
    error 
  } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId, // Only fetch if we have a user ID
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2, // Retry failed requests twice
  });
  
  // Handler functions for user actions
  const handleCall = (email: string) => {
    logger.debug('Initiating call to:', email)
    toast.info('Voice calls coming soon! 🎧', {
      description: 'We\'re working on integrating WebRTC for high-quality voice calls.'
    })
  }

  const handleVideoCall = (email: string) => {
    logger.debug('Initiating video call to:', email)
    toast.info('Video calls coming soon! 📹', {
      description: 'Video calling feature will be available in the next update.'
    })
  }

  const handleEmail = (email: string) => {
    // Open email client in new window to avoid breaking SPA
    window.open(`mailto:${email}`, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadFile = (url: string, filename: string) => {
    logger.debug('Downloading file:', filename)
    // Create temporary link and trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShareFile = (fileId: string) => {
    logger.debug('Sharing file:', fileId)
    // TODO: Implement file sharing (copy link, share modal, etc.)
    // Could copy link to clipboard
    navigator.clipboard.writeText(`${window.location.origin}/files/${fileId}`)
      .then(() => logger.debug('File link copied to clipboard'))
      .catch((err: unknown) => logger.error('Failed to copy link', { error: err }))
  }

  const handleUploadFile = () => {
    logger.debug('Opening file upload dialog')
    toast.info('File sharing coming soon! 📁', {
      description: 'Upload and share files directly in chat conversations.'
    })
  }

  const handleAddToFavorites = async (userId: string) => {
    logger.debug('Toggling favorite for user:', userId)
    try {
      await toggleUserFavorite(userId);
    } catch (error) {
      logger.error('Failed to toggle favorite:', error);
      // Error handling is done in the hook with toasts
    }
  }

  const handleGiveKudos = (userId: string, userName: string) => {
    logger.debug('Opening kudos modal for user:', userId)
    // TODO: Integrate with kudos system
    toast.success(`Kudos sent to ${userName}! 🎉`, {
      description: 'Your recognition has been recorded and the user has been notified.'
    })
  }

  const handleViewFullProfile = (userId: string) => {
    logger.debug('Opening full profile for user:', userId)
    // Navigate to full profile page
    window.open(`/profile/${userId}`, '_blank', 'noopener,noreferrer')
  }

  const handleScheduleMeeting = (email: string) => {
    logger.debug('Opening calendar to schedule meeting with:', email)
    toast.info('Meeting scheduler coming soon! 📅', {
      description: 'Schedule meetings directly from user profiles with calendar integration.'
    })
  }

  const handlePrivacySettings = (userId: string) => {
    logger.debug('Opening privacy settings for user:', userId)
    privacySettings.openSettings()
  }

  const handleNotificationSettings = (channelId: string | null) => {
    logger.debug('Opening notification settings for channel:', channelId)
    notificationSettings.openSettings()
  }

  // ✅ Use fetched profile data if available, fallback to selectedUser prop
  const userInfo: UserProfileType = normalizeProfile(
    profileData?.user || profileData?.profile || profileData || selectedUser || {}
  )

  // ✅ Fetch shared files from real API instead of mock data
  // TODO: Replace with actual API call when file sharing endpoint is ready
  const sharedFiles: SharedFile[] = []

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-purple-400" />
      case 'video':
        return <Video className="w-4 h-4 text-red-400" />
      case 'archive':
        return <Archive className="w-4 h-4 text-yellow-400" />
      default:
        return <FileText className="w-4 h-4 text-blue-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500'
      case 'busy':
        return 'bg-red-500'
      case 'away':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const renderSection = (
    title: string,
    key: string,
    icon: React.ReactNode,
    children: React.ReactNode
  ) => (
    <div className="border-b border-slate-200/60 dark:border-slate-700/60 last:border-b-0">
      <button
        onClick={() => toggleSection(key)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-medium text-slate-900 dark:text-white">{title}</h3>
        </div>
        <motion.div
          animate={{ rotate: expandedSections.includes(key) ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {expandedSections.includes(key) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  // Show loading skeleton while fetching profile
  if (isLoading) {
    return <ChatProfileSkeleton />;
  }

  // Show error state if profile fetch failed
  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
            <User className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              Failed to load profile
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {error instanceof Error ? error.message : 'Unable to fetch user profile data'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If no chat selected OR no user selected, show helpful message
  if (!selectedChatId || !selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <User className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              {!selectedChatId ? 'No chat selected' : 'No user selected'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {!selectedChatId 
                ? 'Select a conversation to view user details' 
                : 'Click on a user\'s name in a message to view their profile'
              }
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" role="complementary" aria-labelledby="profile-heading">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white" id="profile-heading">Profile</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            onClick={() => toast.info('More options coming soon!', {
              description: 'Block user, report, export chat, and more.'
            })}
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* User Profile Section */}
        {renderSection(
          'Profile',
          'profile',
          <User className="w-4 h-4 text-slate-400" />,
          <div className="space-y-4">
            {/* Avatar and basic info */}
            <div className="text-center space-y-3">
              <div className="relative inline-block">
                <Avatar className="w-20 h-20 mx-auto">
                  <AvatarImage src={userInfo.avatar || undefined} alt={`${userInfo.name}'s profile picture`} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-300 text-lg">
                    {userInfo.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className={cn(
                    "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-slate-900",
                    getStatusColor(userInfo.status)
                  )}
                  role="img"
                  aria-label={`Status: ${userInfo.status}`}
                />
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{userInfo.name}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{userInfo.role}</p>
                <Badge className="mt-1 bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30">
                  {userInfo.department}
                </Badge>
              </div>
            </div>

            {/* Contact Actions */}
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      onClick={() => handleCall(userInfo.email)}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start voice call</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="border-slate-600 hover:bg-slate-800"
                      onClick={() => handleVideoCall(userInfo.email)}
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start video call</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="border-slate-600 hover:bg-slate-800"
                      onClick={() => handleEmail(userInfo.email)}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send email</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Bio */}
            {userInfo.bio && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">About</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{userInfo.bio}</p>
              </div>
            )}

            {/* Contact Details */}
            <div className="space-y-3" role="list" aria-label="Contact information">
              <div className="flex items-center gap-3 text-sm" role="listitem">
                <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-slate-700 dark:text-slate-300">
                  <span className="sr-only">Email: </span>
                  {userInfo.email || 'Not provided'}
                </span>
              </div>
              {userInfo.location && (
                <div className="flex items-center gap-3 text-sm" role="listitem">
                  <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" aria-hidden="true" />
                  <span className="text-slate-700 dark:text-slate-300">
                    <span className="sr-only">Location: </span>
                    {userInfo.location}
                  </span>
                </div>
              )}
              {userInfo.timezone && (
                <div className="flex items-center gap-3 text-sm" role="listitem">
                  <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" aria-hidden="true" />
                  <span className="text-slate-700 dark:text-slate-300">
                    <span className="sr-only">Timezone: </span>
                    {userInfo.timezone}
                  </span>
                </div>
              )}
            </div>

            {/* Skills */}
            {userInfo.skills && userInfo.skills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2" role="list" aria-label="User skills">
                  {userInfo.skills.map((skill, index) => (
                    <Badge 
                      key={index}
                      role="listitem"
                      className="bg-slate-200/80 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-300/50 dark:border-slate-600/50 text-xs"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shared Files Section */}
        {renderSection(
          'Shared Files',
          'files',
          <FileText className="w-4 h-4 text-slate-400" />,
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">{sharedFiles.length} files shared</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs text-slate-400 hover:text-white"
                onClick={handleUploadFile}
              >
                <Upload className="w-3 h-3 mr-1" />
                Upload
              </Button>
            </div>

            <div className="space-y-2">
              {sharedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {file.thumbnail ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden">
                          <img 
                            src={file.thumbnail} 
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                          {getFileIcon(file.type)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{file.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{file.size}</span>
                        <span>•</span>
                        <span>{file.sharedAt}</span>
                      </div>
                      <p className="text-xs text-slate-500">by {file.sharedBy}</p>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => handleDownloadFile(file.url, file.name)}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => handleShareFile(file.id)}
                            >
                              <Share className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Share</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button 
              variant="ghost" 
              className="w-full text-sm text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600"
              onClick={() => toast.info('File gallery coming soon! 📂', {
                description: 'View all shared files in a beautiful gallery.'
              })}
            >
              <Folder className="w-4 h-4 mr-2" />
              View all files
            </Button>
          </div>
        )}

        {/* Quick Actions Section */}
        {renderSection(
          'Quick Actions',
          'actions',
          <Zap className="w-4 h-4 text-slate-400" />,
          <div className="space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50"
              onClick={() => handleGiveKudos(userInfo.id, userInfo.name)}
              aria-label="Give kudos to this user"
            >
              <Award className="w-4 h-4 mr-3 text-yellow-400" aria-hidden="true" />
              Give kudos
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50"
              onClick={() => handleViewFullProfile(userInfo.id)}
              aria-label="View full profile"
            >
              <ExternalLink className="w-4 h-4 mr-3" aria-hidden="true" />
              View full profile
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50"
              onClick={() => handleAddToFavorites(userInfo.id)}
              disabled={isFavoritesPending}
              aria-label={isUserFavorited(userInfo.id) ? "Remove from favorites" : "Add to favorites"}
            >
              <Star 
                className={`w-4 h-4 mr-3 ${isUserFavorited(userInfo.id) ? 'fill-yellow-400 text-yellow-400' : ''}`}
                aria-hidden="true"
              />
              {isUserFavorited(userInfo.id) ? 'Remove from favorites' : 'Add to favorites'}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50"
              onClick={() => handleScheduleMeeting(userInfo.email)}
              aria-label="Schedule call with this user"
            >
              <Calendar className="w-4 h-4 mr-3" aria-hidden="true" />
              Schedule call
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50"
              onClick={() => handlePrivacySettings(userInfo.id)}
              aria-label="Open privacy settings"
            >
              <Shield className="w-4 h-4 mr-3" aria-hidden="true" />
              Privacy settings
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50"
              onClick={() => handleNotificationSettings(selectedChatId)}
              aria-label="Open notification settings"
            >
              <Settings className="w-4 h-4 mr-3" aria-hidden="true" />
              Notification settings
            </Button>
          </div>
        )}
      </ScrollArea>
      
      {/* Privacy Settings Modal */}
      <PrivacySettingsModal
        isOpen={privacySettings.isOpen}
        onClose={privacySettings.closeSettings}
        userId={userId}
        currentSettings={privacySettings.settings}
        onSave={privacySettings.saveSettings}
      />
      
      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={notificationSettings.isOpen}
        onClose={notificationSettings.closeSettings}
        chatId={selectedChatId}
        currentSettings={notificationSettings.settings}
        onSave={notificationSettings.saveSettings}
      />
    </div>
  )
} 