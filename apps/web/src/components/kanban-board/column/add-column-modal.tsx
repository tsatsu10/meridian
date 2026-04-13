import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { client } from "@meridian/libs";
import useProjectStore from "@/store/project";

interface AddColumnModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  insertAfterPosition?: number;
}

// @epic-1.1-subtasks: Add custom status columns for Sarah's PM workflow enhancement
function AddColumnModal({ open, onClose, projectId, insertAfterPosition }: AddColumnModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [isLoading, setIsLoading] = useState(false);
  const { project, setProject } = useProjectStore();

  const predefinedColors = [
    "#6b7280", // gray
    "#3b82f6", // blue  
    "#8b5cf6", // purple
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#06b6d4", // cyan
    "#ec4899", // pink (replaced duplicate violet)
    "#f97316", // orange
    "#84cc16", // lime
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Column name is required");
      return;
    }

    if (!projectId) {
      toast.error("Project ID is required");
      return;
    }

    setIsLoading(true);

    try {const response = await client.project[":projectId"]["status-columns"].$post({
        param: { projectId },
        json: {
          name: name.trim(),
          color,
          position: insertAfterPosition,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create column");
      }

      const newColumn = await response.json();

      toast.success(`"${name}" column created successfully`);
      setName("");
      setColor("#6b7280");
      onClose();
      
      // Force a page refresh to get the updated column order
      window.location.reload();
    } catch (error) {
      console.error("Error creating column:", error);
      toast.error("Failed to create column");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName("");
      setColor("#6b7280");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
          <DialogDescription>
            Create a new custom column for your kanban board. Choose a name and color that represents this stage of your workflow.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="column-name">Column Name</Label>
            <Input
              id="column-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Testing, Deployment, Review..."
              maxLength={50}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Column Color</Label>
            <div className="flex gap-2 flex-wrap">
              {predefinedColors.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === colorOption 
                      ? "border-zinc-900 dark:border-zinc-100 scale-110" 
                      : "border-zinc-300 dark:border-zinc-600 hover:scale-105"
                  }`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                  disabled={isLoading}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="custom-color" className="text-sm">Custom:</Label>
              <input
                id="custom-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded border border-zinc-300 dark:border-zinc-600"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? "Creating..." : "Create Column"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddColumnModal; 