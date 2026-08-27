import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NotificationBell from "../notification-bell";

const { mockNavigate, mockMutate, mockUseGetNotifications } = vi.hoisted(
  () => ({
    mockNavigate: vi.fn(),
    mockMutate: vi.fn(),
    mockUseGetNotifications: vi.fn(),
  }),
);

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/queries/notification/use-get-notifications", () => ({
  default: mockUseGetNotifications,
}));

vi.mock("@/hooks/mutations/notification/use-mark-notification-as-read", () => ({
  default: () => ({ mutate: mockMutate, isPending: false }),
}));
vi.mock(
  "@/hooks/mutations/notification/use-mark-all-notifications-as-read",
  () => ({
    default: () => ({ mutate: mockMutate, isPending: false }),
  }),
);
vi.mock("@/hooks/mutations/notification/use-clear-notifications", () => ({
  default: () => ({ mutate: mockMutate, isPending: false }),
}));

describe("NotificationBell (NotificationCenter re-export)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockMutate.mockClear();
    mockUseGetNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          title: "You were mentioned",
          content: "Someone mentioned you.",
          message: null,
          type: "mention",
          isRead: false,
          isPinned: false,
          priority: "normal",
          createdAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
    });
  });

  it("navigates to settings and the full notifications page", async () => {
    render(<NotificationBell />);

    await userEvent.click(
      screen.getByRole("button", { name: "Notifications" }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Notification settings" }),
    );
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/dashboard/settings/notifications",
    });

    mockNavigate.mockClear();

    await userEvent.click(
      screen.getByRole("button", { name: "Notifications" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "View all notifications" }),
    );
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/dashboard/notifications",
    });
  });
});
