import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { MeridianMark } from "@/components/branding/meridian-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
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

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** Classes applied to whichever step is not the current one: hidden from
 * layout-visible rendering and from focus/pointer interaction, but still
 * occupying its grid cell so the panel never reflows when the active step
 * changes. */
const INACTIVE_STEP_CLASSES = "invisible pointer-events-none";

export function AuthSurface({
  intent,
  renderCredentialStep,
}: AuthSurfaceProps) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"identity" | "credential">("identity");
  const [error, setError] = useState<string | null>(null);
  // The credential step is only ever mounted once the user has actually
  // advanced past identity (renderCredentialStep must not run — and its
  // content must not exist in the DOM — before that; see task-3 tests). Once
  // mounted, it stays mounted so going back to "edit email" and forward
  // again is a pure opacity/visibility toggle, not a re-mount.
  const [hasAdvancedOnce, setHasAdvancedOnce] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const identityActive = step === "identity";
  const credentialActive = step === "credential";
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
    if (!emailSchema.safeParse(email).success) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setHasAdvancedOnce(true);
    setStep("credential");
    // The focused Continue button is about to become inert/invisible; move
    // focus off it first so it's never left inside a hidden subtree.
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const onEditEmail = () => {
    setStep("identity");
    (document.activeElement as HTMLElement | null)?.blur();
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
           * Both steps live in the same grid cell (col-start-1 row-start-1)
           * instead of one being conditionally unmounted while the other
           * mounts. That makes step changes a true cross-fade: the panel's
           * height is always sized to fit whichever step is tallest, so
           * there's no reflow when switching, and the entering step never
           * has to wait for the outgoing step's exit animation to finish
           * before it appears. The inactive step stays in the DOM (so
           * "change email" can restore it instantly with the typed value
           * intact) but is aria-hidden and visually hidden
           * (visibility: hidden, which — unlike display: none — still
           * reserves its layout space and also removes it and all its
           * descendants from the tab order), so it can never be a
           * focusable/clickable orphan while the other step is showing.
           *
           * data-step-transition-duration mirrors stepTransition.duration —
           * the exact value handed to both motion elements' `transition`
           * prop below — as a plain data attribute, so a test can assert on
           * the real wiring directly instead of racing framer-motion's
           * animation frame. It deliberately reads the same variable that
           * drives the animation (not a separately-computed reducedMotion
           * check) so the two can't silently drift apart.
           */}
          <div
            className="grid"
            data-step-transition-duration={stepTransition.duration}
          >
            <motion.form
              onSubmit={onContinue}
              noValidate
              aria-hidden={!identityActive}
              animate={{
                opacity: identityActive ? 1 : 0,
                y: identityActive ? 0 : -riseOffset,
              }}
              transition={stepTransition}
              className={cn(
                "col-start-1 row-start-1 space-y-5",
                !identityActive && INACTIVE_STEP_CLASSES,
              )}
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

            {hasAdvancedOnce && (
              <motion.div
                aria-hidden={!credentialActive}
                initial={{ opacity: 0, y: riseOffset }}
                animate={{
                  opacity: credentialActive ? 1 : 0,
                  y: credentialActive ? 0 : riseOffset,
                }}
                transition={stepTransition}
                className={cn(
                  "col-start-1 row-start-1 space-y-5",
                  !credentialActive && INACTIVE_STEP_CLASSES,
                )}
              >
                {renderCredentialStep({ email, onEditEmail })}
              </motion.div>
            )}
          </div>
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
