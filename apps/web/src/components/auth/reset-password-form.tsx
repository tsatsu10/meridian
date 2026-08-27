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
import { userMessage } from "@/lib/user-message";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type ZodType, z } from "zod";
import PasswordStrengthIndicator from "./password-strength-indicator";

export type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

// Mirrors apps/api/src/auth/routes/email-verification.ts's zValidator exactly.
// A weaker client schema here would let the form submit a password the server
// then rejects, turning a fixable inline field error into a toast.
const resetPasswordSchema: ZodType<ResetPasswordFormValues> = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Include at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormProps = {
  /** The single-use token from the emailed link's `?token=` parameter. */
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const { history } = useRouter();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  const password = form.watch("password");

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsPending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
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

      setIsDone(true);
    } catch (error) {
      toast.error(userMessage(error, "reset your password"));
    } finally {
      setIsPending(false);
    }
  };

  if (isDone) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2DD4BF]/10">
          <CheckCircle2 className="h-8 w-8 text-[#2DD4BF]" />
        </div>
        <div>
          <h3 className="mb-2 text-lg font-semibold text-white">
            Password updated
          </h3>
          <p className="text-sm leading-relaxed text-white/60">
            Sign in with your new password. Any other devices already signed in
            to this account have been signed out.
          </p>
        </div>
        <Button
          onClick={() => history.push("/auth/sign-in")}
          className="h-12 w-full bg-[#2DD4BF] font-semibold text-[#06121A] hover:bg-[#5FE3D3]"
        >
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white/80">New password</FormLabel>
              <div className="relative">
                {/* FormControl's Slot forwards id/aria-describedby/aria-invalid
                 * onto its single direct child, so the Input has to be that
                 * child directly — wrapping it in this positioning div here
                 * (instead of inside FormControl) is what keeps the label's
                 * htmlFor pointing at the actual input. */}
                <FormControl>
                  {/* px-0 evicts Input's base `px-3` (redeclared `!important`
                   * by the density system in index.css) via tailwind-merge's
                   * same-group resolution — see the fuller explanation on the
                   * email field in forgot-password-form.tsx. `pr-10` alone
                   * can't win that fight (`pr`/`pl` are separate
                   * tailwind-merge groups from `px`), so without `px-0` here
                   * the eye toggle button overlaps a long password. */}
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    autoFocus
                    className="h-12 border-white/15 bg-white/5 px-0 pl-3 pr-10 text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} />
              <FormMessage className="text-red-300" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white/80">Confirm password</FormLabel>
              <div className="relative">
                <FormControl>
                  {/* px-0: same reason as the field above. */}
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="h-12 border-white/15 bg-white/5 px-0 pl-3 pr-10 text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <FormMessage className="text-red-300" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 w-full bg-[#2DD4BF] font-semibold text-[#06121A] hover:bg-[#5FE3D3]"
        >
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Form>
  );
}
