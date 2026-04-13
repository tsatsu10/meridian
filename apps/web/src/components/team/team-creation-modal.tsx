// @epic-3.4-teams: Team creation and management modal
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShineBorder } from "@/components/magicui/shine-border";
import { 
  Users, 
  Plus, 
  X, 
  Search,
  UserPlus,
  Settings,
  Target,
  Calendar,
  Mail,
  Send,
  Palette
} from "lucide-react";
import { cn } from "@/lib/cn";
import useWorkspaceStore from "@/store/workspace";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch";

// Icon wrappers to fix TypeScript issues
const SearchIcon = Search as React.FC<{ className?: string }>;
const XIcon = X as React.FC<{ className?: string }>;
const UserPlusIcon = UserPlus as React.FC<{ className?: string }>;
const MailIcon = Mail as React.FC<{ className?: string }>;
const SendIcon = Send as React.FC<{ className?: string }>;

interface TeamData {
  name: string;
  description: string;
  color: string;
  type: 'development' | 'design' | 'marketing' | 'management' | 'other';
}

interface TeamCreationModalProps {
  open: boolean;
  onClose: () => void;
  onTeamCreated?: (team: TeamData) => void;
  projectId?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  status?: 'existing' | 'invited';
}

// Available members will be fetched from workspace API
// Remove hardcoded data

const teamTemplates = [
  {
    id: "dev",
    name: "Development Team",
    description: "Full-stack development team",
    color: "bg-blue-500",
    icon: "💻",
    suggestedRoles: ["Team Lead", "Senior Developer", "Developer", "QA Engineer"]
  },
  {
    id: "design",
    name: "Design Team", 
    description: "UI/UX and creative team",
    color: "bg-purple-500",
    icon: "🎨",
    suggestedRoles: ["Design Lead", "Senior Designer", "UX Researcher", "Visual Designer"]
  },
  {
    id: "product",
    name: "Product Team",
    description: "Product management and strategy",
    color: "bg-green-500", 
    icon: "📊",
    suggestedRoles: ["Product Manager", "Product Owner", "Business Analyst", "Data Analyst"]
  },
  {
    id: "marketing",
    name: "Marketing Team",
    description: "Marketing and growth team",
    color: "bg-orange-500",
    icon: "📈",
    suggestedRoles: ["Marketing Manager", "Content Creator", "SEO Specialist", "Social Media Manager"]
  }
];

const TEAM_TYPES = [
  { value: 'development', label: 'Development Team', description: 'Software engineering and technical work' },
  { value: 'design', label: 'Design Team', description: 'UI/UX design and creative work' },
  { value: 'marketing', label: 'Marketing Team', description: 'Marketing and promotional activities' },
  { value: 'management', label: 'Management Team', description: 'Project management and coordination' },
  { value: 'other', label: 'Other', description: 'Custom team type' }
];

const TEAM_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
];

export default function TeamCreationModal({ 
  open, 
  onClose, 
  onTeamCreated,
  projectId 
}: TeamCreationModalProps) {
  const [step, setStep] = useState<"template" | "details" | "members">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [teamData, setTeamData] = useState({
    name: "",
    description: "",
    projectId: "",
    color: "bg-blue-500"
  });
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    name: "",
    email: ""
  });
  // Fetch available members from workspace API
  const [availableMembers, setAvailableMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Fetch workspace members when modal opens
  React.useEffect(() => {
    if (!open || !workspace?.id) return;

    const fetchWorkspaceMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const users = await fetchApi(`/workspace-user/${workspace.id}`);
        const members: TeamMember[] = (Array.isArray(users) ? users : []).map((u: any) => ({
          id: u.id || u.userId,
          name: u.name || u.userName || u.email?.split("@")[0] || "Unknown",
          email: u.email || u.userEmail,
          role: u.role || "member",
          avatar: u.avatar,
          status: "existing" as const,
        }));

        setAvailableMembers(members);
      } catch (error) {
        console.error("Error fetching workspace members:", error);
        setAvailableMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchWorkspaceMembers();
  }, [open, workspace?.id]);
  const [formData, setFormData] = useState<TeamData>({
    name: '',
    description: '',
    color: TEAM_COLORS[0],
    type: 'development'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { workspace } = useWorkspaceStore();
  const { data: projects } = useGetProjects({ 
    workspaceId: workspace?.id || "" 
  });

  const filteredMembers = availableMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setTeamData({
      name: template.name,
      description: template.description,
      projectId: "",
      color: template.color
    });
    setStep("details");
  };

  const handleAddMember = (member: TeamMember) => {
    if (!selectedMembers.find(m => m.id === member.id)) {
      setSelectedMembers([...selectedMembers, member]);
      setMemberRoles({
        ...memberRoles,
        [member.id]: selectedTemplate?.suggestedRoles[0] || "Member"
      });
    }
  };

  const handleInviteMember = () => {
    if (!inviteData.email.trim()) return;
    
    const newMember: TeamMember = {
      id: `invite-${Date.now()}`,
      name: inviteData.name.trim() || inviteData.email.split('@')[0],
      email: inviteData.email.trim(),
      role: "Invited Member",
      status: 'invited'
    };

    // Check if email already exists
    const existingMember = selectedMembers.find(m => m.email === newMember.email);
    const existingAvailable = availableMembers.find(m => m.email === newMember.email);
    
    if (existingMember || existingAvailable) {
      // Could show a toast or error message here
      return;
    }

    setSelectedMembers([...selectedMembers, newMember]);
    setMemberRoles({
      ...memberRoles,
      [newMember.id]: selectedTemplate?.suggestedRoles[0] || "Member"
    });

    // Reset invite form
    setInviteData({ name: "", email: "" });
    setShowInviteForm(false);
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== memberId));
    const newRoles = { ...memberRoles };
    delete newRoles[memberId];
    setMemberRoles(newRoles);
  };

  const handleRoleChange = (memberId: string, role: string) => {
    setMemberRoles({
      ...memberRoles,
      [memberId]: role
    });
  };

  const handleCreateTeam = () => {
    const selectedProject = projects?.find(p => p.id === teamData.projectId);
    const newTeam = {
      id: Date.now().toString(),
      ...teamData,
      projectName: selectedProject?.name || "",
      members: selectedMembers.map(member => ({
        ...member,
        role: memberRoles[member.id] || "Member",
        projectId: teamData.projectId,
        projectName: selectedProject?.name || ""
      })),
      lead: selectedMembers[0]?.name || "",
      performance: 0,
      workload: 0,
      projects: 1
    };

    onTeamCreated?.(newTeam);
    onClose();
    
    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setStep("template");
    setSelectedTemplate(null);
    setTeamData({ name: "", description: "", projectId: "", color: "bg-blue-500" });
    setSelectedMembers([]);
    setMemberRoles({});
    setShowInviteForm(false);
    setInviteData({ name: "", email: "" });
    setFormData({
      name: "",
      description: "",
      color: TEAM_COLORS[0],
      type: "development",
    });
    setErrors({});
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Team name must be at least 2 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Team name must be less than 50 characters';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (!workspace?.id) {
      const message = "No workspace selected. Please choose a workspace before creating a team.";
      setErrors((prev) => ({ ...prev, submit: message }));
      toast.error(message);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        workspaceId: workspace.id,
        projectId: formData.projectId || null,
        color: formData.color,
        memberIds: selectedMembers.map((member) => member.id),
      };

      const response = await fetchApi("/team", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const createdTeam = response.team ?? response;

      onTeamCreated?.(createdTeam);
      handleClose();
    } catch (error) {
      console.error("Failed to create team:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create team. Please try again.";
      setErrors((prev) => ({ ...prev, submit: message }));
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof TeamData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedTeamType = TEAM_TYPES.find(t => t.value === formData.type);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-hidden gap-0 flex items-center justify-center p-0">
        <div className="w-full max-w-[600px] mx-auto">
          <div className="p-8 space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <DialogTitle className="text-3xl font-bold gradient-text flex items-center space-x-3">
                <Users className="h-6 w-6 text-blue-600" />
                <span>Create New Team</span>
              </DialogTitle>
              <DialogDescription className="text-lg">
                Create a new team to organize members and collaborate on projects.
              </DialogDescription>
            </div>

            <div className="max-h-[70vh] overflow-y-auto space-y-8 pr-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-none">
                {/* Team Details */}
                <div className="space-y-6">
                  <div className="flex items-center justify-start space-x-3">
                    <Target className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-xl font-semibold">Team Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Team Name */}
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-sm font-medium flex items-center">
                        Team Name *
                      </Label>
                      <Input
                        id="name"
                        placeholder="Frontend Development"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={cn(
                          "glass-card h-11 w-full font-medium",
                          errors.name && "border-red-500"
                        )}
                        maxLength={50}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500">{errors.name}</p>
                      )}
                    </div>

                    {/* Team Type */}
                    <div className="space-y-3">
                      <Label htmlFor="type" className="text-sm font-medium flex items-center">
                        Team Type
                      </Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: TeamData['type']) => 
                          handleInputChange('type', value)
                        }
                      >
                        <SelectTrigger className="glass-card h-11">
                          <SelectValue placeholder="Select team type" />
                        </SelectTrigger>
                        <SelectContent className="glass-card">
                          {TEAM_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">{type.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-sm font-medium flex items-center">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the team's responsibilities and goals..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className={cn(
                        "resize-none glass-card w-full min-h-[90px]",
                        errors.description && "border-red-500"
                      )}
                      rows={3}
                      maxLength={200}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500">{errors.description}</p>
                    )}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Help others understand what this team does</span>
                      <span>{formData.description?.length || 0}/200</span>
                    </div>
                  </div>
                </div>

                {/* Team Appearance */}
                <div className="space-y-6">
                  <div className="flex items-center justify-start space-x-3">
                    <Palette className="h-5 w-5 text-purple-600" />
                    <h3 className="text-xl font-semibold">Team Appearance</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center">
                      Team Color
                    </Label>
                    <div className="grid grid-cols-8 gap-3">
                      {TEAM_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleInputChange('color', color)}
                          className={cn(
                            "w-10 h-10 rounded-lg border-2 transition-all duration-200",
                            formData.color === color 
                              ? "border-foreground scale-110" 
                              : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {formData.name && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-start space-x-3">
                      <Users className="h-5 w-5 text-indigo-600" />
                      <h3 className="text-xl font-semibold">Preview</h3>
                    </div>
                    
                    <div className="p-4 glass-card rounded-lg border border-border/50">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: formData.color }}
                        />
                        <span className="font-medium">{formData.name}</span>
                        <span className="text-xs px-2 py-1 bg-muted rounded-full">
                          {selectedTeamType?.label}
                        </span>
                      </div>
                      {formData.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {formData.description}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Error */}
                {errors.submit && (
                  <div className="p-4 glass-card border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                  </div>
                )}

                <DialogFooter className="flex justify-between pt-6">
                  <div className="flex space-x-3 w-full justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="glass-card"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !formData.name.trim()}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6"
                    >
                      {isLoading ? 'Creating...' : 'Create Team'}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 