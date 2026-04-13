// @epic-3.5-communication: Mutations for help article interactions

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rateArticle, submitArticleFeedback, submitFAQFeedback } from "@/fetchers/help/rate-article";
import { toast } from "sonner";

export function useRateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, rating }: { articleId: string; rating: number }) =>
      rateArticle(articleId, rating),
    onSuccess: (data, variables) => {
      toast.success("Thank you for your feedback!");
      // Invalidate article queries to refresh rating
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
      queryClient.invalidateQueries({ queryKey: ["help-article", variables.articleId] });
    },
    onError: (error) => {
      toast.error("Failed to submit rating");
      console.error("Rate article error:", error);
    },
  });
}

export function useArticleFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ articleId, helpful }: { articleId: string; helpful: boolean }) =>
      submitArticleFeedback(articleId, helpful),
    onSuccess: (data, variables) => {
      toast.success(variables.helpful ? "Marked as helpful!" : "Feedback recorded");
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
      queryClient.invalidateQueries({ queryKey: ["help-article", variables.articleId] });
    },
    onError: (error) => {
      toast.error("Failed to submit feedback");
      console.error("Article feedback error:", error);
    },
  });
}

export function useFAQFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ faqId, helpful }: { faqId: string; helpful: boolean }) =>
      submitFAQFeedback(faqId, helpful),
    onSuccess: (data, variables) => {
      toast.success(variables.helpful ? "Marked as helpful!" : "Feedback recorded");
      queryClient.invalidateQueries({ queryKey: ["help-faqs"] });
    },
    onError: (error) => {
      toast.error("Failed to submit feedback");
      console.error("FAQ feedback error:", error);
    },
  });
}
