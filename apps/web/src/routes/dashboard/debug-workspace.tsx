import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';
import useGetWorkspaces from '@/hooks/queries/workspace/use-get-workspaces';
import { API_BASE_URL } from '@/constants/urls';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/dashboard/debug-workspace')({
  component: DebugWorkspace,
});

function DebugWorkspace() {
  const { user } = useAuth();
  const { workspace, currentWorkspace, setWorkspace } = useWorkspaceStore();
  const { data: workspaces, isLoading, error } = useGetWorkspaces();
  const [cookies, setCookies] = useState<string>('');

  useEffect(() => {
    setCookies(document.cookie);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Workspace Debug Info</h1>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>👤 User Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Email:</div>
            <div>{user?.email || 'Not authenticated'}</div>

            <div className="font-medium">Name:</div>
            <div>{user?.name || 'N/A'}</div>

            <div className="font-medium">Role:</div>
            <div>
              <Badge>{user?.role || 'N/A'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cookies */}
      <Card>
        <CardHeader>
          <CardTitle>🍪 Browser Cookies</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded overflow-auto">
            {cookies || 'No cookies found'}
          </pre>
        </CardContent>
      </Card>

      {/* Workspace Store */}
      <Card>
        <CardHeader>
          <CardTitle>💾 Workspace Store</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="font-medium mb-2">Current Workspace:</div>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(currentWorkspace || workspace, null, 2)}
            </pre>
          </div>
          {currentWorkspace && (
            <Button
              onClick={() => setWorkspace(undefined)}
              variant="destructive"
              size="sm"
            >
              Clear Workspace
            </Button>
          )}
        </CardContent>
      </Card>

      {/* API Fetch Status */}
      <Card>
        <CardHeader>
          <CardTitle>🌐 Workspace API Fetch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">API URL:</div>
            <div className="break-all">{API_BASE_URL}/workspaces</div>

            <div className="font-medium">Loading:</div>
            <div>{isLoading ? '⏳ Yes' : '✅ No'}</div>

            <div className="font-medium">Error:</div>
            <div>{error ? `❌ ${error.message}` : '✅ None'}</div>

            <div className="font-medium">Workspaces Count:</div>
            <div>{workspaces?.length ?? 0}</div>
          </div>

          {workspaces && workspaces.length > 0 && (
            <div>
              <div className="font-medium mb-2">Available Workspaces:</div>
              <div className="space-y-2">
                {workspaces.map((ws: any) => (
                  <Card key={ws.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{ws.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {ws.id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Role: {ws.userRole || 'N/A'}
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setWorkspace(ws);
                          console.log('✅ Set workspace:', ws);
                        }}
                        size="sm"
                      >
                        Select
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded p-4">
              <div className="font-medium text-destructive mb-2">Error Details:</div>
              <pre className="text-xs">{JSON.stringify(error, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LocalStorage */}
      <Card>
        <CardHeader>
          <CardTitle>💾 LocalStorage</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(
              Object.keys(localStorage).reduce((acc: any, key) => {
                try {
                  acc[key] = JSON.parse(localStorage.getItem(key) || '');
                } catch {
                  acc[key] = localStorage.getItem(key);
                }
                return acc;
              }, {}),
              null,
              2
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
