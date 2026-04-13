// @epic-3.5-communication: React Query hooks for help articles

import { useQuery } from "@tanstack/react-query";
import { getArticles, GetArticlesParams } from "@/fetchers/help/get-articles";

export function useGetArticles(params: GetArticlesParams = {}) {
  return useQuery({
    queryKey: ["help-articles", params],
    queryFn: () => getArticles(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - help content doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
