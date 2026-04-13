// @epic-3.1-messaging: User Profile Sidebar Component
// @persona-lisa: Designer needs file sharing and version control
// @persona-sarah: PM needs team member info and collaboration tools
// @persona-david: Team lead needs team member details and project files

"use client"

import { useState } from 'react'
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
  Zap
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ChatUserProfileProps {
  selectedUser: any
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

interface UserInfo {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
  department: string
  location: string
  timezone: string
  isOnline: boolean
  lastSeen?: string
  status: 'available' | 'busy' | 'away' | 'offline'
  bio?: string
  skills: string[]
}

export function ChatUserProfile({ selectedUser, selectedChatId }: ChatUserProfileProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['profile', 'files'])

  // Handler functions for user actions
  const handleCall = (email: string) => {
    console.log('Initiating call to:', email)
    // TODO: Integrate with WebRTC or call service
  }

  const handleVideoCall = (email: string) => {
    console.log('Initiating video call to:', email)
    // TODO: Integrate with WebRTC or video service
  }

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`
  }

  const handleDownloadFile = (url: string, filename: string) => {
    console.log('Downloading file:', filename)
    // Create temporary link and trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShareFile = (fileId: string) => {
    console.log('Sharing file:', fileId)
    // TODO: Implement file sharing (copy link, share modal, etc.)
    // Could copy link to clipboard
    navigator.clipboard.writeText(`${window.location.origin}/files/${fileId}`)
      .then(() => console.log('File link copied to clipboard'))
      .catch(err => console.error('Failed to copy link:', err))
  }

  const handleUploadFile = () => {
    console.log('Opening file upload dialog')
    // TODO: Open file upload modal
  }

  const handleAddToFavorites = (userId: string) => {
    console.log('Adding user to favorites:', userId)
    // TODO: Implement favorites system with backend
  }

  const handleScheduleMeeting = (email: string) => {
    console.log('Opening calendar to schedule meeting with:', email)
    // TODO: Open calendar modal or integrate with calendar service
  }

  const handlePrivacySettings = (userId: string) => {
    console.log('Opening privacy settings for user:', userId)
    // TODO: Open privacy settings modal
  }

  const handleNotificationSettings = (channelId: string | null) => {
    console.log('Opening notification settings for channel:', channelId)
    // TODO: Open notification settings modal
  }

  // Mock data - replace with actual data from API
  const userInfo: UserInfo = {
    id: '1',
    name: selectedUser?.name || 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    avatar: selectedUser?.avatar || '/avatars/sarah.jpg',
    role: 'Product Manager',
    department: 'Product',
    location: 'San Francisco, CA',
    timezone: 'PST (UTC-8)',
    isOnline: true,
    status: 'available',
    bio: 'Passionate about building great products that solve real problems. Leading the product strategy for Meridian.',
    skills: ['Product Strategy', 'User Research', 'Data Analysis', 'Team Leadership']
  }

  const sharedFiles: SharedFile[] = [
    {
      id: '1',
      name: 'Project Roadmap Q1 2024.pdf',
      type: 'document',
      size: '2.4 MB',
      sharedBy: 'Sarah Johnson',
      sharedAt: '2 hours ago',
      url: '/files/roadmap.pdf'
    },
    {
      id: '2',
      name: 'User Interview Recording.mp4',
      type: 'video',
      size: '45.2 MB',
      sharedBy: 'Sarah Johnson',
      sharedAt: '1 day ago',
      url: '/files/interview.mp4',
      thumbnail: '/thumbnails/interview.jpg'
    },
    {
      id: '3',
      name: 'Design Assets.zip',
      type: 'archive',
      size: '12.8 MB',
      sharedBy: 'Lisa Rodriguez',
      sharedAt: '3 days ago',
      url: '/files/assets.zip'
    },
    {
      id: '4',
      name: 'Dashboard Screenshot.png',
      type: 'image',
      size: '1.2 MB',
      sharedBy: 'Mike Chen',
      sharedAt: '1 week ago',
      url: '/files/screenshot.png',
      thumbnail: '/thumbnails/dashboard.png'
    }
  ]

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

  if (!selectedChatId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <User className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No chat selected</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Select a conversation to view user details</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white">Profile</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <MoreHorizontal className="w-4 h-4" />
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
                  <AvatarImage src={userInfo.avatar} alt={userInfo.name} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-300 text-lg">
                    {userInfo.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-slate-900",
                  getStatusColor(userInfo.status)
                )} />
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
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{userInfo.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{userInfo.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{userInfo.timezone}</span>
              </div>
            </div>

            {/* Skills */}
            {userInfo.skills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {userInfo.skills.map((skill, index) => (
                    <Badge 
                      key={index}
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
              onClick={() => handleAddToFavorites(userInfo.id)}
            >
              <Star className="w-4 h-4 mr-3" />
              Add to favorites
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50"
              onClick={() => handleScheduleMeeting(userInfo.email)}
            >
              <Calendar className="w-4 h-4 mr-3" />
              Schedule meeting
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50"
              onClick={() => handlePrivacySettings(userInfo.id)}
            >
              <Shield className="w-4 h-4 mr-3" />
              Privacy settings
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50"
              onClick={() => handleNotificationSettings(selectedChatId)}
            >
              <Settings className="w-4 h-4 mr-3" />
              Notification settings
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  )
} 