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
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { Eye, EyeOff, Mail, Lock, User, Chrome, Apple } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { type ZodType, z } from "zod";
import useAuth from "../providers/auth-provider/hooks/use-auth";

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

export function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { history } = useRouter();
  const { setUser } = useAuth();
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const { mutateAsync, isPending } = useSignUp();

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
      toast.error(error instanceof Error ? error.message : "Failed to create account");
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                  Full Name
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your full name"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                      placeholder="Create a password"
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

          {/* Confirm Password Field */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                  Repeat Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Confirm your password"
                      type={showConfirmPassword ? "text" : "password"}
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Terms Checkbox */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms"
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required
            />
            <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
              I accept the{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                Terms
              </a>
            </label>
          </div>

          {/* Sign Up Button */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isPending ? "Creating Account..." : "Sign Up"}
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

      {/* Already have account */}
      <div className="text-center">
        <span className="text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/auth/sign-in" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign In
          </a>
        </span>
      </div>
    </div>
  );
}
