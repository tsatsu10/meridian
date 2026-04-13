// @epic-4.1-custom-theme-builder: Theme marketplace for browsing and installing public themes
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Globe, 
  Download, 
  Eye, 
  Search,
  Filter,
  Star,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { API_BASE_URL } from '@/constants/urls';

interface ThemeMarketplaceProps {
  workspaceId: string;
}

export function ThemeMarketplace({ workspaceId }: ThemeMarketplaceProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<any | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Fetch marketplace themes
  const { data: marketplaceResponse, isLoading } = useQuery({
    queryKey: ['marketplace-themes'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/settings/themes/marketplace`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch marketplace themes');
      return response.json();
    },
  });

  const marketplaceThemes = marketplaceResponse?.data || [];

  // Install theme mutation
  const installThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/settings/themes/${workspaceId}/marketplace/${themeId}/install`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to install theme');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Theme installed successfully!');
      queryClient.invalidateQueries({ queryKey: ['themes', workspaceId] });
      setShowPreviewDialog(false);
    },
    onError: () => {
      toast.error('Failed to install theme');
    },
  });

  // Filter themes based on search
  const filteredThemes = marketplaceThemes.filter((theme: any) =>
    theme.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    theme.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInstall = (themeId: string) => {
    installThemeMutation.mutate(themeId);
  };

  const handlePreview = (theme: any) => {
    setSelectedTheme(theme);
    setShowPreviewDialog(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading marketplace themes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Theme Marketplace</CardTitle>
                <CardDescription>
                  Browse and install public themes created by the community
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">
              {filteredThemes.length} {filteredThemes.length === 1 ? 'theme' : 'themes'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" disabled>
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Themes Grid */}
      {filteredThemes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Globe className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No themes found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Be the first to publish a theme to the marketplace!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredThemes.map((theme: any) => (
            <Card key={theme.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{theme.name}</CardTitle>
                    <CardDescription className="text-sm mt-1 line-clamp-2">
                      {theme.description || 'No description provided'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Color Preview */}
                {theme.colors && (
                  <div className="flex gap-1 h-8 rounded-md overflow-hidden border">
                    <div
                      className="flex-1"
                      style={{ backgroundColor: theme.colors.primary }}
                      title="Primary"
                    />
                    <div
                      className="flex-1"
                      style={{ backgroundColor: theme.colors.secondary }}
                      title="Secondary"
                    />
                    <div
                      className="flex-1"
                      style={{ backgroundColor: theme.colors.accent }}
                      title="Accent"
                    />
                    <div
                      className="flex-1"
                      style={{ backgroundColor: theme.colors.success }}
                      title="Success"
                    />
                    <div
                      className="flex-1"
                      style={{ backgroundColor: theme.colors.destructive }}
                      title="Destructive"
                    />
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>By {theme.createdBy || 'Anonymous'}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreview(theme)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleInstall(theme.id)}
                    disabled={installThemeMutation.isPending}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Install
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTheme?.name}</DialogTitle>
            <DialogDescription>
              {selectedTheme?.description || 'No description provided'}
            </DialogDescription>
          </DialogHeader>

          {selectedTheme?.colors && (
            <div className="space-y-4">
              {/* Color Palette */}
              <div>
                <h4 className="text-sm font-medium mb-2">Color Palette</h4>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(selectedTheme.colors).slice(0, 10).map(([key, value]: [string, any]) => (
                    <div key={key} className="space-y-1">
                      <div
                        className="h-12 rounded-md border"
                        style={{ backgroundColor: value }}
                      />
                      <p className="text-xs text-muted-foreground truncate capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <h4 className="text-sm font-medium mb-2">Component Preview</h4>
                <div
                  className="p-4 rounded-lg border-2 space-y-3"
                  style={{
                    backgroundColor: selectedTheme.colors.background,
                    color: selectedTheme.colors.foreground,
                    borderColor: selectedTheme.colors.border,
                  }}
                >
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1.5 rounded text-sm font-medium"
                      style={{
                        backgroundColor: selectedTheme.colors.primary,
                        color: selectedTheme.colors.primaryForeground,
                      }}
                    >
                      Primary
                    </button>
                    <button
                      className="px-3 py-1.5 rounded text-sm font-medium"
                      style={{
                        backgroundColor: selectedTheme.colors.secondary,
                        color: selectedTheme.colors.secondaryForeground,
                      }}
                    >
                      Secondary
                    </button>
                  </div>
                  <div
                    className="p-3 rounded"
                    style={{
                      backgroundColor: selectedTheme.colors.card,
                      color: selectedTheme.colors.cardForeground,
                      border: `1px solid ${selectedTheme.colors.border}`,
                    }}
                  >
                    <p className="text-sm">Card preview with theme colors</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => selectedTheme && handleInstall(selectedTheme.id)}
              disabled={installThemeMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Install Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

