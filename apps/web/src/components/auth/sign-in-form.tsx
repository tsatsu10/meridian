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
import useSignIn from "@/hooks/mutations/use-sign-in";
import { userMessage } from "@/lib/user-message";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type ZodType, z } from "zod";
import useAuth from "../providers/auth-provider/hooks/use-auth";

export type SignInFormValues = {
  email: string;
  password: string;
};

const signInSchema: ZodType<SignInFormValues> = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type SignInFormProps = {
  /** The address entered on the surface's identity step (step 01). */
  email: string;
  /** Returns to step 01 with the entered email preserved. */
  onEditEmail: () => void;
};

export function SignInForm({ email, onEditEmail }: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { history } = useRouter();
  const { setUser } = useAuth();
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email,
      password: "",
    },
  });
  const { mutateAsync, isPending } = useSignIn();

  // The email address is owned by the surface's identity step, not by this
  // form — here it's read-only (the chip below) and only ever changes via
  // onEditEmail, which the surface implements by unmounting this component
  // and returning to step 01 (AnimatePresence mode="wait": only one step is
  // ever mounted at a time). That means every mount of SignInForm is a
  // fresh instance created with whatever `email` the surface most recently
  // validated — useForm's defaultValues are read once per mount, and here
  // "once" already means "with the current value," so there is no stale
  // copy for an effect to correct. (An earlier version of the surface kept
  // this component mounted-but-hidden permanently behind step 01, so
  // defaultValues.email could only ever be the empty string from that one
  // original mount; a `useEffect(() => form.setValue("email", email), ...)`
  // was needed there to keep it in sync. That architecture is gone, so the
  // effect was removed as dead code rather than left in place.)
  const onSubmit = async (data: SignInFormValues) => {
    try {
      const user = await mutateAsync({
        email: data.email,
        password: data.password,
      });

      // Password was correct, but the account has 2FA enabled — the API
      // withholds the session until the second factor is verified.
      // pendingToken is a short-lived bearer credential for that one
      // verification step — kept out of the URL (query strings end up in
      // browser history and server access logs) via sessionStorage instead.
      if (user.twoFactorRequired) {
        sessionStorage.setItem("pending2FAToken", user.pendingToken);
        history.push(
          `/auth/verify-2fa?email=${encodeURIComponent(user.email)}`,
        );
        return;
      }

      setUser(user);
      toast.success("Signed in successfully");

      setTimeout(() => {
        history.push("/dashboard");
      }, 500);
    } catch (error) {
      toast.error(userMessage(error, "sign you in"));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <span className="block text-sm font-medium text-white/80">Email</span>
          <button
            type="button"
            onClick={onEditEmail}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition-colors hover:border-white/20"
          >
            <span className="truncate">{email}</span>
            <span className="ml-3 shrink-0 text-xs text-[#2DD4BF]">Change</span>
          </button>
        </div>

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white/80">Password</FormLabel>
              <div className="relative">
                {/* FormControl's Slot forwards id/aria-describedby/aria-invalid
                 * onto its single direct child, so the Input has to be that
                 * child directly — wrapping it in this positioning div here
                 * (instead of inside FormControl) is what keeps the label's
                 * htmlFor pointing at the actual input. */}
                <FormControl>
                  {/* px-0 evicts Input's base `px-3` (redeclared
                   * `!important` by the density system in index.css) via
                   * tailwind-merge's same-group resolution — see the fuller
                   * explanation on the email field in
                   * forgot-password-form.tsx. `pr-10` alone can't win that
                   * fight (`pr`/`pl` are separate tailwind-merge groups from
                   * `px`), so without `px-0` here the eye toggle button
                   * overlaps a long password. */}
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    autoFocus
                    className="h-12 border-white/15 bg-white/5 px-0 pl-3 pr-10 text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
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
              <FormMessage className="text-red-300" />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <a
            href="/auth/forgot-password"
            className="text-sm font-medium text-[#2DD4BF] hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 w-full bg-[#2DD4BF] font-semibold text-[#06121A] hover:bg-[#5FE3D3]"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Form>
  );
}
