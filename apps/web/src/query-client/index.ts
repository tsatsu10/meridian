import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
});

export default queryClient;
