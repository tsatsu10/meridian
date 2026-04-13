import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useCreateWorkspace from "@/hooks/queries/workspace/use-create-workspace";
import { useUserPreferencesStore } from "@/store/user-preferences";
import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { X, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

function CreateWorkspaceModal({ open, onClose }: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setActiveWorkspaceId } = useUserPreferencesStore();
  const { mutateAsync } = useCreateWorkspace({ name });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const createdWorkspace = await mutateAsync();
      toast.success("Workspace created successfully");
      
      // Set as active workspace
      setActiveWorkspaceId(createdWorkspace.id);
      
      // Invalidate queries to refresh workspace list
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      
      // Reset form and close modal
      setName("");
      onClose();

      // Navigate to the projects page after creating workspace
      navigate({
        to: "/dashboard/projects",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create workspace",
      );
    }
  };

  const resetAndCloseModal = () => {
    setName("");
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={resetAndCloseModal}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
          <div className="glass-card border-border/50 backdrop-blur-xl bg-white/95 dark:bg-black/95 rounded-lg shadow-2xl">
            {/* Close button */}
            <Dialog.Close
              asChild
              className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <button>
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </Dialog.Close>

            {/* Header */}
            <div className="p-8 space-y-8">
              <div className="space-y-2">
                <Dialog.Title className="text-3xl font-bold gradient-text flex items-center space-x-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <span>New Workspace</span>
                </Dialog.Title>
                <Dialog.Description className="text-lg text-muted-foreground">
                  Create a new workspace to organize your projects and collaborate with your team
                </Dialog.Description>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="workspaceName"
                    className="text-sm font-medium flex items-center"
                  >
                    Workspace Name *
                  </Label>
                  <Input
                    id="workspaceName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Workspace"
                    className="glass-card h-12 w-full text-lg font-medium"
                    required
                    autoFocus
                  />
                </div>

                {/* Footer */}
                <div className="flex space-x-3 w-full justify-end pt-6">
                  <Dialog.Close asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="glass-card"
                    >
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    type="submit"
                    disabled={!name.trim()}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6"
                  >
                    Create Workspace
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default CreateWorkspaceModal;
