import EmptyProjectState from "@/components/project/empty-state";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { workspaceId } = Route.useParams();
  const { data: projects } = useGetProjects({ workspaceId });

  const projectList = Array.isArray(projects) ? projects : projects?.projects;

  if (projectList && projectList.length === 0) {
    return <EmptyProjectState />;
  }

  return <Outlet />;
}
