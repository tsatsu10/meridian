import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Globe,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ActiveSession {
  id: string;
  userId: string;
  userEmail: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: {
    city?: string;
    country?: string;
    coordinates?: { lat: number; lon: number };
  };
  isCurrentSession: boolean;
  createdAt: Date;
  lastActivity: Date;
  isSuspicious: boolean;
  status: "active" | "idle" | "expired";
}

interface SessionStats {
  totalActiveSessions: number;
  activeNow: number;
  idleSessions: number;
  suspiciousSessions: number;
  uniqueLocations: number;
  averageSessionDuration: string;
}

export function SessionManagementWidget() {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Fetch active sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery<ActiveSession[]>({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const response = await fetch("/api/security/sessions/active");
      if (!response.ok) throw new Error("Failed to fetch active sessions");
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch session statistics
  const { data: stats, isLoading: statsLoading } = useQuery<SessionStats>({
    queryKey: ["session-stats"],
    queryFn: async () => {
      const response = await fetch("/api/security/sessions/stats");
      if (!response.ok) throw new Error("Failed to fetch session stats");
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000,
  });

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/security/sessions/${sessionId}/terminate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to terminate session");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session-stats"] });
      setSelectedSession(null);
    },
  });

  // Terminate all sessions mutation
  const terminateAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/security/sessions/terminate-all", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to terminate all sessions");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session-stats"] });
    },
  });

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "desktop":
        return <Monitor className="h-4 w-4" aria-hidden="true" />;
      case "mobile":
        return <Smartphone className="h-4 w-4" aria-hidden="true" />;
      case "tablet":
        return <Tablet className="h-4 w-4" aria-hidden="true" />;
      default:
        return <Monitor className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "idle":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "expired":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (sessionsLoading || statsLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading sessions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wifi className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Active Sessions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {stats?.activeNow ?? 0} Active Now
            </Badge>
            {stats?.suspiciousSessions! > 0 && (
              <Badge variant="destructive" className="text-xs">
                {stats?.suspiciousSessions} Suspicious
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor and manage active user sessions across devices
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 border border-border rounded-lg bg-background/50">
            <div className="flex items-center gap-2 mb-1">
              <Monitor className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Total Sessions</span>
            </div>
            <div className="text-xl font-bold">{stats?.totalActiveSessions ?? 0}</div>
          </div>

          <div className="p-3 border border-border rounded-lg bg-background/50">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-4 w-4 text-green-600" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Locations</span>
            </div>
            <div className="text-xl font-bold">{stats?.uniqueLocations ?? 0}</div>
          </div>

          <div className="p-3 border border-border rounded-lg bg-background/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-purple-600" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Avg Duration</span>
            </div>
            <div className="text-sm font-bold">{stats?.averageSessionDuration ?? "N/A"}</div>
          </div>
        </div>

        {/* Active Sessions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Active Sessions</h4>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!sessions || sessions.length === 0}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Terminate All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminate All Sessions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will log out all users from all devices except your current session. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => terminateAllMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Terminate All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {sessions && sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <WifiOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active sessions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions?.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "p-4 border rounded-lg transition-all hover:shadow-md",
                      session.isCurrentSession
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30",
                      session.isSuspicious && "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 border border-border rounded-lg bg-background">
                          {getDeviceIcon(session.deviceType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{session.deviceName}</span>
                            {session.isCurrentSession && (
                              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Current
                              </Badge>
                            )}
                            {session.isSuspicious && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Suspicious
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              {session.browser} on {session.os}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location.city && session.location.country
                                ? `${session.location.city}, ${session.location.country}`
                                : "Unknown Location"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {session.ipAddress}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last active: {formatTimeAgo(session.lastActivity)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className={cn("text-xs", getStatusColor(session.status))}>
                          {session.status}
                        </Badge>
                        {!session.isCurrentSession && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => setSelectedSession(session.id)}
                              >
                                <LogOut className="h-4 w-4 mr-1" />
                                Terminate
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Terminate Session?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will immediately log out the user from this device. They will need to log in
                                  again to continue using the application.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setSelectedSession(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => terminateSessionMutation.mutate(session.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Terminate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>

                    {session.isSuspicious && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-900 dark:text-red-200">
                        <strong>Security Alert:</strong> This session has been flagged as potentially suspicious due to
                        unusual location or activity patterns.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Info Banner */}
        {stats?.suspiciousSessions! > 0 && (
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="text-xs text-red-900 dark:text-red-200">
              <strong>Security Alert:</strong> {stats.suspiciousSessions} suspicious session(s) detected. Review and
              terminate any unauthorized access immediately.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

