import PageTitle from "@/components/page-title";
import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "../../components/auth/layout";
import { SignInForm } from "../../components/auth/sign-in-form";

export const Route = createFileRoute("/auth/sign-in")({
  component: SignIn,
});

function SignIn() {
  return (
    <>
      <PageTitle title="Sign In" />
      <AuthLayout
        title="Sign In"
        subtitle="to your account"
        gradientFrom="from-purple-400 via-pink-400 to-red-400"
        gradientTo="to-orange-500"
      >
        <SignInForm />
      </AuthLayout>
    </>
  );
}
