/**
 * Create Project Modal Tests
 *
 * Tests project creation functionality:
 * - Multi-step form flow
 * - Template selection
 * - Project details configuration
 * - Form validation
 * - Submission and navigation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CreateProjectModal from "../create-project-modal";

// Mock dependencies
const mockNavigate = vi.fn();
const mockHasPermission = vi.fn().mockReturnValue(true);
// Mutable so individual tests can simulate "no workspace selected";
// reset in beforeEach.
let mockWorkspace: { id: string; name: string } | null = {
  id: "workspace-123",
  name: "Test Workspace",
};
const mockOnClose = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

vi.mock("@/lib/permissions", () => ({
  useRBACAuth: () => ({
    hasPermission: mockHasPermission,
  }),
}));

vi.mock("@/store/workspace", () => ({
  default: () => ({
    workspace: mockWorkspace,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@meridian/libs", () => ({
  client: {
    project: {
      $post: vi.fn(),
    },
  },
}));

vi.mock("@/fetchers/templates/get-templates", () => ({
  getTemplates: vi.fn().mockResolvedValue({
    templates: [
      {
        id: "template-1",
        name: "Web Development",
        description: "Full-stack web application",
        profession: "Software Engineer",
        category: "development",
        difficulty: "intermediate",
        tags: ["React", "Node.js"],
        color: "bg-blue-500",
        icon: "Code",
        industry: "Technology",
        estimatedDuration: 90,
      },
      {
        id: "template-2",
        name: "Marketing Campaign",
        description: "Digital marketing project",
        profession: "Marketer",
        category: "marketing",
        difficulty: "beginner",
        tags: ["SEO", "Social Media"],
        color: "bg-purple-500",
        icon: "TrendingUp",
        industry: "Marketing",
        estimatedDuration: 30,
      },
    ],
  }),
}));

const TestWrapperWithMocks = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("CreateProjectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockHasPermission.mockReturnValue(true);
    mockOnClose.mockClear();
    mockWorkspace = { id: "workspace-123", name: "Test Workspace" };
  });

  describe("Templates query gating (#95)", () => {
    it("does not fetch templates while the modal is closed", async () => {
      const { getTemplates } = await import(
        "@/fetchers/templates/get-templates"
      );

      render(<CreateProjectModal open={false} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      // Give any would-be-fired query a tick to resolve.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(getTemplates).not.toHaveBeenCalled();
    });

    it("fetches templates once the modal is open", async () => {
      const { getTemplates } = await import(
        "@/fetchers/templates/get-templates"
      );

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      await waitFor(() => {
        expect(getTemplates).toHaveBeenCalled();
      });
    });
  });

  describe("Permission Handling", () => {
    it("should show access restricted message when user lacks permission", () => {
      mockHasPermission.mockReturnValue(false);

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
      expect(
        screen.getByText(/you don't have permission to create projects/i),
      ).toBeInTheDocument();
    });

    it("should show close button when access is restricted", async () => {
      const user = userEvent.setup();
      mockHasPermission.mockReturnValue(false);

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      // Get the specific "Close" button (not the X button)
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      const mainCloseButton = closeButtons.find(
        (btn) =>
          btn.textContent?.includes("Close") && !btn.querySelector(".lucide-x"),
      );

      if (!mainCloseButton) throw new Error("modal close button not found");
      await user.click(mainCloseButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Step 1: Template Selection", () => {
    it("should render template selection step initially", async () => {
      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      await waitFor(() => {
        expect(
          screen.getByText(/choose a template to get started quickly/i),
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    it("should display custom project option", async () => {
      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      await waitFor(() => {
        // "Start from Scratch" appears in both the sidebar button and the main content
        const elements = screen.getAllByText(/start from scratch/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display template categories", async () => {
      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      await waitFor(() => {
        expect(screen.getByText(/software engineer/i)).toBeInTheDocument();
        expect(screen.getByText(/marketer/i)).toBeInTheDocument();
      });
    });

    it("should allow template search", async () => {
      const user = userEvent.setup();

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/search templates/i),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search templates/i);
      await user.type(searchInput, "web");

      expect(searchInput).toHaveValue("web");
    });

    it("should proceed to step 2 when template selected", async () => {
      const user = userEvent.setup();

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      // Wait for templates to load
      await waitFor(() => {
        expect(
          screen.getAllByText(/start from scratch/i).length,
        ).toBeGreaterThan(0);
      });

      // Click the custom project card (not just any "custom project" text)
      const customCard = screen
        .getByText(/build your own from scratch/i)
        .closest('div[class*="rounded-xl"]');
      if (!customCard) throw new Error("custom project card not found");

      await user.click(customCard);

      await waitFor(() => {
        expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
        expect(
          screen.getByText(/configure your project details/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Step 2: Project Details", () => {
    it("should render project details form fields", async () => {
      const user = userEvent.setup();

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      // Navigate to step 2 (generous timeout — step renders are slow when the
      // full suite runs under memory pressure)
      await user.click(await screen.findByText(/custom project/i));

      expect(
        await screen.findByLabelText(/project name/i, {}, { timeout: 5000 }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByText(/priority/i)).toBeInTheDocument();
    });

    it("should allow entering project name and description", async () => {
      const user = userEvent.setup();

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      await waitFor(() => screen.getByText(/custom project/i));
      await user.click(screen.getByText(/custom project/i));

      const nameInput = await screen.findByLabelText(/project name/i);
      // A template selection may pre-fill the name; clear before typing.
      await user.clear(nameInput);
      await user.type(nameInput, "Test Project");
      expect(nameInput).toHaveValue("Test Project");

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, "A description");
      expect(descriptionInput).toHaveValue("A description");
    });

    it("should show progress indicator", async () => {
      const user = userEvent.setup();

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      // Navigate to step 2
      await waitFor(() => screen.getByText(/custom project/i));
      await user.click(screen.getByText(/custom project/i));

      await waitFor(() => {
        expect(screen.getByText(/form completion/i)).toBeInTheDocument();
      });
    });

    it("should allow proceeding to step 3 when name is filled", async () => {
      const user = userEvent.setup();

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      // Navigate to step 2
      await user.click(await screen.findByText(/custom project/i));

      // Fill required field (typing must happen once, outside waitFor retries)
      const nameInput = await screen.findByLabelText(
        /project name/i,
        {},
        { timeout: 5000 },
      );
      await user.type(nameInput, "My Project");

      // Click Next
      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).not.toBeDisabled();

      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
      });
    });

    it("should allow going back to step 1", async () => {
      const user = userEvent.setup();

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      // Navigate to step 2
      await waitFor(() => screen.getByText(/custom project/i));
      await user.click(screen.getByText(/custom project/i));

      await waitFor(() => {
        expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
      });

      // Go back
      await user.click(screen.getByRole("button", { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
      });
    });
  });

  describe("Step 3: Review and Submit", () => {
    it("should display project summary in step 3", async () => {
      const user = userEvent.setup();

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      // Navigate through steps
      await user.click(await screen.findByText(/custom project/i));

      const nameInput = await screen.findByLabelText(
        /project name/i,
        {},
        { timeout: 5000 },
      );
      await user.type(nameInput, "Test Project");

      await user.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText(/project summary/i)).toBeInTheDocument();
        expect(screen.getByText(/test project/i)).toBeInTheDocument();
      });
    });

    it("should create project on final submit", async () => {
      const user = userEvent.setup();
      const { client } = await import("@meridian/libs");
      const { toast } = await import("sonner");
      (
        client.project.$post as unknown as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        ok: true,
        json: async () => ({ id: "project-123", name: "Test Project" }),
      });

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      // Navigate through all steps
      await waitFor(() => screen.getByText(/custom project/i));
      await user.click(screen.getByText(/custom project/i));

      await waitFor(async () => {
        await user.type(screen.getByLabelText(/project name/i), "Test Project");
      });

      await user.click(screen.getByRole("button", { name: /next/i }));

      await waitFor(() => screen.getByText(/project summary/i));

      // Submit
      await user.click(screen.getByRole("button", { name: /create project/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Project created successfully!",
        );
        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/dashboard/projects",
          search: { page: 1, ps: 12, q: undefined, archived: false },
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error when workspace is not selected", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      mockWorkspace = null;

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      await waitFor(() => screen.getByText(/custom project/i));
      await user.click(screen.getByText(/custom project/i));

      const nameInput = await screen.findByLabelText(/project name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Test Project");

      await user.click(screen.getByRole("button", { name: /next/i }));
      await waitFor(() => screen.getByText(/project summary/i));

      await user.click(screen.getByRole("button", { name: /create project/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Please select a workspace first",
        );
      });
    });

    it("should handle project creation API errors", async () => {
      const user = userEvent.setup();
      const { client } = await import("@meridian/libs");
      const { toast } = await import("sonner");
      (
        client.project.$post as unknown as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        ok: false,
        text: async () => "Project name already exists",
      });

      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      await waitFor(() => screen.getByText(/custom project/i));
      await user.click(screen.getByText(/custom project/i));

      const nameInput = await screen.findByLabelText(/project name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Duplicate Project");

      await user.click(screen.getByRole("button", { name: /next/i }));
      await waitFor(() => screen.getByText(/project summary/i));

      await user.click(screen.getByRole("button", { name: /create project/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("already exists"),
        );
      });
    });
  });

  describe("Form Reset", () => {
    it("should reset form when modal closes", async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <CreateProjectModal open={true} onClose={mockOnClose} />,
        { wrapper: TestWrapperWithMocks },
      );

      // Navigate to step 2 and fill form
      await waitFor(() => screen.getByText(/custom project/i));
      await user.click(screen.getByText(/custom project/i));

      await waitFor(async () => {
        await user.type(screen.getByLabelText(/project name/i), "Test");
      });

      // Close modal
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(mockOnClose).toHaveBeenCalled();

      // Re-open - should be back to step 1
      rerender(<CreateProjectModal open={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should render close button with accessible label", () => {
      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      expect(
        screen.getByRole("button", { name: /close/i }),
      ).toBeInTheDocument();
    });

    it("should have proper heading structure", async () => {
      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /create new project/i }),
        ).toBeInTheDocument();
      });
    });

    it("should show loading state during template fetch", () => {
      render(<CreateProjectModal open={true} onClose={mockOnClose} />, {
        wrapper: TestWrapperWithMocks,
      });

      // May show loading initially
      const loadingText = screen.queryByText(/loading templates/i);
      // Loading should either be present or templates should load quickly
      expect(
        loadingText || screen.queryByText(/start from scratch/i),
      ).toBeTruthy();
    });
  });
});
