import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteArticle } from "@/fetchers/help/delete-article";
import { toast } from "sonner";

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: () => {
      toast.success("Article deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["help-articles"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete article");
    },
  });
}
