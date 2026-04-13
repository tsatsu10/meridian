import useInviteWorkspaceUser from "@/hooks/mutations/workspace-user/use-invite-workspace-user";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Props = {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
};

// Current user roles from the system
type UserRole = 
  | "workspace-manager" 
  | "department-head" 
  | "workspace-viewer"
  | "project-manager" 
  | "project-viewer"
  | "team-lead"
  | "member"
  | "client" 
  | "contractor"
  | "stakeholder"
  | "guest";

// @epic-1.1-rbac: Complete list of available roles for invitation
const AVAILABLE_ROLES = [
  { value: "guest", label: "Guest", description: "Temporary access with limited permissions" },
  { value: "stakeholder", label: "Stakeholder", description: "External stakeholder with project visibility" },
  { value: "contractor", label: "Contractor", description: "External contractor with specific project access" },
  { value: "client", label: "Client", description: "External client with project visibility" },
  { value: "member", label: "Member", description: "Standard team member with basic participation" },
  { value: "team-lead", label: "Team Lead", description: "Team coordination and task assignment" },
  { value: "project-viewer", label: "Project Viewer", description: "Read-only project access" },
  { value: "project-manager", label: "Project Manager", description: "Full control over assigned projects" },
  { value: "workspace-viewer", label: "Workspace Viewer", description: "Read-only workspace access" },
  { value: "department-head", label: "Department Head", description: "Department oversight across multiple projects" },
  { value: "workspace-manager", label: "Workspace Manager", description: "Full workspace control and management" }
] as const;

const teamMemberSchema = z.object({
  userEmail: z.string().email(),
  role: z.enum([
    "guest", "stakeholder", "contractor", "client", "member", 
    "team-lead", "project-viewer", "project-manager", 
    "workspace-viewer", "department-head", "workspace-manager"
  ] as const),
});

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

function InviteTeamMemberModal({ open, onClose, workspaceId }: Props) {
  const { mutateAsync } = useInviteWorkspaceUser();
  const queryClient = useQueryClient();

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      userEmail: "",
      role: "member", // Default to member role
    },
  });

  const onSubmit = async ({ userEmail, role }: TeamMemberFormValues) => {
    try {
      await mutateAsync({ userEmail, workspaceId, role });
      await queryClient.refetchQueries({
        queryKey: ["workspace-users", workspaceId],
      });

      toast.success(`Invitation sent successfully with ${AVAILABLE_ROLES.find(r => r.value === role)?.label} role`);

      resetInviteTeamMember();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to invite team member",
      );
    }
  };

  const resetInviteTeamMember = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["workspace-users", workspaceId],
    });
    form.reset();
  };

  const resetAndCloseModal = () => {
    resetInviteTeamMember();
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={resetAndCloseModal}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Invite Team Member
              </Dialog.Title>
              <Dialog.Close
                asChild
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                <X size={20} />
              </Dialog.Close>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-4">
                <div className="space-y-4">
                  <div>
                    <FormField
                      control={form.control}
                      name="userEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-1">
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="colleague@company.com"
                              className="bg-white dark:bg-zinc-800/50"
                              autoFocus
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-1">
                            Role
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-zinc-800/50">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AVAILABLE_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{role.label}</span>
                                    <span className="text-xs text-muted-foreground">{role.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Dialog.Close asChild>
                    <Button
                      type="button"
                      className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    type="submit"
                    className="bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    Send Invitation
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default InviteTeamMemberModal;
