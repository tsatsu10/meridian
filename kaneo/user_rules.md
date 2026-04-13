---

title: Meridian Development Rules (Role-Based & Epic-Aligned)
description: Developer-facing and AI-facing rules mapped to epics and user roles
-----------------------------------------------------------------------------------

# 🧭 Meridian Rules: Role-Based & Epic-Aligned

## 👨‍💻 Developer-Facing Rules

### 🔧 Design & Architecture

* **📐 Modular by Role Needs**
  All features must serve at least one primary user role:

  * **Workspace Manager (Level 7):** Full workspace control, analytics dashboards, system management
  * **Department Head (Level 6):** Multi-project oversight, department analytics, team coordination
  * **Project Manager (Level 4):** Project lifecycle management, team assignments, budget tracking
  * **Team Lead (Level 2):** Task assignment, subtask CRUD, member mentoring, workload distribution
  * **Member (Level 1):** Task completion, time tracking, basic collaboration
  * **Project Viewer (Level 3):** Read-only project access, progress monitoring
  * **Workspace Viewer (Level 5):** Organization-wide visibility, reporting access
  * **External Roles (Client/Contractor/Stakeholder):** Specialized access patterns

* **🧱 Feature Epic Alignment**
  Code and components should trace to user epics or acceptance criteria.

* **📊 Build for Growth**
  Architect core systems to support upcoming complex features (e.g., task trees, automation engine, analytics).

---

### 🧪 Testing Discipline

* **✅ Acceptance Criteria = Test Cases**
  Derive test cases from acceptance criteria in each user story.

* **🧪 Role-Centric Testing**
  Validate flows based on role permissions and capabilities:
  - Test permission boundaries between role levels
  - Verify context-specific access (workspace, project, team scope)
  - Validate role inheritance and hierarchy enforcement

---

### 🔒 Security & Data Integrity

* **🔐 Role-Based Access Control (RBAC)**
  Ensure all feature access maps to defined user roles and permission matrix.

* **🏗️ Permission Context Enforcement**
  All operations must respect workspace, project, and team scope limitations.

* **🧾 Versioning & Audit Logging**
  Systems modifying persistent user data must track versions or include audit trails.

---

### 🖼️ UX Consistency

* **🧭 Global Layout & Navigation**
  All new views must integrate with global UX patterns and role-based sidebar navigation.

* **🔀 Real-Time Support**
  Subtasks, collaboration, dashboards must work in real-time or degrade gracefully.

* **🎯 Role-Adaptive UI**
  Interface elements should adapt based on user role capabilities.

---

## 🤖 AI-Facing Rules

### 🧠 Context Awareness

* **🎯 Epic-Aware Suggestions**
  Always reference acceptance criteria and workflows from matching epics.

* **👥 Role-Centered UX**
  Tailor suggestions to user role capabilities and restrictions. Ask which role the feature serves.

* **🔐 Permission-First Design**
  Consider permission requirements before suggesting features.

---

### 🛠️ Coding Standards

* **🧩 Modular Suggestions**
  Suggest building new logic as composable modules (e.g., Gantt, automation, dashboards).

* **🧪 Suggest Tests**
  Accompany logic with test scaffolds or inline test comments where needed.

* **🔒 Permission Checks**
  Always include appropriate permission validation in suggested code.

---

### 🛡️ Safety & Integrity

* **🔒 Assume Permissions Required**
  All feature suggestions should presume backend enforcement of roles.

* **🚦 Handle Conflicts Gracefully**
  Suggest conflict resolution for collaborative or real-time editing flows.

* **🔍 Scope Validation**
  Ensure operations respect workspace, project, and team boundaries.

---

### ✍️ Documentation & Comments

* **📝 Contextual Comments**
  Comments should include role intention and permission requirements:

  ```ts
  // Workspace Manager: Full analytics access across all projects
  // Department Head: Limited to department projects only  
  // Project Manager: Project-specific analytics and team performance
  ```

* **📌 Epic-Tagging in Code**
  Use `@epic-1.1-subtasks`, `@epic-3.2-time`, `@epic-2.1-files` to connect code to UX logic.

* **🔐 Role-Tagging in Code**
  Use `@role-workspace-manager`, `@role-team-lead`, `@permission-canManageProjects` for clarity.

---

## 🔌 MCP Server Integration Rules

### 🌐 Available MCP Servers

* **MetaMCP:** Unified middleware to manage and proxy all other MCP servers
* **Context7:** External data integration and context management
* **TaskMaster AI:** Task automation and workflow management
* **Exa Search:** Advanced web search and research capabilities
* **Magic UI:** Component library and design system integration

### 🎯 MCP Usage Guidelines

* **🔧 Unified MCP Management**
  - Use **MetaMCP** as the primary interface to manage and coordinate all other MCP servers
  - Configure multi-workspace setups for different project contexts (development, staging, production)
  - Leverage namespace isolation to prevent conflicts between different MCP functionalities

* **🔍 Research & Context Gathering**
  - Use **Exa Search** for competitive analysis, market research, or technical documentation lookup
  - Use **Context7** for integrating external data sources relevant to role-specific needs

* **⚡ Task Automation**
  - Leverage **TaskMaster AI** for workflow automation that serves role-specific efficiency:
    - **Workspace Manager:** System-wide automation and reporting
    - **Department Head:** Cross-project coordination and resource allocation
    - **Project Manager:** Project lifecycle automation and team coordination
    - **Team Lead:** Task assignment automation and subtask management
    - **Member:** Personal productivity and time tracking optimizations

* **🎨 UI/UX Development**
  - Use **Magic UI** for consistent component implementation:
    - Executive dashboards for **Workspace Manager** and **Department Head**
    - Project management interfaces for **Project Manager**
    - Task assignment tools for **Team Lead**
    - Personal productivity views for **Member**
    - Read-only dashboards for **Project Viewer** and **Workspace Viewer**

### 🧠 MCP-Enhanced AI Behavior

* **📊 Data-Driven Decisions**
  When suggesting features, use MCP servers to:
  - Research current market solutions (Exa)
  - Gather context about role-specific user needs (Context7)
  - Automate repetitive development tasks (TaskMaster AI)
  - Source appropriate UI components (Magic UI)

* **🔄 Workflow Integration**
  Always consider how MCP capabilities can enhance role-based workflows through MetaMCP's unified interface:
  
  ```ts
  // Example: Using coordinated MCP services for Project Manager workflows
  // @epic-1.1-subtasks - MetaMCP coordinates TaskMaster AI + Magic UI
  // @role-project-manager - PM needs project-scoped task operations with team UI
  // @permission-canManageProjectTeam - Requires team management permissions
  ```

* **🎯 Context-Aware Suggestions**
  Before implementing features, use MetaMCP to coordinate multiple MCP servers:
  1. Research best practices (Exa Search)
  2. Gather relevant context (Context7)
  3. Identify automation opportunities (TaskMaster AI)
  4. Select appropriate UI patterns (Magic UI)
  5. Manage and orchestrate all services through MetaMCP's unified interface

---

## 📌 Examples of Good AI Behavior with MCP

| Prompt                     | Expected MCP-Enhanced Response                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "Implement Gantt view"     | Use MetaMCP to coordinate: Exa research → Magic UI components → TaskMaster automation, align Epic 1.2 with Project Manager and Team Lead roles |
| "Add time tracking report" | MetaMCP orchestrates Context7 data + Magic UI charts + automation, clarify Workspace Manager vs Department Head vs Project Manager role needs |
| "Design file upload"       | MetaMCP coordinates research (Exa) + UI (Magic UI) + workflow (TaskMaster), align Epic 2.1 with role-specific file permissions |
| "Automate task creation"   | Use MetaMCP to manage TaskMaster AI workflows + UI consistency, align Team Lead task assignment needs and Member task completion flows |

---

## 🚀 MCP Integration Best Practices

* **🎛️ Unified Management:** Use MetaMCP as the single point of control for all MCP operations and configurations
* **🔄 Multi-Workspace Setup:** Configure different MCP workspace contexts for development phases (prototype, development, staging, production)
* **🔍 Always Research First:** Use Exa Search to understand current best practices before implementing
* **🎨 Component Consistency:** Leverage Magic UI for all UI elements to maintain design system integrity
* **⚡ Automate Repetitive Tasks:** Use TaskMaster AI to identify and automate manual processes
* **🔗 Context Integration:** Use Context7 to connect external data sources that enhance role-based workflows
* **📊 Data-Driven UX:** Combine coordinated MCP insights with role-specific needs to create optimal user experiences
* **🔧 Namespace Isolation:** Leverage MetaMCP's namespace features to prevent conflicts between different MCP functionalities

---

## 🔐 Role-Specific Feature Guidelines

### **Workspace Manager (Level 7)**
- Full system access and control
- Cross-workspace analytics and reporting
- System configuration and security management
- User role assignment and workspace governance

### **Department Head (Level 6)**
- Multi-project oversight across department
- Department-wide analytics and resource allocation
- Team lead assignment and department strategy
- Cross-project coordination and reporting

### **Project Manager (Level 4)**
- Complete project lifecycle management
- Team assembly and task delegation
- Project budget and timeline oversight
- Project-specific analytics and reporting

### **Team Lead (Level 2)**
- Task assignment and subtask creation
- Team member mentoring and capacity management
- Workload distribution and progress tracking
- Team-specific communication and coordination

### **Member (Level 1)**
- Task completion and status updates
- Personal time tracking and productivity
- Basic collaboration and communication
- Individual progress and performance metrics

### **Viewer Roles (Levels 3-5)**
- Read-only access to relevant scope
- Progress monitoring and status visibility
- Report consumption and data export
- Limited interaction capabilities

### **External Roles (Client/Contractor/Stakeholder)**
- Scoped access to specific projects or resources
- Specialized dashboards and reporting views
- Limited interaction based on engagement type
- Time-bounded or contract-specific permissions

--- 