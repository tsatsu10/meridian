import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Smile, X, Clock, Loader2 } from 'lucide-react';

// Popular emoji options
const EMOJI_OPTIONS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '💼', label: 'Working' },
  { emoji: '🏖️', label: 'On Vacation' },
  { emoji: '🤒', label: 'Sick' },
  { emoji: '🎯', label: 'Focused' },
  { emoji: '☕', label: 'On Break' },
  { emoji: '🍕', label: 'Lunch' },
  { emoji: '🏃', label: 'In a Rush' },
  { emoji: '🎉', label: 'Celebrating' },
  { emoji: '🔥', label: 'On Fire' },
  { emoji: '💪', label: 'Motivated' },
  { emoji: '🧘', label: 'Zen Mode' },
  { emoji: '🚀', label: 'Launching' },
  { emoji: '🎨', label: 'Creating' },
  { emoji: '📞', label: 'In a Call' },
  { emoji: '🌙', label: 'Night Owl' },
];

const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
  { value: 'today', label: 'Today' },
  { value: 'custom', label: 'Custom' },
  { value: 'none', label: "Don't clear" },
];

interface CustomStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserStatus {
  status: 'available' | 'in_meeting' | 'focus_mode' | 'away';
  statusMessage: string | null;
  emoji: string | null;
  expiresAt: string | null;
}

export function CustomStatusModal({ open, onOpenChange }: CustomStatusModalProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [duration, setDuration] = useState<string>('none');
  const [customDuration, setCustomDuration] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch current status
  const { data: currentStatus, isLoading: isLoadingStatus } = useQuery<{ success: boolean; data: UserStatus }>({
    queryKey: ['userStatus'],
    queryFn: async () => {
      const response = await fetch('/api/users/status/me', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    enabled: open,
  });

  // Load current status when modal opens
  useEffect(() => {
    if (open && currentStatus?.data) {
      setSelectedEmoji(currentStatus.data.emoji || '');
      setStatusMessage(currentStatus.data.statusMessage || '');
    }
  }, [open, currentStatus]);

  // Set status mutation
  const setStatusMutation = useMutation({
    mutationFn: async (data: { statusMessage: string; emoji: string; expiresIn?: number }) => {
      const response = await fetch('/api/users/status', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'available', // Default status
          statusMessage: data.statusMessage || undefined,
          emoji: data.emoji || undefined,
          expiresIn: data.expiresIn || undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to set status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStatus'] });
      onOpenChange(false);
    },
  });

  // Clear status mutation
  const clearStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/users/status', {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStatus'] });
      setSelectedEmoji('');
      setStatusMessage('');
      onOpenChange(false);
    },
  });

  const handleSave = () => {
    let expiresIn: number | undefined;

    if (duration === 'today') {
      // Calculate minutes until midnight
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      expiresIn = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60));
    } else if (duration === 'custom' && customDuration) {
      expiresIn = parseInt(customDuration, 10);
    } else if (duration !== 'none') {
      expiresIn = parseInt(duration, 10);
    }

    setStatusMutation.mutate({
      statusMessage,
      emoji: selectedEmoji,
      expiresIn,
    });
  };

  const handleClear = () => {
    clearStatusMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set a custom status</DialogTitle>
          <DialogDescription>
            Let your teammates know what you're up to
          </DialogDescription>
        </DialogHeader>

        {isLoadingStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Emoji Selection */}
            <div className="space-y-2">
              <Label>Emoji (optional)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedEmoji ? 'secondary' : 'outline'}
                  className="w-16 h-16 text-2xl"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  {selectedEmoji || <Smile className="h-6 w-6" />}
                </Button>
                {selectedEmoji && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedEmoji('')}
                    className="h-16"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="grid grid-cols-8 gap-2 p-4 border rounded-lg bg-muted/50 max-h-48 overflow-y-auto">
                  {EMOJI_OPTIONS.map((option) => (
                    <button
                      key={option.emoji}
                      type="button"
                      className="text-2xl hover:bg-accent rounded p-2 transition-colors"
                      onClick={() => {
                        setSelectedEmoji(option.emoji);
                        setShowEmojiPicker(false);
                      }}
                      title={option.label}
                    >
                      {option.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Message */}
            <div className="space-y-2">
              <Label htmlFor="status-message">What's your status?</Label>
              <Input
                id="status-message"
                placeholder="e.g., In a meeting, Working from home..."
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {statusMessage.length}/100 characters
              </p>
            </div>

            {/* Auto-clear Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Clear after</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.value !== 'none' && <Clock className="h-4 w-4" />}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom duration input */}
              {duration === 'custom' && (
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Minutes"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    min="1"
                    max="1440"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              )}
            </div>

            {/* Preview */}
            {(selectedEmoji || statusMessage) && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Preview</p>
                <div className="flex items-center gap-2">
                  {selectedEmoji && <span className="text-xl">{selectedEmoji}</span>}
                  <span className="text-sm font-medium">
                    {statusMessage || 'No status message'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={clearStatusMutation.isPending}
          >
            Clear Status
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={setStatusMutation.isPending || (!selectedEmoji && !statusMessage)}
          >
            {setStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact status display component for user menu
interface StatusDisplayProps {
  status?: UserStatus;
  onClick?: () => void;
}

export function StatusDisplay({ status, onClick }: StatusDisplayProps) {
  if (!status?.emoji && !status?.statusMessage) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Smile className="h-4 w-4" />
        <span>Set a status</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-sm hover:bg-accent rounded-md px-2 py-1 transition-colors max-w-full"
    >
      {status.emoji && <span className="text-lg flex-shrink-0">{status.emoji}</span>}
      <span className="truncate flex-1 text-left">
        {status.statusMessage || 'Status set'}
      </span>
      {status.expiresAt && (
        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      )}
    </button>
  );
}

