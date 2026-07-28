import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { z } from "zod";
import { MeridianMark } from "@/components/branding/meridian-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { AuroraBackdrop } from "./aurora-backdrop";
import { GlassPanel } from "./glass-panel";

export type AuthIntent = "sign-in" | "sign-up";

const emailSchema = z.string().email();

// Space Grotesk for headings, matching the idiom already used in
// LandingPage.tsx — an arbitrary-value Tailwind class rather than a
// `fontFamily` theme key, since tailwind.config.js has none and both fonts
// are already loaded via the Google Fonts link in index.html.
const displayFont = "[font-family:'Space_Grotesk',sans-serif]";

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
  const reducedMotion = usePrefersReducedMotion();

  // The no-enumeration guarantee lives on the identity step's submit
  // handler below: it only ever calls setState after a purely client-side
  // zod check, never fetch/XHR — see task-3-brief.md and the
  // "never contacts the server" test.
  const stepTransition = { duration: reducedMotion ? 0 : 0.24 };
  const riseOffset = reducedMotion ? 0 : 8;

  const onContinue = (event: React.FormEvent) => {
    event.preventDefault();
    // Validated entirely on the client. Contacting the server here is what
    // would leak whether the address is registered — see task-3-brief.md.
    // Trimmed first: a pasted " a@b.com " has no whitespace visible to the
    // user, but z.string().email() rejects it outright.
    const trimmedEmail = email.trim();
    if (!emailSchema.safeParse(trimmedEmail).success) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setEmail(trimmedEmail);
    setStep("credential");
  };

  const onEditEmail = () => setStep("identity");

  return (
    <div className="relative flex min-h-svh items-center justify-center p-4">
      <AuroraBackdrop />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <MeridianMark className="mb-4 h-12 w-12" />
          <h1
            className={`text-3xl font-semibold tracking-tight text-white ${displayFont}`}
          >
            {intent === "sign-up" ? "Create your account" : "Welcome back"}
          </h1>
        </div>

        <GlassPanel>
          {/*
           * Only one step is ever mounted at a time (AnimatePresence
           * mode="wait": the outgoing step's exit animation finishes before
           * the incoming step mounts). That's deliberate, not an oversight —
           * an earlier version of this component mounted both steps
           * permanently so a transition would never resize the panel, but
           * that meant the panel was *always* sized to fit the taller of
           * the two steps, leaving permanent dead space under the shorter
           * one (visible on step 01, the screen nearly every user lands
           * on). Mounting one step at a time fixes the dead space and, as a
           * side effect, removes the orphan-focus risk outright: there is
           * never a hidden-but-hydrated sibling step for a screen reader or
           * Tab press to land on, because there is nothing hidden — the
           * outgoing step is genuinely gone by the time the incoming one
           * exists.
           *
           * The `motion.div layout` wrapper is what keeps the resulting
           * height change from snapping: framer-motion measures the
           * wrapper's box before and after each step swap and animates
           * between them (a FLIP-style transform), instead of the panel
           * instantly jumping to the new step's height. It shares
           * `stepTransition` with the step animations below, so reduced
           * motion collapses this to duration 0 (instant, no animation) the
           * same way it does everywhere else — the panel still only ever
           * sizes to the active step either way.
           *
           * data-auth-step / data-step-transition-duration are plain
           * markers for tests, not styling.
           */}
          <motion.div layout transition={stepTransition}>
            <AnimatePresence mode="wait">
              {step === "identity" ? (
                <motion.form
                  key="identity"
                  data-auth-step="identity"
                  onSubmit={onContinue}
                  noValidate
                  initial={{ opacity: 0, y: riseOffset }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -riseOffset }}
                  transition={stepTransition}
                  data-step-transition-duration={stepTransition.duration}
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
                    {/* Rendered unconditionally, not `{error && ...}` — a
                     * live region has to already exist in the DOM before its
                     * content changes, or screen readers never announce the
                     * update. Only the text content toggles. */}
                    <p
                      id="auth-email-error"
                      aria-live="polite"
                      className="text-sm text-red-300"
                    >
                      {error}
                    </p>
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
                  data-auth-step="credential"
                  initial={{ opacity: 0, y: riseOffset }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -riseOffset }}
                  transition={stepTransition}
                  data-step-transition-duration={stepTransition.duration}
                  className="space-y-5"
                >
                  {renderCredentialStep({ email, onEditEmail })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
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
