import { AuthLayout } from "@/components/auth/layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import PageTitle from "@/components/page-title";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  return (
    <>
      <PageTitle title="Forgot Password" />
      <AuthLayout
        title="Forgot Password?"
        subtitle="Enter your email to reset your password"
        gradientFrom="from-green-400 via-blue-400 to-purple-400"
        gradientTo="to-indigo-600"
      >
        <ForgotPasswordForm />
      </AuthLayout>
    </>
  );
} 