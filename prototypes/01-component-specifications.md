# Component Specifications: Meridian Dashboard

**Status**: In Progress  
**Phase**: Phase 4 - Wireframing & Prototyping  
**Date**: January 2025  

## 🎯 Component Overview

This document provides detailed specifications for implementing the Meridian kanban dashboard using Magic UI components. Each component is mapped to specific persona needs and user flows established in our wireframes.

## 🧭 Navigation System

### Primary Navigation: Dock Component
```typescript
// Magic UI Dock Implementation
import { Dock, DockIcon } from "@/components/magicui/dock"

const MeridianDock = () => {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <Dock direction="middle">
        <DockIcon>
          <Icons.dashboard className="h-6 w-6" />
          <span className="sr-only">Dashboard</span>
        </DockIcon>
        <DockIcon>
          <Icons.projects className="h-6 w-6" />
          <span className="sr-only">Projects</span>
        </DockIcon>
        <DockIcon>
          <Icons.analytics className="h-6 w-6" />
          <span className="sr-only">Analytics</span>
        </DockIcon>
        <DockIcon>
          <Icons.team className="h-6 w-6" />
          <span className="sr-only">Team</span>
        </DockIcon>
        <DockIcon>
          <Icons.files className="h-6 w-6" />
          <span className="sr-only">Files</span>
        </DockIcon>
      </Dock>
    </div>
  )
}
```

**Persona Adaptations:**
- **Sarah (PM)**: Dashboard and Projects icons emphasized
- **David (Team Lead)**: Analytics and Team icons highlighted
- **Jennifer (Executive)**: Dashboard with executive metrics badge
- **Mike (Developer)**: Projects with active task count
- **Lisa (Designer)**: Files with recent activity indicator

### Secondary Navigation: Context-Aware Sidebar
```typescript
// Persona-specific navigation items
const getNavigationItems = (persona: PersonaType) => {
  const baseItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: FolderKanban, label: "Projects", href: "/projects" }
  ]
  
  switch (persona) {
    case 'project-manager':
      return [
        ...baseItems,
        { icon: Users, label: "Team Management", href: "/team" },
        { icon: BarChart3, label: "Reports", href: "/reports" },
        { icon: AlertTriangle, label: "Risk Matrix", href: "/risks" }
      ]
    case 'team-lead':
      return [
        ...baseItems,
        { icon: TrendingUp, label: "Analytics", href: "/analytics" },
        { icon: UserCheck, label: "Capacity", href: "/capacity" },
        { icon: Target, label: "Performance", href: "/performance" }
      ]
    // ... other personas
  }
}
```

## 📊 Dashboard Layout: Bento Grid

### Responsive Grid System
```typescript
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid"

const PersonaDashboard = ({ persona }: { persona: PersonaType }) => {
  const gridConfig = getGridConfig(persona)
  
  return (
    <BentoGrid className="lg:grid-rows-3">
      {gridConfig.map((item, index) => (
        <BentoCard
          key={index}
          name={item.name}
          className={item.className}
          background={item.background}
          Icon={item.icon}
          description={item.description}
          href={item.href}
          cta={item.cta}
        />
      ))}
    </BentoGrid>
  )
}
```

### Sarah (PM) Dashboard Configuration
```typescript
const pmGridConfig = [
  {
    name: "Project Overview",
    className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3",
    background: <ProjectOverviewWidget />,
    icon: FolderKanban,
    description: "Active projects and their status",
    href: "/projects",
    cta: "Manage Projects"
  },
  {
    name: "Team Status",
    className: "lg:row-start-1 lg:row-end-2 lg:col-start-1 lg:col-end-2",
    background: <TeamStatusWidget />,
    icon: Users,
    description: "Team availability and workload",
    href: "/team",
    cta: "View Team"
  },
  {
    name: "Alerts & Blockers",
    className: "lg:row-start-2 lg:row-end-4 lg:col-start-1 lg:col-end-2",
    background: <AlertsWidget />,
    icon: AlertTriangle,
    description: "Critical issues requiring attention",
    href: "/alerts",
    cta: "Resolve Issues"
  },
  {
    name: "Timeline View",
    className: "lg:row-start-1 lg:row-end-2 lg:col-start-3 lg:col-end-4",
    background: <TimelineWidget />,
    icon: Calendar,
    description: "Project timelines and milestones",
    href: "/timeline",
    cta: "View Timeline"
  }
]
```

### David (Team Lead) Dashboard Configuration
```typescript
const teamLeadGridConfig = [
  {
    name: "Team Analytics",
    className: "lg:row-start-1 lg:row-end-3 lg:col-start-1 lg:col-end-3",
    background: <TeamAnalyticsWidget />,
    icon: BarChart3,
    description: "Performance metrics and trends",
    href: "/analytics",
    cta: "Deep Dive"
  },
  {
    name: "Capacity Planning",
    className: "lg:row-start-1 lg:row-end-2 lg:col-start-3 lg:col-end-4",
    background: <CapacityWidget />,
    icon: Users,
    description: "Workload distribution and availability",
    href: "/capacity",
    cta: "Rebalance"
  },
  {
    name: "Bottleneck Detection",
    className: "lg:row-start-2 lg:row-end-3 lg:col-start-3 lg:col-end-4",
    background: <BottleneckWidget />,
    icon: AlertCircle,
    description: "Process inefficiencies and blockers",
    href: "/bottlenecks",
    cta: "Optimize"
  }
]
```

## 📋 Kanban Board Implementation

### Enhanced Kanban with Magic UI
```typescript
import { AnimatedList } from "@/components/magicui/animated-list"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

const KanbanBoard = ({ columns, tasks }: KanbanProps) => {
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="min-w-80 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {column.title} ({column.tasks.length})
              </h3>
              <Badge variant="secondary">{column.tasks.length}</Badge>
            </div>
            
            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-3 min-h-96"
                >
                  <AnimatedList>
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <TaskCard task={task} persona={currentPersona} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </AnimatedList>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}
```

### Persona-Specific Task Cards
```typescript
const TaskCard = ({ task, persona }: { task: Task; persona: PersonaType }) => {
  const cardConfig = getTaskCardConfig(persona)
  
  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>
        <div className="flex items-center gap-1">
          {cardConfig.showTimeTracking && (
            <Badge variant="outline" className="text-xs">
              {task.timeLogged}h/{task.timeEstimated}h
            </Badge>
          )}
          <AvatarCircles users={task.assignees} />
        </div>
      </div>
      
      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {task.title}
      </h4>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {task.description}
      </p>
      
      {cardConfig.showProgress && (
        <div className="mb-3">
          <AnimatedCircularProgressBar
            max={100}
            value={task.progress}
            min={0}
            gaugePrimaryColor="rgb(79 70 229)"
            gaugeSecondaryColor="rgba(0, 0, 0, 0.1)"
          />
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {cardConfig.showFiles && task.attachments > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {task.attachments}
            </span>
          )}
          {cardConfig.showComments && task.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {task.comments}
            </span>
          )}
          {cardConfig.showDependencies && task.dependencies > 0 && (
            <span className="flex items-center gap-1">
              <Link className="h-3 w-3" />
              {task.dependencies}
            </span>
          )}
        </div>
        <span>{formatDate(task.dueDate)}</span>
      </div>
    </Card>
  )
}
```

## 👥 Team Collaboration Components

### Avatar Circles for Team Visualization
```typescript
import { AvatarCircles } from "@/components/magicui/avatar-circles"

const TeamVisualization = ({ teamMembers, activeCollaborators }: TeamProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Team Members</h3>
        <AvatarCircles numPeople={teamMembers.length} avatarUrls={teamMembers.map(m => m.avatar)} />
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Active Now</h3>
        <div className="flex items-center gap-2">
          <AvatarCircles 
            numPeople={activeCollaborators.length} 
            avatarUrls={activeCollaborators.map(m => m.avatar)}
          />
          <OrbitingCircles
            className="size-[50px] border-none bg-transparent"
            duration={20}
            delay={20}
            radius={80}
          >
            <Icons.activity className="h-3 w-3 text-green-500" />
          </OrbitingCircles>
        </div>
      </div>
    </div>
  )
}
```

### Real-time Activity Feed
```typescript
import { AnimatedList } from "@/components/magicui/animated-list"

const ActivityFeed = ({ activities }: { activities: Activity[] }) => {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
      <AnimatedList>
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarImage src={activity.user.avatar} />
              <AvatarFallback>{activity.user.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{activity.user.name}</span>
                {' '}{activity.action}{' '}
                <span className="font-medium">{activity.target}</span>
              </p>
              <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
            </div>
            <ActivityIcon type={activity.type} />
          </div>
        ))}
      </AnimatedList>
    </div>
  )
}
```

## 📈 Data Visualization Components

### Progress Tracking with Animated Bars
```typescript
import { AnimatedCircularProgressBar } from "@/components/magicui/animated-circular-progress-bar"

const ProjectProgress = ({ projects }: { projects: Project[] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Card key={project.id} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{project.name}</h3>
            <Badge variant={getStatusVariant(project.status)}>
              {project.status}
            </Badge>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <AnimatedCircularProgressBar
              max={100}
              value={project.progress}
              min={0}
              gaugePrimaryColor={getProgressColor(project.progress)}
              gaugeSecondaryColor="rgba(0, 0, 0, 0.1)"
              className="size-20"
            />
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tasks</span>
              <span>{project.completedTasks}/{project.totalTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date</span>
              <span>{formatDate(project.dueDate)}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

### Skill Matrix Visualization
```typescript
import { IconCloud } from "@/components/magicui/icon-cloud"

const SkillMatrix = ({ teamSkills }: { teamSkills: TeamSkill[] }) => {
  const skillIcons = teamSkills.map(skill => ({
    iconName: skill.icon,
    proficiency: skill.averageProficiency
  }))
  
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Team Skills Overview</h3>
      <div className="relative h-64">
        <IconCloud iconSlugs={skillIcons.map(s => s.iconName)} />
      </div>
      <div className="mt-4 space-y-2">
        {teamSkills.map((skill) => (
          <div key={skill.name} className="flex items-center justify-between">
            <span className="text-sm font-medium">{skill.name}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${skill.averageProficiency}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{skill.averageProficiency}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

## 📁 File Management System

### File Tree Navigation
```typescript
import { FileTree } from "@/components/magicui/file-tree"

const ProjectFileManager = ({ projectFiles }: { projectFiles: FileNode[] }) => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Project Files</h3>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>
      
      <FileTree
        data={projectFiles}
        className="max-h-96 overflow-y-auto"
        initialExpandedItems={["src", "docs"]}
        onSelectChange={(item) => handleFileSelect(item)}
      />
      
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{getTotalFiles(projectFiles)} files</span>
          <span>{formatFileSize(getTotalSize(projectFiles))}</span>
        </div>
      </div>
    </Card>
  )
}
```

### Asset Preview with Lens Effect
```typescript
import { Lens } from "@/components/magicui/lens"

const AssetPreview = ({ asset }: { asset: DesignAsset }) => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">{asset.name}</h4>
        <Badge variant="outline">{asset.type}</Badge>
      </div>
      
      <Lens>
        <img 
          src={asset.thumbnail} 
          alt={asset.name}
          className="w-full h-48 object-cover rounded-lg"
        />
      </Lens>
      
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Version</span>
          <span>{asset.version}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Last Modified</span>
          <span>{formatDate(asset.lastModified)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Size</span>
          <span>{formatFileSize(asset.size)}</span>
        </div>
      </div>
    </Card>
  )
}
```

## 🔔 Notification System

### Marquee for Announcements
```typescript
import { Marquee } from "@/components/magicui/marquee"

const AnnouncementBar = ({ announcements }: { announcements: Announcement[] }) => {
  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <Marquee pauseOnHover className="[--duration:20s]">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="flex items-center gap-2 mx-4">
            <Badge variant="secondary">{announcement.type}</Badge>
            <span className="text-sm text-blue-900">{announcement.message}</span>
          </div>
        ))}
      </Marquee>
    </div>
  )
}
```

### Smart Notifications Panel
```typescript
const NotificationPanel = ({ notifications }: { notifications: Notification[] }) => {
  const groupedNotifications = groupNotificationsByType(notifications)
  
  return (
    <Card className="p-4 max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Notifications</h3>
        <Badge variant="secondary">{notifications.length}</Badge>
      </div>
      
      <AnimatedList>
        {Object.entries(groupedNotifications).map(([type, items]) => (
          <div key={type} className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
              {type} ({items.length})
            </h4>
            <div className="space-y-2">
              {items.map((notification) => (
                <div 
                  key={notification.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <p className="text-sm text-gray-900">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(notification.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </AnimatedList>
    </Card>
  )
}
```

## 🎨 Design System Integration

### Theme Configuration
```typescript
// Persona-specific color schemes
const personaThemes = {
  'project-manager': {
    primary: 'hsl(217, 91%, 60%)', // Blue
    secondary: 'hsl(217, 91%, 95%)',
    accent: 'hsl(217, 91%, 85%)'
  },
  'team-lead': {
    primary: 'hsl(158, 64%, 52%)', // Emerald
    secondary: 'hsl(158, 64%, 95%)',
    accent: 'hsl(158, 64%, 85%)'
  },
  'executive': {
    primary: 'hsl(262, 83%, 58%)', // Purple
    secondary: 'hsl(262, 83%, 95%)',
    accent: 'hsl(262, 83%, 85%)'
  },
  'developer': {
    primary: 'hsl(32, 95%, 44%)', // Amber
    secondary: 'hsl(32, 95%, 95%)',
    accent: 'hsl(32, 95%, 85%)'
  },
  'designer': {
    primary: 'hsl(322, 84%, 60%)', // Pink
    secondary: 'hsl(322, 84%, 95%)',
    accent: 'hsl(322, 84%, 85%)'
  }
}

// Apply theme based on current persona
const ThemeProvider = ({ persona, children }: ThemeProps) => {
  const theme = personaThemes[persona]
  
  return (
    <div 
      style={{
        '--primary': theme.primary,
        '--secondary': theme.secondary,
        '--accent': theme.accent
      }}
      className="min-h-screen"
    >
      {children}
    </div>
  )
}
```

### Responsive Breakpoints
```typescript
// Tailwind configuration for consistent breakpoints
const breakpoints = {
  'sm': '640px',   // Mobile landscape
  'md': '768px',   // Tablet
  'lg': '1024px',  // Desktop
  'xl': '1280px',  // Large desktop
  '2xl': '1536px'  // Extra large
}

// Component responsive behavior
const ResponsiveKanban = () => {
  return (
    <div className="
      grid 
      grid-cols-1 
      sm:grid-cols-2 
      lg:grid-cols-3 
      xl:grid-cols-4 
      2xl:grid-cols-5 
      gap-4
    ">
      {/* Kanban columns */}
    </div>
  )
}
```

## 🚀 Performance Optimizations

### Lazy Loading Implementation
```typescript
import { lazy, Suspense } from 'react'

// Lazy load heavy components
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'))
const FileManager = lazy(() => import('./FileManager'))
const TeamAnalytics = lazy(() => import('./TeamAnalytics'))

const LazyComponentWrapper = ({ component: Component, fallback, ...props }) => {
  return (
    <Suspense fallback={fallback || <ComponentSkeleton />}>
      <Component {...props} />
    </Suspense>
  )
}
```

### Virtual Scrolling for Large Lists
```typescript
import { FixedSizeList as List } from 'react-window'

const VirtualizedTaskList = ({ tasks }: { tasks: Task[] }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <TaskCard task={tasks[index]} />
    </div>
  )
  
  return (
    <List
      height={600}
      itemCount={tasks.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

## 📱 Mobile Adaptations

### Touch-Friendly Interactions
```typescript
const MobileTaskCard = ({ task }: { task: Task }) => {
  return (
    <Card className="p-4 min-h-[120px] touch-manipulation">
      {/* Larger touch targets */}
      <div className="flex items-center justify-between mb-3">
        <Button size="sm" className="h-8 px-3">
          <Play className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" className="h-8 px-3">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Content optimized for mobile */}
      <h4 className="font-medium text-base mb-2 line-clamp-2">
        {task.title}
      </h4>
      
      {/* Simplified metadata */}
      <div className="flex items-center justify-between text-sm">
        <AvatarCircles users={task.assignees} size="sm" />
        <Badge variant="outline">{task.status}</Badge>
      </div>
    </Card>
  )
}
```

### Swipe Gestures for Navigation
```typescript
import { useSwipeable } from 'react-swipeable'

const SwipeableKanban = ({ columns, onColumnChange }) => {
  const handlers = useSwipeable({
    onSwipedLeft: () => onColumnChange('next'),
    onSwipedRight: () => onColumnChange('prev'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  })
  
  return (
    <div {...handlers} className="overflow-hidden">
      {/* Mobile single-column view with swipe navigation */}
    </div>
  )
}
```

---

**Implementation Status**: ✅ Component specifications complete  
**Magic UI Integration**: ✅ All major components mapped  
**Persona Customization**: ✅ Theme and behavior variations defined  
**Responsive Design**: ✅ Mobile-first approach implemented  

**Next Phase**: Interactive prototype development and user testing validation. 