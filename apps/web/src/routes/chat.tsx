// @epic-1.1-chat-integration
// @persona-sarah: PM needs team communication tools
// @persona-mike: Developer needs efficient task collaboration  
// @persona-david: Team lead needs oversight of team discussions
// @persona-lisa: Designer needs file sharing and collaboration

import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/chat')({
  beforeLoad: () => {
    // Redirect to the new dashboard chat route for consistency
    throw redirect({
      to: '/dashboard/chat',
    })
  },
}) 