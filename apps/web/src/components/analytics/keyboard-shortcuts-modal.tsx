import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Keyboard, Command } from "lucide-react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: "Navigation",
    items: [
      { keys: ["Ctrl/Cmd", "B"], description: "Toggle sidebar" },
      { keys: ["Ctrl/Cmd", "I"], description: "Toggle user profile" },
      { keys: ["Ctrl/Cmd", "K"], description: "Open search" },
      { keys: ["Esc"], description: "Close panels" },
      { keys: ["Tab"], description: "Switch between tabs" },
    ],
  },
  {
    category: "Actions",
    items: [
      { keys: ["Ctrl/Cmd", "R"], description: "Refresh analytics" },
      { keys: ["Ctrl/Cmd", "E"], description: "Export data" },
      { keys: ["Ctrl/Cmd", "F"], description: "Open filters" },
      { keys: ["Ctrl/Cmd", "S"], description: "Save filter preset" },
      { keys: ["Ctrl/Cmd", "/"], description: "Show shortcuts" },
    ],
  },
  {
    category: "View Controls",
    items: [
      { keys: ["1"], description: "Overview tab" },
      { keys: ["2"], description: "Projects tab" },
      { keys: ["3"], description: "Teams tab" },
      { keys: ["4"], description: "Insights tab" },
      { keys: ["Ctrl/Cmd", "P"], description: "Toggle comparison mode" },
    ],
  },
  {
    category: "Time Range",
    items: [
      { keys: ["D"], description: "7 days view" },
      { keys: ["W"], description: "30 days view" },
      { keys: ["M"], description: "90 days view" },
    ],
  },
];

const KeyBadge = ({ keyName }: { keyName: string }) => (
  <Badge variant="outline" className="px-2 py-1 text-xs font-mono bg-muted">
    {keyName}
  </Badge>
);

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((section) => (
            <Card key={section.category} className="p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          {keyIndex > 0 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                          <KeyBadge keyName={key} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Card className="p-4 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-start gap-3">
              <Command className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Pro Tip</p>
                <p className="text-xs text-muted-foreground">
                  On Mac, "Ctrl" is replaced with "Cmd" (⌘). Most shortcuts work across all
                  platforms. Press <KeyBadge keyName="?" /> at any time to show this guide.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

