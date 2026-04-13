import { useState } from 'react';
import { useTeamStatus, UserStatus } from '@/hooks/use-team-status';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Clock,
  Focus,
  LogOut,
  ChevronDown,
  Smile,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusOptions: {
  value: UserStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    value: 'available',
    label: 'Available',
    icon: CheckCircle2,
    color: 'text-green-500',
  },
  {
    value: 'in_meeting',
    label: 'In a Meeting',
    icon: Clock,
    color: 'text-red-500',
  },
  {
    value: 'focus_mode',
    label: 'Focus Mode',
    icon: Focus,
    color: 'text-purple-500',
  },
  {
    value: 'away',
    label: 'Away',
    icon: LogOut,
    color: 'text-gray-500',
  },
];

export function StatusSelector() {
  const { myStatus, setStatus, clearStatus } = useTeamStatus();
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [customDuration, setCustomDuration] = useState<number | undefined>(30);
  
  const currentStatusOption = statusOptions.find(
    (opt) => opt.value === (myStatus?.status || 'available')
  ) || statusOptions[0];
  
  const handleQuickStatus = (status: UserStatus) => {
    if (status === 'available') {
      clearStatus();
    } else {
      setStatus(status);
    }
  };
  
  const handleCustomStatus = () => {
    setStatus(myStatus?.status || 'available', {
      statusMessage: customMessage || undefined,
      emoji: customEmoji || undefined,
      expiresIn: customDuration,
    });
    setShowCustomDialog(false);
    setCustomMessage('');
    setCustomEmoji('');
    setCustomDuration(30);
  };
  
  const StatusIcon = currentStatusOption.icon;
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <StatusIcon className={cn('h-4 w-4', currentStatusOption.color)} />
            <span className="hidden md:inline">{currentStatusOption.label}</span>
            {myStatus?.statusMessage && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {myStatus.emoji} {myStatus.statusMessage}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Set your status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {statusOptions.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleQuickStatus(option.value)}
                className="gap-2"
              >
                <Icon className={cn('h-4 w-4', option.color)} />
                <span>{option.label}</span>
                {myStatus?.status === option.value && (
                  <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />
                )}
              </DropdownMenuItem>
            );
          })}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowCustomDialog(true)} className="gap-2">
            <Smile className="h-4 w-4" />
            <span>Custom status...</span>
          </DropdownMenuItem>
          
          {myStatus?.status !== 'available' && (
            <DropdownMenuItem onClick={clearStatus} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span>Clear status</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Custom Status</DialogTitle>
            <DialogDescription>
              Add a message and emoji to your status
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji (optional)</Label>
              <Input
                id="emoji"
                placeholder="😊"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                maxLength={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Status Message</Label>
              <Input
                id="message"
                placeholder="e.g., Working on sprint tasks"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Clear after (minutes)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="30"
                value={customDuration || ''}
                onChange={(e) => setCustomDuration(e.target.value ? Number(e.target.value) : undefined)}
                min={1}
                max={1440}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep status until manually cleared
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomStatus} disabled={!customMessage && !customEmoji}>
              Set Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

