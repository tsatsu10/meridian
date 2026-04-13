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
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { Eye, EyeOff, Mail, Lock, Chrome, Apple } from "lucide-react";
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

export function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { history } = useRouter();
  const { setUser } = useAuth();
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const { mutateAsync, isPending } = useSignIn();

  const onSubmit = async (data: SignInFormValues) => {
    try {
      const user = await mutateAsync({
        email: data.email,
        password: data.password,
      });
      setUser(user);
      toast.success("Signed in successfully");

      setTimeout(() => {
        history.push("/dashboard");
      }, 500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
    }
  };

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
                <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                  Email
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your email"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                  Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <a
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Forgot Password?
            </a>
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isPending ? "Signing In..." : "Sign In"}
          </Button>
        </form>
      </Form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500 font-medium">Or with</span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-12 border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-200"
        >
          <Chrome className="w-5 h-5 mr-2" />
          <span className="font-medium">Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-200"
        >
          <Apple className="w-5 h-5 mr-2" />
          <span className="font-medium">Apple</span>
        </Button>
      </div>

      {/* Sign Up Link */}
      <div className="text-center">
        <span className="text-sm text-gray-600">
          Not a member yet?{" "}
          <a href="/auth/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign Up
          </a>
        </span>
      </div>
    </div>
  );
}
