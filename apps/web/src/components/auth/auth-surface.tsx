import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { z } from "zod";
import { MeridianMark } from "@/components/branding/meridian-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuroraBackdrop } from "./aurora-backdrop";
import { GlassPanel } from "./glass-panel";

export type AuthIntent = "sign-in" | "sign-up";

const emailSchema = z.string().email();

export type AuthSurfaceProps = {
  intent: AuthIntent;
  renderCredentialStep: (args: {
    email: string;
    onEditEmail: () => void;
  }) => React.ReactNode;
};

export function AuthSurface({
  intent,
  renderCredentialStep,
}: AuthSurfaceProps) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"identity" | "credential">("identity");
  const [error, setError] = useState<string | null>(null);

  const onContinue = (event: React.FormEvent) => {
    event.preventDefault();
    // Validated entirely on the client. Contacting the server here is what
    // would leak whether the address is registered — see task-3-brief.md.
    if (!emailSchema.safeParse(email).success) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setStep("credential");
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center p-4">
      <AuroraBackdrop />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <MeridianMark className="mb-4 h-12 w-12" />
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
            {intent === "sign-up" ? "Create your account" : "Welcome back"}
          </h1>
        </div>

        <GlassPanel>
          {/*
           * mode="sync" (the default) mounts the entering step immediately
           * instead of waiting for the outgoing step's exit animation to
           * finish first. Editing the email after advancing relies on the
           * identity step being back in the DOM right away.
           */}
          <AnimatePresence>
            {step === "identity" ? (
              <motion.form
                key="identity"
                onSubmit={onContinue}
                noValidate
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="auth-email" className="text-white/80">
                    Email
                  </Label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-describedby={error ? "auth-email-error" : undefined}
                    aria-invalid={error ? true : undefined}
                    className="h-12 border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
                    placeholder="you@work.com"
                  />
                  {error && (
                    <p
                      id="auth-email-error"
                      aria-live="polite"
                      className="text-sm text-red-300"
                    >
                      {error}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-[#2DD4BF] font-semibold text-[#06121A] hover:bg-[#5FE3D3]"
                >
                  Continue
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="credential"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24 }}
                className="space-y-5"
              >
                {renderCredentialStep({
                  email,
                  onEditEmail: () => setStep("identity"),
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </GlassPanel>

        <p className="mt-6 text-center text-sm text-white/60">
          {intent === "sign-in" ? (
            <>
              New to Meridian?{" "}
              <a
                href="/auth/sign-up"
                className="font-medium text-[#2DD4BF] hover:underline"
              >
                Create an account
              </a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a
                href="/auth/sign-in"
                className="font-medium text-[#2DD4BF] hover:underline"
              >
                Sign in
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
