import { useState, useEffect } from 'react';
import { useKudos, KudosCategory } from '@/hooks/use-kudos';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Heart,
  Star,
  Users,
  Lightbulb,
  Crown,
} from 'lucide-react';

const categoryOptions: {
  value: KudosCategory;
  label: string;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'helpful',
    label: 'Helpful',
    emoji: '🤝',
    icon: Heart,
  },
  {
    value: 'great_work',
    label: 'Great Work',
    emoji: '⭐',
    icon: Star,
  },
  {
    value: 'team_player',
    label: 'Team Player',
    emoji: '👥',
    icon: Users,
  },
  {
    value: 'creative',
    label: 'Creative',
    emoji: '💡',
    icon: Lightbulb,
  },
  {
    value: 'leadership',
    label: 'Leadership',
    emoji: '👑',
    icon: Crown,
  },
];

interface GiveKudosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientEmail?: string;
  recipientName?: string;
}

export function GiveKudosModal({
  open,
  onOpenChange,
  recipientEmail: initialRecipientEmail,
  recipientName: initialRecipientName,
}: GiveKudosModalProps) {
  const { giveKudos } = useKudos();
  const [recipientEmail, setRecipientEmail] = useState(initialRecipientEmail || '');
  const [recipientName, setRecipientName] = useState(initialRecipientName || '');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<KudosCategory>('great_work');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const selectedCategory = categoryOptions.find(c => c.value === category) || categoryOptions[1];
  
  // Update local state when props change
  useEffect(() => {
    if (initialRecipientEmail) {
      setRecipientEmail(initialRecipientEmail);
      setRecipientName(initialRecipientName || '');
    }
  }, [initialRecipientEmail, initialRecipientName]);
  
  const handleSubmit = async () => {
    if (!recipientEmail.trim()) {
      toast.error('Please enter a recipient email');
      return;
    }
    
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await giveKudos(recipientEmail, message, {
        emoji: selectedCategory.emoji,
        category,
        isPublic,
      });
      
      toast.success(`Kudos sent to ${recipientName || recipientEmail}!`);
      
      // Reset and close
      setRecipientEmail('');
      setRecipientName('');
      setMessage('');
      setCategory('great_work');
      setIsPublic(true);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send kudos');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {recipientEmail ? `Give Kudos to ${recipientName || recipientEmail}` : 'Give Kudos'}
          </DialogTitle>
          <DialogDescription>
            Recognize and appreciate your teammate's contributions
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Recipient Email Input - Only show if not pre-filled */}
          {!initialRecipientEmail && (
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email *</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="teammate@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the email of the teammate you want to recognize
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as KudosCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span>{option.emoji}</span>
                        <Icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder={`Tell ${recipientName || 'them'} what they did well...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>
          
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Make Public</Label>
              <p className="text-sm text-muted-foreground">
                Show this kudos in the workspace feed
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!recipientEmail.trim() || !message.trim() || submitting}
          >
            {submitting ? 'Sending...' : `Send ${selectedCategory.emoji}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

