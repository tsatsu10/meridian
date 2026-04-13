import me from "@/fetchers/user/me";
import { useQuery } from "@tanstack/react-query";

function useGetMe() {
  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => me(),
    retry: 0,
    refetchOnMount: "always", // Always refetch to get fresh auth status
    refetchOnWindowFocus: false,
    staleTime: 0, // Consider data stale immediately
  });
  
  return query;
}

export default useGetMe;
