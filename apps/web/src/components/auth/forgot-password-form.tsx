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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSubmitted(true);
      toast.success("Password reset email sent!");
    } catch (error) {
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Check your email
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            We've sent a password reset link to{" "}
            <span className="font-medium text-gray-900">
              {form.getValues("email")}
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full h-12 rounded-xl"
          onClick={() => setIsSubmitted(false)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
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
                <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                  Email
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your email address"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isPending ? "Sending..." : "Submit"}
          </Button>
        </form>
      </Form>

      {/* Cancel Button */}
      <Button
        variant="outline"
        className="w-full h-12 border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-200"
        asChild
      >
        <a href="/auth/sign-in">Cancel</a>
      </Button>
    </div>
  );
} 