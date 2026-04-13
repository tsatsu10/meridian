// @epic-3.5-communication: Channel creation modal with templates and permissions
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Hash, 
  Lock, 
  Users, 
  MessageCircle,
  Megaphone,
  FolderOpen,
  Globe,
  Shield,
  UserPlus,
  Calendar,
  Lightbulb,
  Coffee,
  Code,
  FileText,
  Settings,
  CheckCircle,
  X
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { TeamMember } from "../chat/ChatInterface";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useWorkspaceStore from "@/store/workspace";

// Icon wrappers
const HashIcon = Hash as React.FC<{ className?: string }>;
const LockIcon = Lock as React.FC<{ className?: string }>;
const UsersIcon = Users as React.FC<{ className?: string }>;
const MessageCircleIcon = MessageCircle as React.FC<{ className?: string }>;
const MegaphoneIcon = Megaphone as React.FC<{ className?: string }>;
const FolderOpenIcon = FolderOpen as React.FC<{ className?: string }>;
const GlobeIcon = Globe as React.FC<{ className?: string }>;
const ShieldIcon = Shield as React.FC<{ className?: string }>;
const UserPlusIcon = UserPlus as React.FC<{ className?: string }>;
const CalendarIcon = Calendar as React.FC<{ className?: string }>;
const LightbulbIcon = Lightbulb as React.FC<{ className?: string }>;
const CoffeeIcon = Coffee as React.FC<{ className?: string }>;
const CodeIcon = Code as React.FC<{ className?: string }>;
const FileTextIcon = FileText as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const CheckCircleIcon = CheckCircle as React.FC<{ className?: string }>;
const XIcon = X as React.FC<{ className?: string }>;

interface ChannelCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: (channel: any) => void;
  teamMembers?: TeamMember[];
  initialChannelType?: ChannelType;
  initialProjectId?: string;
}

type ChannelType = 'project' | 'team' | 'announcement' | 'dm' | 'private';
type ChannelPrivacy = 'public' | 'private' | 'invite-only';

interface ChannelTemplate {
  id: string;
  name: string;
  description: string;
  type: ChannelType;
  privacy: ChannelPrivacy;
  icon: React.ReactNode;
  color: string;
  defaultSettings: {
    allowThreads: boolean;
    allowFileUploads: boolean;
    allowReactions: boolean;
    allowMentions: boolean;
  };
  examples: string[];
}

const CHANNEL_TEMPLATES: ChannelTemplate[] = [
  {
    id: 'general-team',
    name: 'General Team',
    description: 'General team discussions and updates',
    type: 'team',
    privacy: 'public',
    icon: <UsersIcon className="h-5 w-5" />,
    color: 'bg-blue-500',
    defaultSettings: {
      allowThreads: true,
      allowFileUploads: true,
      allowReactions: true,
      allowMentions: true
    },
    examples: ['general', 'team-chat', 'daily-standup']
  },
  {
    id: 'project-specific',
    name: 'Project Channel',
    description: 'Project-specific discussions and coordination',
    type: 'project',
    privacy: 'public',
    icon: <FolderOpenIcon className="h-5 w-5" />,
    color: 'bg-green-500',
    defaultSettings: {
      allowThreads: true,
      allowFileUploads: true,
      allowReactions: true,
      allowMentions: true
    },
    examples: ['web-redesign', 'mobile-app', 'api-development']
  },
  {
    id: 'announcements',
    name: 'Announcements',
    description: 'Important announcements and company updates',
    type: 'announcement',
    privacy: 'public',
    icon: <MegaphoneIcon className="h-5 w-5" />,
    color: 'bg-orange-500',
    defaultSettings: {
      allowThreads: false,
      allowFileUploads: false,
      allowReactions: true,
      allowMentions: false
    },
    examples: ['announcements', 'company-updates', 'releases']
  },
  {
    id: 'private-discussion',
    name: 'Private Discussion',
    description: 'Private channel for sensitive discussions',
    type: 'private',
    privacy: 'private',
    icon: <LockIcon className="h-5 w-5" />,
    color: 'bg-red-500',
    defaultSettings: {
      allowThreads: true,
      allowFileUploads: true,
      allowReactions: true,
      allowMentions: true
    },
    examples: ['leadership', 'hr-discussions', 'confidential']
  },
  {
    id: 'social',
    name: 'Social & Fun',
    description: 'Casual conversations and team bonding',
    type: 'team',
    privacy: 'public',
    icon: <CoffeeIcon className="h-5 w-5" />,
    color: 'bg-purple-500',
    defaultSettings: {
      allowThreads: true,
      allowFileUploads: true,
      allowReactions: true,
      allowMentions: true
    },
    examples: ['random', 'coffee-chat', 'memes', 'celebrations']
  },
  {
    id: 'development',
    name: 'Development',
    description: 'Technical discussions and code reviews',
    type: 'team',
    privacy: 'public',
    icon: <CodeIcon className="h-5 w-5" />,
    color: 'bg-indigo-500',
    defaultSettings: {
      allowThreads: true,
      allowFileUploads: true,
      allowReactions: true,
      allowMentions: true
    },
    examples: ['dev-talk', 'code-reviews', 'tech-support']
  }
];

export default function ChannelCreationModal({
  isOpen,
  onClose,
  onChannelCreated,
  teamMembers = [],
  initialChannelType,
  initialProjectId
}: ChannelCreationModalProps) {
  const [step, setStep] = useState<'template' | 'details' | 'settings' | 'members'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ChannelTemplate | null>(null);
  
  // Channel details
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [channelType, setChannelType] = useState<ChannelType>(initialChannelType || 'team');
  const [channelPrivacy, setChannelPrivacy] = useState<ChannelPrivacy>('public');
  const [linkedProjectId, setLinkedProjectId] = useState(initialProjectId || "");
  
  // Channel settings
  const [allowThreads, setAllowThreads] = useState(true);
  const [allowFileUploads, setAllowFileUploads] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [allowMentions, setAllowMentions] = useState(true);
  const [autoArchiveDays, setAutoArchiveDays] = useState<number | null>(null);
  
  // Member management
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { workspace } = useWorkspaceStore();
  const { data: projects } = useGetProjects({ 
    workspaceId: workspace?.id || "" 
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Auto-fill from template
  useEffect(() => {
    if (selectedTemplate) {
      setChannelType(selectedTemplate.type);
      setChannelPrivacy(selectedTemplate.privacy);
      setAllowThreads(selectedTemplate.defaultSettings.allowThreads);
      setAllowFileUploads(selectedTemplate.defaultSettings.allowFileUploads);
      setAllowReactions(selectedTemplate.defaultSettings.allowReactions);
      setAllowMentions(selectedTemplate.defaultSettings.allowMentions);
      
      if (selectedTemplate.examples.length > 0) {
        setChannelName(selectedTemplate.examples[0]);
      }
      setChannelDescription(selectedTemplate.description);
    }
  }, [selectedTemplate]);

  const resetForm = () => {
    setStep('template');
    setSelectedTemplate(null);
    setChannelName("");
    setChannelDescription("");
    setChannelType(initialChannelType || 'team');
    setChannelPrivacy('public');
    setLinkedProjectId(initialProjectId || "");
    setAllowThreads(true);
    setAllowFileUploads(true);
    setAllowReactions(true);
    setAllowMentions(true);
    setAutoArchiveDays(null);
    setSelectedMembers(new Set());
    setMemberSearchTerm("");
    setValidationErrors([]);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!channelName.trim()) {
      errors.push("Channel name is required");
    } else if (channelName.length < 2) {
      errors.push("Channel name must be at least 2 characters");
    } else if (channelName.length > 50) {
      errors.push("Channel name must be less than 50 characters");
    }
    
    if (channelDescription && channelDescription.length > 500) {
      errors.push("Description must be less than 500 characters");
    }
    
    if (channelType === 'project' && !linkedProjectId) {
      errors.push("Project channels must be linked to a project");
    }
    
    if (channelPrivacy === 'private' && selectedMembers.size === 0) {
      errors.push("Private channels must have at least one member");
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleCreateChannel = async () => {
    if (!validateForm()) return;
    
    setIsCreating(true);
    
    try {
      // Mock channel creation - replace with actual API call
      const newChannel = {
        id: Math.random().toString(36).substr(2, 9),
        name: channelName,
        description: channelDescription,
        type: channelType,
        privacy: channelPrivacy,
        workspaceId: workspace?.id,
        projectId: linkedProjectId || undefined,
        createdBy: "current-user", // Replace with actual user ID
        createdAt: new Date(),
        archived: false,
        memberCount: channelPrivacy === 'public' ? teamMembers.length : selectedMembers.size,
        unreadCount: 0,
        permissions: {
          canWrite: true,
          canManage: true,
          canInvite: channelPrivacy !== 'announcement'
        },
        settings: {
          allowThreads,
          allowFileUploads,
          allowReactions,
          allowMentions,
          autoArchiveDays
        },
        members: channelPrivacy === 'public' ? teamMembers.map(m => m.id) : Array.from(selectedMembers)
      };
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      onChannelCreated(newChannel);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to create channel:', error);
      setValidationErrors(['Failed to create channel. Please try again.']);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const renderTemplateStep = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Choose a Channel Template</h3>
        <p className="text-sm text-muted-foreground">
          Start with a template to quickly set up your channel with recommended settings.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CHANNEL_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              setSelectedTemplate(template);
              setStep('details');
            }}
            className={cn(
              "p-4 border rounded-lg text-left transition-all hover:shadow-md",
              selectedTemplate?.id === template.id 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-start space-x-3">
              <div className={cn("p-2 rounded-lg text-white", template.color)}>
                {template.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium">{template.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {template.description}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {template.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {template.privacy}
                  </Badge>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Examples:</p>
                  <p className="text-xs">{template.examples.join(', ')}</p>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setStep('details')}
          className="w-full"
        >
          <SettingsIcon className="h-4 w-4 mr-2" />
          Start from Scratch
        </Button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Channel Details</h3>
        <p className="text-sm text-muted-foreground">
          Configure the basic information for your new channel.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Channel Name *</label>
          <Input
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="e.g., general, web-redesign, announcements"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Channel names should be lowercase, short, and descriptive.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Description</label>
          <Textarea
            value={channelDescription}
            onChange={(e) => setChannelDescription(e.target.value)}
            placeholder="What is this channel about?"
            className="w-full"
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Help others understand the purpose of this channel.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Channel Type</label>
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value as ChannelType)}
              className="w-full p-2 border border-input rounded-md bg-background"
            >
              <option value="team">Team</option>
              <option value="project">Project</option>
              <option value="announcement">Announcement</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Privacy</label>
            <select
              value={channelPrivacy}
              onChange={(e) => setChannelPrivacy(e.target.value as ChannelPrivacy)}
              className="w-full p-2 border border-input rounded-md bg-background"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="invite-only">Invite Only</option>
            </select>
          </div>
        </div>

        {channelType === 'project' && (
          <div>
            <label className="text-sm font-medium mb-2 block">Linked Project</label>
            <select
              value={linkedProjectId}
              onChange={(e) => setLinkedProjectId(e.target.value)}
              className="w-full p-2 border border-input rounded-md bg-background"
            >
              <option value="">Select a project...</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Channel Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure what members can do in this channel.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Allow Threaded Replies</div>
              <div className="text-sm text-muted-foreground">
                Members can reply to messages in threads
              </div>
            </div>
            <button
              onClick={() => setAllowThreads(!allowThreads)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                allowThreads ? "bg-primary" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  allowThreads ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Allow File Uploads</div>
              <div className="text-sm text-muted-foreground">
                Members can share files and images
              </div>
            </div>
            <button
              onClick={() => setAllowFileUploads(!allowFileUploads)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                allowFileUploads ? "bg-primary" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  allowFileUploads ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Allow Reactions</div>
              <div className="text-sm text-muted-foreground">
                Members can react to messages with emojis
              </div>
            </div>
            <button
              onClick={() => setAllowReactions(!allowReactions)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                allowReactions ? "bg-primary" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  allowReactions ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Allow @mentions</div>
              <div className="text-sm text-muted-foreground">
                Members can mention others with @username
              </div>
            </div>
            <button
              onClick={() => setAllowMentions(!allowMentions)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                allowMentions ? "bg-primary" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  allowMentions ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Auto-archive inactive channels</label>
          <select
            value={autoArchiveDays || ""}
            onChange={(e) => setAutoArchiveDays(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full p-2 border border-input rounded-md bg-background"
          >
            <option value="">Never</option>
            <option value="30">After 30 days</option>
            <option value="90">After 90 days</option>
            <option value="180">After 6 months</option>
            <option value="365">After 1 year</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderMembersStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Add Members</h3>
        <p className="text-sm text-muted-foreground">
          {channelPrivacy === 'public' 
            ? "All team members will have access to this public channel."
            : "Choose who can access this private channel."
          }
        </p>
      </div>
      
      {channelPrivacy !== 'public' && (
        <div className="space-y-4">
          <div className="relative">
            <Input
              placeholder="Search team members..."
              value={memberSearchTerm}
              onChange={(e) => setMemberSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50"
              >
                <button
                  onClick={() => toggleMemberSelection(member.id)}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    selectedMembers.has(member.id)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-gray-300 hover:border-primary"
                  )}
                >
                  {selectedMembers.has(member.id) && (
                    <CheckCircleIcon className="h-3 w-3" />
                  )}
                </button>
                
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                  {member.name.charAt(0)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{member.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </div>
                </div>
                
                <Badge variant="outline" className="text-xs">
                  {member.role}
                </Badge>
              </div>
            ))}
          </div>

          {selectedMembers.size > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-2">
                Selected Members ({selectedMembers.size})
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedMembers).slice(0, 10).map((memberId) => {
                  const member = teamMembers.find(m => m.id === memberId);
                  if (!member) return null;
                  
                  return (
                    <Badge key={member.id} variant="secondary" className="text-xs">
                      {member.name}
                      <button
                        onClick={() => toggleMemberSelection(member.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                {selectedMembers.size > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedMembers.size - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const getStepNumber = () => {
    const steps = ['template', 'details', 'settings', 'members'];
    return steps.indexOf(step) + 1;
  };

  const getTotalSteps = () => {
    return channelPrivacy === 'public' ? 3 : 4;
  };

  const canProceed = () => {
    switch (step) {
      case 'template':
        return true;
      case 'details':
        return channelName.trim().length >= 2;
      case 'settings':
        return true;
      case 'members':
        return channelPrivacy === 'public' || selectedMembers.size > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'template':
        setStep('details');
        break;
      case 'details':
        setStep('settings');
        break;
      case 'settings':
        if (channelPrivacy === 'public') {
          handleCreateChannel();
        } else {
          setStep('members');
        }
        break;
      case 'members':
        handleCreateChannel();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'details':
        setStep('template');
        break;
      case 'settings':
        setStep('details');
        break;
      case 'members':
        setStep('settings');
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Set up a new communication channel for your team collaboration.
          </DialogDescription>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-sm text-muted-foreground">
              Step {getStepNumber()} of {getTotalSteps()}
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full">
              <div 
                className="h-2 bg-primary rounded-full transition-all"
                style={{ width: `${(getStepNumber() / getTotalSteps()) * 100}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {step === 'template' && renderTemplateStep()}
          {step === 'details' && renderDetailsStep()}
          {step === 'settings' && renderSettingsStep()}
          {step === 'members' && renderMembersStep()}
          
          {validationErrors.length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="text-sm text-destructive space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'template'}
            >
              Back
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isCreating}
              >
                {isCreating ? "Creating..." : 
                 (step === 'settings' && channelPrivacy === 'public') || step === 'members' 
                   ? "Create Channel" : "Next"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 