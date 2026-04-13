import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateArticle } from "@/hooks/mutations/help/use-create-article";
import { useUpdateArticle } from "@/hooks/mutations/help/use-update-article";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  category: string;
  difficulty: string;
  contentType: string;
  readTime: number;
  tags: string[];
  isPublished: boolean;
}

interface ArticleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: HelpArticle | null;
}

export function ArticleModal({ open, onOpenChange, article }: ArticleModalProps) {
  const isEditing = !!article;
  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    content: "",
    category: "getting-started",
    difficulty: "beginner",
    contentType: "article",
    readTime: 5,
    tags: [] as string[],
    isPublished: false,
  });

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title,
        slug: article.slug,
        description: article.description,
        content: article.content,
        category: article.category,
        difficulty: article.difficulty,
        contentType: article.contentType,
        readTime: article.readTime,
        tags: Array.isArray(article.tags) ? article.tags : [],
        isPublished: article.isPublished,
      });
    } else {
      // Reset form for new article
      setFormData({
        title: "",
        slug: "",
        description: "",
        content: "",
        category: "getting-started",
        difficulty: "beginner",
        contentType: "article",
        readTime: 5,
        tags: [],
        isPublished: false,
      });
    }
  }, [article, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && article) {
      await updateMutation.mutateAsync({
        id: article.id,
        data: formData,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }

    onOpenChange(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Article" : "Create New Article"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to your article. Click save when you're done."
              : "Fill in the details to create a new help article."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter article title..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="getting-started">Getting Started</SelectItem>
                  <SelectItem value="features">Features</SelectItem>
                  <SelectItem value="integrations">Integrations</SelectItem>
                  <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                  <SelectItem value="best-practices">Best Practices</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type</Label>
              <Select
                value={formData.contentType}
                onValueChange={(value) => setFormData({ ...formData, contentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="faq">FAQ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="readTime">Read Time (minutes)</Label>
              <Input
                id="readTime"
                type="number"
                min="1"
                value={formData.readTime}
                onChange={(e) =>
                  setFormData({ ...formData, readTime: parseInt(e.target.value) || 5 })
                }
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the article..."
                rows={2}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="content">Content (Markdown) *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="# Article Content&#10;&#10;Write your content here using Markdown formatting..."
                rows={10}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                Supports Markdown: **bold**, *italic*, `code`, [links](url), images, tables, etc.
              </p>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="pl-2 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 col-span-2">
              <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPublished: checked })
                }
              />
              <Label htmlFor="isPublished" className="cursor-pointer">
                Publish immediately
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Create Article"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
