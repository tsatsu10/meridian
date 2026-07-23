import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NotificationCenter from "../notification-center";

/**
 * Regression: NotificationCenter used to read from getNotificationsFromStore()
 * — a module-level in-memory array only ever populated by the narrow
 * auto-status-update mutation flow, always empty on page load. It never
 * fetched real notifications, so the bell showed "No notifications yet"
 * regardless of how many real unread notifications a user had (confirmed
 * live: sidebar showed 20 unread, bell dropdown showed none). Now it must
 * read from the same source as the rest of the app (useGetNotifications).
 */

const { mockUseGetNotifications, mockMutate } = vi.hoisted(() => ({
  mockUseGetNotifications: vi.fn(),
  mockMutate: vi.fn(),
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

describe("NotificationCenter", () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it("shows real unread notifications from the backend, not an always-empty local store", async () => {
    mockUseGetNotifications.mockReturnValue({
      data: [
        {
          id: "n1",
          title: "You were mentioned",
          content: "Someone mentioned you in a conversation.",
          message: null,
          type: "mention",
          isRead: false,
          isPinned: false,
          priority: "normal",
          createdAt: new Date().toISOString(),
        },
        {
          id: "n2",
          title: "Task completed",
          content: "A task you were tracking has been completed.",
          message: null,
          type: "task",
          isRead: false,
          isPinned: false,
          priority: "normal",
          createdAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
    });

    render(<NotificationCenter />);

    await userEvent.click(
      screen.getByRole("button", { name: "Notifications" }),
    );

    expect(screen.getByText("2 unread notifications")).toBeInTheDocument();
    expect(screen.getByText("You were mentioned")).toBeInTheDocument();
    expect(screen.getByText("Task completed")).toBeInTheDocument();
    expect(screen.queryByText("No notifications yet")).not.toBeInTheDocument();
  });

  it("shows the empty state only when there are genuinely no notifications", async () => {
    mockUseGetNotifications.mockReturnValue({ data: [], isLoading: false });

    render(<NotificationCenter />);

    await userEvent.click(
      screen.getByRole("button", { name: "Notifications" }),
    );

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });
});
