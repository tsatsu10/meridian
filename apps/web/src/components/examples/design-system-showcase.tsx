// @epic-3.5-communication: Design system showcase component
// @persona-sarah: PM needs to see design consistency across the platform
// @persona-jennifer: Exec needs polished visual presentation examples
// @persona-david: Team lead needs clear visual hierarchy examples
// @persona-mike: Dev needs practical implementation examples
// @persona-lisa: Designer needs comprehensive design token examples

import React, { useState } from "react";
import { 
  CheckSquare, 
  Users, 
  BarChart3, 
  Calendar, 
  MessageSquare, 
  Settings,
  Plus,
  Download,
  Share,
  Edit,
  Trash2,
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Zap,
  Award,
  Activity
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

// Design System Showcase Component
export function DesignSystemShowcase() {
  const [activePersona, setActivePersona] = useState<'pm' | 'tl' | 'exec' | 'dev' | 'design'>('pm');

  const personas = [
    { id: 'pm', name: 'Sarah (PM)', color: 'bg-persona-pm-primary' },
    { id: 'tl', name: 'David (Team Lead)', color: 'bg-persona-tl-primary' },
    { id: 'exec', name: 'Jennifer (Exec)', color: 'bg-persona-exec-primary' },
    { id: 'dev', name: 'Mike (Dev)', color: 'bg-persona-dev-primary' },
    { id: 'design', name: 'Lisa (Designer)', color: 'bg-persona-design-primary' }
  ];

  const stats = [
    { title: "Total Projects", value: "24", change: "+12%", trend: "up", icon: CheckSquare },
    { title: "Team Members", value: "156", change: "+8%", trend: "up", icon: Users },
    { title: "Completion Rate", value: "87%", change: "-3%", trend: "down", icon: Target },
    { title: "Revenue", value: "$2.4M", change: "+24%", trend: "up", icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-h1 text-gradient-primary">
            Meridian Light Mode Design System
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            A professional, persona-driven design system that adapts to different user roles 
            while maintaining consistency and visual excellence.
          </p>
        </div>

        {/* Persona Selector */}
        <Card className="card-meridian">
          <CardHeader>
            <CardTitle>Select User Persona</CardTitle>
            <CardDescription>
              Experience how the design system adapts to different user roles and workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {personas.map((persona) => (
                <Button
                  key={persona.id}
                  variant={activePersona === persona.id ? "default" : "outline"}
                  onClick={() => setActivePersona(persona.id as any)}
                  className="button-meridian"
                >
                  <div className={`w-3 h-3 rounded-full ${persona.color}`} />
                  {persona.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Persona-Themed Content */}
        <div className={`theme-${activePersona} space-y-8`}>
          
          {/* Color Palette Display */}
          <Card className="card-meridian-elevated">
            <CardHeader>
              <CardTitle className="text-h3">
                Color Palette - {personas.find(p => p.id === activePersona)?.name}
              </CardTitle>
              <CardDescription>
                Semantic colors that adapt to user context and enhance productivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-3">
                  <div className="h-20 bg-meridian-primary rounded-lg shadow-primary flex items-end p-3">
                    <span className="text-white text-sm font-medium">Primary</span>
                  </div>
                  <div className="h-20 bg-meridian-success rounded-lg shadow-success flex items-end p-3">
                    <span className="text-white text-sm font-medium">Success</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-20 bg-meridian-warning rounded-lg shadow-warning flex items-end p-3">
                    <span className="text-white text-sm font-medium">Warning</span>
                  </div>
                  <div className="h-20 bg-meridian-error rounded-lg shadow-error flex items-end p-3">
                    <span className="text-white text-sm font-medium">Error</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-20 bg-gradient-primary rounded-lg shadow-primary-lg flex items-end p-3">
                    <span className="text-white text-sm font-medium">Gradient</span>
                  </div>
                  <div className="h-20 glass-card-light flex items-end p-3">
                    <span className="text-foreground text-sm font-medium">Glass</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-20 bg-gradient-to-br from-theme-primary/20 to-theme-accent/30 rounded-lg flex items-end p-3 border border-theme-border">
                    <span className="text-foreground text-sm font-medium">Persona</span>
                  </div>
                  <div className="h-20 bg-meridian-neutral-100 rounded-lg flex items-end p-3 border border-meridian-neutral-200">
                    <span className="text-foreground text-sm font-medium">Neutral</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card 
                key={index} 
                className="card-meridian-elevated interactive-lift bg-gradient-to-br from-theme-bg/50 to-background"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-caption text-muted-foreground">{stat.title}</p>
                    <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-lg">
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-h2 font-bold text-foreground">{stat.value}</p>
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${
                        stat.trend === 'up' ? 'text-meridian-success' : 'text-meridian-error'
                      }`}>
                        {stat.trend === 'up' ? '↗' : '↘'} {stat.change}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Button Showcase */}
          <Card className="card-meridian">
            <CardHeader>
              <CardTitle>Button System</CardTitle>
              <CardDescription>
                Consistent button styling with semantic meanings and interactive states
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Primary Buttons */}
                <div className="space-y-3">
                  <h4 className="text-h6">Primary Actions</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button className="button-meridian-primary">
                      <Plus className="h-4 w-4" />
                      Create Project
                    </Button>
                    <Button variant="default" className="bg-theme-primary hover:bg-theme-primary/90">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="default" size="lg">
                      <Share className="h-4 w-4" />
                      Share Report
                    </Button>
                  </div>
                </div>

                {/* Secondary Buttons */}
                <div className="space-y-3">
                  <h4 className="text-h6">Secondary Actions</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="border-theme-border hover:bg-theme-bg">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="ghost">
                      <Star className="h-4 w-4" />
                      Favorite
                    </Button>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Size Variants */}
                <div className="space-y-3">
                  <h4 className="text-h6">Size Variants</h4>
                  <div className="flex items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon"><Settings className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography Showcase */}
          <Card className="card-meridian">
            <CardHeader>
              <CardTitle>Typography System</CardTitle>
              <CardDescription>
                Scalable typography hierarchy designed for clarity and readability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-h1">Heading 1 - Main Page Title</h1>
                <h2 className="text-h2">Heading 2 - Section Title</h2>
                <h3 className="text-h3">Heading 3 - Subsection Title</h3>
                <h4 className="text-h4">Heading 4 - Card Title</h4>
                <h5 className="text-h5">Heading 5 - Component Title</h5>
                <h6 className="text-h6">Heading 6 - Small Title</h6>
                <p className="text-base">
                  Body text - This is the standard paragraph text used throughout the application.
                  It maintains excellent readability at various screen sizes.
                </p>
                <p className="text-caption">CAPTION TEXT - METADATA AND LABELS</p>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Components */}
          <Card className="card-meridian">
            <CardHeader>
              <CardTitle>Interactive Components</CardTitle>
              <CardDescription>
                Responsive components with smooth animations and clear feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Progress Examples */}
              <div className="space-y-4">
                <h4 className="text-h6">Progress Indicators</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Project Completion</span>
                      <span className="text-sm text-muted-foreground">72%</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Team Performance</span>
                      <span className="text-sm text-muted-foreground">89%</span>
                    </div>
                    <Progress value={89} className="h-2" />
                  </div>
                </div>
              </div>

              {/* Badge Examples */}
              <div className="space-y-4">
                <h4 className="text-h6">Status Indicators</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Active</Badge>
                  <Badge variant="secondary">Pending</Badge>
                  <Badge variant="destructive">Overdue</Badge>
                  <Badge variant="outline">On Hold</Badge>
                  <Badge className="bg-theme-primary/10 text-theme-primary border-theme-border">
                    Persona Theme
                  </Badge>
                </div>
              </div>

              {/* Avatar Group */}
              <div className="space-y-4">
                <h4 className="text-h6">Team Members</h4>
                <div className="flex -space-x-2">
                  {['SM', 'DJ', 'JL', 'MK', 'LA'].map((initials, index) => (
                    <Avatar key={index} className="border-2 border-background">
                      <AvatarFallback className="bg-theme-accent text-theme-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted border-2 border-background text-xs font-medium text-muted-foreground">
                    +5
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shadow and Effects Showcase */}
          <Card className="card-meridian">
            <CardHeader>
              <CardTitle>Shadows & Effects</CardTitle>
              <CardDescription>
                Subtle elevation and glass morphism effects for modern interfaces
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-3 text-center">
                  <div className="h-20 bg-card rounded-lg shadow-meridian-sm flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Small</span>
                  </div>
                  <p className="text-caption">Shadow SM</p>
                </div>
                <div className="space-y-3 text-center">
                  <div className="h-20 bg-card rounded-lg shadow-meridian-md flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Medium</span>
                  </div>
                  <p className="text-caption">Shadow MD</p>
                </div>
                <div className="space-y-3 text-center">
                  <div className="h-20 bg-card rounded-lg shadow-meridian-lg flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Large</span>
                  </div>
                  <p className="text-caption">Shadow LG</p>
                </div>
                <div className="space-y-3 text-center">
                  <div className="h-20 glass-card-light flex items-center justify-center">
                    <span className="text-sm text-foreground">Glass</span>
                  </div>
                  <p className="text-caption">Glass Effect</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Implementation Notes */}
        <Card className="card-meridian border-theme-border/50">
          <CardHeader>
            <CardTitle>Implementation Notes</CardTitle>
            <CardDescription>
              Key principles for implementing the Meridian Design System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-h6 text-meridian-success">✅ Best Practices</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Use persona themes when user context is available</li>
                  <li>• Maintain consistent spacing using design tokens</li>
                  <li>• Implement smooth, purposeful animations</li>
                  <li>• Ensure proper contrast ratios for accessibility</li>
                  <li>• Use semantic color meanings consistently</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-h6 text-meridian-error">❌ Common Pitfalls</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Don't mix persona color schemes in one interface</li>
                  <li>• Avoid overriding design tokens with arbitrary values</li>
                  <li>• Don't use animations that distract from productivity</li>
                  <li>• Never ignore responsive behavior requirements</li>
                  <li>• Avoid custom shadows outside the system</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
} 