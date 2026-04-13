import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createArticle, CreateArticleInput } from "@/fetchers/help/create-article";
import { toast } from "sonner";

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateArticleInput) => createArticle(data),
    onSuccess: () => {
      toast.success("Article created successfully!");
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create article");
    },
  });
}
