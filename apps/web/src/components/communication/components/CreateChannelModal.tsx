import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Hash, Lock, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from "../../../lib/logger";

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  teamId?: string;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  open,
  onOpenChange,
  workspaceId,
  teamId
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
    inviteMembers: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!formData.name.trim()) {
      setErrors({ name: 'Channel name is required' });
      return;
    }

    if (formData.name.length < 3) {
      setErrors({ name: 'Channel name must be at least 3 characters' });
      return;
    }

    if (formData.name.length > 50) {
      setErrors({ name: 'Channel name must be less than 50 characters' });
      return;
    }

    // Check for invalid characters
    const invalidChars = /[^a-zA-Z0-9-_]/;
    if (invalidChars.test(formData.name)) {
      setErrors({ name: 'Channel name can only contain letters, numbers, hyphens, and underscores' });
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual API call
      logger.info("Creating channel:");
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        isPrivate: false,
        inviteMembers: []
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create channel:', error);
      setErrors({ submit: 'Failed to create channel. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatChannelName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Hash className="h-5 w-5" />
            <span>Create Channel</span>
          </DialogTitle>
          <DialogDescription>
            Create a new channel for your team to collaborate and communicate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., general, announcements, random"
                className={cn(
                  "pl-10",
                  errors.name && "border-red-500 focus:border-red-500"
                )}
                disabled={isLoading}
              />
            </div>
            {formData.name && (
              <div className="text-xs text-muted-foreground">
                Channel URL: {workspaceId && `meridian.com/${workspaceId}/${formatChannelName(formData.name)}`}
              </div>
            )}
            {errors.name && (
              <div className="text-xs text-red-500">{errors.name}</div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="What is this channel about?"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Privacy</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">Public</div>
                  <div className="text-sm text-muted-foreground">
                    Anyone in the workspace can view and join this channel
                  </div>
                </div>
                <Checkbox
                  checked={!formData.isPrivate}
                  onCheckedChange={(checked) => handleInputChange('isPrivate', !checked)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">Private</div>
                  <div className="text-sm text-muted-foreground">
                    Only invited members can view and join this channel
                  </div>
                </div>
                <Checkbox
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) => handleInputChange('isPrivate', checked)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm text-red-600">{errors.submit}</div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 