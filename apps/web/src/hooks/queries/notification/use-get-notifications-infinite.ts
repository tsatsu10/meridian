import getNotifications from "@/fetchers/notification/get-notifications";
import { useInfiniteQuery } from "@tanstack/react-query";

interface UseGetNotificationsInfiniteOptions {
  includeArchived?: boolean;
}

function useGetNotificationsInfinite(options?: UseGetNotificationsInfiniteOptions) {
  const { includeArchived = false } = options || {};

  return useInfiniteQuery({
    queryKey: ["notifications-infinite", includeArchived],
    queryFn: ({ pageParam = 0 }) => 
      getNotifications({ 
        limit: 50, 
        offset: pageParam, 
        includeArchived 
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.offset + lastPage.pagination.limit;
      }
      return undefined;
    },
    initialPageParam: 0,
    select: (data) => {
      // Flatten all pages into a single array
      const allNotifications = data.pages.flatMap((page) => page.notifications);
      return {
        notifications: allNotifications,
        pagination: data.pages[data.pages.length - 1]?.pagination,
        pages: data.pages,
      };
    },
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error
      if (error instanceof Error && error.message.includes("401")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export default useGetNotificationsInfinite;

