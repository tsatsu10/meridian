// @epic-3.5-communication: Comprehensive showcase of Meridian design system components
// @persona-all: Demonstrates how components adapt to different user personas

import React, { useState } from "react";
import { 
  MeridianPage, 
  MeridianPageHeader, 
  MeridianPageContent, 
  MeridianSection, 
  MeridianGrid,
  MeridianSidebarLayout 
} from "@/components/ui/meridian-layout";
import { 
  MeridianCard, 
  MeridianCardHeader, 
  MeridianCardTitle, 
  MeridianCardDescription, 
  MeridianCardContent,
  MeridianCardFooter,
  StatsCard,
  ActionCard 
} from "@/components/ui/meridian-card";
import { MeridianButton } from "@/components/ui/meridian-button";
import { 
  MeridianBadge, 
  StatusBadge, 
  PriorityBadge, 
  RoleBadge 
} from "@/components/ui/meridian-badge";
import { 
  MeridianFormField,
  MeridianFormLabel,
  MeridianFormInput,
  MeridianFormTextarea,
  MeridianFormSelect,
  MeridianFormCheckbox,
  MeridianFormRadio
} from "@/components/ui/meridian-form";
import { MeridianDataTable } from "@/components/ui/meridian-data-table";
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Target,
  Search,
  Filter,
  Settings,
  Download,
  Edit,
  Trash2,
  Eye,
  Plus,
  BarChart3,
  Calendar,
  MessageSquare,
  FileText,
  Heart,
  Star,
  Share2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Sample data for demonstrations
const sampleTasks = [
  {
    id: 1,
    title: "Design System Implementation",
    status: "in_progress",
    priority: "high",
    assignee: "Sarah Chen",
    dueDate: "2024-01-15",
    progress: 75
  },
  {
    id: 2,
    title: "User Authentication Flow",
    status: "completed",
    priority: "medium",
    assignee: "Mike Rodriguez",
    dueDate: "2024-01-10",
    progress: 100
  },
  {
    id: 3,
    title: "Dashboard Analytics",
    status: "pending",
    priority: "urgent",
    assignee: "Jennifer Kim",
    dueDate: "2024-01-20",
    progress: 25
  }
];

const tableColumns = [
  {
    key: 'title',
    label: 'Task',
    sortable: true,
    filterable: true,
    render: (value: string, row: any) => (
      <div className="font-medium text-meridian-neutral-900">{value}</div>
    )
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (value: string) => (
      <StatusBadge status={value as any} size="sm" />
    )
  },
  {
    key: 'priority',
    label: 'Priority',
    sortable: true,
    render: (value: string) => (
      <PriorityBadge priority={value as any} size="sm" />
    )
  },
  {
    key: 'assignee',
    label: 'Assignee',
    filterable: true
  },
  {
    key: 'progress',
    label: 'Progress',
    sortable: true,
    render: (value: number) => (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-meridian-neutral-200 rounded-full h-2">
          <div 
            className="bg-meridian-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-sm text-meridian-neutral-600 min-w-[3rem]">{value}%</span>
      </div>
    )
  }
];

const tableActions = [
  {
    label: "View",
    icon: <Eye className="h-4 w-4" />,
    onClick: (row: any) =>,
    variant: "destructive" as const
  }
];

export const MeridianComponentShowcase = () => {
  const [selectedPersona, setSelectedPersona] = useState<'pm' | 'tl' | 'exec' | 'dev' | 'design'>('pm');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    bio: '',
    notifications: false,
    theme: 'light'
  });

  const personas = [
    { key: 'pm', label: 'Project Manager', description: 'Sarah - Organized and detail-oriented' },
    { key: 'tl', label: 'Team Lead', description: 'David - Analytics and team-focused' },
    { key: 'exec', label: 'Executive', description: 'Jennifer - Strategic and high-level' },
    { key: 'dev', label: 'Developer', description: 'Mike - Efficient and minimal' },
    { key: 'design', label: 'Designer', description: 'Lisa - Creative and visual' }
  ];

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <MeridianPage persona={selectedPersona} maxWidth="full">
      <MeridianPageHeader
        title="Meridian Design System Showcase"
        description="Interactive demonstration of all Meridian components with persona-specific styling"
        actions={
          <div className="flex gap-2">
            <MeridianButton variant="outline" leftIcon={<Download className="h-4 w-4" />}>
              Export Guide
            </MeridianButton>
            <MeridianButton variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
              Create Component
            </MeridianButton>
          </div>
        }
        meta={
          <div className="flex gap-2">
            {personas.map(persona => (
              <MeridianButton
                key={persona.key}
                variant={selectedPersona === persona.key ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedPersona(persona.key as any)}
              >
                {persona.label}
              </MeridianButton>
            ))}
          </div>
        }
      />

      <MeridianPageContent>
        {/* Persona Information */}
        <MeridianSection variant="glass" title="Current Persona" spacing="sm">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-h5 font-semibold mb-1">
                {personas.find(p => p.key === selectedPersona)?.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {personas.find(p => p.key === selectedPersona)?.description}
              </p>
            </div>
            <RoleBadge role="manager" persona={selectedPersona} size="md" />
          </div>
        </MeridianSection>

        {/* Cards Section */}
        <MeridianSection title="Card Components" description="Various card styles and configurations">
          <MeridianGrid cols={3} gap="lg">
            {/* Stats Cards */}
            <StatsCard
              title="Active Projects"
              value="24"
              description="vs last month"
              trend={{ value: 12, isPositive: true }}
              icon={<Target className="h-5 w-5" />}
              colorScheme="primary"
              persona={selectedPersona}
            />
            
            <StatsCard
              title="Team Members"
              value="156"
              description="across all teams"
              trend={{ value: 8, isPositive: true }}
              icon={<Users className="h-5 w-5" />}
              colorScheme="success"
              persona={selectedPersona}
            />
            
            <StatsCard
              title="Completion Rate"
              value="89%"
              description="this quarter"
              trend={{ value: 3, isPositive: false }}
              icon={<CheckCircle className="h-5 w-5" />}
              colorScheme="warning"
              persona={selectedPersona}
            />

            {/* Action Cards */}
            <ActionCard
              title="Create New Project"
              description="Start a new project with team collaboration tools"
              icon={<Plus className="h-5 w-5" />}
              action={
                <MeridianButton variant="primary" size="sm">
                  Create
                </MeridianButton>
              }
              persona={selectedPersona}
            />

            <ActionCard
              title="View Analytics"
              description="Detailed performance metrics and insights"
              icon={<BarChart3 className="h-5 w-5" />}
              action={
                <MeridianButton variant="outline" size="sm">
                  View
                </MeridianButton>
              }
              persona={selectedPersona}
            />

            <ActionCard
              title="Team Schedule"
              description="Manage team calendar and deadlines"
              icon={<Calendar className="h-5 w-5" />}
              action={
                <MeridianButton variant="ghost" size="sm">
                  Open
                </MeridianButton>
              }
              persona={selectedPersona}
            />
          </MeridianGrid>
        </MeridianSection>

        {/* Buttons Section */}
        <MeridianSection title="Button Components" description="Interactive buttons with various styles and states">
          <div className="space-y-6">
            {/* Button Variants */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-meridian-neutral-700">Button Variants</h4>
              <div className="flex flex-wrap gap-3">
                <MeridianButton variant="primary" persona={selectedPersona}>Primary Button</MeridianButton>
                <MeridianButton variant="secondary" persona={selectedPersona}>Secondary</MeridianButton>
                <MeridianButton variant="outline" persona={selectedPersona}>Outline</MeridianButton>
                <MeridianButton variant="ghost" persona={selectedPersona}>Ghost</MeridianButton>
                <MeridianButton variant="success">Success</MeridianButton>
                <MeridianButton variant="warning">Warning</MeridianButton>
                <MeridianButton variant="error">Error</MeridianButton>
                <MeridianButton variant="gradient">Gradient</MeridianButton>
                <MeridianButton variant="glass">Glass Effect</MeridianButton>
              </div>
            </div>

            {/* Button Sizes */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-meridian-neutral-700">Button Sizes</h4>
              <div className="flex items-center flex-wrap gap-3">
                <MeridianButton variant="primary" size="xs">Extra Small</MeridianButton>
                <MeridianButton variant="primary" size="sm">Small</MeridianButton>
                <MeridianButton variant="primary" size="default">Default</MeridianButton>
                <MeridianButton variant="primary" size="lg">Large</MeridianButton>
                <MeridianButton variant="primary" size="xl">Extra Large</MeridianButton>
              </div>
            </div>

            {/* Button States */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-meridian-neutral-700">Button States</h4>
              <div className="flex flex-wrap gap-3">
                <MeridianButton 
                  variant="primary" 
                  leftIcon={<Search className="h-4 w-4" />}
                >
                  With Left Icon
                </MeridianButton>
                <MeridianButton 
                  variant="primary" 
                  rightIcon={<Settings className="h-4 w-4" />}
                >
                  With Right Icon
                </MeridianButton>
                <MeridianButton 
                  variant="primary" 
                  loading
                  loadingText="Processing..."
                >
                  Loading State
                </MeridianButton>
                <MeridianButton variant="primary" disabled>
                  Disabled State
                </MeridianButton>
              </div>
            </div>

            {/* Icon Buttons */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-meridian-neutral-700">Icon Buttons</h4>
              <div className="flex gap-2">
                <MeridianButton variant="outline" size="icon">
                  <Heart className="h-4 w-4" />
                </MeridianButton>
                <MeridianButton variant="outline" size="icon">
                  <Star className="h-4 w-4" />
                </MeridianButton>
                <MeridianButton variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </MeridianButton>
                <MeridianButton variant="outline" size="icon">
                  <MessageSquare className="h-4 w-4" />
                </MeridianButton>
                <MeridianButton variant="outline" size="icon">
                  <FileText className="h-4 w-4" />
                </MeridianButton>
              </div>
            </div>
          </div>
        </MeridianSection>

        {/* Badges Section */}
        <MeridianSection title="Badge Components" description="Status indicators and labels">
          <div className="space-y-6">
            {/* Badge Variants */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-meridian-neutral-700">Badge Variants</h4>
              <div className="flex flex-wrap gap-2">
                <MeridianBadge variant="default">Default</MeridianBadge>
                <MeridianBadge variant="primary">Primary</MeridianBadge>
                <MeridianBadge variant="secondary">Secondary</MeridianBadge>
                <MeridianBadge variant="success">Success</MeridianBadge>
                <MeridianBadge variant="warning">Warning</MeridianBadge>
                <MeridianBadge variant="error">Error</MeridianBadge>
                <MeridianBadge variant="outline">Outline</MeridianBadge>
                <MeridianBadge variant="soft">Soft</MeridianBadge>
                <MeridianBadge variant="gradient">Gradient</MeridianBadge>
                <MeridianBadge variant="glass">Glass</MeridianBadge>
              </div>
            </div>

            {/* Specialized Badges */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-meridian-neutral-700">Specialized Badges</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-meridian-neutral-600 mb-2">Status Badges</p>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status="active" />
                    <StatusBadge status="pending" />
                    <StatusBadge status="completed" />
                    <StatusBadge status="cancelled" />
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-meridian-neutral-600 mb-2">Priority Badges</p>
                  <div className="flex flex-wrap gap-2">
                    <PriorityBadge priority="low" />
                    <PriorityBadge priority="medium" />
                    <PriorityBadge priority="high" />
                    <PriorityBadge priority="urgent" />
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-meridian-neutral-600 mb-2">Role Badges</p>
                  <div className="flex flex-wrap gap-2">
                    <RoleBadge role="admin" persona={selectedPersona} />
                    <RoleBadge role="manager" persona={selectedPersona} />
                    <RoleBadge role="member" persona={selectedPersona} />
                    <RoleBadge role="viewer" persona={selectedPersona} />
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Badges */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-meridian-neutral-700">Interactive Badges</h4>
              <div className="flex flex-wrap gap-2">
                <MeridianBadge 
                  variant="primary" 
                  interactive 
                  dot
                  onClick={() =>}; 