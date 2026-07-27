import { MeridianMarkLoading } from "@/components/branding/meridian-mark-loading";

/**
 * Full-screen boot/loading screen showing the animated Meridian mark.
 *
 * Shared by the initial lazy-chunk Suspense fallback (main.tsx) and the auth
 * gate (auth-provider) so both stages of the boot sequence are identical and
 * the transition between them is seamless.
 */
export function AppLoadingScreen() {
  return (
    <div className="flex w-full items-center justify-center h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <MeridianMarkLoading className="h-[120px] w-[120px]" />
    </div>
  );
}

export default AppLoadingScreen;
