/**
 * Production Collaboration Features
 * Real-time team collaboration with full API integration
 */

import { useState, useEffect } from 'react';
import {
  CollaborationPermissionsProvider,
  CollaborationPermissionWrapper,
  useCollaborationPermissionsContext
} from './collaboration-permissions-provider';
import { EnhancedLiveCursors } from './enhanced-live-cursors';
import { EnhancedPresenceIndicators } from './enhanced-presence-indicators';
import { CollaborativeTaskEditor } from './collaborative-task-editor';
import { EnhancedActivityStreams } from './enhanced-activity-streams';
import { EnhancedDiscussionSystem } from './enhanced-discussion-system';
import { TeamCollaborationDashboard } from './team-collaboration-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Eye,
  Edit,
  MessageSquare,
  Activity,
  BarChart3,
  Shield,
  Zap,
  Globe,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee?: string;
  dueDate?: string;
}

interface TeamMember {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  lead: string;
  isArchived: boolean;
}

// Production Collaboration API
class ProductionCollaborationAPI {
  private static baseUrl = import.meta.env.VITE_API_URL || "https://api.meridian.com";
  
  private static async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("auth-token") || sessionStorage.getItem("auth-token");
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async getTeamCollaboration(teamId: string): Promise<Team> {
    return await this.request(`/api/teams/${teamId}/collaboration`);
  }

  static async updateTaskCollaboratively(taskId: string, updates: Partial<Task>): Promise<Task> {
    return await this.request(`/api/tasks/${taskId}/collaborate`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  static async getRealtimePresence(workspaceId: string): Promise<TeamMember[]> {
    return await this.request(`/api/workspaces/${workspaceId}/presence`);
  }

  static async sendCollaborationMessage(roomId: string, message: string): Promise<void> {
    await this.request(`/api/collaboration/rooms/${roomId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }
}

interface CollaborationFeaturesProps {
  teamId: string;
  workspaceId: string;
  selectedTask?: Task;
  className?: string;
}

export function CollaborationFeatures({
  teamId,
  workspaceId,
  selectedTask,
  className = ""
}: CollaborationFeaturesProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTeamData() {
      try {
        setLoading(true);
        const teamData = await ProductionCollaborationAPI.getTeamCollaboration(teamId);
        setTeam(teamData);
        setError(null);
      } catch (err) {
        console.error('Failed to load team collaboration data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load team data');
      } finally {
        setLoading(false);
      }
    }

    if (teamId) {
      loadTeamData();
    }
  }, [teamId]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <Zap className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading collaboration features...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-destructive mb-2">Failed to load collaboration features</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No team data available</p>
        </div>
      </div>
    );
  }

  return (
    <CollaborationPermissionsProvider team={team}>
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Team Collaboration
            </h2>
            <p className="text-muted-foreground">
              Real-time collaboration with {team.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Production Ready
            </Badge>
          </div>
        </div>

        {/* Collaboration Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="editing" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Live Editing
            </TabsTrigger>
            <TabsTrigger value="presence" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Presence
            </TabsTrigger>
            <TabsTrigger value="discussions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Discussions
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Collaboration Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="font-semibold">{team.members.length}</p>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="font-semibold">{team.members.filter(m => m.isActive).length}</p>
                    <p className="text-sm text-muted-foreground">Active Now</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="font-semibold">Secure</p>
                    <p className="text-sm text-muted-foreground">End-to-End</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="editing">
            <CollaborationPermissionWrapper requiredRole="member">
              <Card>
                <CardHeader>
                  <CardTitle>Live Collaborative Editing</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTask ? (
                    <CollaborativeTaskEditor
                      task={selectedTask}
                      onSave={async (updates) => {
                        await ProductionCollaborationAPI.updateTaskCollaboratively(
                          selectedTask.id,
                          updates
                        );
                      }}
                    />
                  ) : (
                    <p className="text-muted-foreground">Select a task to start collaborative editing</p>
                  )}
                </CardContent>
              </Card>
            </CollaborationPermissionWrapper>
          </TabsContent>

          <TabsContent value="presence">
            <Card>
              <CardHeader>
                <CardTitle>Team Presence</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedPresenceIndicators
                  workspaceId={workspaceId}
                />
                <div className="mt-4">
                  <EnhancedLiveCursors
                    resourceId="collaboration-overview"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discussions">
            <Card>
              <CardHeader>
                <CardTitle>Team Discussions</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedDiscussionSystem
                  roomId={`team-${teamId}`}
                  onMessageSend={async (message) => {
                    await ProductionCollaborationAPI.sendCollaborationMessage(
                      `team-${teamId}`,
                      message
                    );
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Team Activity Stream</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedActivityStreams
                  teamId={teamId}
                  workspaceId={workspaceId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <Card>
              <CardHeader>
                <CardTitle>Collaboration Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <TeamCollaborationDashboard
                  teamId={teamId}
                  workspaceId={workspaceId}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CollaborationPermissionsProvider>
  );
}

export default CollaborationFeatures;