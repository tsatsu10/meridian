import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import useSignOut from "@/hooks/mutations/use-sign-out";
import { cn } from "@/lib/cn";
import useProjectStore from "@/store/project";
import { useUserPreferencesStore } from "@/store/user-preferences";
import useWorkspaceStore from "@/store/workspace";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Settings } from "lucide-react";
import { toast } from "sonner";

function UserInfo() {
  const { user, setUser } = useAuth();
  const { isSidebarOpened } = useUserPreferencesStore();
  const navigate = useNavigate();
  const { mutateAsync: signOut, isPending } = useSignOut();
  const queryClient = useQueryClient();
  const { setProject } = useProjectStore();
  const { setWorkspace } = useWorkspaceStore();

  const handleSignOut = async () => {
    try {
      await signOut();
      queryClient.clear();
      setUser(null);
      setProject(undefined);
      setWorkspace(undefined);
      toast.success("Signed out successfully");
      navigate({ to: "/auth/sign-in" });
    } catch (error) {
      // If 401, treat as success in demo mode
      if (
        error instanceof Error &&
        (error.message.includes("401") || error.message.toLowerCase().includes("unauthorized"))
      ) {
        queryClient.clear();
        setUser(null);
        setProject(undefined);
        setWorkspace(undefined);
        toast.success("Signed out (demo mode)");
        navigate({ to: "/auth/sign-in" });
      } else {
        toast.error(
          error instanceof Error ? error.message : "Failed to sign out",
        );
      }
    }
  };

  const handleClickSettings = () => {
    navigate({ to: "/dashboard/settings" });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center w-full rounded-xl p-3 transition-all duration-200",
            "hover:bg-white/5 transition-all duration-200",
            "cursor-pointer group",
            isSidebarOpened ? "gap-3 justify-start" : "justify-center",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          )}
        >
          {/* Avatar */}
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-white/10">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0)}
              </span>
            </div>
            {/* Online Status */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-lg" />
          </div>

          {/* User Info */}
          {isSidebarOpened && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate">{user?.email}</p>
            </div>
          )}

          {/* Action Icon */}
          {!isSidebarOpened ? (
            <div className="w-4 h-4" />
          ) : (
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[200px] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-1",
            "z-50 animate-in fade-in-0 zoom-in-95"
          )}
          side="right"
          align="end"
          sideOffset={8}
        >
          <DropdownMenu.Item
            onClick={handleClickSettings}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              "focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700"
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </DropdownMenu.Item>
          
          <DropdownMenu.Separator className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
          
          <DropdownMenu.Item
            onClick={handleSignOut}
            disabled={isPending}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer",
              "hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400",
              "focus:outline-none focus:bg-red-50 dark:focus:bg-red-900/20",
              isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            <LogOut className="w-4 h-4" />
            {isPending ? "Signing out..." : "Sign out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default UserInfo;
