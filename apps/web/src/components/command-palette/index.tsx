import CreateProjectModal from "@/components/shared/modals/create-project-modal";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import CreateWorkspaceModal from "@/components/shared/modals/create-workspace-modal";
import { cn } from "@/lib/cn";
import useProjectStore from "@/store/project";
import useWorkspaceStore from "@/store/workspace";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import {
  CommandIcon,
  LayoutDashboard,
  ListTodo,
  Plus,
  Search,
  Settings,
  Calendar,
  Users,
  BarChart3,
  Clock,
  Flag,
  Filter,
  Download,
  Upload,
  Zap,
  Star,
  Eye,
  CheckSquare,
  Target,
  TrendingUp,
  FileText,
  Palette,
  Moon,
  Sun,
  Monitor,
  Keyboard,
  HelpCircle,
  FolderOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import CommandGroup from "./command-group";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import type { Project } from "@/types/project";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { workspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  const { data: projects = [] as Project[] } = useGetProjects({ workspaceId: workspace?.id ?? "" });
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<{
    type: "task" | "project" | "workspace" | "navigation" | "theme" | "export";
    status?: string;
    payload?: any;
  } | null>(null);
  const navigate = useNavigate();

  // Track recent commands for better UX
  const addToRecent = (command: string) => {
    setRecentCommands(prev => {
      const updated = [command, ...prev.filter(c => c !== command)].slice(0, 5);
      return updated;
    });
  };

  const commandItemStyles = cn(
    "px-3 py-2 rounded-lg cursor-pointer flex items-center gap-3",
    "text-sm text-zinc-900 dark:text-zinc-100",
    "aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/50",
    "transition-colors duration-100",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  );

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (!open && pendingAction) {
      setOpen(false);
      timeout = setTimeout(() => {
        switch (pendingAction.type) {
          case "task":
            setIsCreateTaskOpen(true);
            break;
          case "project":
            setIsCreateProjectOpen(true);
            break;
          case "workspace":
            setIsCreateWorkspaceOpen(true);
            break;
        }
        setPendingAction(null);
      }, 150);
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [open, pendingAction]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.1 }}
              className={cn(
                "fixed top-[20vh] left-1/2 -translate-x-1/2 max-w-[640px] w-full p-4 rounded-xl z-50",
                "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
                "shadow-2xl",
              )}
            >
              <Command.Dialog
                open={open}
                onOpenChange={setOpen}
                label="Global Command Menu"
                className={cn(
                  "fixed top-[20vh] left-1/2 -translate-x-1/2 max-w-[640px] w-full p-4 rounded-xl z-50",
                  "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
                  "shadow-2xl",
                  "data-[state=open]:animate-in",
                  "data-[state=closed]:animate-out",
                  "data-[state=closed]:fade-out-0",
                  "data-[state=open]:fade-in-0",
                  "data-[state=closed]:zoom-out-95",
                  "data-[state=open]:zoom-in-95",
                  "data-[state=closed]:slide-out-to-left-1/2",
                  "data-[state=closed]:slide-out-to-top-[48%]",
                  "data-[state=open]:slide-in-from-left-1/2",
                  "data-[state=open]:slide-in-from-top-[48%]",
                )}
              >
                <div className="flex items-center gap-4 px-3 pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <Search className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  <Command.Input
                    placeholder="Type a command or search..."
                    className={cn(
                      "w-full outline-none bg-transparent",
                      "text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400",
                    )}
                  />
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                    <CommandIcon className="w-3 h-3" />K
                  </kbd>
                </div>
                <Command.List className="max-h-[300px] overflow-y-auto px-3">
                  <Command.Empty className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No results found.
                  </Command.Empty>
                  <CommandGroup heading="Tasks">
                    <Command.Item
                      onSelect={() => {
                        setOpen(false);
                        setPendingAction({ type: "task", status: "todo" });
                      }}
                      disabled={!project}
                      className={commandItemStyles}
                    >
                      <Plus className="w-4 h-4" />
                      Create new task
                      {!project && (
                        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
                          Select a project first
                        </span>
                      )}
                    </Command.Item>
                  </CommandGroup>

                  <CommandGroup heading="Projects" className="mt-4">
                    <Command.Item
                      onSelect={() => {
                        setOpen(false);
                        setPendingAction({ type: "project" });
                      }}
                      disabled={!workspace}
                      className={commandItemStyles}
                    >
                      <Plus className="w-4 h-4" />
                      Create new project
                      {!workspace && (
                        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
                          Select a workspace first
                        </span>
                      )}
                    </Command.Item>
                  </CommandGroup>

                  <CommandGroup heading="Project" className="mt-4">
                    {project && (
                      <Command.Item
                        onSelect={() => {
                          navigate({
                            to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
                            params: {
                              workspaceId: workspace?.id ?? "",
                              projectId: project.id,
                            },
                          });
                          setOpen(false);
                        }}
                        className={commandItemStyles}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Go to Board
                      </Command.Item>
                    )}

                    {project && (
                      <Command.Item
                        className={commandItemStyles}
                        onSelect={() => {
                          navigate({
                            to: "/dashboard/workspace/$workspaceId/project/$projectId/backlog",
                            params: {
                              workspaceId: workspace?.id ?? "",
                              projectId: project?.id ?? "",
                            },
                          });
                          setOpen(false);
                        }}
                      >
                        <ListTodo className="w-4 h-4" />
                        Go to Backlog
                      </Command.Item>
                    )}

                    {project && (
                      <Command.Item
                        onSelect={() => {
                          setOpen(false);
                          navigate({
                            to: "/dashboard/workspace/$workspaceId/project/$projectId/settings",
                            params: {
                              workspaceId: workspace?.id ?? "",
                              projectId: project.id,
                            },
                          });
                        }}
                        className={commandItemStyles}
                      >
                        <Settings className="w-4 h-4" />
                        Project settings
                      </Command.Item>
                    )}
                  </CommandGroup>

                  <CommandGroup heading="Navigation">
                    {(projects as Project[]).map((project: Project) => (
                      <Command.Item
                        key={project.id}
                        onSelect={() => {
                          setOpen(false);
                          navigate({
                            to: "/dashboard/workspace/$workspaceId/project/$projectId",
                            params: {
                              workspaceId: workspace?.id ?? "",
                              projectId: project.id
                            }
                          });
                        }}
                        className={commandItemStyles}
                      >
                        <FolderOpen className="w-4 h-4" />
                        {project.name}
                      </Command.Item>
                    ))}
                  </CommandGroup>

                  <CommandGroup heading="Quick Actions" className="mt-4">
                    <Command.Item
                      onSelect={() => {
                        // Trigger global search focus
                        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                        if (searchInput) {
                          searchInput.focus();
                          setOpen(false);
                          addToRecent("Focus Search");
                        }
                      }}
                      className={commandItemStyles}
                    >
                      <Search className="w-4 h-4" />
                      Focus Search
                      <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">⌘F</kbd>
                    </Command.Item>

                    <Command.Item
                      onSelect={() => {
                        // Open keyboard shortcuts modal
                        const event = new CustomEvent('show-keyboard-shortcuts');
                        window.dispatchEvent(event);
                        setOpen(false);
                        addToRecent("Show Keyboard Shortcuts");
                      }}
                      className={commandItemStyles}
                    >
                      <Keyboard className="w-4 h-4" />
                      Show Keyboard Shortcuts
                      <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">?</kbd>
                    </Command.Item>

                    <Command.Item
                      onSelect={() => {
                        navigate({ to: "/dashboard/help" });
                        setOpen(false);
                        addToRecent("Get Help");
                      }}
                      className={commandItemStyles}
                    >
                      <HelpCircle className="w-4 h-4" />
                      Get Help
                    </Command.Item>
                  </CommandGroup>

                  <CommandGroup heading="Workspace" className="mt-4 mb-2">
                    <Command.Item
                      onSelect={() => {
                        setOpen(false);
                        setPendingAction({ type: "workspace" });
                      }}
                      className={commandItemStyles}
                    >
                      <Plus className="w-4 h-4" />
                      Create new workspace
                    </Command.Item>
                  </CommandGroup>

                  {/* Recent Commands */}
                  {recentCommands.length > 0 && (
                    <CommandGroup heading="Recent" className="mt-4">
                      {recentCommands.slice(0, 3).map((command, index) => (
                        <Command.Item
                          key={command}
                          className={cn(commandItemStyles, "text-muted-foreground")}
                        >
                          <Clock className="w-4 h-4" />
                          {command}
                        </Command.Item>
                      ))}
                    </CommandGroup>
                  )}
                </Command.List>
              </Command.Dialog>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
      <CreateTaskModal
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
      />
      <CreateWorkspaceModal
        open={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
      />
    </>
  );
}
