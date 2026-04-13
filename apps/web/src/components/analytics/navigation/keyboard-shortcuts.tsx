"use client";

// @epic-2.1-workflow: Keyboard shortcuts for efficient analytics navigation
// @persona-mike: Developer needs keyboard-driven workflow
// @persona-david: Team lead needs quick access to analytics views

import * as React from "react";
import { useEffect, useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

interface ShortcutGroup {
  name: string;
  shortcuts: {
    keys: string[];
    description: string;
    action: () => void;
  }[];
}

interface KeyboardShortcutsProps {
  onNavigate?: (path: string) => void;
  onAction?: (action: string) => void;
}

const ANALYTICS_SHORTCUTS: ShortcutGroup[] = [
  {
    name: "Navigation",
    shortcuts: [
      {
        keys: ["g", "h"],
        description: "Go to Analytics Home",
        action: () => {}, // Implemented in useEffect
      },
      {
        keys: ["g", "p"],
        description: "Go to Projects View",
        action: () => {},
      },
      {
        keys: ["g", "t"],
        description: "Go to Team View",
        action: () => {},
      },
      {
        keys: ["g", "r"],
        description: "Go to Reports",
        action: () => {},
      },
    ],
  },
  {
    name: "Actions",
    shortcuts: [
      {
        keys: ["c", "t"],
        description: "Create Task from Current View",
        action: () => {},
      },
      {
        keys: ["s", "i"],
        description: "Share Current Insight",
        action: () => {},
      },
      {
        keys: ["f"],
        description: "Toggle Filters Panel",
        action: () => {},
      },
      {
        keys: ["r"],
        description: "Refresh Data",
        action: () => {},
      },
    ],
  },
  {
    name: "View Controls",
    shortcuts: [
      {
        keys: ["1"],
        description: "Switch to Overview Tab",
        action: () => {},
      },
      {
        keys: ["2"],
        description: "Switch to Details Tab",
        action: () => {},
      },
      {
        keys: ["3"],
        description: "Switch to Insights Tab",
        action: () => {},
      },
      {
        keys: ["+"],
        description: "Zoom In Chart",
        action: () => {},
      },
      {
        keys: ["-"],
        description: "Zoom Out Chart",
        action: () => {},
      },
    ],
  },
];

export function KeyboardShortcuts({ onNavigate, onAction }: KeyboardShortcutsProps) {
  const [showDialog, setShowDialog] = useState(false);

  // Register global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts dialog with '?' key
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowDialog(true);
      }

      // Handle Escape key to close dialog
      if (e.key === "Escape" && showDialog) {
        setShowDialog(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDialog]);

  // Register navigation shortcuts using proper hook pattern
  const shortcutHandler = useCallback((e: KeyboardEvent) => {
    ANALYTICS_SHORTCUTS.forEach(group => {
      group.shortcuts.forEach(shortcut => {
        const keys = shortcut.keys;
        const isMatch = keys.every(key => {
          switch(key.toLowerCase()) {
            case 'ctrl': return e.ctrlKey;
            case 'shift': return e.shiftKey;
            case 'alt': return e.altKey;
            default: return e.key.toLowerCase() === key.toLowerCase();
          }
        });

        if (isMatch) {
          e.preventDefault();
          if (shortcut.description.startsWith("Go to")) {
            onNavigate?.(shortcut.description.replace("Go to ", "").toLowerCase());
          } else {
            onAction?.(shortcut.description);
          }
        }
      });
    });
  }, [onNavigate, onAction]);

  useEffect(() => {
    document.addEventListener('keydown', shortcutHandler);
    return () => document.removeEventListener('keydown', shortcutHandler);
  }, [shortcutHandler]);

  const renderShortcut = useCallback((keys: string[]) => {
    return (
      <div className="flex gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded shadow-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
              {key.toUpperCase()}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-gray-500">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }, []);

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowDialog(true)}
          >
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use keyboard shortcuts to navigate and interact with analytics views quickly.
              Press <kbd className="px-2 py-0.5 text-xs bg-gray-100 border rounded">?</kbd> anywhere to show this dialog.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {ANALYTICS_SHORTCUTS.map((group) => (
                <div key={group.name}>
                  <h3 className="font-medium text-sm text-gray-500 mb-2">
                    {group.name}
                  </h3>
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.description}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        {renderShortcut(shortcut.keys)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-500 mb-2">
              Tips
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <Badge variant="secondary">Tip</Badge>
                Combine navigation shortcuts for quick access (e.g., g + p for Projects)
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">Tip</Badge>
                Most shortcuts work even when input fields are focused
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">Tip</Badge>
                Use number keys (1-3) to quickly switch between tabs
              </li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating help indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 text-sm text-gray-500 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border">
        <kbd className="px-2 py-0.5 text-xs bg-gray-100 border rounded">?</kbd>
        <span>for help</span>
      </div>
    </>
  );
}

export type { KeyboardShortcutsProps };