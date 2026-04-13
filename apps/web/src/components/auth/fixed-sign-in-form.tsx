import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { logger } from "../../lib/logger";
import { API_BASE_URL, API_URL } from '@/constants/urls';

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export type SignInFormValues = SignInFormData;

export type Persona = {
  key: string;
  label: string;
  role: string;
  color: string;
  bgColor: string;
  icon: string;
  tagline: string;
  scene: string;
  quote: string;
  tip: string;
};

export function FixedSignInForm({ persona }: { persona?: Persona }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "demo@example.com",
      password: "password123",
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    logger.info("🚀 FIXED: onSubmit function called with data:");
    setError(null);
    setIsLoading(true);

    try {
      logger.info("📞 FIXED: Making API request to /api/users/sign-in");

      const response = await fetch(`${API_BASE_URL}/users/sign-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      logger.info("📡 FIXED: Response received");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Sign-in failed");
      }

      const responseData = await response.json();
      logger.info("✅ FIXED: Sign-in successful");

      // Store user data
      if (responseData.sessionToken) {
        localStorage.setItem('sessionToken', responseData.sessionToken);
      }

      const userData = responseData.user || responseData;
      sessionStorage.setItem('meridian-user', JSON.stringify(userData));

      logger.info("🧭 FIXED: Navigating to dashboard...");
      navigate({ to: "/dashboard" });

    } catch (err) {
      console.error("❌ FIXED: Sign-in error:", err);
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const buttonColor = persona?.color || "from-blue-600 to-blue-700";

  return (
    <div className="space-y-6">
      {/* Social Login Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-12 border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>
        <Button
          variant="outline"
          className="h-12 border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
          </svg>
          Twitter
        </Button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200 dark:border-zinc-600" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-zinc-800 px-2 text-gray-500 dark:text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      {/* Regular form - no complex Form provider */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="fixed-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="fixed-email"
              type="email"
              placeholder="Enter your email"
              className="pl-10 h-12 border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              {...form.register("email")}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="fixed-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="fixed-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pl-10 pr-12 h-12 border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* Forgot Password Link */}
        <div className="flex items-center justify-between">
          <a
            href="/auth/forgot-password"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline-offset-2 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Forgot your password?
          </a>
        </div>

        {/* Sign In Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className={`w-full h-12 bg-gradient-to-r ${buttonColor} text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Signing In...
            </div>
          ) : (
            "Sign In (Fixed)"
          )}
        </Button>
      </form>

      {/* Sign Up Link */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              logger.info("🔄 Sign-up button clicked - navigating to sign-up");
              navigate({ to: "/auth/sign-up" });
            }}
            className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline-offset-2 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded bg-transparent border-none cursor-pointer"
          >
            Sign up for free
          </button>
        </p>
      </div>
    </div>
  );
}