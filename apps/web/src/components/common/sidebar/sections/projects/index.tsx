import Tip from "@/components/common/tip";
import icons from "@/constants/project-icons";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { cn } from "@/lib/cn";
import useProjectStore from "@/store/project";
import { useUserPreferencesStore } from "@/store/user-preferences";
import type { ProjectWithTasks } from "@/types/project";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useRBACAuth } from "@/lib/permissions";
import {
  Layout,
  Plus,
} from "lucide-react";
import { createElement, useState } from "react";
import CreateProjectModal from "../../../../shared/modals/create-project-modal";

type ProjectsProps = {
  workspaceId: string;
};

function Projects({ workspaceId }: ProjectsProps) {
  const { project: currentProject, setProject } = useProjectStore();
  const { data, isLoading } = useGetProjects({ workspaceId });
  const projects = data as ProjectWithTasks[] | undefined;
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const { isSidebarOpened } = useUserPreferencesStore();
  const { hasPermission } = useRBACAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSelectProject = (selectedProject: ProjectWithTasks) => {
    // Only prevent navigation if we're already on the exact overview page
    if (
      currentProject?.id === selectedProject.id &&
      location.pathname === `/dashboard/workspace/${workspaceId}/project/${selectedProject.id}`
    )
      return;

    setProject(selectedProject);
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId",
      params: {
        workspaceId,
        projectId: selectedProject.id,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-1 w-full">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse flex items-center px-4 py-1.5 rounded-md"
          >
            <div className="h-4 shrink-0 w-4 bg-zinc-200 dark:bg-zinc-800 rounded mr-2" />
            <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/*
      <div
        className={cn(
          "flex items-center justify-between mb-2",
          isSidebarOpened && "px-3",
        )}
      >
        <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {isSidebarOpened && "Projects"}
        </h2>
        {hasPermission("canCreateProjects") && (
          <button
            type="button"
            onClick={() => setIsCreateProjectOpen(true)}
            className={cn(
              "rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
              !isSidebarOpened ? "p-2" : "p-1",
            )}
          >
            <Plus
              className={cn(
                "text-zinc-500 dark:text-zinc-400",
                !isSidebarOpened ? "w-5 h-5" : "w-4 h-4",
              )}
            />
          </button>
        )}
      </div>
      */}
      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </div>
  );
}

export default Projects;
