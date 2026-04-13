import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFAQ, CreateFAQInput } from "@/fetchers/help/create-faq";
import { toast } from "sonner";

export function useCreateFAQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFAQInput) => createFAQ(data),
    onSuccess: () => {
      toast.success("FAQ created successfully!");
      queryClient.invalidateQueries({ queryKey: ["help-faqs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create FAQ");
    },
  });
}
