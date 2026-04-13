### RBAC in Meridian — A Simple Guide

This guide explains how roles and permissions work in Meridian without the jargon.

#### What is RBAC?
Role‑Based Access Control (RBAC) means each user has a role, and each role has permissions. Users only see and do what their role allows.

#### Roles (plain English)
- Owner: Full workspace control, including billing and deletion.
- Admin: Manage users, settings, and projects (not workspace deletion).
- Team Lead: Manage team members and see team analytics.
- Senior: Advanced workflows and mentoring.
- Member: Day‑to‑day task work.
- Viewer: Read‑only access.
- Guest: Temporary, limited access.

#### What can roles do?
Permissions are grouped by area:
- Workspace: settings, billing, user management
- Project: create/edit/archive, project settings
- Tasks: create/edit/delete, bulk actions, import/export
- Teams: manage team members and roles
- Analytics & Reporting: view analytics, create/schedule reports, export data
- Communication: channels, announcements, moderation
- Files: upload/download/delete, sharing and versioning
- System: integrations, API access, security settings

See also: `RBAC_IMPLEMENTATION_SUMMARY.md` for the full list.

#### Where is it enforced?
- Backend (server):
  - Session middleware sets the current user on each request
    - `apps/api/src/index.ts`
    - `apps/api/src/middlewares/auth.ts`
  - Workspace/channel checks for realtime features
    - `apps/api/src/realtime/unified-websocket-server.ts`
  - Protected API routes validate permissions

- Frontend (web):
  - Pages and buttons are shown/hidden based on permissions
  - Navigation items are filtered per role (e.g., Analytics, Teams)
  - Settings sections are gated (e.g., Role Permissions for workspace managers)

#### Typical flows
- Owner invites Admin → Admin invites Team Lead → Team Lead manages Members
- Member requests action → Senior reviews → Team Lead approves → Admin updates settings

#### How to test quickly
1) Sign in and go to Dashboard pages.
2) Try actions like Create Project or Export Analytics.
3) Switch roles; the UI and available actions should change immediately.

#### Takeaways
- Users see only what they’re allowed to do.
- The server double‑checks permissions for security.
- The UI adapts to role changes in real time.


