// Backlog Keyboard Shortcuts Help Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

interface BacklogHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BacklogHelpDialog({ open, onOpenChange }: BacklogHelpDialogProps) {
  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { keys: ["↑", "↓"], description: "Navigate tasks" },
        { keys: ["Enter"], description: "Open selected task" },
        { keys: ["Esc"], description: "Close filters or clear search" },
      ],
    },
    {
      category: "Actions",
      items: [
        { keys: ["N"], description: "Create new backlog item" },
        { keys: ["/"], description: "Focus search" },
        { keys: ["F"], description: "Toggle filters" },
        { keys: ["E"], description: "Toggle enhanced/classic view" },
      ],
    },
    {
      category: "Selection",
      items: [
        { keys: ["Space"], description: "Select/deselect task" },
        { keys: ["Ctrl", "A"], description: "Select all visible tasks" },
        { keys: ["Ctrl", "D"], description: "Deselect all" },
      ],
    },
    {
      category: "Bulk Actions (when items selected)",
      items: [
        { keys: ["Delete"], description: "Delete selected items" },
        { keys: ["Ctrl", "M"], description: "Move to sprint" },
        { keys: ["Ctrl", "Shift", "A"], description: "Archive selected" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Master these shortcuts to manage your backlog efficiently
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <div key={keyIndex} className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs px-2 py-0.5 bg-muted"
                          >
                            {key}
                          </Badge>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Press <Badge variant="outline" className="mx-1 text-xs">?</Badge> at any time to show this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

