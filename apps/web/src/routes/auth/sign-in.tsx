import PageTitle from "@/components/page-title";
import { createFileRoute } from "@tanstack/react-router";
import { AuthSurface } from "@/components/auth/auth-surface";
import { SignInForm } from "@/components/auth/sign-in-form";

export const Route = createFileRoute("/auth/sign-in")({
  component: SignIn,
});

function SignIn() {
  return (
    <>
      <PageTitle title="Sign In" />
      <AuthSurface
        intent="sign-in"
        renderCredentialStep={({ email, onEditEmail }) => (
          <SignInForm email={email} onEditEmail={onEditEmail} />
        )}
      />
    </>
  );
}
