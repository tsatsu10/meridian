import PageTitle from "@/components/page-title";
import { createFileRoute } from "@tanstack/react-router";
import { AuthSurface } from "@/components/auth/auth-surface";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUp,
});

function SignUp() {
  return (
    <>
      <PageTitle title="Sign Up" />
      <AuthSurface
        intent="sign-up"
        renderCredentialStep={({ email, onEditEmail }) => (
          <SignUpForm email={email} onEditEmail={onEditEmail} />
        )}
      />
    </>
  );
}
