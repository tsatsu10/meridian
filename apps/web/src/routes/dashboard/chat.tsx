// @epic-3.1-messaging: Chat Page Layout
// @persona-sarah: PM needs efficient messaging interface for team coordination
// @persona-david: Team lead needs team chat access across devices

"use client"

import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router"
import { useState, useEffect, useRef } from 'react'
import DashboardHeader from '@/components/dashboard/dashboard-header'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { ChatMainArea } from '@/components/chat/chat-main-area'
import { ChatUserProfile } from '@/components/chat/chat-user-profile'
import { SearchModal } from '@/components/chat/search-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Menu, X, Users, MessageSquare, PanelLeftOpen, PanelRightOpen, Hash } from 'lucide-react'
import { cn } from '@/lib/cn'
import { usePresence } from '@/hooks/use-presence'
import { ChatErrorBoundary } from '@/components/chat/chat-error-boundary'
import useWorkspaceStore from '@/store/workspace'
import useAuth from '@/components/providers/auth-provider/hooks/use-auth'
import { parseChatDashboardSearch } from '@/lib/chat-route-search'
import { getOrCreateConversation } from '@/fetchers/direct-messaging'
import { API_BASE_URL } from '@/constants/urls'
import { logger } from '@/lib/logger'
import { useMediaQuery } from '@/hooks/use-responsive'

export const Route = createFileRoute("/dashboard/chat")({
  validateSearch: (search: Record<string, unknown>) => parseChatDashboardSearch(search),
  component: ChatPage,
})

function ChatPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/dashboard/chat' })
  const { state } = useLocation();
  const { workspace } = useWorkspaceStore()
  const { user } = useAuth()

  const [selectedChatId, setSelectedChatId] = useState<string | null>(() => search.channel ?? null)
  const [selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null)
  const [showChatSidebar, setShowChatSidebar] = useState(true)
  const [showUserProfile, setShowUserProfile] = useState(true)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const legacyNavMigrated = useRef(false)
  
  usePresence(workspace?.id)
  
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')
  
  useEffect(() => {
    if (search.channel) {
      setSelectedChatId(search.channel)
    }
  }, [search.channel])

  useEffect(() => {
    if (!search.userId || !workspace?.id || !user?.email) return
    if (search.channel) return

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/workspace-user/${workspace.id}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          throw new Error(`Failed to load workspace members: ${res.statusText}`)
        }
        const data: unknown = await res.json()
        const users = Array.isArray(data) ? data : (data as { users?: unknown[] }).users ?? []
        const target = users.find(
          (u: unknown) => typeof u === 'object' && u !== null && 'id' in u && (u as { id: string }).id === search.userId,
        ) as { email?: string } | undefined
        if (!target?.email || target.email === user.email) {
          logger.warn('Could not resolve chat userId to a workspace member', { userId: search.userId })
          return
        }
        const conv = await getOrCreateConversation(user.email, target.email, workspace.id)
        if (cancelled) return
        const chatId = conv.id ?? ('channelId' in conv ? (conv as { channelId?: string }).channelId : undefined)
        if (!chatId) return
        setSelectedChatId(chatId)
        navigate({
          search: { channel: chatId, message: search.message, userId: undefined },
          replace: true,
        })
      } catch (e) {
        logger.error('Failed to open DM from userId search param', { error: e })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [search.userId, search.channel, search.message, workspace?.id, user?.email, navigate])

  useEffect(() => {
    if (legacyNavMigrated.current) return
    if (state && typeof state === 'object') {
      const navState = state as { selectedChatId?: string; autoFocus?: boolean };
      if (navState.selectedChatId) {
        legacyNavMigrated.current = true
        setSelectedChatId(navState.selectedChatId);
        navigate({
          search: { channel: navState.selectedChatId, message: undefined, userId: undefined },
          replace: true,
        })
        if (isMobile) {
          setShowChatSidebar(true);
        }
      }
    }
  }, [state, navigate, isMobile])

  useEffect(() => {
    if (isMobile) {
      setShowChatSidebar(false)
      setShowUserProfile(false)
    } else if (isTablet) {
      setShowUserProfile(false)
    }
  }, [isMobile, isTablet])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setShowChatSidebar(prev => !prev)
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault()
        if (selectedChatId) {
          setShowUserProfile(prev => !prev)
        }
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchModal(true)
      }
      
      if (e.key === 'Escape') {
        if (showUserProfile && selectedChatId) {
          e.preventDefault()
          setShowUserProfile(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedChatId, showUserProfile])

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId)
    navigate({
      search: { channel: chatId, message: undefined, userId: undefined },
      replace: true,
    })
    if (isMobile) {
      setShowChatSidebar(false)
    }
  }

  const handleSelectUser = (userArg: Record<string, unknown>) => {
    setSelectedUser(userArg)
  }

  const toggleChatSidebar = () => setShowChatSidebar(!showChatSidebar)
  const toggleUserProfile = () => setShowUserProfile(!showUserProfile)

  return (
    <ChatErrorBoundary onReset={() => window.location.reload()}>
      <div className="h-full flex flex-col">
      <DashboardHeader
        title="Team Communication"
        subtitle="Stay connected with your team through organized channels and direct messages"
        variant="default"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleChatSidebar}
            className={cn(
              "glass-card",
              showChatSidebar && "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20"
            )}
            title="Toggle sidebar (⌘B / Ctrl+B)"
          >
            <PanelLeftOpen className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Conversations</span>
            <kbd className="hidden lg:inline ml-2 px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
              ⌘B
            </kbd>
          </Button>
          
          {!isMobile && selectedChatId && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleUserProfile}
              className={cn(
                "glass-card",
                showUserProfile && "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20"
              )}
              title="Toggle profile (⌘I / Ctrl+I)"
            >
              <PanelRightOpen className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Profile</span>
              <kbd className="hidden lg:inline ml-2 px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                ⌘I
              </kbd>
            </Button>
          )}
        </div>
      </DashboardHeader>

      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="w-full flex gap-6 flex-1 min-h-0">
          
          <div className={cn(
            "transition-all duration-300 flex-shrink-0",
            showChatSidebar ? "w-80" : "w-0 overflow-hidden",
            isMobile && showChatSidebar && "fixed inset-0 z-50 w-full bg-white dark:bg-slate-900"
          )}>
            {showChatSidebar && (
              <Card className="glass-card border-border/50 h-full flex flex-col">
                {isMobile && (
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="font-semibold">Messages</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChatSidebar(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="h-full">
                  <ChatSidebar 
                    selectedChatId={selectedChatId} 
                    onSelectChat={handleSelectChat} 
                  />
                </div>
              </Card>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <Card className="glass-card border-border/50 h-full flex flex-col">
              {!selectedChatId ? (
                <CardContent className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-500/20 dark:to-purple-500/20 flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Welcome to Team Chat
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {showChatSidebar 
                        ? "Select a conversation to start chatting with your team, or create a new one"
                        : "Open the conversations panel to view and join discussions"
                      }
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      {!showChatSidebar ? (
                        <Button onClick={toggleChatSidebar} className="gap-2">
                          <Menu className="w-4 h-4" />
                          Open Conversations
                        </Button>
                      ) : (
                        <>
                          <Button 
                            onClick={toggleChatSidebar} 
                            variant="outline"
                            className="gap-2"
                          >
                            <Users className="w-4 h-4" />
                            Browse Channels
                          </Button>
                          <Button 
                            onClick={() => {
                              const event = new CustomEvent('openNewConversation');
                              window.dispatchEvent(event);
                            }}
                            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Start Conversation
                          </Button>
                        </>
                      )}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        💡 Quick Tips
                      </p>
                      <div className="space-y-2 text-left">
                        <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <Hash className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span><strong>Channels</strong> are for team-wide discussions</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span><strong>Direct Messages</strong> for 1-on-1 conversations</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <Users className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span><strong>Groups</strong> for small team collaboration</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              ) : (
                <div className="h-full">
                  <ChatMainArea 
                    selectedChatId={selectedChatId} 
                    onSelectUser={handleSelectUser}
                    onSelectChat={(chatId) => {
                      if (chatId === null) {
                        setSelectedChatId(null)
                        navigate({ search: {}, replace: true })
                        return
                      }
                      handleSelectChat(chatId)
                    }}
                    highlightMessageId={search.message ?? null}
                    onHighlightConsumed={() => {
                      navigate({
                        search: {
                          channel: selectedChatId ?? undefined,
                          message: undefined,
                          userId: undefined,
                        },
                        replace: true,
                      })
                    }}
                  />
                </div>
              )}
            </Card>
          </div>

          {!isMobile && (
            <div className={cn(
              "transition-all duration-300 flex-shrink-0",
              showUserProfile && selectedChatId ? "w-80" : "w-0 overflow-hidden"
            )}>
              {showUserProfile && selectedChatId && (
                <Card className="glass-card border-border/50 h-full flex flex-col">
                  <div className="h-full flex-1 overflow-auto">
                    <ChatUserProfile 
                      selectedUser={selectedUser} 
                      selectedChatId={selectedChatId} 
                    />
                  </div>
                </Card>
              )}
            </div>
          )}

        </div>
      </div>

      {isMobile && selectedChatId && selectedUser && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Profile</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUser(null)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-full overflow-auto">
            <ChatUserProfile 
              selectedUser={selectedUser} 
              selectedChatId={selectedChatId} 
            />
          </div>
        </div>
      )}

      {isMobile && showChatSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowChatSidebar(false)}
        />
      )}

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectChannel={(channelId) => {
          setSelectedChatId(channelId)
          navigate({
            search: { channel: channelId, message: undefined, userId: undefined },
            replace: true,
          })
          if (isMobile) {
            setShowChatSidebar(false)
          }
        }}
        onSelectMessage={(messageId, channelId) => {
          setSelectedChatId(channelId)
          navigate({
            search: { channel: channelId, message: messageId, userId: undefined },
            replace: true,
          })
          if (isMobile) {
            setShowChatSidebar(false)
          }
          setTimeout(() => {
            const messageElement = document.getElementById(`message-${messageId}`)
            if (messageElement) {
              messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
              messageElement.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-500/10')
              setTimeout(() => {
                messageElement.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-500/10')
              }, 2000)
            }
          }, 300)
        }}
      />
      </div>
    </ChatErrorBoundary>
  )
}
