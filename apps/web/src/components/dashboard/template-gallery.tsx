/**
 * Dashboard Template Gallery Component - Phase 4.6
 * Allows users to browse, preview, create, and apply dashboard templates
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  LayoutGrid,
  Plus,
  Eye,
  Copy,
  Trash2,
  Download,
  Globe,
  Lock,
  Star,
  TrendingUp,
} from 'lucide-react';
import { API_BASE_URL } from '@/constants/urls';
import { useUserStore } from '@/store/user';

interface DashboardTemplate {
  id: string;
  name: string;
  description?: string | null;
  workspaceId?: string | null;
  isGlobal: boolean;
  isPublic: boolean;
  layout: any;
  widgets: any;
  gridConfig?: any;
  category?: string | null;
  tags?: string[] | null;
  thumbnail?: string | null;
  usageCount: number;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

interface TemplateGalleryProps {
  workspaceId: string;
  onApplyTemplate?: (template: DashboardTemplate) => void;
}

export function TemplateGallery({ workspaceId, onApplyTemplate }: TemplateGalleryProps) {
  const { user } = useUserStore();
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);
  
  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [isPublicTemplate, setIsPublicTemplate] = useState(false);

  // Load templates
  useEffect(() => {
    fetchTemplates();
  }, [workspaceId]);

  // Filter templates
  useEffect(() => {
    let filtered = templates;
    
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    setFilteredTemplates(filtered);
  }, [templates, searchQuery, categoryFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/settings/dashboard-templates/${workspaceId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load dashboard templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/settings/dashboard-templates/${workspaceId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          layout: { type: 'grid', columns: 12 }, // Default layout
          widgets: [], // Empty widget array
          gridConfig: { columns: 12, rowHeight: 30, gap: 16 },
          category: templateCategory || 'General',
          tags: [],
          isPublic: isPublicTemplate,
        }),
      });

      if (!response.ok) throw new Error('Failed to create template');

      const data = await response.json();
      toast.success('Dashboard template created successfully');
      setTemplates([...templates, data.data]);
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Failed to create dashboard template');
    }
  };

  const handleCloneTemplate = async (template: DashboardTemplate) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/settings/dashboard-templates/${workspaceId}/${template.id}/clone`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to clone template');

      const data = await response.json();
      toast.success('Template cloned successfully');
      setTemplates([...templates, data.data]);
    } catch (error) {
      console.error('Failed to clone template:', error);
      toast.error('Failed to clone template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/settings/dashboard-templates/${workspaceId}/${templateId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to delete template');

      toast.success('Template deleted successfully');
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handlePreviewTemplate = (template: DashboardTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handleApplyTemplate = (template: DashboardTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
      toast.success(`Applied template: ${template.name}`);
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('');
    setIsPublicTemplate(false);
  };

  const categories = Array.from(new Set(templates.map(t => t.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" />
            Dashboard Templates
          </h2>
          <p className="text-muted-foreground mt-1">
            Create, browse, and apply custom dashboard layouts
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category!}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No templates found</p>
          <Button variant="outline" className="mt-4" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">{template.description}</CardDescription>
                  </div>
                  {template.isPublic ? (
                    <Globe className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {template.category && (
                    <Badge variant="secondary">{template.category}</Badge>
                  )}
                  {template.usageCount > 10 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Popular
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Thumbnail */}
                {template.thumbnail ? (
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-32 object-cover rounded-md mb-4"
                  />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-md mb-4 flex items-center justify-center">
                    <LayoutGrid className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCloneTemplate(template)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <Button
                  className="w-full mt-2"
                  onClick={() => handleApplyTemplate(template)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Apply Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Dashboard Template</DialogTitle>
            <DialogDescription>
              Create a new dashboard template to organize your widgets and layout
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="My Custom Dashboard"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Describe your dashboard layout..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-category">Category</Label>
              <Input
                id="template-category"
                placeholder="e.g., Analytics, Project Management"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="public-template"
                checked={isPublicTemplate}
                onChange={(e) => setIsPublicTemplate(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="public-template" className="cursor-pointer">
                Make template public (share with others)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              {/* Template Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.category || 'General'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Usage Count</p>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.usageCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Visibility</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.isPublic ? 'Public' : 'Private'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Widgets</p>
                  <p className="text-sm text-muted-foreground">
                    {Array.isArray(selectedTemplate.widgets) ? selectedTemplate.widgets.length : 0}{' '}
                    widgets
                  </p>
                </div>
              </div>
              
              {/* Thumbnail */}
              {selectedTemplate.thumbnail ? (
                <img
                  src={selectedTemplate.thumbnail}
                  alt={selectedTemplate.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                  <LayoutGrid className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplate) {
                  handleApplyTemplate(selectedTemplate);
                  setPreviewDialogOpen(false);
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

