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
import useSignUp from "@/hooks/mutations/use-sign-up";
import { userMessage } from "@/lib/user-message";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type ZodType, z } from "zod";
import useAuth from "../providers/auth-provider/hooks/use-auth";
import PasswordStrengthIndicator from "./password-strength-indicator";

export type SignUpFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const signUpSchema: ZodType<SignUpFormValues> = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignUpFormProps = {
  /** The address entered on the surface's identity step (step 01). */
  email: string;
  /** Returns to step 01 with the entered email preserved. */
  onEditEmail: () => void;
};

export function SignUpForm({ email, onEditEmail }: SignUpFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { history } = useRouter();
  const { setUser } = useAuth();
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email,
      password: "",
      confirmPassword: "",
    },
  });
  const { mutateAsync, isPending } = useSignUp();
  const password = form.watch("password");

  // The email address is owned by the surface's identity step, not by this
  // form — here it's read-only (the chip below) and only ever changes via
  // onEditEmail, which the surface implements by unmounting this component
  // and returning to step 01 (AnimatePresence mode="wait": only one step is
  // ever mounted at a time). That means every mount of SignUpForm is a fresh
  // instance created with whatever `email` the surface most recently
  // validated — useForm's defaultValues are read once per mount, and here
  // "once" already means "with the current value," so there is no stale
  // copy for an effect to correct. See sign-in-form.tsx for the fuller
  // history of why an earlier sync effect was removed as dead code.
  const onSubmit = async (data: SignUpFormValues) => {
    try {
      const user = await mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setUser(user);
      toast.success("Account created successfully");

      setTimeout(() => {
        history.push("/dashboard");
      }, 500);
    } catch (error) {
      toast.error(userMessage(error, "create your account"));
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white/80">Name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  autoFocus
                  className="h-12 border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
                  placeholder="Jane Doe"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    autoComplete="new-password"
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
              <PasswordStrengthIndicator password={password} />
              <FormMessage />
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
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="h-12 border-white/15 bg-white/5 pr-10 text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
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
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 w-full bg-[#2DD4BF] font-semibold text-[#06121A] hover:bg-[#5FE3D3]"
        >
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </Form>
  );
}
