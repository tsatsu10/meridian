// @epic-1.1-subtasks: Keyboard shortcuts help dialog
// @persona-mike: Dev needs to discover available shortcuts

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getModifierSymbol } from "@/hooks/use-keyboard-shortcuts";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  key: string;
  description: string;
  category: string;
}

const shortcuts: ShortcutItem[] = [
  { key: "C", description: "Create new task", category: "Actions" },
  { key: "V", description: "Toggle board/list view", category: "Navigation" },
  { key: "/", description: "Focus search", category: "Navigation" },
  { key: `${getModifierSymbol()} + Shift + F`, description: "Clear all filters", category: "Actions" },
  { key: `${getModifierSymbol()} + A`, description: "Select all visible tasks", category: "Selection" },
  { key: "?", description: "Show keyboard shortcuts", category: "Help" },
  { key: "Esc", description: "Close dialogs/deselect", category: "Navigation" },
];

const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
  if (!acc[shortcut.category]) {
    acc[shortcut.category] = [];
  }
  acc[shortcut.category].push(shortcut);
  return acc;
}, {} as Record<string, ShortcutItem[]>);

export default function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and work faster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <kbd className="px-3 py-1.5 text-sm font-semibold text-foreground bg-muted border border-border rounded-md shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-2 py-1 bg-muted border border-border rounded text-foreground">?</kbd> anytime to show this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

