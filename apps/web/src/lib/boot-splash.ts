/**
 * Controls the boot splash defined in index.html.
 *
 * The splash covers the app until the first screen is genuinely ready, then
 * fades out. Screens with meaningful data (the dashboard) "claim" it on mount
 * so it is not lifted early, and "release" it once their data has landed.
 *
 * Effect ordering makes the claim reliable: React runs child layout effects
 * before parent ones, so a route claims before <App/> tries to hide.
 */

const SPLASH_ID = "boot-splash";
const HIDDEN_CLASS = "boot-screen--hidden";

let claimed = false;
let hidden = false;

/**
 * Fade out the splash. It is never removed from the DOM afterward — see the
 * comment on `.boot-screen--hidden` in index.html for why (removal itself
 * was causing a visible ripple). It stays permanently opacity:0,
 * visibility:hidden, pointer-events:none: invisible, unpainted, inert.
 *
 * No-op while a screen holds a claim, unless `force` is set.
 */
export function hideBootSplash(force = false): void {
  if (hidden) return;
  if (claimed && !force) return;
  hidden = true;

  // Restore normal page scrolling BEFORE the fade starts. Lifting
  // `overflow: hidden` is itself a layout-affecting change, and this
  // codebase has a blanket `* { transition-duration }` rule, so the
  // resulting reflow can make hundreds of elements register a CSS
  // transition simultaneously. Doing it while the splash is still fully
  // opaque hides that behind the splash instead of causing a visible burst
  // right when the splash disappears.
  document.documentElement.classList.remove("booting");

  document.getElementById(SPLASH_ID)?.classList.add(HIDDEN_CLASS);
}

/** Hold the splash open — the caller is responsible for releasing it. */
export function claimBootSplash(): void {
  if (hidden) return;
  claimed = true;
}

/** Release a claim and fade the splash out. */
export function releaseBootSplash(): void {
  claimed = false;
  hideBootSplash(true);
}

/** Skeleton placeholders are marked with Tailwind's animate-pulse. */
const SKELETON_SELECTOR = ".animate-pulse";

/**
 * Animations belonging to the splash itself (its infinite topple/flash loop)
 * don't count as "the app is still settling" — only the revealed content's
 * animations do.
 */
function runningContentAnimationCount(): number {
  const splash = document.getElementById(SPLASH_ID);
  let count = 0;
  for (const anim of document.getAnimations()) {
    if (anim.playState !== "running") continue;
    const target =
      anim.effect && "target" in anim.effect
        ? (anim.effect as KeyframeEffect).target
        : null;
    if (target && splash?.contains(target)) continue;
    count++;
  }
  return count;
}

/**
 * Release once the screen has both stopped showing skeleton placeholders AND
 * finished any entrance animations (e.g. Framer Motion fade/blur-ins on stat
 * cards), so the crossfade reveals a finished scene instead of a cascade of
 * elements still animating into place — which reads as the background
 * flickering right as the splash disappears.
 *
 * Two phases: first wait for skeletons to clear and stay clear (`quietMs` /
 * `graceMs`); then wait for the page's own running animations (excluding
 * the splash's) to quiet down for `animationQuietMs`, capped at
 * `animationMaxWaitMs` so a permanently-looping animation elsewhere on the
 * page cannot hang the splash indefinitely.
 *
 * Only call this once the screen has actually rendered; calling it earlier
 * would see zero placeholders (nothing rendered yet) and release immediately.
 *
 * `maxWaitMs` is the hard overall cap across both phases.
 */
export function releaseBootSplashWhenSettled({
  quietMs = 250,
  graceMs = 600,
  animationQuietMs = 150,
  animationMaxWaitMs = 1600,
  maxWaitMs = 6000,
}: {
  quietMs?: number;
  graceMs?: number;
  animationQuietMs?: number;
  animationMaxWaitMs?: number;
  maxWaitMs?: number;
} = {}): void {
  const start = performance.now();
  let quietSince: number | null = null;
  let sawBusy = false;
  let domSettledAt: number | null = null;
  let animQuietSince: number | null = null;

  const check = () => {
    if (hidden) return;
    const now = performance.now();

    if (domSettledAt === null) {
      // Phase 1: skeleton placeholders gone and staying gone.
      const busy = document.querySelector(SKELETON_SELECTOR) !== null;
      if (busy) {
        sawBusy = true;
        quietSince = null;
      } else if (quietSince === null) {
        quietSince = now;
      }

      // Widgets mount a render or two after their parent, so an empty screen
      // is not yet proof of "settled". Only trust quiet once we have
      // actually seen a skeleton, or the grace period has passed with none
      // appearing.
      const trustQuiet = sawBusy || now - start >= graceMs;
      const domSettled =
        trustQuiet && quietSince !== null && now - quietSince >= quietMs;

      if (domSettled) {
        domSettledAt = now;
      } else if (now - start >= maxWaitMs) {
        releaseBootSplash();
        return;
      }
      requestAnimationFrame(check);
      return;
    }

    // Phase 2: the DOM stopped changing shape, but entrance animations may
    // still be mid-flight. Wait for those too.
    const animBusy = runningContentAnimationCount() > 0;
    if (animBusy) {
      animQuietSince = null;
    } else if (animQuietSince === null) {
      animQuietSince = now;
    }

    const animSettled =
      animQuietSince !== null && now - animQuietSince >= animationQuietMs;
    const animTimedOut = now - domSettledAt >= animationMaxWaitMs;

    if (animSettled || animTimedOut || now - start >= maxWaitMs) {
      releaseBootSplash();
      return;
    }
    requestAnimationFrame(check);
  };

  requestAnimationFrame(check);
}
