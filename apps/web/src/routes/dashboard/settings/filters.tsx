import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Filter,
  Plus,
  Save,
  Trash2,
  Copy,
  Pin,
  Users,
  ArrowLeft,
  Edit,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export const Route = createFileRoute('/dashboard/settings/filters')({
  component: withErrorBoundary(FiltersSettingsPage, "Saved Filters"),
});

interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filterType: 'projects' | 'tasks' | 'users' | 'messages' | 'files';
  isPinned: boolean;
  isPublic: boolean;
  usageCount: number;
  lastUsed?: Date;
}

function FiltersSettingsPage() {
  const navigate = useNavigate();
  // Fix: Use workspace directly instead of broken currentWorkspace getter
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SavedFilter | null>(null);

  // Form state for new filter
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [filterType, setFilterType] = useState<'projects' | 'tasks' | 'users' | 'messages' | 'files'>('tasks');
  const [isPublic, setIsPublic] = useState(false);

  // Fetch templates
  const { data: templatesResponse } = useQuery({
    queryKey: ['filter-templates', selectedType],
    queryFn: async () => {
      const typeParam = selectedType !== 'all' ? `?filterType=${selectedType}` : '';
      const response = await fetch(`${API_BASE_URL}/settings/filters/templates${typeParam}`, {
        credentials: 'include',
      });
      return response.ok ? response.json() : null;
    },
  });

  // Fetch saved filters
  const { data: filtersResponse, isLoading } = useQuery({
    queryKey: ['saved-filters', currentWorkspace?.id, selectedType],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const typeParam = selectedType !== 'all' ? `?filterType=${selectedType}` : '';
      const response = await fetch(
        `${API_BASE_URL}/settings/filters/${currentWorkspace.id}/filters${typeParam}`,
        { credentials: 'include' }
      );
      return response.ok ? response.json() : null;
    },
    enabled: !!currentWorkspace,
  });

  const templates = templatesResponse?.data || [];
  const filters = filtersResponse?.data || [];

  // Create filter mutation
  const createFilterMutation = useMutation({
    mutationFn: async (filterData: any) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/filters/${currentWorkspace.id}/filters`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(filterData),
        }
      );
      if (!response.ok) throw new Error('Failed to create filter');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Filter created successfully');
      queryClient.invalidateQueries({ queryKey: ['saved-filters', currentWorkspace?.id] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create filter');
    },
  });

  // Update filter mutation
  const updateFilterMutation = useMutation({
    mutationFn: async ({ filterId, updates }: { filterId: string; updates: any }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/filters/${currentWorkspace.id}/filters/${filterId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates),
        }
      );
      if (!response.ok) throw new Error('Failed to update filter');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Filter updated successfully');
      queryClient.invalidateQueries({ queryKey: ['saved-filters', currentWorkspace?.id] });
    },
    onError: () => {
      toast.error('Failed to update filter');
    },
  });

  // Delete filter mutation
  const deleteFilterMutation = useMutation({
    mutationFn: async (filterId: string) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/filters/${currentWorkspace.id}/filters/${filterId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to delete filter');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Filter deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['saved-filters', currentWorkspace?.id] });
      setIsDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to delete filter');
    },
  });

  // Clone filter mutation
  const cloneFilterMutation = useMutation({
    mutationFn: async ({ filterId, name }: { filterId: string; name: string }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const response = await fetch(
        `${API_BASE_URL}/settings/filters/${currentWorkspace.id}/filters/${filterId}/clone`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name }),
        }
      );
      if (!response.ok) throw new Error('Failed to clone filter');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Filter cloned successfully');
      queryClient.invalidateQueries({ queryKey: ['saved-filters', currentWorkspace?.id] });
    },
    onError: () => {
      toast.error('Failed to clone filter');
    },
  });

  const resetForm = () => {
    setFilterName('');
    setFilterDescription('');
    setFilterType('tasks');
    setIsPublic(false);
  };

  const handleCreateFilter = () => {
    if (!filterName.trim()) {
      toast.error('Filter name is required');
      return;
    }

    createFilterMutation.mutate({
      name: filterName,
      description: filterDescription,
      filterType,
      isPublic,
      filterConfig: {
        logic: 'AND',
        conditions: [],
      },
    });
  };

  const handleTogglePin = (filter: SavedFilter) => {
    updateFilterMutation.mutate({
      filterId: filter.id,
      updates: { isPinned: !filter.isPinned },
    });
  };

  const handleTogglePublic = (filter: SavedFilter) => {
    updateFilterMutation.mutate({
      filterId: filter.id,
      updates: { isPublic: !filter.isPublic },
    });
  };

  const handleClone = (filter: SavedFilter) => {
    cloneFilterMutation.mutate({
      filterId: filter.id,
      name: `${filter.name} (Copy)`,
    });
  };

  const handleDelete = () => {
    if (selectedFilter) {
      deleteFilterMutation.mutate(selectedFilter.id);
    }
  };

  const handleUseTemplate = (template: any) => {
    toast.info(`Using template "${template.name}" - Full builder coming soon!`);
  };

  const getFilterTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      projects: 'bg-blue-500',
      tasks: 'bg-green-500',
      users: 'bg-purple-500',
      messages: 'bg-yellow-500',
      files: 'bg-pink-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <LazyDashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate({ to: '/dashboard/settings' })} variant='ghost' size='sm'>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Settings
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Filter className="h-8 w-8" /> Advanced Filters
              </h1>
              <p className="text-muted-foreground">
                Create, save, and manage custom filters
              </p>
            </div>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Filter
          </Button>
        </div>

        <Tabs defaultValue="saved" className="space-y-6">
          <TabsList>
            <TabsTrigger value="saved">
              <Star className="h-4 w-4 mr-2" />
              Saved Filters
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Filter className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Type Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Label>Filter by type:</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="users">Users</SelectItem>
                    <SelectItem value="messages">Messages</SelectItem>
                    <SelectItem value="files">Files</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Saved Filters Tab */}
          <TabsContent value="saved" className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    Loading filters...
                  </div>
                </CardContent>
              </Card>
            ) : filters.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">No saved filters</p>
                    <p className="text-muted-foreground mb-4">
                      Create your first filter to get started
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filters.map((filter: SavedFilter) => (
                  <Card key={filter.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{filter.name}</CardTitle>
                            {filter.isPinned && (
                              <Pin className="h-4 w-4 text-primary fill-current" />
                            )}
                          </div>
                          {filter.description && (
                            <CardDescription>{filter.description}</CardDescription>
                          )}
                        </div>
                        <Badge className={getFilterTypeBadge(filter.filterType)}>
                          {filter.filterType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Used {filter.usageCount} times</span>
                          {filter.lastUsed && (
                            <span>Last used {new Date(filter.lastUsed).toLocaleDateString()}</span>
                          )}
                        </div>

                        {/* Switches */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`pin-${filter.id}`}
                              checked={filter.isPinned}
                              onCheckedChange={() => handleTogglePin(filter)}
                            />
                            <Label htmlFor={`pin-${filter.id}`} className="text-sm">
                              Pin
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`public-${filter.id}`}
                              checked={filter.isPublic}
                              onCheckedChange={() => handleTogglePublic(filter)}
                            />
                            <Label htmlFor={`public-${filter.id}`} className="text-sm flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Share
                            </Label>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleClone(filter)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Clone
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedFilter(filter);
                              setIsDeleteDialogOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            {templates.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    No templates available for this type
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template: any) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription>{template.description}</CardDescription>
                        </div>
                        <Badge className={getFilterTypeBadge(template.filterType)}>
                          {template.filterType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => handleUseTemplate(template)} className="w-full">
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Filter Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Filter</DialogTitle>
              <DialogDescription>
                Create a custom filter to organize and find your data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="filterName">Filter Name *</Label>
                <Input
                  id="filterName"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="My Custom Filter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterDescription">Description</Label>
                <Input
                  id="filterDescription"
                  value={filterDescription}
                  onChange={(e) => setFilterDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterType">Filter Type *</Label>
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger id="filterType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="users">Users</SelectItem>
                    <SelectItem value="messages">Messages</SelectItem>
                    <SelectItem value="files">Files</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="isPublic" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Share with workspace
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFilter} disabled={createFilterMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Filter?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedFilter?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </LazyDashboardLayout>
  );
}
