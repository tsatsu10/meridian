import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateArticle, UpdateArticleInput } from "@/fetchers/help/update-article";
import { toast } from "sonner";

export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateArticleInput }) =>
      updateArticle(id, data),
    onSuccess: () => {
      toast.success("Article updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update article");
    },
  });
}
