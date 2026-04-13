/**
 * @fileoverview Saved Search Queries Component
 * @description Allows users to save, manage, and quickly execute frequently used search queries
 * @author Claude Code Assistant
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bookmark, 
  Search, 
  Edit, 
  Trash2, 
  Plus,
  Clock,
  Star,
  Globe,
  Hash,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: string;
  isGlobal: boolean;
  channelId?: string;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
  isFavorite: boolean;
  tags: string[];
}

interface SavedSearchesProps {
  trigger?: React.ReactNode;
  onExecuteSearch?: (search: SavedSearch) => void;
  onSaveCurrentSearch?: (query: string, isGlobal: boolean, channelId?: string) => void;
  currentQuery?: string;
  currentChannelId?: string;
  className?: string;
}

export default function SavedSearches({
  trigger,
  onExecuteSearch,
  onSaveCurrentSearch,
  currentQuery = '',
  currentChannelId,
  className
}: SavedSearchesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Mock saved searches - in production this would come from backend/localStorage
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    {
      id: '1',
      name: 'Meeting Notes',
      description: 'Find all meeting notes and agendas',
      query: 'meeting notes OR agenda',
      isGlobal: true,
      createdAt: new Date('2024-01-15'),
      lastUsed: new Date('2024-01-20'),
      useCount: 25,
      isFavorite: true,
      tags: ['meetings', 'notes']
    },
    {
      id: '2',
      name: 'Sarah\'s Announcements',
      description: 'Important announcements from Sarah',
      query: 'from:sarah@company.com is:pinned',
      isGlobal: true,
      createdAt: new Date('2024-01-10'),
      lastUsed: new Date('2024-01-19'),
      useCount: 12,
      isFavorite: false,
      tags: ['announcements', 'pinned']
    },
    {
      id: '3',
      name: 'Project Deadlines',
      description: 'Messages about project deadlines and milestones',
      query: 'deadline OR milestone OR due date',
      isGlobal: false,
      channelId: 'project-alpha',
      createdAt: new Date('2024-01-12'),
      lastUsed: new Date('2024-01-18'),
      useCount: 8,
      isFavorite: true,
      tags: ['deadlines', 'projects']
    },
    {
      id: '4',
      name: 'Budget Discussions',
      description: 'Financial and budget related conversations',
      query: 'budget OR financial OR cost OR expense',
      isGlobal: true,
      createdAt: new Date('2024-01-08'),
      useCount: 5,
      isFavorite: false,
      tags: ['budget', 'finance']
    }
  ]);

  const [newSearch, setNewSearch] = useState({
    name: '',
    description: '',
    query: currentQuery,
    isGlobal: !currentChannelId,
    channelId: currentChannelId,
    tags: [] as string[],
  });

  // Filter saved searches based on search input
  const filteredSearches = savedSearches.filter(search =>
    search.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    search.query.toLowerCase().includes(searchFilter.toLowerCase()) ||
    search.tags.some(tag => tag.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  // Sort searches: favorites first, then by last used
  const sortedSearches = [...filteredSearches].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    if (a.lastUsed && b.lastUsed) {
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleExecuteSearch = (search: SavedSearch) => {
    // Update usage statistics
    setSavedSearches(prev => prev.map(s => 
      s.id === search.id 
        ? { ...s, lastUsed: new Date(), useCount: s.useCount + 1 }
        : s
    ));
    onExecuteSearch?.(search);
    setIsOpen(false);
  };

  const handleToggleFavorite = (searchId: string) => {
    setSavedSearches(prev => prev.map(s => 
      s.id === searchId ? { ...s, isFavorite: !s.isFavorite } : s
    ));
  };

  const handleDeleteSearch = (searchId: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== searchId));
  };

  const handleSaveSearch = () => {
    if (!newSearch.name.trim() || !newSearch.query.trim()) return;

    const search: SavedSearch = {
      id: Date.now().toString(),
      name: newSearch.name,
      description: newSearch.description,
      query: newSearch.query,
      isGlobal: newSearch.isGlobal,
      channelId: newSearch.channelId,
      createdAt: new Date(),
      useCount: 0,
      isFavorite: false,
      tags: newSearch.tags,
    };

    setSavedSearches(prev => [search, ...prev]);
    setNewSearch({
      name: '',
      description: '',
      query: currentQuery,
      isGlobal: !currentChannelId,
      channelId: currentChannelId,
      tags: [],
    });
    setIsCreateOpen(false);
  };

  const handleSaveCurrentSearch = () => {
    if (currentQuery.trim()) {
      setNewSearch(prev => ({
        ...prev,
        query: currentQuery,
        isGlobal: !currentChannelId,
        channelId: currentChannelId,
      }));
      setIsCreateOpen(true);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Bookmark className="h-4 w-4 mr-2" />
      Saved Searches
    </Button>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Saved Searches
              <Badge variant="secondary">{savedSearches.length} saved</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search saved queries..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                {currentQuery.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveCurrentSearch}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Save Current
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Search
                </Button>
              </div>
            </div>

            {/* Saved Searches List */}
            <ScrollArea className="h-96">
              {sortedSearches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No saved searches found</p>
                  <p className="text-sm">Save frequently used queries for quick access</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSearches.map((search) => (
                    <Card
                      key={search.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{search.name}</h3>
                              {search.isFavorite && (
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              )}
                              <Badge variant={search.isGlobal ? "default" : "secondary"} className="text-xs">
                                {search.isGlobal ? (
                                  <>
                                    <Globe className="h-3 w-3 mr-1" />
                                    Global
                                  </>
                                ) : (
                                  <>
                                    <Hash className="h-3 w-3 mr-1" />
                                    {search.channelId}
                                  </>
                                )}
                              </Badge>
                            </div>
                            
                            {search.description && (
                              <p className="text-sm text-muted-foreground">{search.description}</p>
                            )}
                            
                            <div className="font-mono text-sm bg-muted p-2 rounded">
                              {search.query}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {search.lastUsed ? (
                                  `Used ${formatDistanceToNow(search.lastUsed, { addSuffix: true })}`
                                ) : (
                                  `Created ${formatDistanceToNow(search.createdAt, { addSuffix: true })}`
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {search.useCount} uses
                              </div>
                            </div>

                            {search.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {search.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(search.id);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Star className={cn(
                                "h-4 w-4",
                                search.isFavorite ? "text-yellow-500 fill-current" : "text-muted-foreground"
                              )} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSearch(search);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSearch(search.id);
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleExecuteSearch(search)}
                            >
                              <Search className="h-4 w-4 mr-2" />
                              Execute
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Search Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Save Search Query
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Search Name</Label>
              <Input
                id="name"
                placeholder="e.g., Meeting Notes, Bug Reports..."
                value={newSearch.name}
                onChange={(e) => setNewSearch(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this search is for..."
                value={newSearch.description}
                onChange={(e) => setNewSearch(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <Textarea
                id="query"
                placeholder="Enter your search query with operators..."
                value={newSearch.query}
                onChange={(e) => setNewSearch(prev => ({ ...prev, query: e.target.value }))}
                rows={3}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                placeholder="meetings, notes, bugs (comma separated)"
                value={newSearch.tags.join(', ')}
                onChange={(e) => setNewSearch(prev => ({ 
                  ...prev, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Search scope: {newSearch.isGlobal ? 'All channels' : `#${newSearch.channelId}`}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSearch} disabled={!newSearch.name.trim() || !newSearch.query.trim()}>
                  Save Search
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}