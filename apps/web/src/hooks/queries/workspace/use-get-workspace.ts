import getWorkspace from "@/fetchers/workspace/get-workspace";
import { useQuery } from "@tanstack/react-query";

function useGetWorkspace({ id }: { id: string }) {
  return useQuery({
    queryKey: [`workspace-${id}`],
    enabled: !!id,
    queryFn: () => getWorkspace({ id }),
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error?.message?.includes('404') || error?.message?.includes('not found')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: 1000,
  });
}

export default useGetWorkspace;
