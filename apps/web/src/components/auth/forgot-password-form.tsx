import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { userMessage } from "@/lib/user-message";
import { type ZodType, z } from "zod";

export type ForgotPasswordFormValues = {
  email: string;
};

const forgotPasswordSchema: ZodType<ForgotPasswordFormValues> = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export function ForgotPasswordForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (_data: ForgotPasswordFormValues) => {
    setIsPending(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIsSubmitted(true);
      toast.success("Password reset email sent!");
    } catch (error) {
      toast.error(userMessage(error, "send the reset email"));
    } finally {
      setIsPending(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2DD4BF]/10">
          <Mail className="h-8 w-8 text-[#2DD4BF]" />
        </div>
        <div>
          <h3 className="mb-2 text-lg font-semibold text-white">
            Check your email
          </h3>
          <p className="text-sm leading-relaxed text-white/60">
            We've sent a password reset link to{" "}
            <span className="font-medium text-white">
              {form.getValues("email")}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          className="h-12 w-full border-white/15 bg-white/5 text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white"
          onClick={() => setIsSubmitted(false)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to form
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Email</FormLabel>
                <div className="relative">
                  {/* FormControl's Slot forwards id/aria-describedby/aria-invalid
                   * onto its single direct child, so the Input has to be that
                   * child directly — wrapping it in this positioning div here
                   * (instead of inside FormControl) is what keeps the label's
                   * htmlFor pointing at the actual input. */}
                  <FormControl>
                    <Input
                      autoComplete="email"
                      autoFocus
                      className="h-12 border-white/15 bg-white/5 pl-10 text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
                      placeholder="Enter your email address"
                      {...field}
                    />
                  </FormControl>
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isPending}
            className="h-12 w-full bg-[#2DD4BF] font-semibold text-[#06121A] hover:bg-[#5FE3D3]"
          >
            {isPending ? "Sending..." : "Submit"}
          </Button>
        </form>
      </Form>

      {/* Cancel Button */}
      <Button
        variant="outline"
        className="h-12 w-full border-white/15 bg-white/5 text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white"
        asChild
      >
        <a href="/auth/sign-in">Cancel</a>
      </Button>
    </div>
  );
}
