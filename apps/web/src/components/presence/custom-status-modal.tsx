// @epic-4.2-presence: Custom status modal for enhanced presence system
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Smile,
  Clock,
  Calendar,
  Eye,
  EyeOff,
  X,
  Coffee,
  Laptop,
  Home,
  Plane,
  Umbrella,
  Heart,
  Star,
  Zap,
  Sun,
  Moon,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface CustomStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus?: {
    message?: string;
    emoji?: string;
    expiresAt?: Date;
    isVisible?: boolean;
  };
  onSave: (status: {
    message?: string;
    emoji?: string;
    expiresAt?: Date;
    isVisible?: boolean;
  }) => void;
  onClear: () => void;
  className?: string;
}

// Common status presets
const statusPresets = [
  { emoji: '💼', message: 'In a meeting', duration: 60 },
  { emoji: '🍕', message: 'Out for lunch', duration: 60 },
  { emoji: '🏠', message: 'Working from home', duration: 480 },
  { emoji: '✈️', message: 'Traveling', duration: 1440 },
  { emoji: '🤒', message: 'Out sick', duration: 480 },
  { emoji: '🎯', message: 'Focusing', duration: 120 },
  { emoji: '☕', message: 'On a coffee break', duration: 15 },
  { emoji: '📚', message: 'In training', duration: 240 },
  { emoji: '🎉', message: 'Celebrating', duration: 120 },
  { emoji: '🔧', message: 'In maintenance mode', duration: 240 },
];

// Quick emoji selector
const quickEmojis = [
  '😊', '😎', '🤔', '😴', '🎯', '💪', '🔥', '⚡', '🎉', '🚀',
  '💼', '📱', '💻', '☕', '🍕', '🏠', '✈️', '🌍', '📚', '🎧',
];

// Duration options in minutes
const durationOptions = [
  { label: 'Don\'t clear', value: null },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: '8 hours', value: 480 },
  { label: '24 hours', value: 1440 },
  { label: 'This week', value: 10080 },
];

export function CustomStatusModal({
  isOpen,
  onClose,
  currentStatus,
  onSave,
  onClear,
  className,
}: CustomStatusModalProps) {
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Initialize form with current status
  useEffect(() => {
    if (isOpen && currentStatus) {
      setMessage(currentStatus.message || '');
      setEmoji(currentStatus.emoji || '');
      setIsVisible(currentStatus.isVisible ?? true);
      
      // Calculate duration from expiration
      if (currentStatus.expiresAt) {
        const now = new Date();
        const expirationTime = new Date(currentStatus.expiresAt);
        const diffMinutes = Math.round((expirationTime.getTime() - now.getTime()) / (1000 * 60));
        setDuration(diffMinutes > 0 ? diffMinutes : null);
      } else {
        setDuration(null);
      }
    } else if (isOpen) {
      // Reset form for new status
      setMessage('');
      setEmoji('');
      setDuration(null);
      setIsVisible(true);
    }
  }, [isOpen, currentStatus]);

  const handlePresetClick = (preset: typeof statusPresets[0]) => {
    setEmoji(preset.emoji);
    setMessage(preset.message);
    setDuration(preset.duration);
  };

  const handleEmojiClick = (selectedEmoji: string) => {
    setEmoji(selectedEmoji);
    setShowEmojiPicker(false);
  };

  const handleSave = () => {
    const expiresAt = duration 
      ? new Date(Date.now() + duration * 60 * 1000)
      : undefined;

    onSave({
      message: message.trim() || undefined,
      emoji: emoji || undefined,
      expiresAt,
      isVisible,
    });
    
    onClose();
  };

  const handleClear = () => {
    onClear();
    setMessage('');
    setEmoji('');
    setDuration(null);
    setIsVisible(true);
    onClose();
  };

  const hasContent = message.trim() || emoji;
  const hasCurrentStatus = currentStatus?.message || currentStatus?.emoji;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-md", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smile className="w-5 h-5" />
            Set your status
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status Display */}
          {hasCurrentStatus && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{currentStatus?.emoji}</span>
                    <span className="text-sm font-medium">
                      {currentStatus?.message || 'Custom status'}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Current
                  </Badge>
                </div>
                {currentStatus?.expiresAt && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Expires {new Date(currentStatus.expiresAt).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Presets */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick presets</Label>
            <div className="grid grid-cols-1 gap-1">
              {statusPresets.slice(0, 6).map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetClick(preset)}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-lg">{preset.emoji}</span>
                  <span className="text-sm flex-1">{preset.message}</span>
                  <span className="text-xs text-muted-foreground">
                    {preset.duration >= 60 
                      ? `${preset.duration / 60}h`
                      : `${preset.duration}m`
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom Status Form */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Custom status</Label>
            
            {/* Emoji and Message Input */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="px-3 h-10 flex-shrink-0"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                {emoji || <Smile className="w-4 h-4" />}
              </Button>
              <Input
                placeholder="What's your status?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={100}
                className="flex-1"
              />
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <Card className="p-3">
                <div className="grid grid-cols-10 gap-1">
                  {quickEmojis.map((emojiOption) => (
                    <button
                      key={emojiOption}
                      onClick={() => handleEmojiClick(emojiOption)}
                      className="p-1 hover:bg-muted rounded text-lg"
                    >
                      {emojiOption}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Duration Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Clear after
              </Label>
              <Select
                value={duration?.toString() || 'null'}
                onValueChange={(value) => setDuration(value === 'null' ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem 
                      key={option.value?.toString() || 'null'} 
                      value={option.value?.toString() || 'null'}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Visible to others
              </Label>
              <Switch
                checked={isVisible}
                onCheckedChange={setIsVisible}
              />
            </div>

            {!isVisible && (
              <p className="text-xs text-muted-foreground">
                Your status will be hidden from other team members
              </p>
            )}
          </div>

          {/* Character Count */}
          {message && (
            <div className="text-right">
              <span className={cn(
                "text-xs",
                message.length > 80 ? "text-yellow-600" : "text-muted-foreground",
                message.length >= 100 ? "text-red-600" : ""
              )}>
                {message.length}/100
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {hasCurrentStatus && (
              <Button
                variant="outline"
                onClick={handleClear}
                className="flex-1"
              >
                Clear status
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasContent}
              className="flex-1"
            >
              {hasCurrentStatus ? 'Update status' : 'Set status'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CustomStatusModal;