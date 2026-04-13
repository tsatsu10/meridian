// @epic-3.3-projects: Project templates gallery for quick project setup
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import * as Dialog from "@radix-ui/react-dialog";
import { 
  X, 
  Search, 
  Clock, 
  Users, 
  CheckCircle, 
  BarChart3, 
  Palette, 
  Code, 
  Megaphone, 
  ShoppingCart,
  Briefcase,
  Rocket,
  Heart,
  Monitor
} from "lucide-react";
import { cn } from "@/lib/cn";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'software' | 'marketing' | 'design' | 'business' | 'personal';
  icon: React.ReactNode;
  estimatedDuration: string;
  teamSize: string;
  complexity: 'simple' | 'medium' | 'complex';
  tasks: {
    title: string;
    status: 'todo' | 'in_progress' | 'done';
    assignee?: string;
  }[];
  tags: string[];
  color: string;
}

const projectTemplates: ProjectTemplate[] = [
  // Software Development
  {
    id: 'web-app',
    name: 'Web Application',
    description: 'Full-stack web application with modern tech stack',
    category: 'software',
    icon: <Monitor className="w-5 h-5" />,
    estimatedDuration: '8-12 weeks',
    teamSize: '4-6 people',
    complexity: 'complex',
    tasks: [
      { title: 'Setup development environment', status: 'todo' },
      { title: 'Design database schema', status: 'todo' },
      { title: 'Create UI/UX wireframes', status: 'todo' },
      { title: 'Implement authentication', status: 'todo' },
      { title: 'Build core features', status: 'todo' },
      { title: 'Testing and QA', status: 'todo' },
      { title: 'Deployment and launch', status: 'todo' }
    ],
    tags: ['React', 'Node.js', 'Database', 'API'],
    color: 'bg-blue-500'
  },
  {
    id: 'mobile-app',
    name: 'Mobile Application',
    description: 'Cross-platform mobile app development',
    category: 'software',
    icon: <Code className="w-5 h-5" />,
    estimatedDuration: '10-16 weeks',
    teamSize: '3-5 people',
    complexity: 'complex',
    tasks: [
      { title: 'Market research and requirements', status: 'todo' },
      { title: 'UI/UX design for mobile', status: 'todo' },
      { title: 'Setup development environment', status: 'todo' },
      { title: 'Implement core features', status: 'todo' },
      { title: 'Backend API development', status: 'todo' },
      { title: 'Testing on multiple devices', status: 'todo' },
      { title: 'App store submission', status: 'todo' }
    ],
    tags: ['React Native', 'iOS', 'Android', 'API'],
    color: 'bg-purple-500'
  },
  
  // Marketing
  {
    id: 'product-launch',
    name: 'Product Launch Campaign',
    description: 'Complete marketing campaign for new product launch',
    category: 'marketing',
    icon: <Rocket className="w-5 h-5" />,
    estimatedDuration: '6-8 weeks',
    teamSize: '3-4 people',
    complexity: 'medium',
    tasks: [
      { title: 'Market research and analysis', status: 'todo' },
      { title: 'Define target audience', status: 'todo' },
      { title: 'Create marketing strategy', status: 'todo' },
      { title: 'Design campaign materials', status: 'todo' },
      { title: 'Setup social media campaigns', status: 'todo' },
      { title: 'Launch and monitor metrics', status: 'todo' }
    ],
    tags: ['Marketing', 'Social Media', 'Analytics', 'Branding'],
    color: 'bg-pink-500'
  },
  {
    id: 'content-strategy',
    name: 'Content Marketing Strategy',
    description: 'Comprehensive content marketing and SEO strategy',
    category: 'marketing',
    icon: <Megaphone className="w-5 h-5" />,
    estimatedDuration: '4-6 weeks',
    teamSize: '2-3 people',
    complexity: 'medium',
    tasks: [
      { title: 'Content audit and analysis', status: 'todo' },
      { title: 'SEO keyword research', status: 'todo' },
      { title: 'Create content calendar', status: 'todo' },
      { title: 'Develop content templates', status: 'todo' },
      { title: 'Setup analytics tracking', status: 'todo' }
    ],
    tags: ['Content', 'SEO', 'Blogging', 'Analytics'],
    color: 'bg-orange-500'
  },

  // Design
  {
    id: 'brand-identity',
    name: 'Brand Identity Design',
    description: 'Complete brand identity and visual design system',
    category: 'design',
    icon: <Palette className="w-5 h-5" />,
    estimatedDuration: '4-6 weeks',
    teamSize: '2-3 people',
    complexity: 'medium',
    tasks: [
      { title: 'Brand research and discovery', status: 'todo' },
      { title: 'Logo design concepts', status: 'todo' },
      { title: 'Color palette and typography', status: 'todo' },
      { title: 'Brand guidelines document', status: 'todo' },
      { title: 'Marketing material templates', status: 'todo' }
    ],
    tags: ['Branding', 'Logo', 'Design System', 'Guidelines'],
    color: 'bg-indigo-500'
  },

  // Business
  {
    id: 'business-plan',
    name: 'Business Plan Development',
    description: 'Comprehensive business plan and strategy development',
    category: 'business',
    icon: <Briefcase className="w-5 h-5" />,
    estimatedDuration: '3-4 weeks',
    teamSize: '2-3 people',
    complexity: 'medium',
    tasks: [
      { title: 'Market analysis and research', status: 'todo' },
      { title: 'Financial projections', status: 'todo' },
      { title: 'Business model development', status: 'todo' },
      { title: 'Risk assessment', status: 'todo' },
      { title: 'Final business plan document', status: 'todo' }
    ],
    tags: ['Strategy', 'Finance', 'Analysis', 'Planning'],
    color: 'bg-emerald-500'
  },
  {
    id: 'ecommerce-store',
    name: 'E-commerce Store Setup',
    description: 'Complete e-commerce store setup and launch',
    category: 'business',
    icon: <ShoppingCart className="w-5 h-5" />,
    estimatedDuration: '6-10 weeks',
    teamSize: '4-5 people',
    complexity: 'complex',
    tasks: [
      { title: 'Platform selection and setup', status: 'todo' },
      { title: 'Product catalog creation', status: 'todo' },
      { title: 'Payment gateway integration', status: 'todo' },
      { title: 'Shipping and tax configuration', status: 'todo' },
      { title: 'Store design and branding', status: 'todo' },
      { title: 'Testing and launch', status: 'todo' }
    ],
    tags: ['E-commerce', 'Payments', 'Inventory', 'Marketing'],
    color: 'bg-green-500'
  },

  // Personal
  {
    id: 'event-planning',
    name: 'Event Planning',
    description: 'Complete event planning and coordination',
    category: 'personal',
    icon: <Heart className="w-5 h-5" />,
    estimatedDuration: '8-12 weeks',
    teamSize: '2-4 people',
    complexity: 'medium',
    tasks: [
      { title: 'Define event requirements', status: 'todo' },
      { title: 'Venue selection and booking', status: 'todo' },
      { title: 'Vendor coordination', status: 'todo' },
      { title: 'Guest list and invitations', status: 'todo' },
      { title: 'Event day coordination', status: 'todo' }
    ],
    tags: ['Events', 'Coordination', 'Vendors', 'Planning'],
    color: 'bg-rose-500'
  }
];

const categoryFilters = [
  { id: 'all', name: 'All Templates', count: projectTemplates.length },
  { id: 'software', name: 'Software', count: projectTemplates.filter(t => t.category === 'software').length },
  { id: 'marketing', name: 'Marketing', count: projectTemplates.filter(t => t.category === 'marketing').length },
  { id: 'design', name: 'Design', count: projectTemplates.filter(t => t.category === 'design').length },
  { id: 'business', name: 'Business', count: projectTemplates.filter(t => t.category === 'business').length },
  { id: 'personal', name: 'Personal', count: projectTemplates.filter(t => t.category === 'personal').length },
];

const complexityColors = {
  simple: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  complex: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

interface ProjectTemplatesProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ProjectTemplate) => void;
}

export function ProjectTemplates({ open, onClose, onSelectTemplate }: ProjectTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  const filteredTemplates = projectTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      setSelectedTemplate(null);
      onClose();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl max-h-[90vh]">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <Dialog.Title className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Project Templates
                </Dialog.Title>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Choose from our collection of pre-built project templates
                </p>
              </div>
              <Dialog.Close asChild>
                <button className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
                  <X className="w-6 h-6" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex h-[calc(90vh-120px)]">
              {/* Left Sidebar - Categories & Search */}
              <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 p-6 overflow-y-auto">
                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                    Categories
                  </h3>
                  {categoryFilters.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors",
                        selectedCategory === category.id
                          ? "bg-primary text-primary-foreground"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      <span>{category.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {category.count}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-hidden">
                {!selectedTemplate ? (
                  /* Templates Grid */
                  <div className="p-6 overflow-y-auto h-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredTemplates.map((template) => (
                        <div
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="group cursor-pointer p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-primary hover:shadow-md transition-all"
                        >
                          {/* Template Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className={cn("p-3 rounded-lg", template.color)}>
                              <div className="text-white">
                                {template.icon}
                              </div>
                            </div>
                            <Badge className={cn("text-xs", complexityColors[template.complexity])}>
                              {template.complexity}
                            </Badge>
                          </div>

                          {/* Template Info */}
                          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                            {template.name}
                          </h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                            {template.description}
                          </p>

                          {/* Template Stats */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-xs text-zinc-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {template.estimatedDuration}
                            </div>
                            <div className="flex items-center text-xs text-zinc-500">
                              <Users className="w-3 h-3 mr-1" />
                              {template.teamSize}
                            </div>
                            <div className="flex items-center text-xs text-zinc-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {template.tasks.length} tasks included
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {template.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Empty State */}
                    {filteredTemplates.length === 0 && (
                      <div className="text-center py-12">
                        <Search className="mx-auto h-12 w-12 text-zinc-400" />
                        <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                          No templates found
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400">
                          Try adjusting your search terms or category filter
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Template Details */
                  <div className="p-6 overflow-y-auto h-full">
                    <div className="max-w-4xl mx-auto">
                      {/* Back Button */}
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="flex items-center text-sm text-zinc-500 hover:text-zinc-700 mb-6"
                      >
                        ← Back to templates
                      </button>

                      {/* Template Header */}
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center space-x-4">
                          <div className={cn("p-4 rounded-xl", selectedTemplate.color)}>
                            <div className="text-white text-xl">
                              {selectedTemplate.icon}
                            </div>
                          </div>
                          <div>
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                              {selectedTemplate.name}
                            </h1>
                            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                              {selectedTemplate.description}
                            </p>
                          </div>
                        </div>
                        <Button onClick={handleUseTemplate} size="lg">
                          Use This Template
                        </Button>
                      </div>

                      {/* Template Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                          <div className="flex items-center text-zinc-500 mb-2">
                            <Clock className="w-4 h-4 mr-2" />
                            Duration
                          </div>
                          <div className="font-semibold">{selectedTemplate.estimatedDuration}</div>
                        </div>
                        <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                          <div className="flex items-center text-zinc-500 mb-2">
                            <Users className="w-4 h-4 mr-2" />
                            Team Size
                          </div>
                          <div className="font-semibold">{selectedTemplate.teamSize}</div>
                        </div>
                        <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                          <div className="flex items-center text-zinc-500 mb-2">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Complexity
                          </div>
                          <Badge className={cn("", complexityColors[selectedTemplate.complexity])}>
                            {selectedTemplate.complexity}
                          </Badge>
                        </div>
                      </div>

                      {/* Tasks Preview */}
                      <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Included Tasks</h2>
                        <div className="space-y-2">
                          {selectedTemplate.tasks.map((task, index) => (
                            <div key={index} className="flex items-center p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-zinc-400 mr-3" />
                              <span className="flex-1">{task.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {task.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Technologies & Skills</h2>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 