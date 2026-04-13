// @epic-1.1-rbac: RBAC debugging page for workspace managers
// @persona-sarah: PM needs to debug permission issues
// @persona-jennifer: Exec needs to verify access controls

"use client";

import { createFileRoute } from "@tanstack/react-router";
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  User, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Crown,
  Eye,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useRBACAuth } from "@/lib/permissions";
import useWorkspaceStore from "@/store/workspace";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import DashboardHeader from "@/components/dashboard/dashboard-header";

function RBACDebugPage() {
  const { user: authUser } = useAuth();
  const { rbacUser, hasPermission, checkPermissionFull } = useRBACAuth();
  const { workspace } = useWorkspaceStore();

  const criticalPermissions = [
    "canViewAnalytics",
    "canViewWorkspaceAnalytics", 
    "canViewAllTasks",
    "canViewProjects",
    "canManageWorkspace",
    "canManageRoles",
    "canViewUsers",
    "canCreateProjects",
    "canExportReports",
    "canViewTeamAnalytics"
  ];

  const testAPIEndpoint = async () => {
    if (!authUser?.id) return;
    
    try {const response = await fetch(`${API_BASE_URL}/rbac/assignments/${authUser.id}`, {
        credentials: 'include'
      });if (response.ok) {
        const data = await response.json();} else {
        const errorText = await response.text();}
    } catch (error) {
      console.error("🚨 API Call failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="RBAC Debug Console"
        subtitle="Diagnose role and permission issues"
        variant="default"
      >
        <Button onClick={testAPIEndpoint} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Test API
        </Button>
      </DashboardHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Current User</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Auth User ID:</span>
                <p className="text-muted-foreground">{authUser?.id || "N/A"}</p>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <p className="text-muted-foreground">{authUser?.email || "N/A"}</p>
              </div>
              <div>
                <span className="font-medium">Name:</span>
                <p className="text-muted-foreground">{authUser?.name || "N/A"}</p>
              </div>
              <div>
                <span className="font-medium">Auth Status:</span>
                <Badge variant={authUser ? "default" : "outline"}>
                  {authUser ? "Authenticated" : "Not Authenticated"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RBAC User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>RBAC User</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">RBAC Status:</span>
                <Badge variant={rbacUser ? "default" : "outline"}>
                  {rbacUser === undefined ? "Loading" : rbacUser ? "Active" : "Not Active"}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Current Role:</span>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={rbacUser?.role === "workspace-manager" ? "default" : "secondary"}
                    className="flex items-center space-x-1"
                  >
                    {rbacUser?.role === "workspace-manager" && <Crown className="h-3 w-3" />}
                    <span>{rbacUser?.role || "N/A"}</span>
                  </Badge>
                </div>
              </div>
              <div>
                <span className="font-medium">Workspace:</span>
                <p className="text-muted-foreground">{workspace?.name || "None Selected"}</p>
              </div>
              <div>
                <span className="font-medium">Assignment:</span>
                <Badge variant={rbacUser?.roleAssignment?.isActive ? "default" : "outline"}>
                  {rbacUser?.roleAssignment?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="permissions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="permissions">Critical Permissions</TabsTrigger>
          <TabsTrigger value="details">Role Details</TabsTrigger>
          <TabsTrigger value="api">API Response</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {criticalPermissions.map((permission) => {
                  const hasAccess = hasPermission(permission as any);
                  const fullCheck = checkPermissionFull(permission as any);
                  
                  return (
                    <div key={permission} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        {hasAccess ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{permission}</p>
                          {!hasAccess && fullCheck.reason && (
                            <p className="text-xs text-red-500">{fullCheck.reason}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={hasAccess ? "default" : "outline"}>
                        {hasAccess ? "✓" : "✗"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Role Information</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify({
                  rbacUser: rbacUser ? {
                    id: rbacUser.id,
                    email: rbacUser.email,
                    role: rbacUser.role,
                    roleAssignment: rbacUser.roleAssignment,
                    currentWorkspaceId: rbacUser.currentWorkspaceId,
                    lastActiveAt: rbacUser.lastActiveAt
                  } : null,
                  workspace: workspace ? {
                    id: workspace.id,
                    name: workspace.name
                  } : null
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>API Test</span>
                <Button onClick={testAPIEndpoint} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Test Now
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <span className="font-medium">Endpoint:</span>
                  <p className="text-muted-foreground font-mono text-sm">
                    /api/rbac/assignments/{authUser?.id || "USER_ID"}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    Check the browser console (F12) for detailed API response information when you click "Test Now".
                  </p>
                </div>
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">Expected Behavior:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>API should return your role assignments from the database</li>
                      <li>Fallback to email-based role detection if API fails</li>
                      <li>Email "elidegbotse@gmail.com" should get "workspace-manager" role</li>
                      <li>Demo users might get "member" role by default</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/__dev__/rbac-debug")({
  component: RBACDebugPage,
}); 