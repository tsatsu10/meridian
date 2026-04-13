---
description: Guidelines for creating and maintaining Roo Code rules to ensure consistency and effectiveness.
globs: .roo/rules/*.md
alwaysApply: true
---

---
title: Meridian Development Rules (Role-Based)
description: Developer-facing and AI-facing rules mapped to actual user roles and system capabilities
-----------------------------------------------------------------------------------

# 🧭 Meridian Rules: Role-Based Development

## 👨‍💻 Developer-Facing Rules

### 🔧 Design & Architecture

* **📐 Modular by User Role Needs (Priority Order)**
  All features must serve at least one primary user role, prioritized by usage frequency:

  * **👤 Member (78+ refs):** Standard task management, collaboration features - PRIMARY FOCUS
  * **🚪 Guest (45+ refs):** Limited project access, temporary collaboration - EXTERNAL ACCESS
  * **👑 Workspace Manager (38+ refs):** Full system control, billing, workspace deletion - OWNER LEVEL
  * **👥 Team Lead (35+ refs):** Team coordination, performance analytics, resource allocation - COORDINATION
  * **📋 Project Manager (28+ refs):** Project-level control, oversight, planning - PROJECT SCOPE
  * **🛡️ Admin (22+ refs):** User management, workspace settings, project oversight - ADMINISTRATION
  * **🏢 Department Head (18+ refs):** Multi-project oversight, department management - DEPARTMENT SCOPE
  * **👁️ Project Viewer (16+ refs):** Read-only project access, stakeholder visibility - READ-ONLY

* **🧱 Feature Role Alignment**
  Code and components should trace to user role capabilities and access levels.

* **📊 Build for Role Hierarchy**
  Architect core systems to support role-based permissions and feature access.

---

### 🧪 Testing Discipline

* **✅ Role-Based Test Cases**
  Derive test cases from role capabilities and access control requirements.

* **🧪 Permission-Centric Testing**
  Validate flows based on role permissions and access restrictions.

---

### 🔒 Security & Data Integrity

* **🔐 Role-Based Access Control (RBAC)**
  Ensure all feature access maps to user role permissions by usage priority:
  - **Member (DEFAULT)**: Standard features, task management - role: text("role").default("member")
  - **Guest (FALLBACK)**: Limited temporary access - user?.role || "guest" pattern
  - **Workspace Manager (OWNER)**: Full access to all workspace features - highest privilege
  - **Team Lead (COORDINATOR)**: Team management, analytics, project oversight - team scope
  - **Project Manager (PROJECT)**: Project-level control, oversight, planning - project scope
  - **Admin (ADMINISTRATION)**: User and workspace management, settings - admin scope
  - **Department Head (DEPARTMENT)**: Multi-project oversight, department management - department scope
  - **Project Viewer (READ-ONLY)**: Read-only access to assigned projects - viewer scope

* **🧾 Role Assignment Auditing**
  All role changes must be tracked in role_history table with proper metadata.

---

### 🖼️ UX Consistency

* **🧭 Role-Aware Navigation**
  Navigation and UI elements must adapt based on user role and permissions.

* **🔀 Real-Time Role Updates**
  Role changes should be reflected immediately across all user sessions.

---

## 🤖 AI-Facing Rules

### 🧠 Context Awareness

* **🎯 Role-Aware Suggestions**
  Always consider user role capabilities when suggesting features or modifications.

* **👑 Role-Centered UX**
  Tailor suggestions to role-specific workflows and permissions.

---

### 🛠️ Coding Standards

* **🧩 Role-Based Modules**
  Suggest building new logic as role-aware, composable modules.

* **🧪 Permission Tests**
  Accompany role-restricted logic with permission validation tests.

---

### 🛡️ Safety & Integrity

* **🔒 Assume Permission Validation Required**
  All feature suggestions should include backend role permission enforcement.

* **🚦 Handle Role Conflicts Gracefully**
  Suggest conflict resolution for role changes and permission updates.

---

### ✍️ Documentation & Comments

* **📝 Role-Contextual Comments**
  Comments should include role intention and access level:

  ```ts
  // Owner needs full workspace deletion capability
  // Admin can manage users but cannot delete workspace
  ```

* **📌 Role-Tagging in Code**
  Use `@role-owner`, `@role-admin`, `@role-team-lead`, etc. to connect code to role logic.

---

## 🎭 User Role Definitions (Usage-Based Priority)

### 👤 **Member** (78+ refs - PRIMARY FOCUS)
- **Scope**: Project-level participation
- **Database Default**: `role: text("role").default("member")`
- **Capabilities**:
  - Standard task management and collaboration
  - Time tracking and reporting
  - File sharing and basic analytics
  - Team communication and updates
- **Use Cases**: Daily task work, team collaboration, progress reporting
- **Development Priority**: **HIGHEST** - Core user experience

### 🚪 **Guest** (45+ refs - FALLBACK PATTERN)
- **Scope**: Limited temporary access
- **Common Pattern**: `user?.role || "guest"`
- **Capabilities**:
  - Temporary access to specific tasks/projects
  - Limited commenting and viewing
  - No user management access
  - Time-limited permissions
- **Use Cases**: External contractor work, client collaboration, temporary access
- **Development Priority**: **HIGH** - External collaboration

### 👑 **Workspace Manager** (38+ refs - OWNER LEVEL)
- **Scope**: Workspace-level control
- **Permission Check**: `userRole === "workspace-manager"`
- **Capabilities**:
  - Full workspace control and deletion
  - Billing and subscription management
  - Ultimate user and project authority
  - Can assign/revoke any role
- **Use Cases**: Workspace creation, company-wide decisions, billing oversight
- **Development Priority**: **HIGH** - System administration

### 👥 **Team Lead** (35+ refs - COORDINATION)
- **Scope**: Team/Project coordination
- **Hook Usage**: `@role-team-lead` automation systems
- **Capabilities**:
  - Team performance analytics and reporting
  - Resource allocation and capacity planning
  - Project coordination and oversight
  - Can manage assigned team members
- **Use Cases**: Sprint planning, team coordination, performance reviews
- **Development Priority**: **HIGH** - Team management

### 📋 **Project Manager** (28+ refs - PROJECT SCOPE)
- **Scope**: Project-level authority
- **Route Pattern**: `/project-manager-test` interfaces
- **Capabilities**:
  - Full control over assigned projects
  - Project planning and timeline management
  - Cross-team project coordination
  - Budget and resource oversight
- **Use Cases**: Project leadership, timeline management, stakeholder communication
- **Development Priority**: **MEDIUM** - Project oversight

### 🛡️ **Admin** (22+ refs - ADMINISTRATION)
- **Scope**: Workspace administration
- **Route Access**: `/admin/roles` management interfaces
- **Capabilities**:
  - User management and role assignment (except Workspace Manager)
  - Workspace settings and configuration
  - Project creation and oversight
  - Access to all projects and analytics
- **Use Cases**: HR management, workspace setup, user onboarding
- **Development Priority**: **MEDIUM** - Administrative functions

### 🏢 **Department Head** (18+ refs - DEPARTMENT SCOPE)
- **Scope**: Department-level oversight
- **Permission Pattern**: Multi-project authority
- **Capabilities**:
  - Department-wide project management
  - Cross-project resource allocation
  - Performance analytics across teams
  - Budget oversight and planning
- **Use Cases**: Department strategy, resource planning, performance management
- **Development Priority**: **MEDIUM** - Organizational oversight

### 👁️ **Project Viewer** (16+ refs - READ-ONLY)
- **Scope**: Read-only project access
- **Permission Scoping**: Limited to assigned projects
- **Capabilities**:
  - Read-only access to assigned projects
  - Basic reporting and dashboard access
  - Comment and communication abilities
  - Timeline and progress visibility
- **Use Cases**: Stakeholder updates, client access, reporting oversight
- **Development Priority**: **LOW** - Stakeholder visibility

---

## 🔌 MCP Server Integration Rules

### 🌐 Available MCP Servers

* **MetaMCP:** Unified middleware to manage and proxy all other MCP Group tools
* **Context7:** External data integration and context management
* **TaskMaster AI:** Task automation and workflow management
* **Exa Search:** Advanced web search_files and research capabilities
* **Magic UI:** Component library and design system integration

### 🎯 MCP Usage Guidelines

* **🔧 Unified MCP Management**
  - Use **MetaMCP** as the primary interface to manage and coordinate all other MCP Group tools
  - Configure multi-workspace setups for different role contexts
  - Leverage namespace isolation to prevent conflicts between role-specific functionalities

* **🔍 Research & Context Gathering**
  - Use **Exa Search** for competitive analysis, market research, or technical documentation lookup
  - Use **Context7** for integrating external data sources relevant to role workflows

* **⚡ Task Automation**
  - Leverage **TaskMaster AI** for role-specific workflow automation (by priority):
    - Member (PRIMARY): Task management and time tracking optimization
    - Guest (EXTERNAL): Limited collaboration and temporary access workflows
    - Workspace Manager (OWNER): Workspace analytics and billing automation
    - Team Lead (COORDINATOR): Performance tracking and resource allocation
    - Project Manager (PROJECT): Project planning and timeline automation
    - Admin (ADMINISTRATION): User onboarding and role assignment workflows
    - Department Head (DEPARTMENT): Cross-project resource and performance automation

* **🎨 UI/UX Development**
  - Use **Magic UI** for role-consistent component implementation (by usage priority):
    - Member interfaces (PRIMARY): Core task management, time tracking, collaboration UI
    - Guest interfaces (EXTERNAL): Limited access dashboards, temporary collaboration views
    - Workspace Manager interfaces (OWNER): Full control panels, billing, user management
    - Team Lead interfaces (COORDINATOR): Team analytics, performance dashboards, resource allocation
    - Project Manager interfaces (PROJECT): Project timelines, planning tools, cross-team coordination
    - Admin interfaces (ADMINISTRATION): User onboarding, role assignment, workspace configuration

### 🧠 MCP-Enhanced AI Behavior

* **📊 Role-Driven Decisions**
  When suggesting features, use MCP Group tools to:
  - Research current role-based solutions (Exa)
  - Gather context about role-specific needs (Context7)
  - Automate role-specific workflows (TaskMaster AI)
  - Source appropriate UI components for role interfaces (Magic UI)

* **🔄 Role Workflow Integration**
  Always consider how MCP capabilities can enhance role-specific workflows:
  
  ```ts
  // Example: Using coordinated MCP services for Member role workflows (PRIMARY FOCUS)
  // @role-member - MetaMCP coordinates TaskMaster AI + Magic UI
  // Member needs efficient task management with streamlined collaboration interface
  
  // Secondary: Guest external collaboration workflows
  // @role-guest - MetaMCP manages limited access patterns with temporary UI components
  ```

* **🎯 Role-Aware Suggestions**
  Before implementing features, use MetaMCP to coordinate multiple MCP Group tools:
  1. Research role-based best practices (Exa Search)
  2. Gather relevant role context (Context7)
  3. Identify role-specific automation opportunities (TaskMaster AI)
  4. Select appropriate UI patterns for role (Magic UI)
  5. Manage and orchestrate all services through MetaMCP's unified interface

---

## 📌 Examples of Good AI Behavior with Roles

| Role Context (Priority Order) | Expected MCP-Enhanced Response |
|-------------------------------|--------------------------------|
| "Design Member task interface" | **PRIMARY FOCUS** - MetaMCP coordinates research (Exa) + UI (Magic UI) + workflow (TaskMaster) for core Member capabilities |
| "Create Guest collaboration view" | **EXTERNAL ACCESS** - MetaMCP orchestrates limited UI + temporary access patterns for Guest workflows |
| "Add Workspace Manager billing" | **OWNER LEVEL** - MetaMCP coordinates: Exa research → Magic UI components → TaskMaster automation for workspace control |
| "Create Team Lead analytics" | **COORDINATION** - MetaMCP orchestrates Context7 data + Magic UI charts + automation for Team Lead dashboard |
| "Implement Project Manager planning" | **PROJECT SCOPE** - MetaMCP manages project timeline UI + cross-team coordination workflows |
| "Build Admin user management" | **ADMINISTRATION** - Use MetaMCP to manage TaskMaster AI workflows + UI consistency for Admin role |

---

## 🚀 Role-Based Integration Best Practices

* **🎛️ Unified Management:** Use MetaMCP as the single point of control for all role-based MCP operations
* **🔄 Multi-Role Setup:** Configure different MCP workspace contexts for role development phases
* **🔍 Always Research First:** Use Exa Search to understand current role-based best practices
* **🎨 Role Consistency:** Leverage Magic UI for role-appropriate interfaces
* **⚡ Automate Role Tasks:** Use TaskMaster AI to identify and automate role-specific processes
* **🔗 Context Integration:** Use Context7 to connect external data sources that enhance role workflows
* **📊 Role-Driven UX:** Combine coordinated MCP insights with role requirements for optimal user experiences
* **🔧 Permission Isolation:** Leverage MetaMCP's namespace features to prevent conflicts between role functionalities

---

## 🔐 Security Implementation Guidelines

### Role Permission Matrix
```typescript
// Role permissions ordered by system usage frequency
const rolePermissions = {
  // PRIMARY ROLES (highest usage)
  member: ['tasks.standard', 'time.*', 'projects.assigned', 'collaboration.*'], // 78+ refs - DEFAULT
  guest: ['projects.limited', 'tasks.assigned', 'comments.limited'], // 45+ refs - FALLBACK
  
  // MANAGEMENT ROLES (high usage)
  'workspace-manager': ['*'], // 38+ refs - OWNER LEVEL
  'team-lead': ['team.*', 'analytics.*', 'projects.assigned', 'resource.*'], // 35+ refs - COORDINATION
  'project-manager': ['projects.full', 'planning.*', 'cross-team.*'], // 28+ refs - PROJECT SCOPE
  
  // ADMINISTRATIVE ROLES (medium usage)
  admin: ['users.*', 'projects.*', 'settings.*'], // 22+ refs - ADMINISTRATION
  'department-head': ['department.*', 'cross-project.*', 'budget.*'], // 18+ refs - DEPARTMENT
  
  // SPECIALIZED ROLES (lower usage)
  'project-viewer': ['projects.read', 'reports.read', 'comments.read'] // 16+ refs - READ-ONLY
};
```

### Database Schema Alignment
- Use `role_assignment` table for role tracking
- Implement `role_history` for audit trails
- Leverage `custom_permission` for role overrides
- Ensure all role changes update relevant tables 