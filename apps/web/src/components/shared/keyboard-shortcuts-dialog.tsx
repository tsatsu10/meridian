import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";
import { KeyboardShortcut, formatShortcut } from "@/hooks/use-keyboard-shortcuts";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsDialog({
  open,
  onClose,
  shortcuts,
}: KeyboardShortcutsDialogProps) {
  // Group shortcuts by category (optional future enhancement)
  const groupedShortcuts = {
    "Navigation": shortcuts.filter(s => ['/', 'Escape'].includes(s.key)),
    "Actions": shortcuts.filter(s => ['n', 'k'].includes(s.key)),
    "Help": shortcuts.filter(s => s.key === '?'),
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
            if (categoryShortcuts.length === 0) return null;
            
            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatShortcut(shortcut)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* All shortcuts if no grouping */}
          {shortcuts.length > 0 && Object.values(groupedShortcuts).every(g => g.length === 0) && (
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <span className="text-sm">{shortcut.description}</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {formatShortcut(shortcut)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs border rounded bg-muted">?</kbd> to show this dialog anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;

