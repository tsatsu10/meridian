import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteFAQ } from "@/fetchers/help/delete-faq";
import { toast } from "sonner";

export function useDeleteFAQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFAQ(id),
    onSuccess: () => {
      toast.success("FAQ deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["help-faqs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete FAQ");
    },
  });
}
