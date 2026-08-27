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
import { API_BASE_URL } from "@/constants/urls";
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

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsPending(true);
    try {
      // This used to be `await new Promise(r => setTimeout(r, 2000))` followed
      // by a success toast — the form never contacted the server, so the
      // screen claimed an email had been sent that was never requested. The
      // endpoint existed the whole time.
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: data.email }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string } | string;
        } | null;
        const reason =
          typeof body?.error === "string" ? body.error : body?.error?.message;
        throw new Error(
          reason || `Request failed with status ${response.status}`,
        );
      }

      // The API deliberately answers success whether or not the address is
      // registered, so this confirmation must not imply the account exists.
      setIsSubmitted(true);
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
          {/* Deliberately conditional: the API answers success whether or not
           * the address is registered, so asserting "we sent you a link" would
           * both mislead and confirm the account exists. */}
          <p className="text-sm leading-relaxed text-white/60">
            If an account exists for{" "}
            <span className="font-medium text-white">
              {form.getValues("email")}
            </span>
            , a reset link is on its way. It expires in one hour. Check your
            spam folder if it hasn't arrived in a few minutes.
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
                  {/* px-0 is load-bearing, not decorative: Input's base
                   * classes include `px-3`, and index.css's density system
                   * redeclares `.px-3` with `!important` on both padding
                   * sides. `pl-10`/`pr-3` alone can't override that — but
                   * tailwind-merge only evicts an earlier class when the
                   * later one is in the exact same class group, and `px-0`
                   * is in the same group as `px-3` (unlike `pl-10`/`pr-3`,
                   * which belong to separate `pl`/`pr` groups). So `px-0`
                   * drops `px-3` from the rendered class list entirely, and
                   * only then do `pl-10`/`pr-3` take effect. Removing
                   * `px-0` reintroduces the bug: the Mail icon overlaps the
                   * placeholder text because the input keeps px-3's forced
                   * padding underneath it. */}
                  <FormControl>
                    <Input
                      autoComplete="email"
                      autoFocus
                      className="h-12 border-white/15 bg-white/5 px-0 pl-10 pr-3 text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
                      placeholder="Enter your email address"
                      {...field}
                    />
                  </FormControl>
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40"
                  />
                </div>
                <FormMessage className="text-red-300" />
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

      {/* Cancel Button. A plain anchor rather than <Button asChild> — the
       * Button component's asChild path wraps its content in an inner
       * `inline-flex ... w-full h-full` span whose own `h-full` collides
       * with the `h-12` we pass in (Radix Slot merges classNames by
       * concatenation, not tailwind-merge, so both stay in the class list
       * and the Tailwind cascade doesn't reliably pick `h-12`), collapsing
       * the button to a content-sized strip. A direct anchor styled to the
       * same footprint sidesteps that entirely. */}
      <a
        href="/auth/sign-in"
        className="flex h-12 w-full items-center justify-center rounded-lg border border-white/15 bg-white/5 text-sm font-medium text-white/80 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
      >
        Cancel
      </a>
    </div>
  );
}
