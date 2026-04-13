import React, { useState } from 'react';
import { X, Hash, Lock, Users, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateChannel } from "@/hooks/use-channels";
import { CreateChannelData } from "@/hooks/use-channels";

interface ChannelActionsProps {
  onClose: () => void;
  onChannelCreated: () => void;
  workspaceId?: string;
}

export default function ChannelActions({ 
  onClose, 
  onChannelCreated,
  workspaceId = "default-workspace" // TODO: Get from context
}: ChannelActionsProps) {
  const [formData, setFormData] = useState<CreateChannelData>({
    name: '',
    description: '',
    type: 'team',
    workspaceId,
    isPrivate: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createChannelMutation = useCreateChannel();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Channel name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Channel name must be at least 2 characters';
    } else if (!/^[a-z0-9-_]+$/.test(formData.name)) {
      newErrors.name = 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores';
    }
    
    if (formData.description && formData.description.length > 250) {
      newErrors.description = 'Description must be 250 characters or less';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await createChannelMutation.mutateAsync(formData);
      onChannelCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create channel:', error);
      setErrors({ submit: 'Failed to create channel. Please try again.' });
    }
  };

  const handleNameChange = (value: string) => {
    // Auto-format name: lowercase, spaces to hyphens
    const formatted = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    setFormData(prev => ({ ...prev, name: formatted }));
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const channelTypes = [
    { value: 'team', label: 'Team Channel', icon: Users, description: 'For team discussions and collaboration' },
    { value: 'project', label: 'Project Channel', icon: Hash, description: 'For project-specific conversations' },
    { value: 'announcement', label: 'Announcement', icon: Globe, description: 'For important announcements' },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Create New Channel
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name *</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="e.g., team-general, project-alpha"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="pl-10"
                maxLength={50}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, hyphens, and underscores only
            </p>
          </div>

          {/* Channel Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Channel Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select channel type" />
              </SelectTrigger>
              <SelectContent>
                {channelTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {formData.isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                <Label htmlFor="private">
                  {formData.isPrivate ? 'Private Channel' : 'Public Channel'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.isPrivate 
                  ? 'Only invited members can see and join this channel'
                  : 'Anyone in the workspace can see and join this channel'
                }
              </p>
            </div>
            <Switch
              id="private"
              checked={formData.isPrivate}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this channel about?"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-[80px]"
              maxLength={250}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Help others understand the purpose of this channel</span>
              <span>{formData.description?.length || 0}/250</span>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={createChannelMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createChannelMutation.isPending || !formData.name.trim()}
            >
              {createChannelMutation.isPending ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 