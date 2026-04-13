import getTask from "@/fetchers/task/get-task";
import { useQuery } from "@tanstack/react-query";

function useGetTask(taskId: string) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
    staleTime: 30 * 1000, // 30 seconds - tasks change frequently but not every second
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: !!taskId,
  });
}

export default useGetTask;
