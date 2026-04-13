/**
 * Notes List Component - Phase 5.2
 * Displays all notes for a project with search, filter, and grid/list views
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Archive,
  Clock,
  MessageSquare,
  Grid3X3,
  List,
  Edit,
  Trash2,
} from 'lucide-react';
import { API_BASE_URL } from '@/constants/urls';
import { formatDistanceToNow } from 'date-fns';

interface ProjectNote {
  id: string;
  projectId: string;
  title: string;
  content?: string | null;
  createdBy: string;
  lastEditedBy?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  tags?: string[] | null;
  createdAt: string;
  updatedAt?: string | null;
}

interface NotesListProps {
  projectId: string;
  onSelectNote?: (note: ProjectNote) => void;
  onCreateNote?: () => void;
}

export function NotesList({ projectId, onSelectNote, onCreateNote }: NotesListProps) {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchNotes();
  }, [projectId, showArchived]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredNotes(
        notes.filter(
          (note) =>
            note.title.toLowerCase().includes(query) ||
            note.content?.toLowerCase().includes(query) ||
            note.tags?.some((tag) => tag.toLowerCase().includes(query))
        )
      );
    } else {
      setFilteredNotes(notes);
    }
  }, [notes, searchQuery]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const url = `${API_BASE_URL}/project-notes/projects/${projectId}/notes?includeArchived=${showArchived}`;
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch notes');

      const data = await response.json();
      setNotes(data.data || []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handlePinNote = async (noteId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/project-notes/notes/${noteId}/pin`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to pin note');

      toast.success('Note pin status updated');
      fetchNotes();
    } catch (error) {
      console.error('Failed to pin note:', error);
      toast.error('Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/project-notes/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete note');

      toast.success('Note deleted successfully');
      fetchNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    }
  };

  const truncateContent = (content: string | null | undefined, maxLength = 150) => {
    if (!content) return 'No content';
    const stripped = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
    return stripped.length > maxLength ? stripped.substring(0, maxLength) + '...' : stripped;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Project Notes
          </h2>
          <p className="text-muted-foreground mt-1">
            Collaborative documentation and meeting notes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </Button>
          <Button onClick={onCreateNote}>
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="w-4 h-4 mr-2" />
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </Button>
      </div>

      {/* Notes Grid/List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading notes...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No notes found</p>
          <Button variant="outline" className="mt-4" onClick={onCreateNote}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Note
          </Button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              className={`hover:shadow-lg transition-shadow cursor-pointer ${
                note.isPinned ? 'border-primary' : ''
              }`}
              onClick={() => onSelectNote && onSelectNote(note)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {note.isPinned && <Pin className="w-4 h-4 text-primary" />}
                      {note.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Updated {formatDistanceToNow(new Date(note.updatedAt || note.createdAt))} ago
                    </CardDescription>
                  </div>
                </div>

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {note.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                    {note.tags.length > 3 && (
                      <Badge variant="outline">+{note.tags.length - 3}</Badge>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {truncateContent(note.content)}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(note.createdAt))}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      0
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePinNote(note.id)}
                    >
                      <Pin
                        className={`w-4 h-4 ${note.isPinned ? 'fill-current text-primary' : ''}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSelectNote && onSelectNote(note)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

