"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPortal } from "react-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SmartAvatar } from "@/components/avatar/smart-avatar";
import { 
  FolderOpen, 
  Calendar as CalendarIcon, 
  Users, 
  DollarSign,
  Target,
  Clock,
  Zap,
  Palette,
  Code,
  TrendingUp,
  Settings,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Upload,
  GitBranch,
  Database,
  Flag,
  Search,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useRBACAuth } from "@/lib/permissions";
import useWorkspaceStore from "@/store/workspace";
import { toast } from "sonner";
import useCreateProject from "@/hooks/mutations/project/use-create-project";
import { useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { client } from "@meridian/libs";
import { getTemplates } from "@/fetchers/templates/get-templates";
import type { ProjectTemplate } from "@/types/templates";

// Project templates will be fetched from API

// Priority options
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-gray-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-red-500" },
  { value: "critical", label: "Critical", color: "bg-purple-500" }
];

// Team members will be fetched from workspace API
// Removed hardcoded SUGGESTED_MEMBERS

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const { hasPermission } = useRBACAuth();
  const { workspace } = useWorkspaceStore();
  const router = useRouter();
  
  // Form state
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("custom");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: "medium",
    budget: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    teamMembers: [] as string[],
    technologies: [] as string[],
    milestones: [] as string[],
    goals: [] as string[]
  });

  // Fetch available team members from workspace
  const [availableMembers, setAvailableMembers] = useState<Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Fetch workspace members when modal opens
  React.useEffect(() => {
    if (!open || !workspace?.id) return;

    const fetchWorkspaceMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3005'}/api/workspace-users/${workspace.id}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch members');

        const users = await response.json();
        const members = users.map((u: any) => ({
          id: u.id || u.userId,
          name: u.name || u.userName || u.email?.split('@')[0] || 'Unknown',
          role: u.role || 'member',
          email: u.email || u.userEmail,
          avatar: u.avatar // Custom avatar if exists, DiceBear will be used in component
        }));

        setAvailableMembers(members);
      } catch (error) {
        console.error('Error fetching workspace members:', error);
        setAvailableMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchWorkspaceMembers();
  }, [open, workspace?.id]);
  
  // Create project mutation - we'll pass data during the mutation call
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.id) {
        throw new Error("No workspace selected");
      }

      if (!formData.name.trim()) {
        throw new Error("Project name is required");
      }

      // Create a clean slug from the project name (max 10 chars as per API schema)
      const slug = formData.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .substring(0, 10); // Limit to 10 characters as per API schema

      // Find selected template
      const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

      const projectData = {
        workspaceId: workspace.id,
        name: formData.name.trim(),
        description: formData.description?.trim() || "",
        slug: slug || "project",
        icon: selectedTemplate === "custom" ? "Settings" : 
              selectedTemplateData?.icon || "Layout",
        
        // Project metadata
        status: "planning" as const,
        category: selectedTemplate === "custom" ? "other" as const :
                 (selectedTemplateData?.category as any) || "other" as const,
        priority: formData.priority as "low" | "medium" | "high" | "urgent",
        
        // Visibility and access
        visibility: "team" as const,
        allowGuestAccess: false,
        requireApprovalForJoining: true,
        
        // Feature toggles
        timeTrackingEnabled: true,
        requireTimeEntry: false,
        enableSubtasks: true,
        enableDependencies: true,
        enableBudgetTracking: false,
        
        // Timeline
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        budget: 0,
        estimatedHours: 0,
        
        // Notifications
        emailNotifications: true,
        slackNotifications: false,
      };const response = await client.project.$post({
        json: projectData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Project creation failed:", errorData);
        throw new Error(errorData || "Failed to create project");
      }

      return await response.json();
    }
  });

  // Permission checks
  const canCreateProjects = hasPermission("canCreateProjects");
  const canAssignMembers = hasPermission("canManageTeamRoles");
  const canSetBudget = hasPermission("canManageProjectBudget");

  // Reset form when modal closes
  const handleClose = () => {
    setStep(1);
    setSelectedTemplate("");
    setSelectedCategory("custom");
    setSearchQuery("");
    setFormData({
      name: "",
      description: "",
      priority: "medium",
      budget: "",
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      teamMembers: [],
      technologies: [],
      milestones: [],
      goals: []
    });
    // Reset any mutation state
    createProjectMutation.reset();
    onClose();
  };

  // Fetch templates
  const { data: templatesResponse, isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => getTemplates({ limit: 50, isOfficial: true }),
  });

  const templates = templatesResponse?.templates || [];

  // Template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        technologies: template.tags // Use tags as technologies
      }));
    }
    setStep(2);
  };

  // Add/remove team members
  const toggleTeamMember = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.includes(memberId)
        ? prev.teamMembers.filter(id => id !== memberId)
        : [...prev.teamMembers, memberId]
    }));
  };

  // Add technology
  const addTechnology = (tech: string) => {
    if (tech && !formData.technologies.includes(tech)) {
      setFormData(prev => ({
        ...prev,
        technologies: [...prev.technologies, tech]
      }));
    }
  };

  // Remove technology
  const removeTechnology = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      technologies: prev.technologies.filter(t => t !== tech)
    }));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!canCreateProjects) {
      toast.error("You don't have permission to create projects");
      return;
    }

    if (!workspace) {
      toast.error("Please select a workspace first");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      const result = await createProjectMutation.mutateAsync();
      
      toast.success("Project created successfully!");
      handleClose();
      
      // Navigate to the projects page
      router.navigate({
        to: '/dashboard/projects'
      });
    } catch (error: any) {
      console.error("Failed to create project:", error);
      toast.error(error?.message || "Failed to create project");
    }
  };

  // Progress calculation and validation
  const progress = useMemo(() => {
    const requiredFields = ["name"];
    const optionalFields = ["description"];
    const completedRequired = requiredFields.filter(field => 
      formData[field as keyof typeof formData] && 
      String(formData[field as keyof typeof formData]).trim()
    ).length;
    const completedOptional = optionalFields.filter(field => 
      formData[field as keyof typeof formData] && 
      String(formData[field as keyof typeof formData]).trim()
    ).length;
    
    const totalFields = requiredFields.length + optionalFields.length;
    const completedFields = completedRequired + completedOptional;
    return (completedFields / totalFields) * 100;
  }, [formData]);

  // Form validation
  const isStep2Valid = useMemo(() => {
    return formData.name.trim().length > 0;
  }, [formData.name]);

  const canProceedToStep3 = useMemo(() => {
    return isStep2Valid && selectedTemplate;
  }, [isStep2Valid, selectedTemplate]);

  if (!canCreateProjects) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="glass-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <span>Access Restricted</span>
            </DialogTitle>
            <DialogDescription>
              You don't have permission to create projects in this workspace.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleClose} className="glass-card">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Custom stable modal implementation
  if (!open) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className={cn(
          "glass-card border-border/50 backdrop-blur-xl max-w-4xl w-full",
          "bg-white/95 dark:bg-black/95 h-[80vh] flex flex-col rounded-lg shadow-2xl",
          "relative"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <div className="pb-6 flex-shrink-0 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold gradient-text flex items-center space-x-3">
                <FolderOpen className="h-6 w-6 text-blue-600" />
                <span>Create New Project</span>
              </h2>
              <p className="text-lg mt-2 text-muted-foreground">
                {step === 1 && "Choose a template to get started quickly"}
                {step === 2 && "Configure your project details"}
                {step === 3 && "Review and create your project"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-muted-foreground">Step {step} of 3</div>
              <Progress value={(step / 3) * 100} className="w-32 h-3 mt-2" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 space-y-8 pr-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <AnimatePresence mode="wait">
          {/* Step 1: Template Selection - Redesigned with Sidebar */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col -mx-8 -my-8"
            >
              {templatesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading templates...</p>
                  </div>
                </div>
              ) : (() => {
                // Group templates by profession
                const templatesByProfession = templates.reduce((acc, template) => {
                  const profession = template.profession || 'Other';
                  if (!acc[profession]) {
                    acc[profession] = [];
                  }
                  acc[profession].push(template);
                  return acc;
                }, {} as Record<string, typeof templates>);

                // Sort professions alphabetically
                const sortedProfessions = Object.keys(templatesByProfession).sort();

                // Get icon for profession
                const getProfessionIcon = (prof: string) => {
                  const iconMap: Record<string, any> = {
                    'Software Engineer': Code,
                    'Designer': Palette,
                    'Marketer': TrendingUp,
                    'Data Analyst': Database,
                    'Product Manager': Target,
                    'Business Analyst': GitBranch,
                  };
                  return iconMap[prof] || FolderOpen;
                };

                // Get templates for selected category
                const getSelectedTemplates = () => {
                  if (selectedCategory === 'custom') return [];
                  return templatesByProfession[selectedCategory] || [];
                };

                // Filter templates by search query
                const filteredTemplates = getSelectedTemplates().filter(template =>
                  template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                );

                return (
                  <>
                    {/* Search Bar */}
                    <div className="flex-shrink-0 px-8 pt-6 pb-4 border-b border-border/50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search templates by name, description, or tags..."
                          className="pl-10 glass-card h-11"
                        />
                      </div>
                    </div>

                    {/* Sidebar + Content Layout */}
                    <div className="flex-1 flex min-h-0">
                      {/* Left Sidebar - Categories */}
                      <div className="w-72 flex-shrink-0 border-r border-border/50 bg-muted/30 overflow-y-auto custom-scrollbar">
                        <div className="p-4 space-y-1">
                          {/* Custom Project */}
                          <button
                            onClick={() => setSelectedCategory('custom')}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                              selectedCategory === 'custom'
                                ? "bg-primary/10 text-primary border-l-2 border-primary pl-2.5"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Sparkles className={cn("h-4 w-4 flex-shrink-0", selectedCategory === 'custom' ? "text-primary" : "text-muted-foreground")} />
                            <span className="flex-1 text-left truncate min-w-0">Start from Scratch</span>
                            {selectedCategory === 'custom' && (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                          </button>

                          <Separator className="my-3" />

                          {/* Professional Categories */}
                          {sortedProfessions.map((profession) => {
                            const professionTemplates = templatesByProfession[profession];
                            const ProfessionIcon = getProfessionIcon(profession);

                            return (
                              <button
                                key={profession}
                                onClick={() => {
                                  setSelectedCategory(profession);
                                  setSearchQuery(''); // Clear search when changing category
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all overflow-hidden",
                                  selectedCategory === profession
                                    ? "bg-primary/10 text-primary border-l-2 border-primary pl-2.5"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <ProfessionIcon className={cn("h-4 w-4 flex-shrink-0", selectedCategory === profession ? "text-primary" : "text-muted-foreground")} />
                                <span className="flex-1 text-left truncate min-w-0">{profession}</span>
                                <Badge variant="secondary" className="text-xs flex-shrink-0 px-1.5 min-w-[24px] text-center">
                                  {professionTemplates.length}
                                </Badge>
                                {selectedCategory === profession && (
                                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Panel - Templates */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6">
                          {selectedCategory === 'custom' ? (
                            /* Custom Project Card */
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="max-w-2xl"
                            >
                              <h3 className="text-lg font-semibold mb-4 flex items-center">
                                <Sparkles className="h-5 w-5 mr-2 text-primary" />
                                Start from Scratch
                              </h3>
                              <motion.div
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className={cn(
                                  "relative overflow-hidden rounded-xl border-2 cursor-pointer transition-all duration-300",
                                  "glass-card",
                                  selectedTemplate === "custom"
                                    ? "border-primary shadow-lg ring-2 ring-primary/20"
                                    : "border-border/50 hover:border-primary/50 hover:shadow-md"
                                )}
                                onClick={() => handleTemplateSelect("custom")}
                              >
                                <div className="h-32 relative bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500">
                                  <div className="absolute inset-0 bg-black/10" />
                                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
                                  <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                                        <Settings className="h-6 w-6 text-white" />
                                      </div>
                                      <div>
                                        <h4 className="text-white font-semibold text-lg">Custom Project</h4>
                                        <p className="text-white/80 text-xs">Build your own from scratch</p>
                                      </div>
                                    </div>
                                    {selectedTemplate === "custom" && (
                                      <CheckCircle2 className="h-6 w-6 text-white" />
                                    )}
                                  </div>
                                </div>
                                <div className="p-6 space-y-4">
                                  <p className="text-muted-foreground">
                                    Start with a blank canvas and build your project exactly how you want it. Perfect for unique requirements or when you prefer full control over your project structure.
                                  </p>
                                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                    <span className="flex items-center">
                                      <Zap className="h-4 w-4 mr-1.5 text-yellow-500" />
                                      Maximum flexibility
                                    </span>
                                    <span className="flex items-center">
                                      <Target className="h-4 w-4 mr-1.5 text-blue-500" />
                                      Tailored to your needs
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            </motion.div>
                          ) : (
                            /* Professional Templates Grid */
                            <motion.div
                              key={selectedCategory}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="mb-6">
                                <h3 className="text-lg font-semibold flex items-center">
                                  {React.createElement(getProfessionIcon(selectedCategory), { className: "h-5 w-5 mr-2 text-primary" })}
                                  {selectedCategory}
                                  <Badge variant="secondary" className="ml-3">
                                    {searchQuery ? filteredTemplates.length : templatesByProfession[selectedCategory]?.length || 0} templates
                                  </Badge>
                                </h3>
                                {searchQuery && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Filtered by "{searchQuery}"
                                  </p>
                                )}
                              </div>

                              {filteredTemplates.length === 0 ? (
                                <div className="text-center py-12">
                                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                  <p className="text-muted-foreground">
                                    {searchQuery ? 'No templates match your search' : 'No templates in this category'}
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {filteredTemplates.map((template) => {
                                    const complexityMap: Record<string, string> = {
                                      'beginner': 'Easy',
                                      'intermediate': 'Medium',
                                      'advanced': 'Hard'
                                    };

                                    const IconComponent = getProfessionIcon(template.profession);

                                    return (
                                      <motion.div
                                        key={template.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className={cn(
                                          "relative overflow-hidden rounded-xl border-2 cursor-pointer transition-all duration-300",
                                          "glass-card",
                                          selectedTemplate === template.id
                                            ? "border-primary shadow-lg ring-2 ring-primary/20"
                                            : "border-border/50 hover:border-primary/50 hover:shadow-md"
                                        )}
                                        onClick={() => handleTemplateSelect(template.id)}
                                      >
                                        <div className={cn("h-24 relative", template.color)}>
                                          <div className="absolute inset-0 bg-black/20" />
                                          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                                            <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                                              <IconComponent className="h-5 w-5 text-white flex-shrink-0" />
                                              <h4 className="text-white font-semibold text-sm truncate">{template.name}</h4>
                                            </div>
                                            <div className="flex items-center space-x-2 flex-shrink-0">
                                              <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                                {complexityMap[template.difficulty] || template.difficulty}
                                              </Badge>
                                              {selectedTemplate === template.id && (
                                                <CheckCircle2 className="h-5 w-5 text-white" />
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="p-4 space-y-3">
                                          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                                            {template.description}
                                          </p>

                                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center">
                                              <Clock className="h-3 w-3 mr-1" />
                                              {template.estimatedDuration ? `${template.estimatedDuration} days` : 'Flexible'}
                                            </span>
                                            <span className="flex items-center">
                                              <Target className="h-3 w-3 mr-1" />
                                              {template.industry}
                                            </span>
                                          </div>

                                          {template.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-1">
                                              {template.tags.slice(0, 4).map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                  {tag}
                                                </Badge>
                                              ))}
                                              {template.tags.length > 4 && (
                                                <Badge variant="secondary" className="text-xs">
                                                  +{template.tags.length - 4}
                                                </Badge>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* Step 2: Project Details */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Basic Info */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center">
                      Project Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter project name"
                      className="glass-card h-12 w-full text-lg font-medium"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-sm font-medium flex items-center">
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your project"
                      className="glass-card resize-none w-full min-h-[90px]"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center space-x-2">
                      <Flag className="h-4 w-4" />
                      <span>Priority</span>
                    </Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger className="glass-card h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card">
                        {PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <div className={cn("w-3 h-3 rounded-full", option.color)} />
                              <span className="font-medium">{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {canSetBudget && (
                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget (USD)</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                        placeholder="100000"
                        className="glass-card"
                      />
                    </div>
                  )}
                </div>

                {/* Right Column - Dates & Team */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Start Date</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start glass-card h-11">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {format(formData.startDate, "MMM d, yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 glass-card" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.startDate}
                            onSelect={(date) => date && setFormData(prev => ({ ...prev, startDate: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>End Date</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start glass-card h-11">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {format(formData.endDate, "MMM d, yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 glass-card" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.endDate}
                            onSelect={(date) => date && setFormData(prev => ({ ...prev, endDate: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {canAssignMembers && (
                    <div className="space-y-2">
                      <Label>Team Members</Label>
                      {isLoadingMembers ? (
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : availableMembers.length === 0 ? (
                        <div className="text-center p-4 text-sm text-muted-foreground">
                          No team members available
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                          {availableMembers.map((member) => (
                            <div
                              key={member.id}
                              className={cn(
                                "flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors",
                                "hover:bg-muted/50 glass-card",
                                formData.teamMembers.includes(member.id) && "bg-primary/10 border-primary/20"
                              )}
                              onClick={() => toggleTeamMember(member.id)}
                            >
                              <SmartAvatar
                                user={{
                                  email: member.email,
                                  name: member.name,
                                  role: member.role,
                                  avatar: member.avatar,
                                }}
                                size="sm"
                                showRole={false}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {member.role.replace('-', ' ')}
                                </p>
                              </div>
                              {formData.teamMembers.includes(member.id) && (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Technologies</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Add technology (press Enter)"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTechnology(e.currentTarget.value);
                            e.currentTarget.value = "";
                          }
                        }}
                        className="glass-card"
                      />
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {formData.technologies.map((tech) => (
                          <Badge 
                            key={tech} 
                            variant="secondary" 
                            className="text-xs glass-card cursor-pointer hover:bg-red-100"
                            onClick={() => removeTechnology(tech)}
                          >
                            {tech}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Form Completion</Label>
                  <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="glass-card p-6 rounded-xl border border-border/50">
                <h3 className="text-lg font-semibold mb-4">Project Summary</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Project Name</Label>
                      <p className="font-medium">{formData.name}</p>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Description</Label>
                      <p className="text-sm">{formData.description}</p>
                      </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Duration</Label>
                      <p className="text-sm">
                        {format(formData.startDate, "MMM d, yyyy")} - {format(formData.endDate, "MMM d, yyyy")}
                      </p>
                    </div>
                    </div>

                  <div className="space-y-4">
                    {formData.teamMembers.length > 0 && (
                    <div>
                        <Label className="text-sm text-muted-foreground">Team Members</Label>
                        <div className="flex -space-x-2 mt-1">
                          {formData.teamMembers.slice(0, 5).map((memberId) => {
                            const member = availableMembers.find(m => m.id === memberId);
                            return member ? (
                              <SmartAvatar
                                key={member.id}
                                user={{
                                  email: member.email,
                                  name: member.name,
                                  role: member.role,
                                  avatar: member.avatar,
                                }}
                                size="sm"
                                className="ring-2 ring-background"
                              />
                            ) : null;
                          })}
                          {formData.teamMembers.length > 5 && (
                            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                              +{formData.teamMembers.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {formData.technologies.length > 0 && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Technologies</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.technologies.map((tech) => (
                            <Badge key={tech} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                      </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50 flex-shrink-0 p-6">
          <div className="flex items-center space-x-2">
            {step > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setStep(step - 1)}
                disabled={createProjectMutation.isPending}
                className="glass-card"
              >
                Back
              </Button>
            )}
                    </div>

          <div className="flex items-center space-x-2">
                        <Button
              variant="outline" 
              onClick={handleClose}
              disabled={createProjectMutation.isPending}
              className="glass-card"
                        >
                          Cancel
                        </Button>
            
            {step < 3 ? (
              <Button 
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !selectedTemplate) ||
                  (step === 2 && !isStep2Valid)
                }
                className="glass-card"
              >
                Next
              </Button>
            ) : (
                      <Button
                onClick={handleSubmit}
                disabled={createProjectMutation.isPending || !formData.name.trim()}
                className="glass-card bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
              >
                {createProjectMutation.isPending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <Settings className="h-4 w-4" />
                    </motion.div>
                    Creating...
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-4 w-4 mr-2" />
                        Create Project
                  </>
                )}
                      </Button>
            )}
                    </div>
                  </div>
      </div>
    </div>,
    document.body
  );
}
