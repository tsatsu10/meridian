// @epic-3.5-communication: Modal for creating new channels
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { Hash, Lock, FolderOpen, Megaphone } from "lucide-react";

interface CreateChannelData {
  name: string;
  description?: string;
  type: 'public' | 'private' | 'project' | 'announcement';
  workspaceId: string;
}

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onCreateChannel: (channelData: CreateChannelData) => Promise<void>;
  workspaceId?: string;
}

export function CreateChannelModal({
  open,
  onClose,
  onCreateChannel,
  workspaceId
}: CreateChannelModalProps) {
  const [formData, setFormData] = useState<Omit<CreateChannelData, 'workspaceId'>>({
    name: '',
    description: '',
    type: 'public'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Channel name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Channel name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Channel name must be less than 50 characters';
    } else if (!/^[a-z0-9-_]+$/.test(formData.name)) {
      newErrors.name = 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !workspaceId) return;

    setIsLoading(true);
    try {
      await onCreateChannel({
        ...formData,
        workspaceId
      });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'public'
      });
      setErrors({});
      onClose();
    } catch (error) {
      setErrors({ submit: 'Failed to create channel. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatChannelName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-');
  };

  const channelTypes = [
    {
      value: 'public',
      label: 'Public Channel',
      description: 'Anyone in the workspace can join',
      icon: Hash
    },
    {
      value: 'private',
      label: 'Private Channel',
      description: 'Only invited members can join',
      icon: Lock
    },
    {
      value: 'project',
      label: 'Project Channel',
      description: 'Linked to a specific project',
      icon: FolderOpen
    },
    {
      value: 'announcement',
      label: 'Announcement',
      description: 'Only admins can post messages',
      icon: Megaphone
    }
  ];

  const selectedChannelType = channelTypes.find(t => t.value === formData.type);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-hidden gap-0 flex items-center justify-center p-0">
        <div className="w-full max-w-[600px] mx-auto">
          <div className="p-8 space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <DialogTitle className="text-3xl font-bold gradient-text flex items-center space-x-3">
                <Hash className="h-6 w-6 text-blue-600" />
                <span>Create New Channel</span>
              </DialogTitle>
              <DialogDescription className="text-lg">
                Create a new channel for your team to collaborate in.
              </DialogDescription>
            </div>

            <div className="max-h-[70vh] overflow-y-auto space-y-8 pr-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-none">
                {/* Channel Type */}
                <div className="space-y-6">
                  <div className="flex items-center justify-start space-x-3">
                    <Hash className="h-5 w-5 text-blue-600" />
                    <h3 className="text-xl font-semibold">Channel Type</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="type" className="text-sm font-medium flex items-center">
                      Type
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: CreateChannelData['type']) => 
                        handleInputChange('type', value)
                      }
                    >
                      <SelectTrigger className="glass-card h-11">
                        <SelectValue placeholder="Select channel type" />
                      </SelectTrigger>
                      <SelectContent className="glass-card">
                        {channelTypes.map((type) => {
                          const IconComponent = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center space-x-3">
                                <IconComponent className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-xs text-muted-foreground">{type.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Channel Details */}
                <div className="space-y-6">
                  <div className="flex items-center justify-start space-x-3">
                    <selectedChannelType.icon className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-xl font-semibold">Channel Details</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Channel Name */}
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-sm font-medium flex items-center">
                        Channel Name *
                      </Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <selectedChannelType.icon className="h-4 w-4" />
                        </div>
                        <Input
                          id="name"
                          placeholder="e.g. general, random, project-alpha"
                          value={formData.name}
                          onChange={(e) => {
                            const formatted = formatChannelName(e.target.value);
                            handleInputChange('name', formatted);
                          }}
                          className={cn(
                            "pl-10 glass-card h-11 w-full",
                            errors.name && "border-red-500"
                          )}
                          maxLength={50}
                        />
                      </div>
                      {errors.name && (
                        <p className="text-sm text-red-500">{errors.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Channel names must be lowercase and can contain letters, numbers, hyphens, and underscores.
                      </p>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                      <Label htmlFor="description" className="text-sm font-medium flex items-center">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="What is this channel about?"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className={cn(
                          "resize-none glass-card w-full min-h-[90px]",
                          errors.description && "border-red-500"
                        )}
                        rows={3}
                        maxLength={200}
                      />
                      {errors.description && (
                        <p className="text-sm text-red-500">{errors.description}</p>
                      )}
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Help others understand what this channel is for</span>
                        <span>{formData.description?.length || 0}/200</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {formData.name && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-start space-x-3">
                      <selectedChannelType.icon className="h-5 w-5 text-purple-600" />
                      <h3 className="text-xl font-semibold">Preview</h3>
                    </div>
                    
                    <div className="p-4 glass-card rounded-lg border border-border/50">
                      <div className="flex items-center space-x-3">
                        <selectedChannelType.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formData.name}</span>
                      </div>
                      {formData.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {formData.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Error */}
                {errors.submit && (
                  <div className="p-4 glass-card border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                  </div>
                )}

                <DialogFooter className="flex justify-between pt-6">
                  <div className="flex space-x-3 w-full justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isLoading}
                      className="glass-card"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={isLoading || !formData.name.trim()}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6"
                    >
                      {isLoading ? 'Creating...' : 'Create Channel'}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 