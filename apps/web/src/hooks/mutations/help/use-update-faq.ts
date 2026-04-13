import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFAQ, UpdateFAQInput } from "@/fetchers/help/update-faq";
import { toast } from "sonner";

export function useUpdateFAQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFAQInput }) =>
      updateFAQ(id, data),
    onSuccess: () => {
      toast.success("FAQ updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["help-faqs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update FAQ");
    },
  });
}
