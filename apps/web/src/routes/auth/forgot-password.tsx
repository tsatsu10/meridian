import { AuroraBackdrop } from "@/components/auth/aurora-backdrop";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { GlassPanel } from "@/components/auth/glass-panel";
import { MeridianMark } from "@/components/branding/meridian-mark";
import PageTitle from "@/components/page-title";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  return (
    <>
      <PageTitle title="Forgot Password" />
      <div className="relative flex min-h-svh items-center justify-center p-4">
        <AuroraBackdrop />
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <MeridianMark className="mb-4 h-12 w-12" />
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
              Forgot password?
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Enter your email to reset your password
            </p>
          </div>
          <GlassPanel>
            <ForgotPasswordForm />
          </GlassPanel>
        </div>
      </div>
    </>
  );
}
