import { AuthLayout } from "@/components/auth/layout";
import { SignUpForm } from "@/components/auth/sign-up-form";
import PageTitle from "@/components/page-title";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUp,
});

function SignUp() {
  return (
    <>
      <PageTitle title="Create Account" />
      <AuthLayout
        title="Sign Up"
        subtitle="Your Secret Companion"
        gradientFrom="from-blue-400 via-cyan-400 to-teal-400"
        gradientTo="to-green-500"
      >
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
