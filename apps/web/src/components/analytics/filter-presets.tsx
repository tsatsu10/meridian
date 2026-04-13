import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Save, Star, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export interface FilterPreset {
  id: string;
  name: string;
  timeRange: "7d" | "30d" | "90d";
  selectedProjects: string[];
  selectedUsers: string[];
  comparisonMode: boolean;
  comparisonTimeRange?: "7d" | "30d" | "90d";
  createdAt: number;
}

interface FilterPresetsProps {
  currentFilters: {
    timeRange: "7d" | "30d" | "90d";
    selectedProjects: string[];
    selectedUsers: string[];
    comparisonMode: boolean;
    comparisonTimeRange: "7d" | "30d" | "90d";
  };
  onApplyPreset: (preset: FilterPreset) => void;
}

const PRESETS_STORAGE_KEY = "analytics-filter-presets";

export function FilterPresets({ currentFilters, onApplyPreset }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [deletePresetId, setDeletePresetId] = useState<string | null>(null);

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (error) {
        console.error("Failed to parse saved presets:", error);
      }
    }
  }, []);

  // Save presets to localStorage whenever they change
  const savePresetsToStorage = useCallback((updatedPresets: FilterPreset[]) => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updatedPresets));
    setPresets(updatedPresets);
  }, []);

  const handleSavePreset = useCallback(() => {
    if (!newPresetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      timeRange: currentFilters.timeRange,
      selectedProjects: currentFilters.selectedProjects,
      selectedUsers: currentFilters.selectedUsers,
      comparisonMode: currentFilters.comparisonMode,
      comparisonTimeRange: currentFilters.comparisonTimeRange,
      createdAt: Date.now(),
    };

    const updatedPresets = [...presets, newPreset];
    savePresetsToStorage(updatedPresets);
    setShowSaveDialog(false);
    setNewPresetName("");
    toast.success(`Filter preset "${newPreset.name}" saved`);
  }, [newPresetName, currentFilters, presets, savePresetsToStorage]);

  const handleDeletePreset = useCallback((id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      const updatedPresets = presets.filter((p) => p.id !== id);
      savePresetsToStorage(updatedPresets);
      setDeletePresetId(null);
      toast.success(`Filter preset "${preset.name}" deleted`);
    }
  }, [presets, savePresetsToStorage]);

  const getPresetDescription = (preset: FilterPreset): string => {
    const parts: string[] = [];
    
    // Time range
    const timeRangeLabel = preset.timeRange === "7d" ? "7 days" : preset.timeRange === "30d" ? "30 days" : "90 days";
    parts.push(timeRangeLabel);

    // Projects
    if (preset.selectedProjects.length > 0) {
      parts.push(`${preset.selectedProjects.length} project${preset.selectedProjects.length > 1 ? 's' : ''}`);
    }

    // Users
    if (preset.selectedUsers.length > 0) {
      parts.push(`${preset.selectedUsers.length} user${preset.selectedUsers.length > 1 ? 's' : ''}`);
    }

    // Comparison
    if (preset.comparisonMode) {
      parts.push("comparison on");
    }

    return parts.join(" • ");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Saved Presets</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Save Current
        </Button>
      </div>

      {presets.length === 0 ? (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          <p>No saved presets yet.</p>
          <p className="text-xs mt-1">Save your current filters to quickly apply them later.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {presets.map((preset) => (
            <Card
              key={preset.id}
              className="p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => onApplyPreset(preset)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    <h4 className="font-medium text-sm truncate">{preset.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getPresetDescription(preset)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletePresetId(preset.id);
                  }}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete preset</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Save Preset Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Filter Preset
            </DialogTitle>
            <DialogDescription>
              Give your current filter configuration a name to save it for later use.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                placeholder="e.g., Q4 Performance, My Projects, Team Overview"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSavePreset();
                  }
                }}
              />
            </div>

            <Card className="p-3 bg-muted/30">
              <h4 className="text-sm font-semibold mb-2">Current Filters:</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium">Time Range:</span>{" "}
                  {currentFilters.timeRange === "7d" ? "7 days" : currentFilters.timeRange === "30d" ? "30 days" : "90 days"}
                </p>
                {currentFilters.selectedProjects.length > 0 && (
                  <p>
                    <span className="font-medium">Projects:</span> {currentFilters.selectedProjects.length} selected
                  </p>
                )}
                {currentFilters.selectedUsers.length > 0 && (
                  <p>
                    <span className="font-medium">Users:</span> {currentFilters.selectedUsers.length} selected
                  </p>
                )}
                {currentFilters.comparisonMode && (
                  <p>
                    <span className="font-medium">Comparison:</span> Enabled
                  </p>
                )}
              </div>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} className="gap-2">
              <Check className="h-4 w-4" />
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePresetId} onOpenChange={() => setDeletePresetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter Preset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the filter preset "
              {presets.find((p) => p.id === deletePresetId)?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePresetId && handleDeletePreset(deletePresetId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

