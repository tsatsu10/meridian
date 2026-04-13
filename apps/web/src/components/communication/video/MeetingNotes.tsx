import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileText,
  Save,
  Download,
  Share2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Eye,
  Edit,
  Clock,
  User,
  Search,
  Tag,
  Pin,
  Archive,
  Trash2,
  Copy,
  Plus,
  Minus,
  CheckSquare,
  Square
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface MeetingNote {
  id: string;
  callId: string;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  collaborators: string[];
  actionItems: ActionItem[];
  version: number;
  versions: NoteVersion[];
}

interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
}

interface NoteVersion {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
  changes: string;
}

interface MeetingNotesProps {
  callId: string;
  currentUserId: string;
  participants: string[];
  onSaveNotes: (notes: MeetingNote) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function MeetingNotes({
  callId,
  currentUserId,
  participants,
  onSaveNotes,
  isVisible,
  onClose
}: MeetingNotesProps) {
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newActionItem, setNewActionItem] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Load existing notes for the call
  useEffect(() => {
    loadNotesForCall();
  }, [callId]);

  const loadNotesForCall = () => {
    // In real implementation, this would load from API
    const stored = localStorage.getItem(`meeting-notes-${callId}`);
    if (stored) {
      const parsedNotes = JSON.parse(stored).map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
        actionItems: note.actionItems?.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined
        })) || [],
        versions: note.versions?.map((v: any) => ({
          ...v,
          timestamp: new Date(v.timestamp)
        })) || []
      }));
      setNotes(parsedNotes);
      
      // Set active note to the most recent one
      if (parsedNotes.length > 0) {
        const mostRecent = parsedNotes[0];
        setActiveNoteId(mostRecent.id);
        setTitle(mostRecent.title);
        setContent(mostRecent.content);
        setTags(mostRecent.tags);
        setActionItems(mostRecent.actionItems);
      }
    }
  };

  const saveNotes = () => {
    const noteId = activeNoteId || `note-${Date.now()}`;
    const now = new Date();
    
    const existingNote = notes.find(n => n.id === noteId);
    const newNote: MeetingNote = {
      id: noteId,
      callId,
      title: title || `Meeting Notes - ${now.toLocaleDateString()}`,
      content,
      author: currentUserId,
      createdAt: existingNote?.createdAt || now,
      updatedAt: now,
      tags,
      isPinned: existingNote?.isPinned || false,
      isArchived: existingNote?.isArchived || false,
      collaborators: participants,
      actionItems,
      version: (existingNote?.version || 0) + 1,
      versions: [
        ...(existingNote?.versions || []),
        {
          id: `version-${Date.now()}`,
          content,
          author: currentUserId,
          timestamp: now,
          changes: existingNote ? 'Updated content' : 'Initial version'
        }
      ]
    };

    const updatedNotes = existingNote 
      ? notes.map(n => n.id === noteId ? newNote : n)
      : [newNote, ...notes];
    
    setNotes(updatedNotes);
    setActiveNoteId(noteId);
    
    // Save to localStorage
    localStorage.setItem(`meeting-notes-${callId}`, JSON.stringify(updatedNotes));
    
    onSaveNotes(newNote);
    toast.success('Notes saved successfully');
  };

  const createNewNote = () => {
    setActiveNoteId(null);
    setTitle('');
    setContent('');
    setTags([]);
    setActionItems([]);
    setIsEditing(true);
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addActionItem = () => {
    if (newActionItem) {
      const newItem: ActionItem = {
        id: `action-${Date.now()}`,
        text: newActionItem,
        completed: false,
        createdAt: new Date()
      };
      setActionItems([...actionItems, newItem]);
      setNewActionItem('');
    }
  };

  const toggleActionItem = (itemId: string) => {
    setActionItems(actionItems.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  const removeActionItem = (itemId: string) => {
    setActionItems(actionItems.filter(item => item.id !== itemId));
  };

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newText);
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const exportNotes = (format: 'md' | 'txt' | 'pdf') => {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    let exportContent = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'md':
        exportContent = `# ${activeNote.title}\n\n${activeNote.content}\n\n## Action Items\n${actionItems.map(item => `- [${item.completed ? 'x' : ' '}] ${item.text}`).join('\n')}`;
        filename = `${activeNote.title.replace(/\s+/g, '-')}.md`;
        mimeType = 'text/markdown';
        break;
      case 'txt':
        exportContent = `${activeNote.title}\n${'='.repeat(activeNote.title.length)}\n\n${activeNote.content}\n\nAction Items:\n${actionItems.map(item => `- ${item.completed ? '[DONE] ' : ''}${item.text}`).join('\n')}`;
        filename = `${activeNote.title.replace(/\s+/g, '-')}.txt`;
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Notes exported as ${format.toUpperCase()}`);
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => note.tags.includes(tag));
    return matchesSearch && matchesTags && !note.isArchived;
  });

  const allTags = [...new Set(notes.flatMap(note => note.tags))];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-7xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-lg shadow-xl">
        <div className="flex h-full">
          {/* Sidebar - Notes List */}
          <div className="w-80 border-r bg-gray-50 dark:bg-gray-800 flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Meeting Notes</h3>
                <Button size="sm" onClick={createNewNote}>
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </div>
              
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8"
                />
              </div>
              
              {/* Tag Filter */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedTags(prev => 
                          prev.includes(tag) 
                            ? prev.filter(t => t !== tag)
                            : [...prev, tag]
                        );
                      }}
                      className={cn(
                        "px-2 py-1 text-xs rounded-full transition-colors",
                        selectedTags.includes(tag)
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Notes List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotes.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notes yet</p>
                </div>
              ) : (
                filteredNotes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => {
                      setActiveNoteId(note.id);
                      setTitle(note.title);
                      setContent(note.content);
                      setTags(note.tags);
                      setActionItems(note.actionItems);
                      setIsEditing(false);
                    }}
                    className={cn(
                      "w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b transition-colors",
                      activeNoteId === note.id && "bg-blue-50 dark:bg-blue-900/20 border-blue-200"
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">{note.title}</h4>
                      {note.isPinned && <Pin className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                      {note.content.substring(0, 80)}...
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{note.updatedAt.toLocaleDateString()}</span>
                      <span>{note.actionItems.filter(a => !a.completed).length} actions</span>
                    </div>
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-semibold">Meeting Notes</span>
                  {activeNoteId && (
                    <Badge variant="outline">
                      v{notes.find(n => n.id === activeNoteId)?.version}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                    {showPreview ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPreview ? 'Edit' : 'Preview'}
                  </Button>
                  <Button size="sm" onClick={saveNotes}>
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  {activeNoteId && (
                    <div className="relative">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Export
                      </Button>
                      {/* Export menu would go here */}
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={onClose}>
                    ✕
                  </Button>
                </div>
              </div>
              
              {/* Title Input */}
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                className="mt-3 font-medium"
              />
              
              {/* Tags */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="h-6 text-xs w-20"
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button size="sm" variant="ghost" onClick={addTag} className="h-6 w-6 p-0">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            {!showPreview && (
              <div className="p-2 border-b bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => insertText('**', '**')}>
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => insertText('_', '_')}>
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => insertText('- ')}>
                    <List className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => insertText('1. ')}>
                    <ListOrdered className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => insertText('> ')}>
                    <Quote className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => insertText('`', '`')}>
                    <Code className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 p-4 overflow-hidden">
              <div className="flex gap-4 h-full">
                {/* Text Editor */}
                <div className="flex-1">
                  {showPreview ? (
                    <div className="h-full overflow-y-auto prose max-w-none">
                      <div dangerouslySetInnerHTML={{ 
                        __html: content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/_(.*?)_/g, '<em>$1</em>')
                      }} />
                    </div>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Start writing your meeting notes..."
                      className="w-full h-full resize-none border rounded-lg p-3 font-mono text-sm"
                    />
                  )}
                </div>

                {/* Action Items Panel */}
                <div className="w-80 border-l pl-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Action Items</h4>
                    <Badge variant="outline">
                      {actionItems.filter(item => !item.completed).length} pending
                    </Badge>
                  </div>
                  
                  {/* Add Action Item */}
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newActionItem}
                      onChange={(e) => setNewActionItem(e.target.value)}
                      placeholder="Add action item..."
                      className="h-8 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addActionItem()}
                    />
                    <Button size="sm" onClick={addActionItem} className="h-8 w-8 p-0">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Action Items List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {actionItems.map(item => (
                      <div key={item.id} className="flex items-start gap-2 group">
                        <button
                          onClick={() => toggleActionItem(item.id)}
                          className="mt-0.5"
                        >
                          {item.completed ? (
                            <CheckSquare className="w-4 h-4 text-green-500" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm",
                            item.completed && "line-through text-gray-500"
                          )}>
                            {item.text}
                          </p>
                          {item.assignee && (
                            <p className="text-xs text-gray-500">
                              Assigned to: {item.assignee}
                            </p>
                          )}
                          {item.dueDate && (
                            <p className="text-xs text-gray-500">
                              Due: {item.dueDate.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeActionItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}