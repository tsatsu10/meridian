# Low-Fidelity Wireframes: Meridian Kanban Dashboard

**Status**: In Progress  
**Phase**: Phase 4 - Wireframing & Prototyping  
**Date**: January 2025  

## 🎯 Wireframe Overview

This document presents low-fidelity wireframes for each persona-specific dashboard, following the information architecture established in Phase 3. Each wireframe focuses on the unique needs and workflows of our target personas.

## 📱 Global Layout Structure

### Master Layout Template
```
┌─────────────────────────────────────────────────────────────────┐
│ [🏠 Logo] [🔍 Global Search] [🔔 Notifications] [👤 Profile]    │
├─────────────────────────────────────────────────────────────────┤
│ [📋 Projects] [📊 Analytics] [👥 Team] [📁 Files] [⚙️ Settings] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    PERSONA-SPECIFIC CONTENT                    │
│                         (Main Dashboard)                       │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Quick Actions Panel] [Activity Feed] [Context Help]           │
└─────────────────────────────────────────────────────────────────┘
```

## 👩‍💼 Sarah (Project Manager) Dashboard

### Primary View: Project Management Hub
```
┌─────────────────────────────────────────────────────────────────┐
│ Project Overview │ Quick Actions │ Team Status │ Alerts         │
├─────────────────┼───────────────┼─────────────┼────────────────┤
│ 📊 Active: 8    │ ➕ New Project│ 👥 Online: 12│ ⚠️ 3 Overdue   │
│ ⏸️ Paused: 2    │ 📋 Bulk Edit  │ 🏠 Remote: 8 │ 🔄 2 Blocked   │
│ ✅ Done: 15     │ 📈 Reports    │ 🏢 Office: 4 │ 📅 5 Due Today │
└─────────────────┴───────────────┴─────────────┴────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     KANBAN BOARD VIEW                          │
├─────────────┬─────────────┬─────────────┬─────────────┬────────┤
│    TODO     │ IN PROGRESS │   REVIEW    │   TESTING   │  DONE  │
│    (12)     │     (8)     │     (5)     │     (3)     │  (24)  │
├─────────────┼─────────────┼─────────────┼─────────────┼────────┤
│ [Task Card] │ [Task Card] │ [Task Card] │ [Task Card] │ [Card] │
│ [Task Card] │ [Task Card] │ [Task Card] │ [Task Card] │ [Card] │
│ [Task Card] │ [Task Card] │ [Task Card] │             │ [Card] │
│ [Task Card] │ [Task Card] │             │             │        │
│ [+Add Task] │             │             │             │        │
└─────────────┴─────────────┴─────────────┴─────────────┴────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT TIMELINE                            │
├─────────────────────────────────────────────────────────────────┤
│ Week 1    Week 2    Week 3    Week 4    Week 5    Week 6       │
│ ████████  ████████  ██████    ████      ██        ░░           │
│ Project A: ████████████████████████                            │
│ Project B:           ████████████████████████                  │
│ Project C:                     ████████████████████████        │
└─────────────────────────────────────────────────────────────────┘
```

### Task Card Detail (Sarah's View)
```
┌─────────────────────────────────────────────────────────────────┐
│ [🔄 Status: In Progress] [🔥 High Priority] [👤 Mike, Lisa]     │
├─────────────────────────────────────────────────────────────────┤
│ Design System Implementation                                   │
│ Create comprehensive design tokens and component library...    │
├─────────────────────────────────────────────────────────────────┤
│ 📅 Due: Jan 15 │ ⏱️ 16h/20h │ 🔗 Dependencies: 3 │ 📎 Files: 5│
├─────────────────────────────────────────────────────────────────┤
│ Subtasks (4/7):                                              │
│ ✅ Typography scale                                            │
│ ✅ Color palette                                               │
│ 🔄 Component templates                                         │
│ ⏸️ Animation guidelines                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 👨‍💼 David (Team Lead) Dashboard

### Primary View: Team Analytics Center
```
┌─────────────────────────────────────────────────────────────────┐
│ Team Capacity │ Performance │ Workload │ Skill Matrix          │
├───────────────┼─────────────┼──────────┼──────────────────────┤
│ 👥 12 members │ 📈 +12% eff │ ⚖️ 82% avg│ 🎯 Skills gap: 2     │
│ 🕒 480h total │ ⚡ 2.3x vel  │ 🔴 3 over │ 📚 Training: 4      │
│ ✅ 78% util   │ 🎯 98% qual  │ 🟡 2 under│ 🌟 Experts: 6       │
└───────────────┴─────────────┴──────────┴──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    TEAM WORKLOAD DISTRIBUTION                  │
├─────────────────────────────────────────────────────────────────┤
│ Sarah (PM)      ████████████████████████████████░░  85%         │
│ Mike (Dev)      █████████████████████████████████░  90%         │
│ Lisa (Design)   ████████████████████████░░░░░░░░░░  70%         │
│ Tom (Dev)       ███████████████████████████████░░░  82%         │
│ Ana (QA)        ████████████████████████████████░░  88%         │
│ Ben (DevOps)    ██████████████████░░░░░░░░░░░░░░░░  55%         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│             PERFORMANCE TRENDS & BOTTLENECKS                   │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Weekly Velocity:  [Chart showing 4-week trend]              │
│ 🚧 Current Blockers: 3 items                                   │
│ ⚡ Fastest: Code Reviews (avg 2h)                              │
│ 🐌 Slowest: Design Approval (avg 3.2 days)                    │
│ 🎯 Goal vs Actual: 95% completion rate                        │
└─────────────────────────────────────────────────────────────────┘
```

### Resource Allocation View (David's Focus)
```
┌─────────────────────────────────────────────────────────────────┐
│                     RESOURCE REALLOCATION                      │
├─────────────────────────────────────────────────────────────────┤
│ Overloaded Members:                                            │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Mike (Developer) - 90% capacity                             ││
│ │ Current: 8 tasks │ Suggested: Move 2 to Tom              ││
│ │ [📋 Task 1] [📋 Task 2] → [Transfer to Tom]              ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                │
│ Available Capacity:                                            │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Ben (DevOps) - 55% capacity                                ││
│ │ Available: 18h │ Skills: Docker, AWS, CI/CD              ││
│ │ [📋 Suggested Tasks] [📋 Training Opportunities]          ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 👩‍💼 Jennifer (Executive) Dashboard

### Primary View: Executive Summary
```
┌─────────────────────────────────────────────────────────────────┐
│ Portfolio Health │ Budget Status │ Strategic KPIs │ Risk Matrix │
├──────────────────┼───────────────┼────────────────┼─────────────┤
│ 🟢 8 on track    │ 💰 $245k used │ 📈 ROI: +23%   │ 🟡 2 medium │
│ 🟡 2 at risk     │ 💸 $55k left  │ ⚡ TTM: -15%   │ 🔴 1 high   │
│ 🔴 1 critical    │ 📊 82% util   │ 🎯 CSat: 4.2/5 │ 🟢 8 low    │
└──────────────────┴───────────────┴────────────────┴─────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    STRATEGIC DASHBOARD                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│ 📊 Revenue Impact Projects:                                    │
│ ████████████████████████████████████████████████  85% complete │
│                                                                │
│ 🎯 Market Expansion Initiative:                                │
│ ████████████████████████████░░░░░░░░░░░░░░░░░░░░  62% complete │
│                                                                │
│ 🚀 Innovation Pipeline:                                        │
│ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  38% complete │
│                                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DECISION SUPPORT PANEL                      │
├─────────────────────────────────────────────────────────────────┤
│ 🚨 Requires Attention:                                         │
│ • Resource shortage in Q2 (2 additional developers needed)    │
│ • Budget reallocation request for Project Phoenix ($15k)      │
│ • Technical debt review scheduled for next quarter            │
│                                                                │
│ 💡 Recommendations:                                            │
│ • Accelerate hiring timeline by 3 weeks                       │
│ • Consider outsourcing non-critical development               │
│ • Approve design system investment for long-term efficiency   │
└─────────────────────────────────────────────────────────────────┘
```

## 👨‍💻 Mike (Developer) Dashboard

### Primary View: Developer Workspace
```
┌─────────────────────────────────────────────────────────────────┐
│ My Tasks │ Active Sprint │ Code Stats │ Focus Time              │
├──────────┼───────────────┼────────────┼────────────────────────┤
│ 🔄 5 WIP │ 📅 Sprint 12  │ 📊 +247LOC │ 🎯 3h 45m today         │
│ 📋 3 TODO│ ⏱️ Day 3/14   │ 🐛 2 bugs  │ 🔕 DND until 2:30 PM   │
│ ✅ 8 Done│ 🎯 67% done   │ ⚡ 12 PRs  │ ☕ Break in 15m        │
└──────────┴───────────────┴────────────┴────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       MY TASK QUEUE                            │
├─────────────────────────────────────────────────────────────────┤
│ 🔥 HIGH PRIORITY                                               │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ [🔄 In Progress] API Authentication Refactor               ││
│ │ ⏱️ 4h logged / 6h est │ 🔗 PR #234 │ 📅 Due: Today 5PM   ││
│ │ [View Code] [Time Log] [Block Task]                        ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                │
│ 📋 READY TO START                                              │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ [📝 Todo] Database Migration Script                        ││
│ │ ⏱️ 0h logged / 3h est │ 🔗 Depends on #233 │ 📅 Tomorrow  ││
│ │ [Start Task] [View Dependencies] [Add Time]                ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT TOOLS PANEL                     │
├─────────────────────────────────────────────────────────────────┤
│ 🔗 Quick Links:                                                │
│ [GitHub Repo] [CI/CD Status] [Documentation] [Code Review]    │
│                                                                │
│ 📊 Today's Activity:                                           │
│ • 3 commits pushed                                            │
│ • 2 PRs reviewed                                              │
│ • 1 deployment successful                                     │
│ • 0 build failures                                            │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Lisa (Designer) Dashboard

### Primary View: Design Studio
```
┌─────────────────────────────────────────────────────────────────┐
│ Design Tasks │ Asset Status │ Reviews │ Creative Pipeline      │
├──────────────┼──────────────┼─────────┼──────────────────────┤
│ 🎨 4 Active  │ 📁 23 files  │ ✅ 2 app│ 💡 3 concepts        │
│ 👀 2 Review  │ 🔄 5 updated │ ⏸️ 1 pen│ 🎨 2 in progress     │
│ ✅ 12 Done   │ 📤 3 shared  │ 📝 1 rev│ 🚀 1 ready to dev    │
└──────────────┴──────────────┴─────────┴──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      DESIGN WORKFLOW                           │
├─────────────────────────────────────────────────────────────────┤
│ 🎨 CONCEPT PHASE                                               │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Mobile App Redesign - User Onboarding                      ││
│ │ 📊 Status: Wireframing │ 👥 Stakeholders: Sarah, Jennifer ││
│ │ 📅 Due: Jan 18 │ 💬 3 comments │ 🔄 Version 2.1           ││
│ │ [View Figma] [Upload Assets] [Request Feedback]            ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                │
│ 👀 REVIEW QUEUE                                                │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Dashboard Icons - Final Approval                           ││
│ │ 📊 Waiting for: Jennifer │ ⏰ 2 days pending               ││
│ │ 💬 "Looks great, just need color adjustments"             ││
│ │ [View Comments] [Upload Revision] [Ping Reviewer]         ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     ASSET LIBRARY PANEL                        │
├─────────────────────────────────────────────────────────────────┤
│ 📁 Recent Files:                                               │
│ • meridian-dashboard-v3.fig (Updated 2h ago)                     │
│ • mobile-wireframes.sketch (Updated yesterday)                │
│ • design-tokens.json (Updated 3 days ago)                     │
│                                                                │
│ 🎨 Design System Status:                                       │
│ • Components: 24/30 complete                                  │
│ • Tokens: All defined                                         │
│ • Documentation: 80% complete                                 │
│                                                                │
│ [Browse All Assets] [Upload New] [Version History]            │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Component Specifications

### Kanban Card Component (Multi-Persona)
```
┌─────────────────────────────────────────────────────────────────┐
│ [🔥 Priority] [Status Badge] [⏱️ Time] [👤 Assignee Avatar]     │
├─────────────────────────────────────────────────────────────────┤
│ Task Title (truncated if > 2 lines)                           │
│ Brief description preview...                                   │
├─────────────────────────────────────────────────────────────────┤
│ [🏷️ Tags] [📎 Files: 3] [💬 Comments: 5] [🔗 Dependencies: 2] │
│                                                                │
│ Progress: ████████████████████████████████░░  85%             │
└─────────────────────────────────────────────────────────────────┘

Persona Variations:
- Sarah: Emphasizes dependencies and team assignment
- David: Shows workload impact and team member status
- Jennifer: Highlights business value and risk indicators
- Mike: Focuses on technical details and time tracking
- Lisa: Emphasizes asset attachments and review status
```

### Magic UI Integration Points
```yaml
Navigation:
  Component: Dock (Mac-style animated dock)
  Usage: Primary navigation bar
  Animation: Hover scale and glow effects

Dashboard Layout:
  Component: Bento Grid
  Usage: Responsive widget layout
  Customization: Persona-specific grid configurations

Activity Feed:
  Component: Animated List
  Usage: Real-time updates and notifications
  Animation: Slide-in animations for new items

Team Collaboration:
  Component: Avatar Circles
  Usage: Team member indicators and assignments
  Animation: Orbiting circles for active collaboration

Progress Visualization:
  Component: Animated Circular Progress Bar
  Usage: Project and task completion indicators
  Animation: Smooth progress transitions

File Management:
  Component: File Tree
  Usage: Asset organization and navigation
  Interaction: Expandable folders with animations

Data Visualization:
  Component: Icon Cloud
  Usage: Technology stack and skill visualization
  Animation: Floating and rotating icons

Status Updates:
  Component: Marquee
  Usage: Scrolling announcements and alerts
  Animation: Smooth horizontal scrolling
```

## 📱 Responsive Breakpoints

### Desktop (1440px+)
- Full sidebar navigation
- 5-column kanban view
- Detailed card information
- Side panels for context

### Tablet (768px - 1439px)
- Collapsible sidebar
- 3-column kanban view
- Condensed card layout
- Modal panels for details

### Mobile (320px - 767px)
- Bottom navigation bar
- Single column kanban (swipe navigation)
- Minimalist card design
- Full-screen task details

## 🚀 Next Phase: High-Fidelity Prototypes

Based on these wireframes, the next steps include:

1. **Interactive Prototypes**: Convert wireframes to clickable prototypes
2. **Magic UI Implementation**: Integrate specific components
3. **User Testing**: Validate workflows with personas
4. **Design System Creation**: Build comprehensive component library
5. **Developer Handoff**: Create detailed specifications

---

**Magic UI Components Ready for Integration**:
- ✅ Dock navigation system
- ✅ Bento grid dashboard layout
- ✅ Animated list for activity feeds
- ✅ Avatar circles for team visualization
- ✅ Progress bars for completion tracking
- ✅ File tree for asset management

**Epic Alignment**:
- **Epic 1.1**: ✅ Kanban board structure wireframed
- **Epic 1.2**: ✅ Gantt integration points identified
- **Epic 2.1**: ✅ File management UI designed
- **Epic 3.1**: ✅ Time tracking interfaces specified
- **Epic 4.1**: ✅ Real-time collaboration elements defined 