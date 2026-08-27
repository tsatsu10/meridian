import { AuroraBackdrop } from "@/components/auth/aurora-backdrop";
import { GlassPanel } from "@/components/auth/glass-panel";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { MeridianMark } from "@/components/branding/meridian-mark";
import PageTitle from "@/components/page-title";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Space Grotesk for headings, matching the idiom already used in
// LandingPage.tsx — an arbitrary-value Tailwind class rather than a
// `fontFamily` theme key, since tailwind.config.js has none and both fonts
// are already loaded via the Google Fonts link in index.html.
const displayFont = "[font-family:'Space_Grotesk',sans-serif]";

const searchSchema = z.object({
  // Optional so a tokenless visit renders the explanatory state below rather
  // than throwing a router validation error at someone who clicked a
  // truncated link.
  token: z.string().optional(),
});

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: searchSchema,
  component: ResetPassword,
});

function ResetPassword() {
  const { token } = Route.useSearch();

  return (
    <>
      <PageTitle title="Reset Password" />
      <div className="relative flex min-h-svh items-center justify-center p-4">
        <AuroraBackdrop />
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <MeridianMark className="mb-4 h-12 w-12" />
            <h1
              className={`text-3xl font-semibold tracking-tight text-white ${displayFont}`}
            >
              Choose a new password
            </h1>
            <p className="mt-2 text-sm text-white/60">
              {token
                ? "This link is single-use and expires one hour after it was sent."
                : "This link is missing its reset token."}
            </p>
          </div>
          <GlassPanel>
            {token ? (
              <ResetPasswordForm token={token} />
            ) : (
              <div className="space-y-6 text-center">
                <p className="text-sm leading-relaxed text-white/60">
                  Open the link straight from the email — some clients truncate
                  long URLs. If it keeps failing, request a new one; reset links
                  expire after an hour.
                </p>
                <a
                  href="/auth/forgot-password"
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-[#2DD4BF] text-sm font-semibold text-[#06121A] transition-colors hover:bg-[#5FE3D3]"
                >
                  Request a new link
                </a>
              </div>
            )}
          </GlassPanel>
        </div>
      </div>
    </>
  );
}
