# Aurora Auth Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blue/purple gradient sign-in and sign-up pages with one on-brand, two-step "aurora depth" auth surface, without changing any auth API, route or error semantic.

**Architecture:** Three new presentational components (`aurora-backdrop`, `glass-panel`, `auth-surface`) compose the shell. `auth-surface` owns a small step machine (`identity` → `credential`) and renders the existing sign-in/sign-up forms as step bodies. The forms keep their current react-hook-form schemas, mutations and submit handlers; only their markup and which fields they render changes.

**Tech Stack:** React 19, TypeScript, TanStack Router, react-hook-form + zod, framer-motion (already a dependency), Tailwind, vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-28-aurora-auth-surface-design.md`

## Global Constraints

Every task's requirements implicitly include these.

- **No API changes.** No file under `apps/api/` is touched by this plan.
- **No route changes.** `/auth/sign-in` and `/auth/sign-up` both remain real routes rendering the same component; the route seeds intent only.
- **No account enumeration.** Step 01 must never issue a network request. The UI must never branch on a server response about whether an address exists.
- **Palette:** base `#0B1220`, indigo bloom `#1B2559` at 40%, teal bloom `#2DD4BF` at 12%. Teal is used only for focus rings, the primary CTA and the mark — never body text, never large fills.
- **Card:** `blur(24px)`, `rgb(255 255 255 / 0.07)` fill, `1px solid rgb(255 255 255 / 0.12)` border, `inset 0 1px 0 rgb(255 255 255 / 0.10)`, `0 32px 64px -16px rgb(0 0 0 / 0.55)`.
- **Motion:** step change 240ms cross-fade + 8px rise. `prefers-reduced-motion: reduce` disables aurora drift, pointer tilt and step transition.
- **Dark-only surface**, regardless of app theme.
- **Type:** Space Grotesk for headings, Inter for everything else. No new font requests.
- **Errors** go through `userMessage(error, "<action>")` from `@/lib/user-message`.
- **Accessibility:** real `<form>`, bound labels, `autocomplete` tokens, Enter submits, errors via `aria-describedby` + `aria-live`, visible focus never suppressed.

---

### Task 1: Aurora backdrop

**Files:**
- Create: `apps/web/src/components/auth/aurora-backdrop.tsx`
- Test: `apps/web/src/components/auth/__tests__/aurora-backdrop.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<AuroraBackdrop />` — no props. Renders a fixed, `aria-hidden` full-viewport layer stack. Later tasks render it once, behind the panel.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuroraBackdrop } from "../aurora-backdrop";

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
}

describe("AuroraBackdrop", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("is hidden from assistive technology", () => {
    mockReducedMotion(false);
    const { container } = render(<AuroraBackdrop />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("animates the blooms by default", () => {
    mockReducedMotion(false);
    const { container } = render(<AuroraBackdrop />);
    expect(container.querySelectorAll("[data-aurora-bloom]").length).toBe(2);
    expect(container.querySelector("[data-aurora-animated='true']")).not.toBeNull();
  });

  it("renders static when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(<AuroraBackdrop />);
    expect(container.querySelectorAll("[data-aurora-bloom]").length).toBe(2);
    expect(container.querySelector("[data-aurora-animated='true']")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/aurora-backdrop.test.tsx`
Expected: FAIL — cannot resolve `../aurora-backdrop`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useEffect, useState } from "react";

/** Grain, as inline SVG turbulence — no image request, tiles at any size. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")";

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

export function AuroraBackdrop() {
  const reduced = usePrefersReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ backgroundColor: "#0B1220" }}
    >
      <div
        data-aurora-bloom="indigo"
        {...(reduced ? {} : { "data-aurora-animated": "true" })}
        className={`absolute -left-[20%] -top-[30%] h-[80vmax] w-[80vmax] rounded-full blur-3xl ${
          reduced ? "" : "animate-[aurora-drift-a_60s_ease-in-out_infinite]"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgb(27 37 89 / 0.40) 0%, transparent 70%)",
        }}
      />
      <div
        data-aurora-bloom="teal"
        {...(reduced ? {} : { "data-aurora-animated": "true" })}
        className={`absolute -bottom-[35%] -right-[15%] h-[70vmax] w-[70vmax] rounded-full blur-3xl ${
          reduced ? "" : "animate-[aurora-drift-b_40s_ease-in-out_infinite]"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgb(45 212 191 / 0.12) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Add the keyframes**

In `apps/web/src/index.css`, append to the end of the file:

```css
/* Aurora auth surface — transform-only drift so the compositor handles it and
   no layout or paint is triggered. Paired with prefers-reduced-motion in
   components/auth/aurora-backdrop.tsx, which drops the animation entirely
   rather than merely slowing it. */
@keyframes aurora-drift-a {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(6%, 4%, 0) scale(1.08);
  }
}

@keyframes aurora-drift-b {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1.05);
  }
  50% {
    transform: translate3d(-5%, -6%, 0) scale(1);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/aurora-backdrop.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/auth/aurora-backdrop.tsx apps/web/src/components/auth/__tests__/aurora-backdrop.test.tsx apps/web/src/index.css
git commit -m "feat(auth): add aurora backdrop for the new auth surface"
```

---

### Task 2: Glass panel

**Files:**
- Create: `apps/web/src/components/auth/glass-panel.tsx`
- Test: `apps/web/src/components/auth/__tests__/glass-panel.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<GlassPanel>{children}</GlassPanel>` — props `{ children: React.ReactNode; className?: string }`. Owns the frosted card and the ±2° pointer tilt.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GlassPanel } from "../glass-panel";

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
}

describe("GlassPanel", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("renders its children", () => {
    mockReducedMotion(false);
    render(<GlassPanel>panel content</GlassPanel>);
    expect(screen.getByText("panel content")).toBeInTheDocument();
  });

  it("tilts toward the pointer", () => {
    mockReducedMotion(false);
    const { container } = render(<GlassPanel>x</GlassPanel>);
    const panel = container.querySelector("[data-glass-panel]") as HTMLElement;

    fireEvent.mouseMove(panel, { clientX: 0, clientY: 0 });
    expect(panel.style.transform).toMatch(/rotate[XY]/);
  });

  it("does not tilt when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(<GlassPanel>x</GlassPanel>);
    const panel = container.querySelector("[data-glass-panel]") as HTMLElement;

    fireEvent.mouseMove(panel, { clientX: 0, clientY: 0 });
    expect(panel.style.transform).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/glass-panel.test.tsx`
Expected: FAIL — cannot resolve `../glass-panel`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_TILT_DEGREES = 2;

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

export function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const node = ref.current;
      if (!node || reduced) {
        return;
      }
      const rect = node.getBoundingClientRect();
      // Guard against a zero-sized rect (jsdom reports 0x0), which would make
      // the ratios NaN and produce "rotateX(NaNdeg)".
      const width = rect.width || 1;
      const height = rect.height || 1;
      const x = (event.clientX - rect.left) / width - 0.5;
      const y = (event.clientY - rect.top) / height - 0.5;
      node.style.transform = `perspective(1200px) rotateY(${(x * MAX_TILT_DEGREES * 2).toFixed(2)}deg) rotateX(${(-y * MAX_TILT_DEGREES * 2).toFixed(2)}deg)`;
    },
    [reduced],
  );

  const onMouseLeave = useCallback(() => {
    if (ref.current) {
      ref.current.style.transform = "";
    }
  }, []);

  return (
    <div
      ref={ref}
      data-glass-panel=""
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`relative rounded-3xl p-8 transition-transform duration-200 ease-out ${className}`}
      style={{
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        backgroundColor: "rgb(255 255 255 / 0.07)",
        border: "1px solid rgb(255 255 255 / 0.12)",
        boxShadow:
          "inset 0 1px 0 rgb(255 255 255 / 0.10), 0 32px 64px -16px rgb(0 0 0 / 0.55)",
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/glass-panel.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/auth/glass-panel.tsx apps/web/src/components/auth/__tests__/glass-panel.test.tsx
git commit -m "feat(auth): add frosted glass panel with pointer tilt"
```

---

### Task 3: Auth surface step machine

**Files:**
- Create: `apps/web/src/components/auth/auth-surface.tsx`
- Test: `apps/web/src/components/auth/__tests__/auth-surface.test.tsx`

**Interfaces:**
- Consumes: `<AuroraBackdrop />` (Task 1), `<GlassPanel>` (Task 2).
- Produces: `<AuthSurface intent="sign-in" | "sign-up" />`. Renders the backdrop, the panel, the step-01 email form, and on advance renders `children`-style step bodies supplied by Tasks 4 and 5 via the `renderCredentialStep` prop:

```ts
type AuthIntent = "sign-in" | "sign-up";

type AuthSurfaceProps = {
  intent: AuthIntent;
  renderCredentialStep: (args: {
    email: string;
    onEditEmail: () => void;
  }) => React.ReactNode;
};
```

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSurface } from "../auth-surface";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
});

const credential = ({
  email,
  onEditEmail,
}: { email: string; onEditEmail: () => void }) => (
  <div>
    <span>credential step for {email}</span>
    <button type="button" onClick={onEditEmail}>
      change email
    </button>
  </div>
);

describe("AuthSurface", () => {
  it("starts on the identity step", () => {
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByText(/credential step/i)).not.toBeInTheDocument();
  });

  it("advances to the credential step with the email", async () => {
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/credential step for person@example.com/i),
      ).toBeInTheDocument(),
    );
  });

  it("returns to identity with the email preserved", async () => {
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(await screen.findByRole("button", { name: /change email/i }));

    expect(screen.getByLabelText(/email/i)).toHaveValue("person@example.com");
  });

  it("refuses to advance on an invalid email", async () => {
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.queryByText(/credential step/i)).not.toBeInTheDocument();
  });

  it("never contacts the server on the identity step", async () => {
    // The enumeration guarantee: no request may reveal whether the address is
    // registered, so step 01 must make no request at all.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("offers account creation on the sign-in intent", () => {
    render(<AuthSurface intent="sign-in" renderCredentialStep={credential} />);
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute(
      "href",
      "/auth/sign-up",
    );
  });

  it("offers sign-in on the sign-up intent", () => {
    render(<AuthSurface intent="sign-up" renderCredentialStep={credential} />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/auth-surface.test.tsx`
Expected: FAIL — cannot resolve `../auth-surface`.

- [ ] **Step 3: Write minimal implementation**

```tsx
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

export function AuthSurface({
  intent,
  renderCredentialStep,
}: {
  intent: AuthIntent;
  renderCredentialStep: (args: {
    email: string;
    onEditEmail: () => void;
  }) => React.ReactNode;
}) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"identity" | "credential">("identity");
  const [error, setError] = useState<string | null>(null);

  const onContinue = (event: React.FormEvent) => {
    event.preventDefault();
    // Validated entirely on the client. Contacting the server here is what
    // would leak whether the address is registered.
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
          <AnimatePresence mode="wait">
            {step === "identity" ? (
              <motion.form
                key="identity"
                onSubmit={onContinue}
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
              <a href="/auth/sign-up" className="font-medium text-[#2DD4BF] hover:underline">
                Create an account
              </a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a href="/auth/sign-in" className="font-medium text-[#2DD4BF] hover:underline">
                Sign in
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/auth-surface.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/auth/auth-surface.tsx apps/web/src/components/auth/__tests__/auth-surface.test.tsx
git commit -m "feat(auth): add two-step auth surface with no-enumeration guarantee"
```

---

### Task 4: Sign-in as a credential step

**Files:**
- Modify: `apps/web/src/components/auth/sign-in-form.tsx` (full rewrite of markup; keep `useSignIn`, the 2FA branch and the schema)
- Modify: `apps/web/src/routes/auth/sign-in.tsx`
- Modify: `apps/web/src/components/auth/__tests__/sign-in-form.test.tsx`

**Interfaces:**
- Consumes: `AuthSurface` (Task 3).
- Produces: `<SignInForm email={string} onEditEmail={() => void} />`.

**Why the existing test changes:** `sign-in-form.test.tsx` currently asserts the email and password inputs are on screen simultaneously (`getByPlaceholderText(/enter your email/i)` and `/enter your password/i`). The two-step flow makes that false by design — email now lives on step 01. The test is updated to render the whole surface and advance a step first. Its assertions about validation, submission and the 2FA branch are preserved.

- [ ] **Step 1: Update the failing test**

Replace the "renders form elements correctly" and "submits form with valid data" cases with surface-aware versions. Keep every other case, changing only how the password field is reached.

```tsx
async function advanceToPassword(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email/i), "person@example.com");
  await user.click(screen.getByRole("button", { name: /continue/i }));
  return screen.findByLabelText(/password/i);
}

it("renders the password step after the email step", async () => {
  const user = userEvent.setup();
  renderSignInRoute();

  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(await advanceToPassword(user)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
});

it("submits with valid credentials", async () => {
  const user = userEvent.setup();
  renderSignInRoute();

  const password = await advanceToPassword(user);
  await user.type(password, "Passw0rd!");
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  await waitFor(() =>
    expect(mockSignIn).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "Passw0rd!",
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/sign-in-form.test.tsx`
Expected: FAIL — no "continue" button yet; the route still renders the old layout.

- [ ] **Step 3: Rewrite the form as a credential step**

`sign-in-form.tsx` keeps `useSignIn`, `useAuth`, the 2FA `sessionStorage` + `history.push` branch and the zod schema **exactly as they are**. Changes: it accepts `{ email, onEditEmail }`, drops its own email field, drops the dead Google/Apple buttons and the "Not a member yet?" link (the surface owns that), restyles onto the dark panel, and routes its error through `userMessage`:

```tsx
} catch (error) {
  toast.error(userMessage(error, "sign you in"));
}
```

The email chip above the password field:

```tsx
<button
  type="button"
  onClick={onEditEmail}
  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition-colors hover:border-white/20"
>
  <span className="truncate">{email}</span>
  <span className="ml-3 shrink-0 text-xs text-[#2DD4BF]">Change</span>
</button>
```

The password field keeps `autoComplete="current-password"`, its show/hide toggle (retain `data-testid="eye-icon"` so the existing visibility test still passes) and the forgot-password link.

- [ ] **Step 4: Point the route at the surface**

```tsx
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/sign-in-form.test.tsx src/components/auth/__tests__/login-form.test.tsx`
Expected: PASS. If `login-form.test.tsx` also asserts a single-screen layout, update it the same way — do not delete cases.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/auth/sign-in-form.tsx apps/web/src/routes/auth/sign-in.tsx apps/web/src/components/auth/__tests__/
git commit -m "feat(auth): move sign-in onto the aurora surface as a credential step"
```

---

### Task 5: Sign-up as a credential step

**Files:**
- Modify: `apps/web/src/components/auth/sign-up-form.tsx`
- Modify: `apps/web/src/routes/auth/sign-up.tsx`
- Modify: `apps/web/src/components/auth/__tests__/sign-up-form.test.tsx`

**Interfaces:**
- Consumes: `AuthSurface` (Task 3), `PasswordStrengthIndicator` (existing, restyled in place).
- Produces: `<SignUpForm email={string} onEditEmail={() => void} />`.

- [ ] **Step 1: Update the failing test**

Same shape as Task 4: advance past the email step, then assert on name, password and confirm-password.

```tsx
it("creates an account from the credential step", async () => {
  const user = userEvent.setup();
  renderSignUpRoute();

  await user.type(screen.getByLabelText(/email/i), "new@example.com");
  await user.click(screen.getByRole("button", { name: /continue/i }));

  await user.type(await screen.findByLabelText(/name/i), "New Person");
  await user.type(screen.getByLabelText(/^password/i), "Passw0rd!");
  await user.type(screen.getByLabelText(/confirm/i), "Passw0rd!");
  await user.click(screen.getByRole("button", { name: /create account/i }));

  await waitFor(() =>
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com", name: "New Person" }),
    ),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/sign-up-form.test.tsx`
Expected: FAIL — no "continue" button.

- [ ] **Step 3: Rewrite the form as a credential step**

Keep `useSignUp`, the schema (including the confirm-password refinement) and the submit handler. Drop the email field, the dead Google/Apple buttons and the "Already have an account?" link. Add the same email chip as Task 4. Render `PasswordStrengthIndicator` under the password field. Route the error through `userMessage(error, "create your account")`.

- [ ] **Step 4: Point the route at the surface**

Identical to Task 4's route, with `intent="sign-up"`, `PageTitle title="Sign Up"` and `<SignUpForm />`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/sign-up-form.test.tsx src/components/auth/__tests__/password-strength-indicator.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/auth/sign-up-form.tsx apps/web/src/routes/auth/sign-up.tsx apps/web/src/components/auth/__tests__/
git commit -m "feat(auth): move sign-up onto the aurora surface as a credential step"
```

---

### Task 6: Restyle forgot-password and verify-2fa, retire the old layout

**Files:**
- Modify: `apps/web/src/routes/auth/forgot-password.tsx`
- Modify: `apps/web/src/routes/auth/verify-2fa.tsx`
- Modify: `apps/web/src/components/auth/forgot-password-form.tsx`
- Modify: `apps/web/src/components/auth/two-factor-verify.tsx`
- Delete: `apps/web/src/components/auth/layout.tsx`

**Interfaces:**
- Consumes: `AuroraBackdrop`, `GlassPanel`.
- Produces: nothing new.

**Logic on both of these is untouched** — only the shell and control styling change. `verify-2fa` keeps reading `pending2FAToken` from `sessionStorage` exactly as it does today.

- [ ] **Step 1: Confirm the current tests pass before touching anything**

Run: `cd apps/web && npx vitest run src/components/auth/__tests__/forgot-password-form.test.tsx src/components/auth/__tests__/two-factor-verify.test.tsx`
Expected: PASS. This is the baseline; these must still pass at Step 4.

- [ ] **Step 2: Wrap both routes in the new shell**

Replace each route's `<AuthLayout …>` wrapper with:

```tsx
<div className="relative flex min-h-svh items-center justify-center p-4">
  <AuroraBackdrop />
  <div className="relative z-10 w-full max-w-md">
    <GlassPanel>{/* existing form */}</GlassPanel>
  </div>
</div>
```

Restyle the inputs and buttons inside each form to the dark treatment used in Task 3 (`border-white/15 bg-white/5 text-white`, teal focus ring, teal primary button).

- [ ] **Step 3: Delete the old layout**

```bash
git rm apps/web/src/components/auth/layout.tsx
```

Then confirm nothing still imports it:

Run: `cd apps/web && grep -rn "auth/layout\|AuthLayout" src --include=*.tsx --include=*.ts`
Expected: no matches.

- [ ] **Step 4: Run the whole auth suite**

Run: `cd apps/web && npx vitest run src/components/auth`
Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/src/components/auth apps/web/src/routes/auth
git commit -m "feat(auth): restyle forgot-password and 2FA onto the aurora surface"
```

---

### Task 7: Verification pass

**Files:** none modified unless a defect is found.

- [ ] **Step 1: Typecheck**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.app.json`
Expected: no output.

- [ ] **Step 2: Lint the changed files**

Run: `cd "$(git rev-parse --show-toplevel)" && npx biome check $(git diff --name-only HEAD -- 'apps/web/src/**/*.tsx' 'apps/web/src/**/*.ts')`
Expected: "No fixes applied", zero errors.

- [ ] **Step 3: Full web suite, compared against a baseline**

Run: `cd apps/web && npx vitest run`
Expected: no failures beyond the known pre-existing flakes (`create-project-modal`, `global-search`, `DashboardOverviewPage`, and the two env-gated `real-tests` suites). Any *new* failure blocks the task.

- [ ] **Step 4: Manual click-through against the running app**

Sign in at `http://localhost:5174/auth/sign-in` with `admin@meridian.app` / `demo123`, then verify each of:

1. Step 01 → step 02 advance, and the chip returns to step 01 with the email intact.
2. Wrong password shows an error, and it is **word-for-word identical** to signing in with an address that has no account. Check both.
3. Sign-up creates an account and lands on the dashboard.
4. Forgot-password submits.
5. A 2FA-enabled account reaches `/auth/verify-2fa` and completes.
6. Keyboard only: tab to every control, Enter submits both steps, focus is always visible.
7. With reduced motion enabled in the OS: no drift, no tilt, no step animation, page fully usable.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A apps/web/src
git commit -m "fix(auth): address issues found in the aurora surface verification pass"
```

---

## Self-review notes

- **Spec coverage:** routes (T4, T5) · flow and enumeration guarantee (T3) · aurora background (T1) · glass card and tilt (T2) · type and colour discipline (global constraints, applied T1–T6) · accessibility (T3 markup, T7 step 4 items 6–7) · components list (T1–T3, T6) · untouched list (stated per task) · testing (each task, plus T7) · `backdrop-filter` fallback (see below).
- **Fallback not yet a task:** the spec's low-GPU fallback (solid navy at 92%, no blur) is deliberately *not* built up front. It is a one-line change in `glass-panel.tsx` and should only be made if T7 shows dropped frames — building it speculatively would add a code path with no evidence it is needed.
- **Dead OAuth buttons:** the Google and Apple buttons in both forms have no handler and do nothing. They are removed in T4 and T5 rather than restyled. This is slightly beyond "restyle", and is called out here so a reviewer can object.
