import { useState } from "react";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { AuroraBackdrop } from "@/components/auth/aurora-backdrop";
import { GlassPanel } from "@/components/auth/glass-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { MeridianMark } from "@/components/branding/meridian-mark";
import { Label } from "@/components/ui/label";
import PageTitle from "@/components/page-title";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";

export const Route = createFileRoute("/auth/verify-2fa")({
  component: Verify2FA,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: search.email as string,
    };
  },
});

// Space Grotesk for headings, matching the idiom already used in
// LandingPage.tsx — an arbitrary-value Tailwind class rather than a
// `fontFamily` theme key, since tailwind.config.js has none and both fonts
// are already loaded via the Google Fonts link in index.html.
const displayFont = "[font-family:'Space_Grotesk',sans-serif]";

function Verify2FA() {
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  void useRouter();
  const { setUser } = useAuth();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const pendingToken = sessionStorage.getItem("pending2FAToken");
    if (!pendingToken) {
      setError("Invalid session. Please sign in again.");
      return;
    }

    if (!useBackupCode && code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    if (useBackupCode && !backupCode) {
      setError("Please enter a backup code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const user = await apiClient.auth.twoFactor.verifyLogin({
        pendingToken,
        token: useBackupCode ? undefined : code,
        backupCode: useBackupCode ? backupCode : undefined,
      });

      sessionStorage.removeItem("pending2FAToken");

      setUser(user);
      toast.success("Verification successful!");
      navigate({ to: "/dashboard" });
    } catch (error) {
      const errorMessage = useBackupCode
        ? "Invalid backup code. Please try again."
        : "Invalid verification code. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate({ to: "/auth/sign-in" });
  };

  return (
    <>
      <PageTitle title="Two-Factor Verification" />
      <div className="relative flex min-h-svh items-center justify-center p-4">
        <AuroraBackdrop />
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <MeridianMark className="mb-4 h-12 w-12" />
            <h1
              className={`text-3xl font-semibold tracking-tight text-white ${displayFont}`}
            >
              Two-factor authentication
            </h1>
            <p className="mt-2 text-sm text-white/60">
              {useBackupCode
                ? "Enter one of your backup codes"
                : "Enter the code from your authenticator app"}
            </p>
          </div>

          <GlassPanel>
            <form onSubmit={handleVerify} className="space-y-6">
              {!useBackupCode ? (
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-white/80">
                    Verification Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setCode(value);
                      setError("");
                    }}
                    aria-describedby={error ? "verify-2fa-error" : undefined}
                    aria-invalid={error ? true : undefined}
                    className="h-14 border-white/15 bg-white/5 text-center font-mono text-2xl tracking-widest text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
                    autoFocus
                    disabled={isLoading}
                  />
                  <p className="text-center text-xs text-white/50">
                    The code changes every 30 seconds
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="backupCode" className="text-white/80">
                    Backup Code
                  </Label>
                  <Input
                    id="backupCode"
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={backupCode}
                    onChange={(e) => {
                      setBackupCode(e.target.value.toUpperCase());
                      setError("");
                    }}
                    aria-describedby={error ? "verify-2fa-error" : undefined}
                    aria-invalid={error ? true : undefined}
                    className="h-12 border-white/15 bg-white/5 text-center font-mono text-xl tracking-wider text-white placeholder:text-white/40 focus-visible:ring-[#2DD4BF]"
                    autoFocus
                    disabled={isLoading}
                  />
                  <p className="text-center text-xs text-white/50">
                    Enter one of the backup codes you saved during setup
                  </p>
                </div>
              )}

              {/* Rendered unconditionally, not `{error && ...}` — a live
               * region has to already exist in the DOM before its content
               * changes, or screen readers never announce the update. Only
               * the text content toggles. */}
              <p
                id="verify-2fa-error"
                aria-live="polite"
                className="text-sm text-red-300"
              >
                {error}
              </p>

              <Button
                type="submit"
                className="h-12 w-full bg-[#2DD4BF] font-semibold text-[#06121A] hover:bg-[#5FE3D3]"
                disabled={
                  isLoading ||
                  (!useBackupCode && code.length !== 6) ||
                  (useBackupCode && !backupCode)
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify and Continue"
                )}
              </Button>

              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full text-center text-sm font-medium text-[#2DD4BF] hover:underline"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setCode("");
                    setBackupCode("");
                    setError("");
                  }}
                  disabled={isLoading}
                >
                  {useBackupCode
                    ? "← Back to authenticator code"
                    : "Use backup code instead →"}
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 text-sm text-white/60 hover:text-white/80"
                  onClick={handleBackToLogin}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </button>
              </div>
            </form>
          </GlassPanel>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              Lost access to your authenticator?{" "}
              <button type="button" className="text-[#2DD4BF] hover:underline">
                Contact support
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Verify2FA;
