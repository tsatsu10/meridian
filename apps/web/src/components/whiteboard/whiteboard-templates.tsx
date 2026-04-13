/**
 * Whiteboard Templates Component
 * Browse and use whiteboard templates
 * Phase 4.2 - Whiteboard Collaboration
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Search,
  Grid,
  Users,
  Lightbulb,
  GitBranch,
  LayoutTemplate,
  TrendingUp,
  Calendar,
  Plus,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string | null;
  usageCount: number;
  isPublic: boolean;
}

interface WhiteboardTemplatesProps {
  workspaceId?: string;
  onSelectTemplate: (templateId: string) => void;
  onCreateBlank: () => void;
}

export function WhiteboardTemplates({
  workspaceId,
  onSelectTemplate,
  onCreateBlank,
}: WhiteboardTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [workspaceId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const url = workspaceId
        ? `/api/whiteboard/templates?workspaceId=${workspaceId}`
        : '/api/whiteboard/templates';

      const response = await fetch(url);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'brainstorm', name: 'Brainstorm', icon: Lightbulb, color: 'text-yellow-600' },
    { id: 'planning', name: 'Planning', icon: Calendar, color: 'text-blue-600' },
    { id: 'design', name: 'Design', icon: LayoutTemplate, color: 'text-purple-600' },
    { id: 'retrospective', name: 'Retrospective', icon: TrendingUp, color: 'text-green-600' },
    { id: 'flowchart', name: 'Flowchart', icon: GitBranch, color: 'text-red-600' },
    { id: 'workshop', name: 'Workshop', icon: Users, color: 'text-indigo-600' },
  ];

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTemplateIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat || categories[0];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Loading templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Choose a Template</h2>
        <p className="text-gray-600">
          Start with a blank canvas or use a pre-built template for common workflows
        </p>
      </div>

      {/* Blank Canvas Option */}
      <Card
        className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-blue-300 bg-blue-50/50"
        onClick={onCreateBlank}
      >
        <CardContent className="p-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Blank Canvas</h3>
              <p className="text-sm text-gray-600">
                Start with an empty whiteboard and create from scratch
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search & Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setSelectedCategory(null)}
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
          >
            All
          </Button>
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
              >
                <Icon className={`w-4 h-4 mr-2 ${selectedCategory === cat.id ? 'text-white' : cat.color}`} />
                {cat.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Grid className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-600">No templates found</p>
            <p className="text-sm text-gray-500 mt-2">
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or filters'
                : 'Create your first template from a whiteboard'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const catInfo = getTemplateIcon(template.category);
            const Icon = catInfo.icon;

            return (
              <Card
                key={template.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onSelectTemplate(template.id)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Icon className={`w-12 h-12 ${catInfo.color}`} />
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className="absolute top-2 right-2">
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Icon className={`w-3 h-3 ${catInfo.color}`} />
                      <span className="text-xs font-medium text-gray-700">
                        {catInfo.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{template.name}</h3>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{template.usageCount} uses</span>
                    </div>
                    {template.isPublic && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Public
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

