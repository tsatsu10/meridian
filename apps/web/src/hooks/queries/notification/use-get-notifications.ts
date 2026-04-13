import getNotifications from "@/fetchers/notification/get-notifications";
import { useQuery } from "@tanstack/react-query";

function useGetNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    select: (data) => {
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
    initialData: [],
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error
      if (error instanceof Error && error.message.includes("401")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export default useGetNotifications;
