// @epic-3.5-communication: React Query hook for single article

import { useQuery } from "@tanstack/react-query";
import { getArticle } from "@/fetchers/help/get-article";

export function useGetArticle(slug: string) {
  return useQuery({
    queryKey: ["help-article", slug],
    queryFn: () => getArticle(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
