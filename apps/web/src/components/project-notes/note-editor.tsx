/**
 * Note Editor Component - Phase 5.2
 * Editor for creating and editing project notes
 * NOTE: Uses simple textarea for now - should be upgraded to TipTap/ProseMirror rich text editor
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, X, Pin, History, MessageSquare, Tag, Clock } from "lucide-react";
import { API_BASE_URL } from "@/constants/urls";
import { formatDistanceToNow } from "date-fns";

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

interface NoteEditorProps {
  projectId: string;
  note?: ProjectNote | null;
  onSave?: (note: ProjectNote) => void;
  onCancel?: () => void;
  onShowVersions?: () => void;
  onShowComments?: () => void;
}

export function NoteEditor({
  projectId,
  note,
  onSave,
  onCancel,
  onShowVersions,
  onShowComments,
}: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  void useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || "");
      setTags(note.tags || []);
      setIsPinned(note.isPinned);
    }
  }, [note]);

  // Auto-save functionality
  // biome-ignore lint/correctness/useExhaustiveDependencies: debounced autosave keyed on title/content; autoSaveTimeout is written here and note fields are read for change detection — adding them would reset/loop the timer
  useEffect(() => {
    if (note && (title !== note.title || content !== note.content)) {
      // Clear existing timeout
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }

      // Set new timeout for auto-save
      const timeout = setTimeout(() => {
        handleSave(true); // Silent save
      }, 2000); // Auto-save after 2 seconds of inactivity

      setAutoSaveTimeout(timeout);
    }

    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [title, content]);

  const handleSave = async (silent = false) => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    try {
      setSaving(true);

      let response: Response;
      if (note) {
        // Update existing note
        response = await fetch(
          `${API_BASE_URL}/project-notes/notes/${note.id}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              content,
              tags,
              isPinned,
            }),
          },
        );
      } else {
        // Create new note
        response = await fetch(
          `${API_BASE_URL}/project-notes/projects/${projectId}/notes`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              content,
              tags,
              isPinned,
            }),
          },
        );
      }

      if (!response.ok) throw new Error("Failed to save note");

      const data = await response.json();

      if (!silent) {
        toast.success(
          note ? "Note updated successfully" : "Note created successfully",
        );
      }

      if (onSave) {
        onSave(data.data);
      }
    } catch (error) {
      console.error("Failed to save note:", error);
      if (!silent) {
        toast.error("Failed to save note");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                {note ? "Edit Note" : "New Note"}
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              {note && (
                <>
                  <Button variant="outline" size="sm" onClick={onShowVersions}>
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Button>
                  <Button variant="outline" size="sm" onClick={onShowComments}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Comments
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsPinned(!isPinned)}
              >
                <Pin
                  className={`w-4 h-4 ${isPinned ? "fill-current text-primary" : ""}`}
                />
              </Button>
              <Button variant="outline" size="icon" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
              <Button onClick={() => handleSave()} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {note && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Last updated{" "}
                {formatDistanceToNow(
                  new Date(note.updatedAt || note.createdAt),
                )}{" "}
                ago
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Editor */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Input
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold border-0 px-0 focus-visible:ring-0"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-32 h-7 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Content Editor */}
          {/* See https://github.com/tsatsu10/meridian/issues/90 */}
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              placeholder="Start writing your note... (Markdown supported)"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
              }}
              className="min-h-[400px] resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💡 Tip: A rich text editor will be available soon. For now, you
              can use Markdown formatting.
            </p>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
            <div>
              {content.length} characters •{" "}
              {content.split(/\s+/).filter(Boolean).length} words
            </div>
            <div>Auto-saves every 2 seconds</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
