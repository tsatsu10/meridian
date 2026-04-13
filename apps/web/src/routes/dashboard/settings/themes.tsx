import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Palette,
  Type,
  Layout,
  Image as ImageIcon,
  Plus,
  Trash2,
  Copy,
  Check,
  Save,
  RotateCcw,
  Download,
  Upload,
  Eye,
  Sparkles,
  ArrowLeft,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import LazyDashboardLayout from '@/components/performance/lazy-dashboard-layout';
import { useWorkspaceStore } from '@/store/workspace';
import { API_BASE_URL } from '@/constants/urls';
import { ThemeBuilder } from '@/components/themes/theme-builder';
import { ThemeMarketplace } from '@/components/themes/theme-marketplace';
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/settings/themes')({
  component: withErrorBoundary(ThemesSettingsPage, "Custom Themes"),
});

interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
}

interface CustomTheme {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  colors: ThemeColors;
  typography: {
    fontFamily: string;
    fontSizeBase: number;
    fontSizeSmall: number;
    fontSizeLarge: number;
    fontSizeHeading: number;
    lineHeight: number;
    letterSpacing: number;
    fontWeightNormal: number;
    fontWeightMedium: number;
    fontWeightBold: number;
  };
  spacing: {
    borderRadius: 'sharp' | 'rounded' | 'pill';
    borderRadiusValue: string;
    componentSpacing: 'compact' | 'normal' | 'spacious';
    containerMaxWidth: string;
    shadowIntensity: 'none' | 'subtle' | 'normal' | 'strong';
  };
  isActive: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BrandingSettings {
  workspaceId: string;
  logoUrl?: string;
  faviconUrl?: string;
  loginBackgroundUrl?: string;
  customCss?: string;
  updatedAt: Date;
}

function ThemesSettingsPage() {
  const navigate = useNavigate();
  // Fix: Use workspace directly instead of broken currentWorkspace getter
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<CustomTheme | null>(null);
  const [previewTheme, setPreviewTheme] = useState<CustomTheme | null>(null);

  // Fetch themes
  const { data: themesResponse, isLoading: themesLoading } = useQuery({
    queryKey: ['themes', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const response = await fetch(`${API_BASE_URL}/settings/themes/${currentWorkspace.id}/themes`, {
        credentials: 'include',
      });
      return response.ok ? response.json() : null;
    },
    enabled: !!currentWorkspace,
  });

  // Fetch theme templates
  const { data: templatesResponse } = useQuery({
    queryKey: ['theme-templates'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/settings/themes/templates`, {
        credentials: 'include',
      });
      return response.ok ? response.json() : null;
    },
  });

  // Fetch branding settings
  const { data: brandingResponse } = useQuery({
    queryKey: ['branding', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const response = await fetch(`${API_BASE_URL}/settings/themes/${currentWorkspace.id}/branding`, {
        credentials: 'include',
      });
      return response.ok ? response.json() : null;
    },
    enabled: !!currentWorkspace,
  });

  const themes = themesResponse?.data || [];
  const templates = templatesResponse?.data || {};
  const branding = brandingResponse?.data || {};

  // Apply theme mutation
  const applyThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/themes/${currentWorkspace.id}/themes/${themeId}/apply`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to apply theme');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Theme applied successfully');
      queryClient.invalidateQueries({ queryKey: ['themes', currentWorkspace?.id] });
    },
    onError: () => {
      toast.error('Failed to apply theme');
    },
  });

  // Delete theme mutation
  const deleteThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/themes/${currentWorkspace.id}/themes/${themeId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to delete theme');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Theme deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['themes', currentWorkspace?.id] });
      setIsDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to delete theme');
    },
  });

  // Clone theme mutation
  const cloneThemeMutation = useMutation({
    mutationFn: async ({ themeId, name }: { themeId: string; name: string }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/themes/${currentWorkspace.id}/themes/${themeId}/clone`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name }),
        }
      );
      if (!response.ok) throw new Error('Failed to clone theme');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Theme cloned successfully');
      queryClient.invalidateQueries({ queryKey: ['themes', currentWorkspace?.id] });
    },
    onError: () => {
      toast.error('Failed to clone theme');
    },
  });

  // Create theme mutation
  const createThemeMutation = useMutation({
    mutationFn: async (themeData: any) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/themes/${currentWorkspace.id}/themes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(themeData),
        }
      );
      if (!response.ok) throw new Error('Failed to create theme');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Theme created successfully');
      queryClient.invalidateQueries({ queryKey: ['themes', currentWorkspace?.id] });
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to create theme');
    },
  });

  const activeTheme = themes.find((t: CustomTheme) => t.isActive);

  const handleApplyTheme = (themeId: string) => {
    applyThemeMutation.mutate(themeId);
  };

  const handleDeleteTheme = () => {
    if (selectedTheme) {
      deleteThemeMutation.mutate(selectedTheme.id);
    }
  };

  const handleCloneTheme = (theme: CustomTheme) => {
    cloneThemeMutation.mutate({
      themeId: theme.id,
      name: `${theme.name} (Copy)`,
    });
  };

  const handleCreateTheme = (themeData: any) => {
    createThemeMutation.mutate(themeData);
  };

  return (
    <LazyDashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate({ to: '/dashboard/settings' })} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Settings
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Palette className="h-8 w-8" /> Themes & Branding
              </h1>
              <p className="text-muted-foreground">
                Customize your workspace appearance and branding
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateDialogOpen(true)} variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Create Theme
            </Button>
          </div>
        </div>

        <Tabs defaultValue="themes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="themes">
              <Palette className="h-4 w-4 mr-2" />
              Custom Themes
            </TabsTrigger>
            <TabsTrigger value="marketplace">
              <Globe className="h-4 w-4 mr-2" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Sparkles className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="branding">
              <ImageIcon className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
          </TabsList>

          {/* Custom Themes Tab */}
          <TabsContent value="themes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Themes</CardTitle>
                <CardDescription>Manage custom themes for your workspace</CardDescription>
              </CardHeader>
              <CardContent>
                {themesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading themes...</div>
                ) : themes.length === 0 ? (
                  <div className="text-center py-12">
                    <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">No custom themes yet</p>
                    <p className="text-muted-foreground mb-4">
                      Create your first theme or start from a template
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Theme
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {themes.map((theme: CustomTheme) => (
                      <Card
                        key={theme.id}
                        className={`relative ${theme.isActive ? 'border-primary shadow-lg' : ''}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {theme.name}
                                {theme.isActive && (
                                  <Badge className="bg-green-500">
                                    <Check className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                )}
                              </CardTitle>
                              {theme.description && (
                                <CardDescription className="text-sm mt-1">
                                  {theme.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Color Preview */}
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            <div
                              className="h-8 rounded border"
                              style={{ backgroundColor: theme.colors.primary }}
                              title="Primary"
                            />
                            <div
                              className="h-8 rounded border"
                              style={{ backgroundColor: theme.colors.secondary }}
                              title="Secondary"
                            />
                            <div
                              className="h-8 rounded border"
                              style={{ backgroundColor: theme.colors.accent }}
                              title="Accent"
                            />
                            <div
                              className="h-8 rounded border"
                              style={{ backgroundColor: theme.colors.success }}
                              title="Success"
                            />
                          </div>

                          {/* Typography Info */}
                          <div className="text-xs text-muted-foreground mb-4">
                            <p>Font: {theme.typography.fontFamily.split(',')[0]}</p>
                            <p>Size: {theme.typography.fontSizeBase}px</p>
                            <p>Radius: {theme.spacing.borderRadius}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            {!theme.isActive && (
                              <Button
                                onClick={() => handleApplyTheme(theme.id)}
                                size="sm"
                                className="flex-1"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Apply
                              </Button>
                            )}
                            <Button
                              onClick={() => setPreviewTheme(theme)}
                              size="sm"
                              variant="outline"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleCloneTheme(theme)}
                              size="sm"
                              variant="outline"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedTheme(theme);
                                setIsDeleteDialogOpen(true);
                              }}
                              size="sm"
                              variant="outline"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-4">
            <ThemeMarketplace workspaceId={currentWorkspace?.id || ''} />
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme Templates</CardTitle>
                <CardDescription>Start from a pre-built theme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(templates).map(([key, template]: [string, any]) => (
                    <Card key={key} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Color Preview */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          <div
                            className="h-8 rounded border"
                            style={{ backgroundColor: template.colors.primary }}
                          />
                          <div
                            className="h-8 rounded border"
                            style={{ backgroundColor: template.colors.secondary }}
                          />
                          <div
                            className="h-8 rounded border"
                            style={{ backgroundColor: template.colors.accent }}
                          />
                          <div
                            className="h-8 rounded border"
                            style={{ backgroundColor: template.colors.background }}
                          />
                        </div>

                        <Button
                          onClick={() => {
                            toast.info('Create from template - Coming soon!');
                          }}
                          className="w-full"
                          variant="outline"
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Branding</CardTitle>
                <CardDescription>Customize your workspace identity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                <div>
                  <Label htmlFor="logo">Workspace Logo</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {branding.logoUrl && (
                      <img src={branding.logoUrl} alt="Logo" className="h-16 w-16 object-contain border rounded" />
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      {branding.logoUrl && (
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: 200x200px, PNG or SVG format
                  </p>
                </div>

                {/* Favicon */}
                <div>
                  <Label htmlFor="favicon">Favicon</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {branding.faviconUrl && (
                      <img src={branding.faviconUrl} alt="Favicon" className="h-8 w-8 object-contain border rounded" />
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Favicon
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: 32x32px, ICO or PNG format
                  </p>
                </div>

                {/* Login Background */}
                <div>
                  <Label htmlFor="loginBg">Login Page Background</Label>
                  <div className="mt-2">
                    <Input
                      id="loginBg"
                      placeholder="https://example.com/background.jpg"
                      value={branding.loginBackgroundUrl || ''}
                      readOnly
                    />
                    <Button variant="outline" size="sm" className="mt-2">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Background
                    </Button>
                  </div>
                </div>

                {/* Custom CSS */}
                <div>
                  <Label htmlFor="customCss">Custom CSS (Advanced)</Label>
                  <Textarea
                    id="customCss"
                    placeholder="/* Add custom CSS here */"
                    rows={10}
                    value={branding.customCss || ''}
                    readOnly
                    className="mt-2 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Advanced users only. Custom CSS will be injected into all pages.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Save Branding
                  </Button>
                  <Button variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Theme?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedTheme?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTheme} className="bg-destructive">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Theme Dialog - Full Theme Builder */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <ThemeBuilder
              workspaceId={currentWorkspace?.id || ''}
              onSave={handleCreateTheme}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </LazyDashboardLayout>
  );
}
