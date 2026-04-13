// @epic-3.5-communication: React Query hook for FAQs

import { useQuery } from "@tanstack/react-query";
import { getFAQs, GetFAQsParams } from "@/fetchers/help/get-faqs";

export function useGetFAQs(params: GetFAQsParams = {}) {
  return useQuery({
    queryKey: ["help-faqs", params],
    queryFn: () => getFAQs(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
