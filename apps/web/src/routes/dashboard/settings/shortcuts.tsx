import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Keyboard,
  Edit,
  RotateCcw,
  Save,
  ArrowLeft,
  HelpCircle,
  Command,
  Search,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute('/dashboard/settings/shortcuts')({
  component: withErrorBoundary(ShortcutsSettingsPage, "Keyboard Shortcuts"),
});

interface KeyboardShortcut {
  id: string;
  action: string;
  shortcutKeys: string;
  description?: string;
  category: string;
  isEnabled: boolean;
  isCustom: boolean;
}

const CATEGORY_NAMES = {
  navigation: 'Navigation',
  actions: 'Actions',
  editing: 'Editing',
  selection: 'Selection',
  view: 'View',
};

function ShortcutsSettingsPage() {
  const navigate = useNavigate();
  // Fix: Use workspace directly instead of broken currentWorkspace getter
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState<KeyboardShortcut | null>(null);
  const [editingKeys, setEditingKeys] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Fetch shortcuts
  const { data: shortcutsResponse, isLoading } = useQuery({
    queryKey: ['shortcuts', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const response = await fetch(
        `${API_BASE_URL}/settings/shortcuts/${currentWorkspace.id}/shortcuts`,
        { credentials: 'include' }
      );
      return response.ok ? response.json() : null;
    },
    enabled: !!currentWorkspace,
  });

  // Fetch presets
  const { data: presetsResponse } = useQuery({
    queryKey: ['shortcut-presets'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/settings/shortcuts/presets`, {
        credentials: 'include',
      });
      return response.ok ? response.json() : null;
    },
  });

  const shortcuts = shortcutsResponse?.data || [];
  const presets = presetsResponse?.data || [];

  // Update shortcut mutation
  const updateShortcutMutation = useMutation({
    mutationFn: async ({ shortcutId, updates }: { shortcutId: string; updates: any }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/shortcuts/${currentWorkspace.id}/shortcuts/${shortcutId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates),
        }
      );
      if (!response.ok) throw new Error('Failed to update shortcut');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Shortcut updated successfully');
      queryClient.invalidateQueries({ queryKey: ['shortcuts', currentWorkspace?.id] });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to update shortcut');
    },
  });

  // Reset shortcuts mutation
  const resetShortcutsMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/shortcuts/${currentWorkspace.id}/reset`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to reset shortcuts');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Shortcuts reset to defaults');
      queryClient.invalidateQueries({ queryKey: ['shortcuts', currentWorkspace?.id] });
      setIsResetDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to reset shortcuts');
    },
  });

  // Apply preset mutation
  const applyPresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/shortcuts/${currentWorkspace.id}/presets/${presetId}/apply`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to apply preset');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Preset applied successfully');
      queryClient.invalidateQueries({ queryKey: ['shortcuts', currentWorkspace?.id] });
    },
    onError: () => {
      toast.error('Failed to apply preset');
    },
  });

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc: any, shortcut: KeyboardShortcut) => {
    const category = shortcut.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {});

  // Filter shortcuts
  const filteredGroups = Object.entries(groupedShortcuts).reduce((acc: any, [category, items]) => {
    const filtered = (items as KeyboardShortcut[]).filter((shortcut) => {
      const matchesSearch = searchTerm === '' || 
        shortcut.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shortcut.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shortcut.shortcutKeys.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
    
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {});

  const handleEditShortcut = (shortcut: KeyboardShortcut) => {
    setSelectedShortcut(shortcut);
    setEditingKeys(shortcut.shortcutKeys);
    setIsEditDialogOpen(true);
  };

  const handleToggleShortcut = (shortcut: KeyboardShortcut) => {
    updateShortcutMutation.mutate({
      shortcutId: shortcut.id,
      updates: { isEnabled: !shortcut.isEnabled },
    });
  };

  const handleSaveShortcut = () => {
    if (selectedShortcut && editingKeys) {
      // Check for conflicts
      const conflict = shortcuts.find(
        (s: KeyboardShortcut) =>
          s.id !== selectedShortcut.id &&
          s.shortcutKeys === editingKeys &&
          s.isEnabled
      );

      if (conflict) {
        toast.error(`Conflict: "${editingKeys}" is already used by ${conflict.description}`);
        return;
      }

      updateShortcutMutation.mutate({
        shortcutId: selectedShortcut.id,
        updates: { shortcutKeys: editingKeys },
      });
    }
  };

  const handleKeyRecord = (e: React.KeyboardEvent) => {
    if (!isRecording) return;
    
    e.preventDefault();
    
    const keys = [];
    if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    
    const key = e.key;
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      keys.push(key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key);
    }
    
    if (keys.length > 0 && keys[keys.length - 1] !== 'Ctrl' && keys[keys.length - 1] !== 'Shift' && keys[keys.length - 1] !== 'Alt') {
      setEditingKeys(keys.join('+'));
      setIsRecording(false);
    }
  };

  const formatShortcutKey = (key: string) => {
    return key
      .replace('Ctrl', '⌃')
      .replace('Shift', '⇧')
      .replace('Alt', '⌥')
      .replace('Meta', '⌘')
      .replace('Command', '⌘');
  };

  const customShortcutsCount = shortcuts.filter((s: KeyboardShortcut) => s.isCustom).length;

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
                <Keyboard className="h-8 w-8" /> Keyboard Shortcuts
              </h1>
              <p className="text-muted-foreground">
                Customize shortcuts to match your workflow
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsCheatSheetOpen(true)} variant="outline" size="sm">
              <HelpCircle className="h-4 w-4 mr-2" />
              Cheat Sheet
            </Button>
            <Button onClick={() => setIsResetDialogOpen(true)} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Presets */}
        <Card>
          <CardHeader>
            <CardTitle>Shortcut Presets</CardTitle>
            <CardDescription>
              Apply a preset to match your favorite apps
              {customShortcutsCount > 0 && (
                <span className="ml-2">
                  ({customShortcutsCount} custom shortcuts)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {presets.map((preset: any) => (
                <Button
                  key={preset.id}
                  onClick={() => applyPresetMutation.mutate(preset.id)}
                  variant="outline"
                  className="justify-start"
                  disabled={applyPresetMutation.isPending}
                >
                  <Command className="h-4 w-4 mr-2" />
                  {preset.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search shortcuts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Shortcuts List */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Loading shortcuts...
              </div>
            </CardContent>
          </Card>
        ) : Object.keys(filteredGroups).length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Keyboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No shortcuts found</p>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          Object.entries(filteredGroups).map(([category, categoryShortcuts]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>
                  {CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES] || category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(categoryShortcuts as KeyboardShortcut[]).map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div>
                          <div className="font-medium">{shortcut.description || shortcut.action}</div>
                          <div className="text-sm text-muted-foreground">{shortcut.action}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={shortcut.isCustom ? 'default' : 'secondary'} className="font-mono">
                          {formatShortcutKey(shortcut.shortcutKeys)}
                        </Badge>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={shortcut.isEnabled}
                            onCheckedChange={() => handleToggleShortcut(shortcut)}
                          />
                        </div>

                        <Button
                          onClick={() => handleEditShortcut(shortcut)}
                          size="sm"
                          variant="ghost"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Edit Shortcut Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Shortcut</DialogTitle>
              <DialogDescription>
                {selectedShortcut?.description || selectedShortcut?.action}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Shortcut</Label>
                <div className="p-3 rounded-lg border bg-muted font-mono text-center">
                  {formatShortcutKey(selectedShortcut?.shortcutKeys || '')}
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Shortcut</Label>
                <div className="relative">
                  <Input
                    value={editingKeys}
                    onChange={(e) => setEditingKeys(e.target.value)}
                    onKeyDown={handleKeyRecord}
                    onFocus={() => setIsRecording(true)}
                    onBlur={() => setIsRecording(false)}
                    placeholder={isRecording ? 'Press keys...' : 'Click to record'}
                    className="font-mono text-center"
                  />
                  {isRecording && (
                    <div className="absolute inset-0 border-2 border-primary rounded-md pointer-events-none animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click the input and press your desired key combination
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveShortcut} disabled={!editingKeys || updateShortcutMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Confirmation */}
        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset All Shortcuts?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all keyboard shortcuts to their default values. Any custom shortcuts will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => resetShortcutsMutation.mutate()}>
                Reset to Defaults
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cheat Sheet Dialog */}
        <Dialog open={isCheatSheetOpen} onOpenChange={setIsCheatSheetOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Keyboard Shortcuts Cheat Sheet</DialogTitle>
              <DialogDescription>
                Quick reference for all available shortcuts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                <div key={category}>
                  <h3 className="font-semibold mb-3">
                    {CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES] || category}
                  </h3>
                  <div className="space-y-2">
                    {(categoryShortcuts as KeyboardShortcut[])
                      .filter(s => s.isEnabled)
                      .map((shortcut) => (
                        <div
                          key={shortcut.id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <span className="text-sm">{shortcut.description || shortcut.action}</span>
                          <Badge variant="secondary" className="font-mono">
                            {formatShortcutKey(shortcut.shortcutKeys)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </LazyDashboardLayout>
  );
}
