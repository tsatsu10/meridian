import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { userMessage } from "@/lib/user-message";
import getMilestones from "@/fetchers/milestone/get-milestones";
import createMilestoneApi from "@/fetchers/milestone/create-milestone";
import updateMilestoneApi from "@/fetchers/milestone/update-milestone";
import deleteMilestoneApi from "@/fetchers/milestone/delete-milestone";
import type { MilestoneRow } from "@/fetchers/milestone/get-milestones";

// @epic-1.3-milestones: Team Leads and Admins need milestone tracking
// @epic-2.1-dashboard: Milestone persistence across browser sessions
// @role-team-lead @role-admin: Project oversight requires reliable milestone storage
//
// Backed by the real /api/milestone endpoints (apps/api/src/milestone) -
// this used to store everything in a single localStorage key, which meant
// milestones were never actually visible to anyone but the browser that
// created them, contradicting the whole point of "project oversight".

interface MilestoneTask {
  id: string;
  title: string;
  date: string;
  status: "upcoming" | "achieved" | "missed";
  description: string;
  type: "milestone";
  dependencies: string[];
  milestoneType: "phase_completion" | "deliverable" | "approval" | "deadline";
  stakeholders: string[];
  successCriteria: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// The API's dueDate is a full timestamptz; <input type="date"> and the rest
// of the frontend only ever deal with a bare "YYYY-MM-DD" (see the original
// localStorage hook and every consumer's formData.date usage).
function toMilestoneTask(row: MilestoneRow): MilestoneTask {
  return {
    id: row.id,
    title: row.title,
    date: row.dueDate.slice(0, 10),
    status: (row.status as MilestoneTask["status"]) || "upcoming",
    description: row.description ?? "",
    type: "milestone",
    dependencies: row.dependencyTaskIds ?? [],
    milestoneType:
      (row.type as MilestoneTask["milestoneType"]) || "deliverable",
    stakeholders: row.stakeholderIds ?? [],
    successCriteria: row.successCriteria ?? "",
    riskLevel: (row.riskLevel as MilestoneTask["riskLevel"]) || "medium",
    projectId: row.projectId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? row.createdAt,
  };
}

export function useMilestones(projectId?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["milestones", projectId],
    queryFn: () => getMilestones(projectId as string),
    enabled: !!projectId,
  });

  const milestones = useMemo(
    () => (data?.milestones ?? []).map(toMilestoneTask),
    [data],
  );

  const invalidate = () => {
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
    }
  };

  // No caller of create/update/delete awaits or catches these (they're all
  // fire-and-forget) - so both success and failure toasts must be surfaced
  // here, not by callers optimistically toasting "success" before the
  // request has actually resolved.
  const createMutation = useMutation({
    mutationFn: (
      milestoneData: Omit<MilestoneTask, "id" | "createdAt" | "updatedAt">,
    ) =>
      createMilestoneApi({
        projectId: milestoneData.projectId,
        title: milestoneData.title,
        description: milestoneData.description,
        type: milestoneData.milestoneType,
        status: milestoneData.status,
        dueDate: milestoneData.date,
        riskLevel: milestoneData.riskLevel,
        successCriteria: milestoneData.successCriteria,
        dependencyTaskIds: milestoneData.dependencies,
        stakeholderIds: milestoneData.stakeholders,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Milestone created successfully");
    },
    onError: (error) => {
      console.error("Failed to create milestone:", error);
      toast.error(userMessage(error, "save your milestone changes"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      milestoneId,
      updates,
    }: {
      milestoneId: string;
      updates: Partial<MilestoneTask>;
    }) =>
      updateMilestoneApi({
        milestoneId,
        title: updates.title,
        description: updates.description,
        type: updates.milestoneType,
        status: updates.status,
        dueDate: updates.date,
        riskLevel: updates.riskLevel,
        successCriteria: updates.successCriteria,
        dependencyTaskIds: updates.dependencies,
        stakeholderIds: updates.stakeholders,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Milestone updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update milestone:", error);
      toast.error(userMessage(error, "save your milestone changes"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (milestoneId: string) => deleteMilestoneApi(milestoneId),
    onSuccess: () => {
      invalidate();
      toast.success("Milestone deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete milestone:", error);
      toast.error(userMessage(error, "delete the milestone"));
    },
  });

  const createMilestone = (
    milestoneData: Omit<MilestoneTask, "id" | "createdAt" | "updatedAt">,
  ) => {
    createMutation.mutate(milestoneData);
  };

  const updateMilestone = (
    milestoneId: string,
    updates: Partial<MilestoneTask>,
  ) => {
    updateMutation.mutate({ milestoneId, updates });
  };

  const deleteMilestone = (milestoneId: string) => {
    deleteMutation.mutate(milestoneId);
  };

  // Kept for interface compatibility - every existing call site already
  // scopes the hook to a single project via the projectId argument, so this
  // just returns that same list back.
  const getProjectMilestones = (targetProjectId: string) =>
    targetProjectId === projectId ? milestones : [];

  const stats = useMemo(() => {
    return {
      total: milestones.length,
      upcoming: milestones.filter((m) => m.status === "upcoming").length,
      achieved: milestones.filter((m) => m.status === "achieved").length,
      missed: milestones.filter((m) => m.status === "missed").length,
      highRisk: milestones.filter(
        (m) => m.riskLevel === "high" || m.riskLevel === "critical",
      ).length,
      dueSoon: milestones.filter((m) => {
        const dueDate = new Date(m.date);
        const today = new Date();
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysUntilDue <= 7 && daysUntilDue > 0 && m.status === "upcoming";
      }).length,
    };
  }, [milestones]);

  return {
    milestones,
    allMilestones: milestones,
    isLoading,
    stats,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    getProjectMilestones,
  };
}
