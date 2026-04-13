import { useState } from 'react';
import { useMoodTracker, MoodType } from '@/hooks/use-mood-tracker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const moodOptions: {
  value: MoodType;
  label: string;
  emoji: string;
  color: string;
  description: string;
}[] = [
  {
    value: 'great',
    label: 'Great',
    emoji: '😄',
    color: 'bg-green-500 hover:bg-green-600',
    description: 'Feeling fantastic!',
  },
  {
    value: 'good',
    label: 'Good',
    emoji: '🙂',
    color: 'bg-blue-500 hover:bg-blue-600',
    description: 'All good here',
  },
  {
    value: 'okay',
    label: 'Okay',
    emoji: '😐',
    color: 'bg-yellow-500 hover:bg-yellow-600',
    description: 'Getting by',
  },
  {
    value: 'bad',
    label: 'Bad',
    emoji: '😞',
    color: 'bg-orange-500 hover:bg-orange-600',
    description: 'Not great today',
  },
  {
    value: 'stressed',
    label: 'Stressed',
    emoji: '😰',
    color: 'bg-red-500 hover:bg-red-600',
    description: 'Feeling overwhelmed',
  },
];

interface MoodCheckinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoodCheckinModal({ open, onOpenChange }: MoodCheckinModalProps) {
  const { submitMoodCheckin } = useMoodTracker();
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [notes, setNotes] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!selectedMood) return;
    
    setSubmitting(true);
    
    try {
      await submitMoodCheckin(selectedMood, {
        notes: notes.trim() || undefined,
        isAnonymous,
      });
      
      // Reset and close
      setSelectedMood(null);
      setNotes('');
      setIsAnonymous(false);
      onOpenChange(false);
    } catch (error) {
      // Error already handled by hook
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Daily Mood Check-in</DialogTitle>
          <DialogDescription>
            How are you feeling today? Your feedback helps us understand team well-being.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Select your mood</Label>
            <div className="grid grid-cols-5 gap-2">
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedMood(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg transition-all',
                    selectedMood === option.value
                      ? `${option.color} text-white shadow-lg scale-105`
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  <span className="text-3xl">{option.emoji}</span>
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
            {selectedMood && (
              <p className="text-sm text-muted-foreground text-center">
                {moodOptions.find(o => o.value === selectedMood)?.description}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Anything you'd like to share about how you're feeling..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/500
            </p>
          </div>
          
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Submit Anonymously</Label>
              <p className="text-sm text-muted-foreground">
                Your mood will be counted but not linked to your name
              </p>
            </div>
            <Switch
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Skip Today
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedMood || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Check-in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

