// @epic-3.5-communication: Enhanced help center with Magic UI integration
// @persona-sarah: PM needs quick access to project management guides
// @persona-jennifer: Exec needs strategic guidance and best practices
// @persona-david: Team lead needs team management documentation
// @persona-mike: Dev needs technical documentation and API guides
// @persona-lisa: Designer needs design system and collaboration guides

"use client";

import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  BookOpen,
  Video,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Star,
  Clock,
  Users,
  Mail,
  HelpCircle,
  PlayCircle,
  ThumbsUp,
  Download,
  Bookmark,
  Share,
  Filter,
  Grid,
  List,
  Zap,
  Target,
  Settings,
  Shield,
  BarChart3,
  Palette,
  Code,
  Globe,
  Headphones,
  FileText,
  Lightbulb,
  Phone,
  MessageSquare,
  X
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import PageTitle from "@/components/page-title";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { useRBACAuth } from "@/lib/permissions";
import UniversalHeader from "@/components/dashboard/universal-header";
import { useGetArticles } from "@/hooks/queries/help/use-get-articles";
import { useGetFAQs } from "@/hooks/queries/help/use-get-faqs";
import { useRateArticle, useArticleFeedback, useFAQFeedback } from "@/hooks/mutations/help/use-rate-article";
import { HelpSkeleton, FAQSkeleton } from "@/components/help/help-skeleton";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/dashboard/help/")({
  component: HelpPage,
});

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  slug: string;
  category: "getting-started" | "features" | "integrations" | "troubleshooting" | "best-practices";
  readTime: number;
  rating: number;
  tags: string[];
  icon: any;
  difficulty: "beginner" | "intermediate" | "advanced";
  lastUpdated: Date;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  category: string;
  views: number;
  rating: number;
  instructor: {
    name: string;
    avatar: string;
    role: string;
  };
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  tags: string[];
  relatedArticles?: string[];
}

// Enhanced sample data with Magic UI styling
const sampleArticles: HelpArticle[] = [
  {
    id: "1",
    title: "Getting Started with Meridian Workspace",
    description: "Complete guide to setting up your workspace, inviting team members, and configuring basic settings",
    slug: "getting-started-with-meridian-workspace",
    category: "getting-started",
    readTime: 5,
    rating: 4.8,
    tags: ["setup", "basics", "workspace", "onboarding"],
    icon: Target,
    difficulty: "beginner",
    lastUpdated: new Date("2024-01-15")
  },
  {
    id: "2",
    title: "Advanced Task Management & Workflows",
    description: "Master complex task hierarchies, dependencies, and automated workflow triggers",
    slug: "advanced-task-management-workflows",
    category: "features",
    readTime: 12,
    rating: 4.9,
    tags: ["tasks", "workflow", "automation", "dependencies"],
    icon: Settings,
    difficulty: "advanced",
    lastUpdated: new Date("2024-01-10")
  },
  {
    id: "3",
    title: "Team Collaboration & Role Management",
    description: "Learn to optimize team collaboration with proper role assignments and permission management",
    slug: "team-collaboration-role-management",
    category: "best-practices",
    readTime: 8,
    rating: 4.7,
    tags: ["team", "collaboration", "permissions", "rbac"],
    icon: Users,
    difficulty: "intermediate",
    lastUpdated: new Date("2024-01-08")
  },
  {
    id: "4",
    title: "API Integration & Custom Workflows",
    description: "Connect Meridian with external tools using webhooks, API integrations, and custom automations",
    slug: "api-integration-custom-workflows",
    category: "integrations",
    readTime: 15,
    rating: 4.6,
    tags: ["api", "webhooks", "automation", "integrations"],
    icon: Code,
    difficulty: "advanced",
    lastUpdated: new Date("2024-01-05")
  },
  {
    id: "5",
    title: "Analytics & Performance Tracking",
    description: "Understand your team's productivity with advanced analytics and performance metrics",
    slug: "analytics-performance-tracking",
    category: "features",
    readTime: 10,
    rating: 4.8,
    tags: ["analytics", "metrics", "performance", "reports"],
    icon: BarChart3,
    difficulty: "intermediate",
    lastUpdated: new Date("2024-01-12")
  },
  {
    id: "6",
    title: "Design System & Brand Customization",
    description: "Customize Meridian's appearance to match your brand with themes and design tokens",
    slug: "design-system-brand-customization",
    category: "features",
    readTime: 6,
    rating: 4.5,
    tags: ["design", "branding", "customization", "themes"],
    icon: Palette,
    difficulty: "intermediate",
    lastUpdated: new Date("2024-01-07")
  }
];

const sampleTutorials: VideoTutorial[] = [
  {
    id: "1",
    title: "Meridian Quick Start: From Zero to Productive",
    description: "Complete walkthrough of setting up your first workspace and managing your first project",
    duration: "12:45",
    thumbnail: "/api/placeholder/400/240",
    category: "Getting Started",
    views: 25420,
    rating: 4.9,
    instructor: {
      name: "Sarah Johnson",
      avatar: "/avatars/sarah.jpg",
      role: "Product Manager"
    }
  },
  {
    id: "2",
    title: "Advanced Project Dependencies",
    description: "Master complex project structures with task dependencies and milestone planning",
    duration: "18:32",
    thumbnail: "/api/placeholder/400/240",
    category: "Advanced",
    views: 12960,
    rating: 4.7,
    instructor: {
      name: "David Thompson",
      avatar: "/avatars/david.jpg",
      role: "Team Lead"
    }
  },
  {
    id: "3",
    title: "Team Performance Analytics Deep Dive",
    description: "Learn to interpret analytics data and optimize team performance",
    duration: "14:18",
    thumbnail: "/api/placeholder/400/240",
    category: "Analytics",
    views: 18340,
    rating: 4.8,
    instructor: {
      name: "Jennifer Wilson",
      avatar: "/avatars/jennifer.jpg",
      role: "Executive"
    }
  }
];

const sampleFAQs: FAQ[] = [
  {
    id: "1",
    question: "How do I invite team members with specific roles?",
    answer: "Navigate to Settings > Team Management, click 'Invite Members', enter email addresses, and select from our 11-role hierarchy including workspace-manager, project-manager, team-lead, and more. Each role has specific permissions tailored to their responsibilities.",
    category: "Team Management",
    helpful: 67,
    tags: ["invites", "roles", "permissions", "rbac"],
    relatedArticles: ["3"]
  },
  {
    id: "2",
    question: "Can I integrate Meridian with development tools?",
    answer: "Yes! Meridian supports integrations with GitHub, GitLab, Slack, Discord, Jira, and 50+ other tools. Use our API for custom integrations or set up webhooks for real-time synchronization.",
    category: "Integrations",
    helpful: 89,
    tags: ["integrations", "api", "webhooks", "github", "slack"],
    relatedArticles: ["4"]
  },
  {
    id: "3",
    question: "How do project templates work?",
    answer: "Create reusable project templates from any project. Go to Project Settings > Templates, define task structures, assign default roles, and save. Templates include task hierarchies, timelines, and team assignments.",
    category: "Projects",
    helpful: 78,
    tags: ["templates", "projects", "automation"],
    relatedArticles: ["1", "2"]
  },
  {
    id: "4",
    question: "What's the difference between workspace and project permissions?",
    answer: "Workspace permissions control access to the entire workspace (workspace-manager, department-head, etc.), while project permissions are specific to individual projects (project-manager, project-viewer). Users can have different roles across projects.",
    category: "Permissions",
    helpful: 92,
    tags: ["permissions", "rbac", "security", "roles"],
    relatedArticles: ["3"]
  }
];

// Support channels
const SUPPORT_CHANNELS = [
  {
    id: "chat",
    title: "Live Chat",
    description: "Get instant help from our support team",
    icon: MessageSquare,
    availability: "24/7",
    responseTime: "< 2 minutes",
    color: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800"
  },
  {
    id: "email",
    title: "Email Support",
    description: "Detailed help for complex issues",
    icon: Mail,
    availability: "Business hours",
    responseTime: "< 4 hours",
    color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800"
  },
  {
    id: "phone",
    title: "Phone Support",
    description: "Direct phone support for urgent matters",
    icon: Phone,
    availability: "Enterprise only",
    responseTime: "Immediate",
    color: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800"
  },
  {
    id: "community",
    title: "Community Forum",
    description: "Connect with other Meridian users",
    icon: Users,
    availability: "24/7",
    responseTime: "Community driven",
    color: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800"
  }
];

const categoryColors = {
  "getting-started": "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  "features": "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  "integrations": "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
  "troubleshooting": "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  "best-practices": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
};

const difficultyColors = {
  "beginner": "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  "intermediate": "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300",
  "advanced": "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
};

function HelpPage() {
  const navigate = useNavigate();
  const { hasPermission } = useRBACAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"articles" | "videos" | "faq" | "support">("articles");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Debounce search term to avoid excessive API calls (500ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch real data from API using debounced search term
  const { data: articlesData, isLoading: articlesLoading } = useGetArticles({
    q: debouncedSearchTerm,
    category: selectedCategory,
  });

  const { data: faqsData, isLoading: faqsLoading } = useGetFAQs({
    q: debouncedSearchTerm,
  });

  const rateArticleMutation = useRateArticle();
  const articleFeedbackMutation = useArticleFeedback();
  const faqFeedbackMutation = useFAQFeedback();

  // Use real data or fallback to sample data
  const filteredArticles = articlesData?.data || sampleArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = faqsData?.data || sampleFAQs.filter(faq => {
    return faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
           faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
           faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const filteredTutorials = sampleTutorials.filter(tutorial => {
    return tutorial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           tutorial.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleContactSupport = (channel: string) => {
    toast.success(`Opening ${channel} support...`);
  };

  const handleBookmark = (id: string, type: string) => {
    toast.success(`${type} bookmarked successfully`);
  };

  const handleShare = (id: string, title: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/help/${id}`);
    toast.success("Link copied to clipboard");
  };

  const handleArticleFeedback = (articleId: string, helpful: boolean) => {
    articleFeedbackMutation.mutate({ articleId, helpful });
  };

  const handleFAQFeedback = (faqId: string, helpful: boolean) => {
    faqFeedbackMutation.mutate({ faqId, helpful });
  };

  // Reference to search input for keyboard shortcut focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement && e.target !== searchInputRef.current) {
        return;
      }

      // `/` or `Ctrl+K`: Focus search
      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // `Esc`: Clear search (if search is focused)
      if (e.key === 'Escape' && searchInputRef.current === document.activeElement) {
        e.preventDefault();
        setSearchTerm("");
        searchInputRef.current?.blur();
      }

      // `Ctrl+1-4`: Switch tabs
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setActiveTab("articles");
            break;
          case '2':
            e.preventDefault();
            setActiveTab("videos");
            break;
          case '3':
            e.preventDefault();
            setActiveTab("faq");
            break;
          case '4':
            e.preventDefault();
            setActiveTab("support");
            break;
        }
      }

      // `?`: Show keyboard shortcuts (could implement a modal)
      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault();
        toast.info("Keyboard Shortcuts", {
          description: (
            <div className="text-sm space-y-1 mt-2">
              <div><kbd className="px-2 py-1 bg-muted rounded text-xs">/ or Ctrl+K</kbd> Focus search</div>
              <div><kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> Clear search</div>
              <div><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+1-4</kbd> Switch tabs</div>
            </div>
          ),
          duration: 5000,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <LazyDashboardLayout>
      <UniversalHeader 
        title="Help & Support"
        subtitle="Find answers, learn new features, and get the most out of Meridian"
        variant="default"
        customActions={
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        }
      />
      <div className="flex-1 space-y-6 p-6">
        <PageTitle title="Help & Support" />
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card p-8 rounded-xl border border-border/50 text-center"
        >
          <div className="max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold gradient-text mb-4">How can we help you?</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Find answers, learn new features, and get the most out of Meridian
            </p>
            
            {/* Enhanced Search */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search for help articles, tutorials, or FAQs... (Press / or Ctrl+K)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg glass-card border-border/50 bg-white/50 dark:bg-black/50"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Quick Categories */}
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              {Object.entries(categoryColors).map(([category, colorClass]) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(selectedCategory === category ? "" : category)}
                  className={cn(
                    "glass-card",
                    selectedCategory === category && "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="glass-card border border-border/50">
                <TabsTrigger value="articles" className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Articles</span>
                  <Badge variant="secondary" className="ml-1">
                    {filteredArticles.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="videos" className="flex items-center space-x-2">
                  <Video className="h-4 w-4" />
                  <span>Videos</span>
                  <Badge variant="secondary" className="ml-1">
                    {filteredTutorials.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="faq" className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>FAQ</span>
                  <Badge variant="secondary" className="ml-1">
                    {filteredFAQs.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="support" className="flex items-center space-x-2">
                  <Headphones className="h-4 w-4" />
                  <span>Contact</span>
                </TabsTrigger>
              </TabsList>

              {(activeTab === "articles" || activeTab === "videos") && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className="glass-card"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className="glass-card"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Articles Tab */}
            <TabsContent value="articles" className="space-y-6">
              {articlesLoading ? (
                <HelpSkeleton type="article" count={6} />
              ) : (
                <AnimatePresence>
                  <div className={cn(
                    "grid gap-6",
                    viewMode === "grid" ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                  )}>
                    {filteredArticles.map((article, index) => {
                    const IconComponent = article.icon || BookOpen;
                    return (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        className="group"
                      >
                        <Card className="glass-card border-border/50 h-full hover:shadow-lg transition-all duration-300">
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                {IconComponent && (
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  categoryColors[article.category]
                                )}>
                                  <IconComponent className="h-5 w-5" />
                                </div>
                                )}
                                <div className="space-y-1">
                                  <Badge className={cn("text-xs", categoryColors[article.category])}>
                                    {article.category.split('-').map(word => 
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                  </Badge>
                                  <Badge variant="outline" className={cn("text-xs", difficultyColors[article.difficulty])}>
                                    {article.difficulty}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleBookmark(article.id, "Article")}
                                >
                                  <Bookmark className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleShare(article.id, article.title)}
                                >
                                  <Share className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {article.title}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {article.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{article.readTime} min</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span>{article.rating}</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="glass-card group-hover:bg-primary/10"
                                onClick={() => navigate({ to: `/dashboard/help/${article.slug}` })}
                              >
                                Read Article
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-3">
                              {article.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {article.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{article.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                    })}
                  </div>
                </AnimatePresence>
              )}

              {!articlesLoading && filteredArticles.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No articles found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or browse by category
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="space-y-6">
              <div className={cn(
                "grid gap-6",
                viewMode === "grid" ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
              )}>
                {filteredTutorials.map((tutorial, index) => (
                  <motion.div
                    key={tutorial.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="group"
                  >
                    <Card className="glass-card border-border/50 overflow-hidden hover:shadow-lg transition-all duration-300">
                      <div className="relative">
                        <img
                          src={tutorial.thumbnail}
                          alt={tutorial.title}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="lg" className="glass-card bg-white/20 hover:bg-white/30 text-white border-white/30">
                            <PlayCircle className="h-6 w-6 mr-2" />
                            Play Video
                          </Button>
                        </div>
                        <Badge className="absolute top-3 right-3 bg-black/70 text-white">
                          {tutorial.duration}
                        </Badge>
                      </div>
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={cn("text-xs", categoryColors.features)}>
                            {tutorial.category}
                          </Badge>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{tutorial.rating}</span>
                          </div>
                        </div>
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {tutorial.title}
                        </CardTitle>
                        <CardDescription>
                          {tutorial.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={tutorial.instructor.avatar} />
                              <AvatarFallback>
                                {tutorial.instructor.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{tutorial.instructor.name}</p>
                              <p className="text-xs text-muted-foreground">{tutorial.instructor.role}</p>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tutorial.views.toLocaleString()} views
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="space-y-4">
              {faqsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FAQSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <>
                  {filteredFAQs.map((faq, index) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="glass-card border-border/50">
                    <CardHeader 
                      className="cursor-pointer"
                      onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{faq.question}</CardTitle>
                        <motion.div
                          animate={{ rotate: expandedFAQ === faq.id ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </motion.div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={cn("text-xs", categoryColors.features)}>
                          {faq.category}
                        </Badge>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{faq.helpful} helpful</span>
                        </div>
                      </div>
                    </CardHeader>
                    <AnimatePresence>
                      {expandedFAQ === faq.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent>
                            <p className="text-muted-foreground mb-4">{faq.answer}</p>
                            <div className="flex flex-wrap gap-2">
                              {faq.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="glass-card"
                                  onClick={() => handleFAQFeedback(faq.id, true)}
                                >
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  Helpful
                                </Button>
                                <Button variant="outline" size="sm" className="glass-card">
                                  <Share className="h-3 w-3 mr-1" />
                                  Share
                                </Button>
                              </div>
                              {faq.relatedArticles && faq.relatedArticles.length > 0 && (
                                <Button variant="link" size="sm">
                                  View related articles
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
                  ))}
                </>
              )}
            </TabsContent>

            {/* Support Tab */}
            <TabsContent value="support" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SUPPORT_CHANNELS.map((channel, index) => {
                  const IconComponent = channel.icon || Headphones;
                  return (
                    <motion.div
                      key={channel.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card className={cn(
                        "glass-card border-border/50 h-full cursor-pointer hover:shadow-lg transition-all duration-300",
                        channel.color
                      )} onClick={() => handleContactSupport(channel.title)}>
                        <CardHeader>
                          <div className="flex items-center space-x-3">
                            {IconComponent && (
                            <div className="p-3 rounded-lg bg-current/10">
                              <IconComponent className="h-6 w-6" />
                            </div>
                            )}
                            <div>
                              <CardTitle className="text-lg">{channel.title}</CardTitle>
                              <CardDescription>{channel.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Availability:</span>
                              <span className="font-medium">{channel.availability}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Response time:</span>
                              <span className="font-medium">{channel.responseTime}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Additional Support Resources */}
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <span>Additional Resources</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="h-auto p-4 glass-card">
                      <div className="text-center">
                        <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="font-medium">API Documentation</div>
                        <div className="text-xs text-muted-foreground">Developer resources</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 glass-card">
                      <div className="text-center">
                        <Globe className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="font-medium">Status Page</div>
                        <div className="text-xs text-muted-foreground">System status</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 glass-card">
                      <div className="text-center">
                        <Download className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="font-medium">Downloads</div>
                        <div className="text-xs text-muted-foreground">Apps & tools</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </LazyDashboardLayout>
  );
}

export default HelpPage; 