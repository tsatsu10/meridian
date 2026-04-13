import { useState } from "react";
import { Button } from "@/components/ui/button";
import ChatInterface from "@/components/communication/chat/ChatInterface";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";

// Icon wrapper
const MessageSquareIcon = MessageSquare as React.FC<{ className?: string }>;

// Sample team data for testing
const testTeam = {
  id: "test-team-1",
  name: "Test Team",
  lead: "user-1",
  members: [
    {
      id: "user-1",
      name: "John Doe",
      email: "john@meridian.dev",
      status: "online" as const,
      role: "team-lead",
      isActive: true
    },
    {
      id: "user-2", 
      name: "Jane Smith",
      email: "jane@meridian.dev",
      status: "away" as const,
      role: "senior",
      isActive: true
    },
    {
      id: "user-3",
      name: "Bob Wilson",
      email: "bob@meridian.dev", 
      status: "busy" as const,
      role: "member",
      isActive: true
    },
    {
      id: "user-4",
      name: "Alice Johnson",
      email: "alice@meridian.dev",
      status: "offline" as const,
      role: "member", 
      isActive: true
    }
  ]
};

function ChatTestPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Chat Interface Test</h1>
        
        <div className="space-y-4">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Channel Management Features</h2>
            <p className="text-muted-foreground mb-4">
              Test the comprehensive channel management system including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm mb-4">
              <li>✅ Channel Filtering (All/Unread/Mentions/Muted/Archived)</li>
              <li>✅ Channel Sorting (Recent/Alphabetical/Unread/Type)</li>
              <li>✅ Channel Context Menu (Mute/Pin/Archive)</li>
              <li>✅ Channel Creation with Templates</li>
              <li>✅ Channel Type Colors & Icons</li>
              <li>✅ Unread & Mention Badges</li>
              <li>✅ Search Functionality</li>
              <li>✅ Collapsible Sidebar</li>
            </ul>
            
            <Button onClick={() => setIsChatOpen(true)} className="w-full">
              <MessageSquareIcon className="mr-2 h-4 w-4" />
              Open Chat Interface
            </Button>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Test Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click "Open Chat Interface" above</li>
              <li>Look for the "Add Channel" button in the left sidebar (should be visible)</li>
              <li>Click "Add Channel" to see the multi-step wizard</li>
              <li>Try different channel templates (General Team, Project, Announcements, etc.)</li>
              <li>Test the filter dropdown (All/Unread/Mentions/Muted/Archived)</li>
              <li>Test the sort dropdown (Recent/Alphabetical/Unread/Type)</li>
              <li>Hover over channels to see the context menu (⋯)</li>
              <li>Try muting/pinning/archiving channels</li>
              <li>Search for channels using the search box</li>
              <li>Collapse/expand the sidebar using the arrow button</li>
            </ol>
          </div>

          <div className="p-6 border rounded-lg bg-muted">
            <h3 className="text-lg font-semibold mb-2">Expected Behavior</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Add Channel Button:</strong> Should be visible with a + icon</p>
              <p><strong>Channel Creation:</strong> Should show 6 templates on step 1, then form on step 2</p>
              <p><strong>Channel Colors:</strong> Green=Team, Blue=Project, Orange=Announcement, Red=Private</p>
              <p><strong>Badges:</strong> Gray badges for unread count, red badges for mentions</p>
              <p><strong>Context Menu:</strong> Mute, Pin, Settings, Archive options</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface Modal */}
      <ChatInterface
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userId="test-user-1"
        workspaceId="test-workspace-1"
      />
    </div>
  );
}

export const Route = createFileRoute("/__dev__/chat-test")({
  component: ChatTestPage,
}); 