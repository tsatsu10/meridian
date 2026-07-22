/**
 * useCreateTask's onSuccess invalidated queryKey ["project-tasks"] — a key
 * that matches no actual query in the app (grep confirms it's referenced
 * nowhere else). The board's real task list comes from useGetTasks
 * (apps/web/src/hooks/queries/task/use-get-tasks.ts), whose query key is
 * ["tasks", projectId]. Net effect: after creating a task, the board kept
 * showing "No tasks yet" until either its 5s poll caught up or the page was
 * fully reloaded — reproduced manually during Phase 12 by creating a task
 * and watching the board not update.
 *
 * This proves the mutation now refetches the exact key the board reads from.
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import useCreateTask from "../use-create-task";

vi.mock("@/fetchers/task/create-task", () => ({
  default: vi.fn().mockResolvedValue({ id: "new-task-id" }),
}));

vi.mock("@/store/workspace", () => ({
  default: () => ({ workspace: { id: "workspace-1" } }),
}));

describe("useCreateTask invalidates the board's actual task query", () => {
  it("refetches [\"tasks\", projectId] — the key useGetTasks reads from", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    result.current.mutate({
      title: "Test task",
      description: "",
      projectId: "project-123",
      userEmail: "user@example.com",
      status: "todo",
      dueDate: new Date().toISOString(),
      priority: "medium",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const allCalls = [...refetchSpy.mock.calls, ...invalidateSpy.mock.calls];
    const targetedBoardTasks = allCalls.some(
      ([arg]) =>
        Array.isArray(arg?.queryKey) &&
        arg.queryKey[0] === "tasks" &&
        arg.queryKey[1] === "project-123",
    );

    expect(targetedBoardTasks).toBe(true);
  });
});
