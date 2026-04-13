/**
 * Project Notes Page - Phase 5.2
 * Main page for project notes with list, editor, version history, and comments
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import { NotesList } from '@/components/project-notes/notes-list';
import { NoteEditor } from '@/components/project-notes/note-editor';
import { VersionHistory } from '@/components/project-notes/version-history';
import { NoteComments } from '@/components/project-notes/note-comments';

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

type ViewMode = 'list' | 'editor' | 'versions' | 'comments';

export const Route = createFileRoute(
  '/dashboard/workspace/$workspaceId/project/$projectId/notes'
)({
  component: ProjectNotesPage,
});

function ProjectNotesPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = useState<ProjectNote | null>(null);

  const handleSelectNote = (note: ProjectNote) => {
    setSelectedNote(note);
    setViewMode('editor');
  };

  const handleCreateNote = () => {
    setSelectedNote(null);
    setViewMode('editor');
  };

  const handleSaveNote = (note: ProjectNote) => {
    setSelectedNote(note);
    // Optionally refresh the list or stay in editor
  };

  const handleBackToList = () => {
    setSelectedNote(null);
    setViewMode('list');
  };

  const handleShowVersions = () => {
    setViewMode('versions');
  };

  const handleShowComments = () => {
    setViewMode('comments');
  };

  return (
    <div className="p-6">
      {viewMode === 'list' && (
        <NotesList
          projectId={projectId}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
        />
      )}

      {viewMode === 'editor' && (
        <NoteEditor
          projectId={projectId}
          note={selectedNote}
          onSave={handleSaveNote}
          onCancel={handleBackToList}
          onShowVersions={handleShowVersions}
          onShowComments={handleShowComments}
        />
      )}

      {viewMode === 'versions' && selectedNote && (
        <VersionHistory noteId={selectedNote.id} onClose={() => setViewMode('editor')} />
      )}

      {viewMode === 'comments' && selectedNote && (
        <NoteComments
          noteId={selectedNote.id}
          currentUserEmail={user?.email}
          onClose={() => setViewMode('editor')}
        />
      )}
    </div>
  );
}
