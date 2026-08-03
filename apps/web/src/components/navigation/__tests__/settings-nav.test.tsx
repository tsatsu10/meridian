import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SettingsNav } from "../settings-nav";

const mockPathname = { current: "/dashboard/settings/appearance" };

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: mockPathname.current }),
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const mockHasPermission = vi.fn();
const mockRbac = { current: null as { hasPermission: unknown } | null };

vi.mock("@/lib/permissions/context", () => ({
  useOptionalRBACAuth: () => mockRbac.current,
}));

describe("SettingsNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.current = "/dashboard/settings/appearance";
    mockRbac.current = { hasPermission: mockHasPermission };
    mockHasPermission.mockReturnValue(true);
  });

  it("renders the group headings in authored order", () => {
    render(<SettingsNav />);

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Personal",
      "Security & Privacy",
      "Workspace",
      "Data & Integrations",
    ]);
  });

  it("marks the current page with aria-current", () => {
    render(<SettingsNav />);

    const active = screen.getByRole("link", { current: "page" });
    expect(active).toHaveTextContent("Appearance");
  });

  it("marks nothing when on a settings page outside the nav", () => {
    mockPathname.current = "/dashboard/settings";
    render(<SettingsNav />);

    expect(screen.queryByRole("link", { current: "page" })).toBeNull();
  });

  it("hides items whose permission the user lacks", () => {
    // These three items carried `permissions` since the nav config was
    // written, but nothing ever read the field — API & Webhooks, Audit Logs
    // and Roles & Permissions were shown to everyone.
    mockHasPermission.mockImplementation(
      (permission: string) => permission !== "canViewAuditLogs",
    );
    render(<SettingsNav />);

    expect(screen.queryByRole("link", { name: /audit logs/i })).toBeNull();
    expect(
      screen.getByRole("link", { name: /api & webhooks/i }),
    ).toBeInTheDocument();
  });

  it("drops a whole group when every item in it is hidden", () => {
    mockHasPermission.mockReturnValue(false);
    render(<SettingsNav />);

    // Security keeps its unguarded "Security" entry, but Workspace loses only
    // Roles & Permissions, so both headings survive. What must not happen is
    // an empty heading with no links under it.
    for (const heading of screen.getAllByRole("heading", { level: 2 })) {
      const section = heading.parentElement;
      expect(section).not.toBeNull();
      expect(
        within(section as HTMLElement).getAllByRole("link").length,
      ).toBeGreaterThan(0);
    }
  });

  it("shows permission-gated items when no RBAC provider is mounted", () => {
    // Fail open, not closed: hiding navigation because the provider is absent
    // would lock people out of settings they can legitimately reach, and the
    // pages enforce their own access anyway.
    mockRbac.current = null;
    render(<SettingsNav />);

    expect(
      screen.getByRole("link", { name: /audit logs/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /roles & permissions/i }),
    ).toBeInTheDocument();
  });

  it("links every item to a settings route", () => {
    render(<SettingsNav />);

    const links = screen.getAllByRole("link");
    // 14 since Localization was removed on main (#117) as a dead feature.
    expect(links).toHaveLength(14);
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^\/dashboard\/settings\//);
    }
  });
});
