/**
 * 🛡️ Admin Role Management Interface
 * 
 * @epic-3.4-admin @persona-jennifer: Executive oversight of role assignments
 * Comprehensive role management dashboard for workspace managers and department heads
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRBACAuth } from "@/lib/permissions";
import { RequirePermission } from "@/lib/permissions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Users, Shield, Clock, History, AlertTriangle, Crown, UserCog, Eye, Settings, Ban } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

// API client will be added when types are available

interface RoleAssignment {
  id: string;
  userId: string;
  role: string;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
  workspaceId?: string;
  reason?: string;
  notes?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  assignedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface RoleHistory {
  id: string;
  userId: string;
  previousRole?: string;
  newRole: string;
  action: string;
  changedBy: string;
  reason?: string;
  changedAt: string;
  changedByUser?: {
    name: string;
    email: string;
  };
}

// Role configuration with icons and colors
const roleConfig = {
  "workspace-manager": { icon: Crown, color: "bg-purple-500", label: "Workspace Manager", level: 7 },
  "department-head": { icon: UserCog, color: "bg-blue-500", label: "Department Head", level: 6 },
  "workspace-viewer": { icon: Eye, color: "bg-green-500", label: "Workspace Viewer", level: 5 },
  "project-manager": { icon: Settings, color: "bg-orange-500", label: "Project Manager", level: 4 },
  "project-viewer": { icon: Eye, color: "bg-green-400", label: "Project Viewer", level: 3 },
  "team-lead": { icon: Users, color: "bg-indigo-500", label: "Team Lead", level: 2 },
  "member": { icon: Users, color: "bg-gray-500", label: "Member", level: 1 },
  "client": { icon: Users, color: "bg-amber-500", label: "Client", level: 1 },
  "contractor": { icon: Users, color: "bg-teal-500", label: "Contractor", level: 1 },
  "stakeholder": { icon: Eye, color: "bg-cyan-500", label: "Stakeholder", level: 1 },
  "guest": { icon: Ban, color: "bg-red-500", label: "Guest", level: 0 },
};

const AdminRoleManagementWithPermission = () => (
  <RequirePermission action="canManageRoles">
    <RoleManagementPage />
  </RequirePermission>
);

export const Route = createFileRoute("/dashboard/admin/roles")({
  component: withErrorBoundary(AdminRoleManagementWithPermission, "Admin Role Management"),
});

function RoleManagementPage() {
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Role Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage user roles and permissions across your workspace
          </p>
        </div>
        
        <Button className="flex items-center gap-2">
          <UserCog className="h-4 w-4" />
          Assign Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Role Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Role management interface is being built.</p>
            <p className="text-sm text-gray-500">Full functionality coming soon!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Role Assignment Form Component
function RoleAssignmentForm({
  users,
  onSubmit,
  isLoading,
}: {
  users: User[];
  onSubmit: (data: {
    userId: string;
    role: string;
    reason?: string;
    expiresAt?: Date;
    notes?: string;
  }) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    userId: "",
    role: "",
    reason: "",
    expiresAt: undefined as Date | undefined,
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.userId && formData.role) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="user">Select User</Label>
        <Select value={formData.userId} onValueChange={(value) => setFormData(prev => ({ ...prev, userId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(roleConfig).map(([role, config]) => (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  <config.icon className="h-4 w-4" />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="reason">Reason for Assignment</Label>
        <Input
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
          placeholder="Why is this role being assigned?"
        />
      </div>

      <div>
        <Label htmlFor="expiry">Expiry Date (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.expiresAt && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.expiresAt ? format(formData.expiresAt, "PPP") : "No expiry"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.expiresAt}
              onSelect={(date) => setFormData(prev => ({ ...prev, expiresAt: date }))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes about this assignment"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setFormData({
          userId: "",
          role: "",
          reason: "",
          expiresAt: undefined,
          notes: "",
        })}>
          Reset
        </Button>
        <Button type="submit" disabled={isLoading || !formData.userId || !formData.role}>
          {isLoading ? "Assigning..." : "Assign Role"}
        </Button>
      </div>
    </form>
  );
} 