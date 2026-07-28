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
import { useEffect, useState } from "react";
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
  // onEditEmail. The zod resolver still validates the full SignInFormValues
  // shape though, so the form's own copy of `email` has to track the prop or
  // a stale/empty value would fail validation and silently block submission.
  // This is a plain in-memory state sync — no network call, timer, or
  // analytics — so it's safe to run on every render of this step, including
  // while it's mounted hidden before the user has advanced past step 01.
  useEffect(() => {
    form.setValue("email", email);
  }, [email, form]);

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
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    autoFocus
                    className="h-12 border-white/15 bg-white/5 pr-10 text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
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
              <FormMessage />
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
