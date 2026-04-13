import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/cn';
import { 
  Command, 
  Navigation, 
  ListChecks, 
  Star, 
  MousePointer2, 
  HelpCircle,
  Keyboard
} from 'lucide-react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: string;
}

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
  shortcuts?: Record<string, KeyboardShortcut[]>;
}

const CATEGORY_ICONS = {
  'Navigation': Navigation,
  'Tasks': ListChecks,
  'Task Status': ListChecks,
  'Task Priority': Star,
  'Task Actions': MousePointer2,
  'Selection': MousePointer2,
  'Help': HelpCircle,
} as const;

const DEFAULT_SHORTCUTS: Record<string, KeyboardShortcut[]> = {
  'Navigation': [
    { key: 'k', meta: true, description: 'Open command palette', category: 'Navigation' },
    { key: 'd', meta: true, description: 'Go to dashboard', category: 'Navigation' },
    { key: 't', meta: true, description: 'Go to all tasks', category: 'Navigation' },
    { key: 's', meta: true, description: 'Go to settings', category: 'Navigation' },
    { key: 'f', meta: true, description: 'Focus search', category: 'Navigation' },
  ],
  'Tasks': [
    { key: 'n', meta: true, description: 'Create new task', category: 'Tasks' },
  ],
  'Task Status': [
    { key: '1', description: 'Mark as To Do', category: 'Task Status' },
    { key: '2', description: 'Mark as In Progress', category: 'Task Status' },
    { key: '3', description: 'Mark as In Review', category: 'Task Status' },
    { key: '4', description: 'Mark as Done', category: 'Task Status' },
  ],
  'Task Priority': [
    { key: 'u', description: 'Mark as Urgent', category: 'Task Priority' },
    { key: 'h', description: 'Mark as High Priority', category: 'Task Priority' },
    { key: 'm', description: 'Mark as Medium Priority', category: 'Task Priority' },
    { key: 'l', description: 'Mark as Low Priority', category: 'Task Priority' },
  ],
  'Selection': [
    { key: 'a', meta: true, description: 'Select all tasks', category: 'Selection' },
    { key: 'Escape', description: 'Clear selection', category: 'Selection' },
  ],
  'Task Actions': [
    { key: 'Delete', description: 'Delete selected task(s)', category: 'Task Actions' },
  ],
  'Help': [
    { key: '?', description: 'Show this help', category: 'Help' },
  ],
};

function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  const isMac = navigator.platform.toLowerCase().includes('mac');
  
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.ctrl && !shortcut.meta) parts.push('Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  
  // Format special keys
  let keyDisplay = shortcut.key;
  if (keyDisplay === 'Delete') keyDisplay = 'Del';
  if (keyDisplay === 'Escape') keyDisplay = 'Esc';
  if (keyDisplay === ' ') keyDisplay = 'Space';
  
  parts.push(keyDisplay.toUpperCase());
  
  return parts.join(isMac ? '' : '+');
}

const ShortcutBadge: React.FC<{ shortcut: KeyboardShortcut }> = ({ shortcut }) => {
  const formattedShortcut = formatShortcut(shortcut);
  const isMac = navigator.platform.toLowerCase().includes('mac');
  
  return (
    <div className="flex items-center gap-1">
      {formattedShortcut.split(isMac ? '' : '+').map((part, index, array) => (
        <React.Fragment key={index}>
          <Badge 
            variant="secondary" 
            className="text-xs font-mono py-0.5 px-1.5 bg-muted/50 text-muted-foreground border"
          >
            {part}
          </Badge>
          {index < array.length - 1 && !isMac && (
            <span className="text-xs text-muted-foreground">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  open,
  onClose,
  shortcuts = DEFAULT_SHORTCUTS
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {Object.entries(shortcuts).map(([category, categoryShortcuts]) => {
            const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Command;
            
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    {category}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-foreground">
                        {shortcut.description}
                      </span>
                      <ShortcutBadge shortcut={shortcut} />
                    </div>
                  ))}
                </div>
                
                {Object.keys(shortcuts).indexOf(category) < Object.keys(shortcuts).length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              💡 Tip: These shortcuts work throughout the app, even when typing in forms
            </span>
            <div className="flex items-center gap-1">
              <span>Press</span>
              <Badge variant="secondary" className="text-xs font-mono">
                {navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'}K
              </Badge>
              <span>for command palette</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsModal; 