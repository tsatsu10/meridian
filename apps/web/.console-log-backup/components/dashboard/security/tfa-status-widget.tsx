import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  TrendingUp,
  Mail,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TwoFactorStats {
  totalUsers: number;
  usersWithTwoFactor: number;
  usersWithoutTwoFactor: number;
  adoptionPercentage: number;
  enforcementEnabled: boolean;
  trend: {
    direction: "up" | "down" | "neutral";
    percentage: number;
  };
}

interface UserTwoFactorStatus {
  email: string;
  name: string;
  hasTwoFactor: boolean;
  enabledAt?: Date;
  lastUsed?: Date;
  backupCodesRemaining?: number;
}

export function TwoFactorStatusWidget() {
  const queryClient = useQueryClient();
  const [showUserList, setShowUserList] = useState(false);

  // Fetch 2FA statistics
  const { data: stats, isLoading: statsLoading } = useQuery<TwoFactorStats>({
    queryKey: ["two-factor-stats"],
    queryFn: async () => {
      const response = await fetch("/api/security/two-factor/stats");
      if (!response.ok) throw new Error("Failed to fetch 2FA stats");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch user 2FA status list
  const { data: userStatuses, isLoading: usersLoading } = useQuery<UserTwoFactorStatus[]>({
    queryKey: ["two-factor-users"],
    queryFn: async () => {
      const response = await fetch("/api/security/two-factor/users");
      if (!response.ok) throw new Error("Failed to fetch user statuses");
      return response.json();
    },
    enabled: showUserList,
  });

  // Toggle 2FA enforcement
  const toggleEnforcementMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch("/api/security/two-factor/enforcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to update enforcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["two-factor-stats"] });
    },
  });

  // Send reminder email
  const sendReminderMutation = useMutation({
    mutationFn: async (userEmail: string) => {
      const response = await fetch("/api/security/two-factor/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail }),
      });
      if (!response.ok) throw new Error("Failed to send reminder");
      return response.json();
    },
  });

  const getAdoptionColor = (percentage: number) => {
    if (percentage >= 75) return "text-green-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getAdoptionSeverity = (percentage: number): "success" | "warning" | "danger" => {
    if (percentage >= 75) return "success";
    if (percentage >= 50) return "warning";
    return "danger";
  };

  if (statsLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading 2FA status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const adoptionPercentage = stats?.adoptionPercentage ?? 0;
  const severity = getAdoptionSeverity(adoptionPercentage);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" aria-hidden="true" />
            Two-Factor Authentication Status
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              severity === "success" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
              severity === "warning" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
              severity === "danger" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            )}
          >
            {adoptionPercentage}% Adoption
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor and enforce 2FA across your workspace
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Adoption Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Team Adoption Rate</span>
            <span className={cn("font-bold text-2xl", getAdoptionColor(adoptionPercentage))}>
              {adoptionPercentage}%
            </span>
          </div>
          
          <Progress
            value={adoptionPercentage}
            className={cn(
              "h-3",
              severity === "success" && "[&>div]:bg-green-600",
              severity === "warning" && "[&>div]:bg-yellow-600",
              severity === "danger" && "[&>div]:bg-red-600"
            )}
          />
          
          {stats?.trend && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {stats.trend.direction === "up" && (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span>+{stats.trend.percentage}% from last month</span>
                </>
              )}
              {stats.trend.direction === "down" && (
                <>
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span>-{stats.trend.percentage}% from last month</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 border border-border rounded-lg bg-background/50">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Total Users</span>
            </div>
            <div className="text-xl font-bold">{stats?.totalUsers ?? 0}</div>
          </div>

          <div className="p-3 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
              <span className="text-xs text-green-700 dark:text-green-300">With 2FA</span>
            </div>
            <div className="text-xl font-bold text-green-700 dark:text-green-300">
              {stats?.usersWithTwoFactor ?? 0}
            </div>
          </div>

          <div className="p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden="true" />
              <span className="text-xs text-red-700 dark:text-red-300">Without 2FA</span>
            </div>
            <div className="text-xl font-bold text-red-700 dark:text-red-300">
              {stats?.usersWithoutTwoFactor ?? 0}
            </div>
          </div>
        </div>

        {/* Enforcement Toggle */}
        <div className="p-4 border border-border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enforce-2fa" className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                Enforce 2FA for All Users
              </Label>
              <p className="text-xs text-muted-foreground">
                Require all users to enable 2FA before accessing the workspace
              </p>
            </div>
            <Switch
              id="enforce-2fa"
              checked={stats?.enforcementEnabled ?? false}
              onCheckedChange={(checked) => toggleEnforcementMutation.mutate(checked)}
              disabled={toggleEnforcementMutation.isPending}
              aria-label="Toggle 2FA enforcement"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Dialog open={showUserList} onOpenChange={setShowUserList}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                View User Status
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>User 2FA Status</DialogTitle>
                <DialogDescription>
                  View and manage two-factor authentication for all users
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="h-[400px] pr-4">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userStatuses?.map((user) => (
                      <div
                        key={user.email}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{user.name}</span>
                            {user.hasTwoFactor ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="2FA enabled" />
                            ) : (
                              <ShieldAlert className="h-4 w-4 text-red-600" aria-label="2FA disabled" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                          {user.hasTwoFactor && user.enabledAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Enabled {new Date(user.enabledAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        
                        {!user.hasTwoFactor && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendReminderMutation.mutate(user.email)}
                            disabled={sendReminderMutation.isPending}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Send Reminder
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              // Send bulk reminders to all users without 2FA
              if (confirm(`Send 2FA setup reminders to ${stats?.usersWithoutTwoFactor} users?`)) {
                // TODO: Implement bulk reminder
                console.log("Sending bulk reminders");
              }
            }}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Bulk Reminders
          </Button>
        </div>

        {/* Info Banner */}
        {adoptionPercentage < 75 && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <strong>Recommendation:</strong> Enable 2FA enforcement to improve workspace security.
              Users will be prompted to set up 2FA on their next login.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

