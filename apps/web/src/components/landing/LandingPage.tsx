import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useTheme from "@/components/providers/theme-provider/hooks/use-theme";
import { MeridianMark } from "@/components/branding/meridian-mark";
import {
  CheckCircle,
  ArrowRight,
  Users,
  Shield,
  Calendar,
  Kanban,
  Menu,
  X,
  Sparkles,
  Crown,
  ChevronDown,
  Target,
  Layers,
  Lock,
  FileText,
  Activity,
  ListTodo,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  ShieldAlert,
  Briefcase,
  UserCog,
  Eye,
  Building2,
  Wrench,
  Handshake,
  Megaphone,
  UserPlus,
} from "lucide-react";

// Brand palette pulled from the real Meridian logomark (see meridian-mark.tsx) —
// #1B2559 navy + teal-400/500 — one confident accent instead of a rainbow per section.
const displayFont = "[font-family:'Space_Grotesk',sans-serif]";
const bodyFont = "[font-family:'Inter',sans-serif]";

// The 11 built-in roles, matching apps/api/src/types/rbac.ts (UserRole)
const userRoles = [
  {
    id: "workspace-manager",
    name: "Workspace Manager",
    icon: Crown,
    description:
      "Full administrative control across the whole workspace — settings, members, and every project.",
  },
  {
    id: "department-head",
    name: "Department Head",
    icon: Briefcase,
    description:
      "Oversight across every project within their department, without full workspace admin access.",
  },
  {
    id: "project-manager",
    name: "Project Manager",
    icon: Target,
    description:
      "Full control over the projects they run — boards, timelines, milestones, and their team.",
  },
  {
    id: "team-lead",
    name: "Team Lead",
    icon: Users,
    description: "Assigns and manages tasks for their team within a project.",
  },
  {
    id: "member",
    name: "Member",
    icon: UserCog,
    description:
      "Works their assigned tasks across boards, lists, and calendar views.",
  },
  {
    id: "project-viewer",
    name: "Project Viewer",
    icon: Eye,
    description: "Read-only visibility into a single project's progress.",
  },
  {
    id: "workspace-viewer",
    name: "Workspace Viewer",
    icon: Building2,
    description: "Read-only visibility across the workspace's projects.",
  },
  {
    id: "contractor",
    name: "Contractor",
    icon: Wrench,
    description:
      "Scoped access to only the specific project they were brought in for.",
  },
  {
    id: "client",
    name: "Client",
    icon: Handshake,
    description:
      "External visibility into the status of the work being done for them.",
  },
  {
    id: "stakeholder",
    name: "Stakeholder",
    icon: Megaphone,
    description:
      "Progress visibility for people who need updates but don't do the work.",
  },
  {
    id: "guest",
    name: "Guest",
    icon: UserPlus,
    description: "Minimal, temporary access with the smallest footprint.",
  },
];

// Real feature categories — every item below exists in the current codebase
const platformFeatures = [
  {
    category: "Plan & Track",
    icon: Kanban,
    features: [
      {
        name: "Kanban Board",
        icon: Kanban,
        description: "Drag-and-drop columns for To Do, In Progress, and Done",
      },
      {
        name: "List & Backlog",
        icon: ListTodo,
        description:
          "A flat list view plus a dedicated backlog for unscheduled work",
      },
      {
        name: "Calendar & Timeline",
        icon: Calendar,
        description:
          "See tasks by due date or laid out across a project timeline",
      },
      {
        name: "Milestones & Subtasks",
        icon: Target,
        description: "Break work into subtasks and track key milestones",
      },
    ],
  },
  {
    category: "Analytics & Insights",
    icon: BarChart3,
    features: [
      {
        name: "Executive Dashboard",
        icon: TrendingUp,
        description: "A workspace-wide view of tasks, projects, and progress",
      },
      {
        name: "Team Performance",
        icon: BarChart3,
        description: "Per-person workload and productivity charts",
      },
      {
        name: "Risk Detection",
        icon: AlertTriangle,
        description: "Automatic flags for overdue and at-risk work",
      },
      {
        name: "Predictive Forecasts",
        icon: Sparkles,
        description: "Trend-based forecasts for completion and capacity",
      },
    ],
  },
  {
    category: "Teams & Access",
    icon: Users,
    features: [
      {
        name: "11-Role RBAC",
        icon: Crown,
        description:
          "From guest to workspace manager, scoped to what each person needs",
      },
      {
        name: "Team Health Scoring",
        icon: Activity,
        description: "Workload balance and health at a glance, per team",
      },
      {
        name: "User Management",
        icon: Users,
        description:
          "Search, filter, and manage every workspace member's role and status",
      },
      {
        name: "Multi-Workspace Support",
        icon: Layers,
        description:
          "Separate workspaces for different orgs, clients, or departments",
      },
    ],
  },
  {
    category: "Security",
    icon: Shield,
    features: [
      {
        name: "Two-Factor Authentication",
        icon: Shield,
        description: "TOTP-based 2FA to protect account login",
      },
      {
        name: "Audit Logs",
        icon: FileText,
        description: "A record of who changed what, and when",
      },
      {
        name: "Session Management",
        icon: Lock,
        description: "See every active session and revoke access remotely",
      },
      {
        name: "Security Dashboard",
        icon: ShieldAlert,
        description: "Live access-control monitoring and threat alerts",
      },
    ],
  },
];

// Real screenshots captured from the running app
const productScreenshots = [
  {
    src: "/landing/board.jpg",
    alt: "Meridian kanban board with To Do, In Progress, and Done columns",
    title: "Plan visually",
    description: "Drag tasks across a kanban board scoped to your project.",
  },
  {
    src: "/landing/analytics.jpg",
    alt: "Meridian team performance analytics chart",
    title: "See team performance",
    description: "Per-person workload charts, updated as work moves.",
  },
  {
    src: "/landing/teams.jpg",
    alt: "Meridian teams overview showing team health scores",
    title: "Track team health",
    description: "Workload balance and health scoring for every team.",
  },
];

// Factual, benefit-framed reasons — no invented customer quotes
const reasons = [
  {
    icon: Crown,
    title: "Built around real permission boundaries",
    description:
      "Most PM tools bolt on a simple admin/member toggle. Meridian ships 11 distinct roles so contractors, clients, and executives each see only what's relevant to them.",
  },
  {
    icon: Layers,
    title: "One tool instead of five tabs",
    description:
      "Boards, lists, calendars, timelines, and analytics live in the same workspace, scoped by the same role system.",
  },
  {
    icon: AlertTriangle,
    title: "Risk surfaces before it becomes a problem",
    description:
      "Automatic overdue and at-risk detection means issues show up on the dashboard, not in a status meeting.",
  },
];

const faqData = [
  {
    question: "How does role-based access control work?",
    answer:
      "Meridian has 11 built-in roles, from Guest and Client up to Workspace Manager. Each role's access is scoped on every request, so people only see the workspaces, projects, and data relevant to their role.",
  },
  {
    question: "What views are available for managing work?",
    answer:
      "Kanban board, list view, calendar, and timeline, all backed by the same task data — switch views without losing context.",
  },
  {
    question: "How is my account secured?",
    answer:
      "Two-factor authentication (TOTP), session management so you can see and revoke active sessions, and an audit log of account and workspace changes.",
  },
  {
    question: "Can I run multiple workspaces?",
    answer:
      "Yes — create and switch between separate workspaces, useful for separating clients, departments, or organizations.",
  },
  {
    question: "What kind of analytics do you provide?",
    answer:
      "An executive dashboard, per-team performance charts, automatic risk detection for overdue work, and trend-based forecasts.",
  },
  {
    question: "Is Meridian free to use?",
    answer:
      "Yes — creating an account and workspace is free, with no credit card required.",
  },
];

// Eyebrow label: a small teal dot + tracked caps, used instead of a filled
// gradient pill so each section opens with the same restrained mark.
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mb-4">
      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
      <span className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-700 dark:text-teal-400">
        {children}
      </span>
    </div>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(userRoles[0]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeFeatureCategory, setActiveFeatureCategory] = useState(
    platformFeatures[0],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div
      id="meridian-landing"
      ref={containerRef}
      className={`relative min-h-screen bg-background w-full overflow-x-hidden ${bodyFont}`}
    >
      {/* index.css has a blanket ".dark button { background: linear-gradient(...) }"
          rule (an app-wide dark-mode style, not something to change here). It beats
          any single Tailwind bg-* utility on plain <button> specificity-wise, so on
          this page specifically we neutralize just the parts that fight our own
          intentional button colors, scoped by id so the rest of the app is untouched. */}
      <style>{`
        .dark #meridian-landing button,
        .dark #meridian-landing button:hover {
          background-image: none;
          border-color: transparent;
          box-shadow: none;
          backdrop-filter: none;
          transform: none;
        }
      `}</style>

      {/* Navigation */}
      <nav className="sticky top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex-shrink-0 flex items-center group gap-3"
            >
              <div className="rounded-xl bg-card p-1.5 shadow-sm ring-1 ring-border group-hover:shadow-md transition-shadow duration-200">
                <MeridianMark className="h-8 w-8" />
              </div>
              <span
                className={`text-lg font-semibold text-foreground ${displayFont}`}
              >
                Meridian
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {[
                { name: "Features", href: "#features" },
                { name: "Roles", href: "#roles" },
                { name: "FAQ", href: "#faq" },
              ].map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="relative px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 group"
                >
                  {item.name}
                  <span className="absolute bottom-1 left-4 right-4 h-px bg-teal-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                </a>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleThemeToggle}
                className="cursor-pointer"
              >
                {theme === "dark" ? "🌙" : "☀️"}
              </Button>

              <Link to="/auth/sign-in">
                <Button variant="ghost" className="cursor-pointer">
                  Sign In
                </Button>
              </Link>

              <Link to="/auth/sign-up">
                <Button className="cursor-pointer text-white shadow-sm hover:shadow-md transition-shadow !bg-[#1B2559] hover:!bg-[#12193F] dark:!bg-teal-400 dark:!text-[#0B1220] dark:hover:!bg-teal-300">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden overflow-hidden bg-background/95 backdrop-blur-xl border-t border-border/50"
            >
              <div className="px-4 py-6 space-y-4">
                <div className="space-y-1">
                  {[
                    { name: "Features", href: "#features" },
                    { name: "Roles", href: "#roles" },
                    { name: "FAQ", href: "#faq" },
                  ].map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="block px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  ))}
                </div>

                <div className="pt-4 border-t border-border/50 space-y-3">
                  <Link to="/auth/sign-in" className="w-full">
                    <Button
                      variant="ghost"
                      className="w-full justify-start cursor-pointer"
                    >
                      Sign In
                    </Button>
                  </Link>

                  <Link to="/auth/sign-up" className="w-full">
                    <Button className="w-full cursor-pointer text-white !bg-[#1B2559] hover:!bg-[#12193F] dark:!bg-teal-400 dark:!text-[#0B1220] dark:hover:!bg-teal-300">
                      Get Started Free
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    className="w-full justify-start cursor-pointer"
                    onClick={handleThemeToggle}
                  >
                    <span className="mr-2">
                      {theme === "dark" ? "🌙" : "☀️"}
                    </span>
                    Switch to {theme === "dark" ? "Light" : "Dark"} Mode
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32 overflow-hidden w-full">
        {/* Background: one soft accent glow + a faint dot grid, not a gradient blob pile */}
        <div
          className="absolute inset-0 opacity-[0.4] dark:opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            color: "rgb(148 163 184 / 0.35)",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-teal-400/20 dark:bg-teal-400/10 rounded-full blur-3xl" />

        <motion.div
          style={{ y: heroY }}
          className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center"
            >
              <Eyebrow>Role-based access control, built in</Eyebrow>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className={`text-5xl sm:text-6xl lg:text-7xl font-semibold text-foreground mb-6 leading-[1.05] tracking-tight ${displayFont}`}
            >
              Project management
              <br />
              <span className="text-teal-600 dark:text-teal-400">
                with real permission boundaries
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              Eleven built-in roles — from{" "}
              <span className="font-medium text-foreground">Guest</span> to{" "}
              <span className="font-medium text-foreground">
                Workspace Manager
              </span>{" "}
              — mean contractors, clients, and executives only ever see what's
              relevant to them.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex justify-center mb-8"
            >
              <Link to="/auth/sign-up">
                <Button
                  size="lg"
                  className="cursor-pointer text-base px-7 py-6 h-auto text-white shadow-lg hover:shadow-xl transition-shadow !bg-[#1B2559] hover:!bg-[#12193F] dark:!bg-teal-400 dark:!text-[#0B1220] dark:hover:!bg-teal-300"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            {/* Fact strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 text-sm text-muted-foreground mb-16"
            >
              {[
                "11 built-in roles",
                "Kanban, list, calendar & timeline",
                "Built-in analytics",
                "No credit card required",
              ].map((fact, i) => (
                <span key={fact} className="flex items-center gap-3">
                  {i > 0 && <span className="text-border select-none">·</span>}
                  {fact}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Product Preview — a clean elevated screenshot, not a fake browser toy */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="relative"
          >
            <div className="relative max-w-6xl mx-auto">
              <div className="absolute -inset-4 bg-teal-400/10 dark:bg-teal-400/5 rounded-[2rem] blur-2xl" />
              <div className="relative rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden bg-card border border-border">
                <img
                  src="/landing/dashboard.jpg"
                  alt="Meridian dashboard showing active projects, task progress, and risk detection"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Role-Based Access Section */}
      <section id="roles" className="py-24 bg-muted/30 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Eyebrow>11 built-in roles</Eyebrow>
            <h2
              className={`text-4xl sm:text-5xl font-semibold text-foreground mb-4 tracking-tight ${displayFont}`}
            >
              Access scoped to{" "}
              <span className="text-teal-600 dark:text-teal-400">
                what each person needs
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From workspace managers to guests, every role sees a different,
              deliberately scoped slice of the workspace.
            </p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
            {userRoles.map((role) => {
              const isSelected = selectedRole.id === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`cursor-pointer p-5 rounded-xl border text-left transition-all duration-200 !shadow-none ${
                    isSelected
                      ? "!border-teal-500 !bg-teal-500/5 shadow-sm"
                      : "!border-border !bg-background hover:!border-teal-500/40"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg mb-3 flex items-center justify-center transition-colors duration-200 ${
                      isSelected
                        ? "bg-teal-500 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <role.icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {role.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Role Details */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="p-8 bg-background rounded-2xl border border-border border-l-4 border-l-teal-500 shadow-sm max-w-3xl mx-auto"
            >
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
                  <selectedRole.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3
                    className={`text-xl font-semibold text-foreground mb-1.5 ${displayFont}`}
                  >
                    {selectedRole.name}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedRole.description}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="features" className="py-24 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Eyebrow>What's included</Eyebrow>
            <h2
              className={`text-4xl sm:text-5xl font-semibold text-foreground mb-4 tracking-tight ${displayFont}`}
            >
              Everything your team needs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Planning, analytics, team management, and security — all scoped by
              the same role system.
            </p>
          </div>

          <Tabs
            value={activeFeatureCategory.category}
            onValueChange={(value) => {
              const category = platformFeatures.find(
                (f) => f.category === value,
              );
              if (category) setActiveFeatureCategory(category);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-12 bg-muted/50">
              {platformFeatures.map((category) => (
                <TabsTrigger
                  key={category.category}
                  value={category.category}
                  className="cursor-pointer flex items-center gap-2 text-sm py-2.5 data-[state=active]:bg-background"
                >
                  <category.icon className="w-4 h-4" />
                  {category.category}
                </TabsTrigger>
              ))}
            </TabsList>

            {platformFeatures.map((category) => (
              <TabsContent
                key={category.category}
                value={category.category}
                className="mt-0"
              >
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {category.features.map((feature) => (
                    <div
                      key={feature.name}
                      className="group p-6 bg-background rounded-xl border border-border hover:border-teal-500/40 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="inline-flex p-2.5 rounded-lg mb-4 bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400">
                        <feature.icon className="w-5 h-5" />
                      </div>
                      <h3
                        className={`text-lg font-semibold text-foreground mb-1.5 ${displayFont}`}
                      >
                        {feature.name}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Real Product Screenshots Section */}
      <section className="py-24 bg-muted/30 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Eyebrow>The real product</Eyebrow>
            <h2
              className={`text-4xl sm:text-5xl font-semibold text-foreground mb-4 tracking-tight ${displayFont}`}
            >
              See it for yourself
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real screens from the actual product — no mockups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {productScreenshots.map((shot) => (
              <div
                key={shot.src}
                className="rounded-2xl overflow-hidden border border-border bg-background shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <img
                  src={shot.src}
                  alt={shot.alt}
                  className="w-full h-auto border-b border-border"
                />
                <div className="p-5">
                  <h3
                    className={`text-base font-semibold text-foreground mb-1 ${displayFont}`}
                  >
                    {shot.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {shot.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Meridian Section */}
      <section id="why" className="py-24 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2
              className={`text-4xl sm:text-5xl font-semibold text-foreground mb-4 tracking-tight ${displayFont}`}
            >
              Why teams pick Meridian
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reasons.map((reason) => (
              <div
                key={reason.title}
                className="p-6 bg-background rounded-xl border border-border shadow-sm"
              >
                <div className="inline-flex p-2.5 rounded-lg mb-4 bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400">
                  <reason.icon className="w-5 h-5" />
                </div>
                <h3
                  className={`text-lg font-semibold text-foreground mb-2 ${displayFont}`}
                >
                  {reason.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-muted/30 w-full">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Eyebrow>Got questions?</Eyebrow>
            <h2
              className={`text-4xl sm:text-5xl font-semibold text-foreground mb-4 tracking-tight ${displayFont}`}
            >
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqData.map((faq, index) => (
              <div
                key={faq.question}
                className="bg-background rounded-xl border border-border overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenFaqIndex(openFaqIndex === index ? null : index)
                  }
                  className="cursor-pointer w-full px-6 py-5 text-left flex items-center justify-between !bg-transparent hover:!bg-muted/40 !border-none !shadow-none !text-foreground transition-colors"
                >
                  <span className="font-medium text-foreground pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                      openFaqIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaqIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5">
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 w-full">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative rounded-3xl p-12 sm:p-16 text-white overflow-hidden shadow-xl bg-[#1B2559]">
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl bg-[#12193F]" />

            <div className="relative z-10">
              <h2
                className={`text-3xl sm:text-5xl font-semibold mb-4 tracking-tight ${displayFont}`}
              >
                Ready to give your team the access model it should have had from
                day one?
              </h2>
              <div className="flex justify-center mt-8">
                <Link to="/auth/sign-up">
                  <Button
                    size="lg"
                    className="cursor-pointer text-base px-7 py-6 h-auto !bg-teal-400 !text-[#0B1220] hover:!bg-teal-300 shadow-lg"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  Free to get started
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  No credit card required
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 border-t w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-muted/80 p-1.5 ring-1 ring-border">
                  <MeridianMark className="h-8 w-8" />
                </div>
                <span
                  className={`text-lg font-semibold text-foreground ${displayFont}`}
                >
                  Meridian
                </span>
              </div>
              <p className="text-muted-foreground max-w-md leading-relaxed text-sm">
                Project management with an 11-role access control system built
                in — so every team member sees exactly what they need.
              </p>
            </div>

            <div>
              <h3
                className={`font-semibold text-foreground mb-4 ${displayFont}`}
              >
                Product
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="#features"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#roles"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Roles
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    FAQ
                  </a>
                </li>
                <li>
                  <Link
                    to="/auth/sign-in"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    to="/auth/sign-up"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Get Started Free
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 text-center">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Meridian.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
