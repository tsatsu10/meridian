/**
 * 🔐 2FA Admin Dashboard
 * 
 * Admin interface for managing 2FA across workspace:
 * - View 2FA status for all users
 * - Send bulk reminders
 * - Force 2FA for roles
 * - Track adoption rate
 * - Export security reports
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, ShieldAlert, ShieldCheck, Mail, Download, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface User2FAStatus {
  userId: string;
  userEmail: string;
  userName?: string;
  role: string;
  has2FA: boolean;
  twoFactorMethod?: string;
  lastReminderSent?: string;
  joinedAt: string;
}

export function TwoFADashboard() {
  const { toast } = useToast();
  const { workspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Fetch 2FA status for all workspace users
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['2fa-status', workspace?.id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/2fa-status?workspaceId=${workspace?.id}`);
      return response.json();
    },
    enabled: !!workspace?.id,
  });

  // Send bulk reminder
  const sendReminderMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await fetch('/api/admin/2fa-reminder/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          userIds,
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: '✓ Reminders Sent',
        description: `Sent 2FA setup reminders to ${data.sentCount} users`,
      });
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: () => {
      toast({
        title: 'Failed to Send Reminders',
        description: 'Could not send 2FA reminders',
        variant: 'destructive',
      });
    },
  });

  // Export report
  const exportReportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/2fa-report?workspaceId=${workspace?.id}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `2fa-report-${workspace?.name}-${new Date().toISOString()}.csv`;
      a.click();
      return {};
    },
    onSuccess: () => {
      toast({
        title: '✓ Report Downloaded',
        description: '2FA security report exported',
      });
    },
  });

  const users: User2FAStatus[] = data?.users || [];
  const stats = {
    total: users.length,
    enabled: users.filter(u => u.has2FA).length,
    disabled: users.filter(u => !u.has2FA).length,
    adoptionRate: users.length > 0 ? (users.filter(u => u.has2FA).length / users.length) * 100 : 0,
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllWithout2FA = () => {
    const usersWithout2FA = users.filter(u => !u.has2FA).map(u => u.userId);
    setSelectedUsers(usersWithout2FA);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">2FA Enabled</p>
                <p className="text-3xl font-bold">{stats.enabled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Without 2FA</p>
                <p className="text-3xl font-bold">{stats.disabled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Adoption Rate</p>
                <p className="text-3xl font-bold">{Math.round(stats.adoptionRate)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>2FA Management</CardTitle>
              <CardDescription>
                Manage two-factor authentication across your workspace
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReportMutation.mutate()}
                disabled={exportReportMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
              <span className="text-sm font-medium">
                {selectedUsers.length} users selected
              </span>
              <Button
                size="sm"
                onClick={() => sendReminderMutation.mutate(selectedUsers)}
                disabled={sendReminderMutation.isPending}
              >
                {sendReminderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send 2FA Reminders
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Quick Action */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Quick select all users without 2FA
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllWithout2FA}
            >
              Select All Without 2FA
            </Button>
          </div>

          {/* Users Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onCheckedChange={(checked) => {
                      setSelectedUsers(checked ? users.map(u => u.userId) : []);
                    }}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>2FA Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Last Reminder</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.userId)}
                        onCheckedChange={() => toggleSelectUser(user.userId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.userName || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{user.userEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.has2FA ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.twoFactorMethod || '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {user.lastReminderSent
                        ? new Date(user.lastReminderSent).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {!user.has2FA && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendReminderMutation.mutate([user.userId])}
                          disabled={sendReminderMutation.isPending}
                        >
                          <Mail className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

