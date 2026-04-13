// @epic-1.1-rbac: Enhanced team management with Magic UI integration
// @persona-sarah: PM needs efficient team coordination and member management
// @persona-david: Team lead needs comprehensive team oversight and analytics
// @persona-jennifer: Exec needs department structure and performance visibility

"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SmartAvatar } from "@/components/avatar/smart-avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Search, 
  Plus, 
  Filter,
  MoreHorizontal,
  Mail,
  Shield,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Crown,
  Zap,
  UserMinus,
  UserPlus,
  Settings,
  Activity,
  Star,
  BarChart3,
  Calendar,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { useRBACAuth } from "@/lib/permissions";
import { toast } from "sonner";

// Enhanced role hierarchy with UI styling
const ROLE_HIERARCHY = {
  "workspace-manager": { 
    label: "Workspace Manager", 
    level: 10, 
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300",
    icon: Crown,
    description: "Full workspace control"
  },
  "department-head": { 
    label: "Department Head", 
    level: 9, 
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300",
    icon: Star,
    description: "Department oversight"
  },
  "workspace-viewer": { 
    label: "Workspace Viewer", 
    level: 8, 
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
    icon: Activity,
    description: "Workspace visibility"
  },
  "project-manager": { 
    label: "Project Manager", 
    level: 7, 
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
    icon: Zap,
    description: "Project oversight"
  },
  "project-viewer": { 
    label: "Project Viewer", 
    level: 6, 
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300",
    icon: Activity,
    description: "Project visibility"
  },
  "team-lead": { 
    label: "Team Lead", 
    level: 5, 
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
    icon: Users,
    description: "Team leadership"
  },
  "member": { 
    label: "Member", 
    level: 4, 
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300",
    icon: Activity,
    description: "Active contributor"
  },
  "client": { 
    label: "Client", 
    level: 3, 
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300",
    icon: Crown,
    description: "External client"
  },
  "contractor": { 
    label: "Contractor", 
    level: 2, 
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300",
    icon: Zap,
    description: "Contract worker"
  },
  "stakeholder": { 
    label: "Stakeholder", 
    level: 1, 
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300",
    icon: Star,
    description: "Project stakeholder"
  },
  "guest": { 
    label: "Guest", 
    level: 0, 
    color: "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-300",
    icon: Activity,
    description: "Limited access"
  }
};

// Team member status options
const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  { value: "busy", label: "Busy", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20" },
  { value: "away", label: "Away", color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20" },
  { value: "offline", label: "Offline", color: "text-gray-600 bg-gray-50 dark:bg-gray-900/20" },
  { value: "vacation", label: "On Vacation", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" }
];

// Team data will be fetched from API
// Removed hardcoded DEMO_TEAM_DATA

interface TeamManagementProps {
  className?: string;
  teamId?: string;
  showFilters?: boolean;
  showBulkActions?: boolean;
}

export default function TeamManagement({ 
  className,
  teamId,
  showFilters = true,
  showBulkActions = true
}: TeamManagementProps) {
  const { role, hasPermission } = useRBACAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Fetch team members from API
  React.useEffect(() => {
    const fetchTeamMembers = async () => {
      setIsLoadingTeam(true);
      try {
        // Get workspace from localStorage
        const workspaceStore = localStorage.getItem('meridian-workspace');
        if (!workspaceStore) {
          setTeamData([]);
          return;
        }

        const { state } = JSON.parse(workspaceStore);
        const workspaceId = state?.workspace?.id;
        if (!workspaceId) {
          setTeamData([]);
          return;
        }

        // Fetch workspace users (or team members if teamId is provided)
        const endpoint = teamId 
          ? `/api/teams/${teamId}/members`
          : `/api/workspace-users/${workspaceId}`;

        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3005'}${endpoint}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch team members');

        const members = await response.json();
        
        // Transform API data to match component format
        const formattedMembers = members.map((m: any) => ({
          id: m.id || m.userId,
          name: m.name || m.userName || m.email?.split('@')[0] || 'Unknown',
          email: m.email || m.userEmail,
          role: m.role || 'member',
          status: m.status || 'active',
          avatar: m.avatar, // DiceBear will auto-generate if missing
          joinedAt: m.joinedAt ? new Date(m.joinedAt) : new Date(),
          lastActive: m.lastActive ? new Date(m.lastActive) : new Date(),
          tasksCompleted: m.tasksCompleted || 0,
          projectsManaged: m.projectsManaged || 0,
          teamLead: m.teamLead || false,
          departments: m.departments || ['General'],
          skills: m.skills || [],
          workload: m.workload || 0,
          performance: m.performance || 0
        }));

        setTeamData(formattedMembers);
      } catch (error) {
        console.error('Error fetching team members:', error);
        setTeamData([]);
      } finally {
        setIsLoadingTeam(false);
      }
    };

    fetchTeamMembers();
  }, [teamId]);

  // Permission checks
  const canManageMembers = hasPermission("canManageTeamRoles");
  const canViewDetails = hasPermission("canViewTeamMembers");
  const canInviteMembers = hasPermission("canInviteMembers");

  // Filter and search team members
  const filteredMembers = useMemo(() => {
    return teamData.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           member.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesStatus = statusFilter === "all" || member.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [teamData, searchQuery, roleFilter, statusFilter]);

  // Team statistics
  const teamStats = useMemo(() => {
    const total = teamData.length;
    const active = teamData.filter(m => m.status === "active").length;
    const teamLeads = teamData.filter(m => m.teamLead).length;
    const avgPerformance = teamData.reduce((sum, m) => sum + m.performance, 0) / total;
    const avgWorkload = teamData.reduce((sum, m) => sum + m.workload, 0) / total;
    
    return { total, active, teamLeads, avgPerformance, avgWorkload };
  }, [teamData]);

  // Handle member selection
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    setSelectedMembers(filteredMembers.map(m => m.id));
  };

  const clearSelection = () => {
    setSelectedMembers([]);
  };

  // Handle member actions
  const handleRemoveMember = (memberId: string) => {
    if (!canManageMembers) {
      toast.error("You don't have permission to remove members");
      return;
    }
    
    setTeamData(prev => prev.filter(m => m.id !== memberId));
    toast.success("Member removed successfully");
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    if (!canManageMembers) {
      toast.error("You don't have permission to change roles");
      return;
    }

    setTeamData(prev => prev.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    toast.success("Member role updated successfully");
  };

  const handleInviteMember = () => {
    if (!canInviteMembers) {
      toast.error("You don't have permission to invite members");
      return;
    }
    
    // In real app, would open invite modal
    toast.success("Invite modal would open");
  };

  // Get role styling
  const getRoleInfo = (roleKey: string) => {
    return ROLE_HIERARCHY[roleKey as keyof typeof ROLE_HIERARCHY] || ROLE_HIERARCHY.guest;
  };

  // Get status styling
  const getStatusInfo = (statusKey: string) => {
    return STATUS_OPTIONS.find(s => s.value === statusKey) || STATUS_OPTIONS[0];
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-4 rounded-xl border border-border/50"
        >
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-muted-foreground">Total Members</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{teamStats.total}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="glass-card p-4 rounded-xl border border-border/50"
        >
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-muted-foreground">Active Now</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{teamStats.active}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="glass-card p-4 rounded-xl border border-border/50"
        >
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium text-muted-foreground">Team Leads</span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{teamStats.teamLeads}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="glass-card p-4 rounded-xl border border-border/50"
        >
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-muted-foreground">Avg Performance</span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-2xl font-bold text-foreground">{Math.round(teamStats.avgPerformance)}%</p>
            <Progress value={teamStats.avgPerformance} className="flex-1 h-2" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="glass-card p-4 rounded-xl border border-border/50"
        >
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-muted-foreground">Avg Workload</span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-2xl font-bold text-foreground">{Math.round(teamStats.avgWorkload)}%</p>
            <Progress value={teamStats.avgWorkload} className="flex-1 h-2" />
          </div>
        </motion.div>
      </div>

      {/* Filters and Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="glass-card p-4 rounded-xl border border-border/50"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 glass-card"
              />
            </div>

            {showFilters && (
              <>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48 glass-card">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="all">All Roles</SelectItem>
                    {Object.entries(ROLE_HIERARCHY).map(([key, role]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <role.icon className="h-3 w-3" />
                          <span>{role.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48 glass-card">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="all">All Status</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center space-x-2">
                          <div className={cn("w-2 h-2 rounded-full", status.color.split(' ')[0].replace('text-', 'bg-'))} />
                          <span>{status.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {selectedMembers.length > 0 && showBulkActions && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedMembers.length} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="glass-card text-xs"
                >
                  Clear
                </Button>
              </div>
            )}

            {canInviteMembers && (
              <Button
                onClick={handleInviteMember}
                className="glass-card bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Team Members Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="glass-card rounded-xl border border-border/50 overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              {showBulkActions && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                    onChange={selectedMembers.length === filteredMembers.length ? clearSelection : selectAllMembers}
                    className="rounded border-gray-300"
                  />
                </TableHead>
              )}
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Workload</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredMembers.map((member, index) => {
                const roleInfo = getRoleInfo(member.role);
                const statusInfo = getStatusInfo(member.status);
                const RoleIcon = roleInfo.icon;

                return (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={cn(
                      "border-border/50 hover:bg-muted/30 transition-colors",
                      selectedMembers.includes(member.id) && "bg-primary/5"
                    )}
                  >
                    {showBulkActions && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => toggleMemberSelection(member.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 border-2 border-primary/20">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback className="text-sm">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                            member.status === "active" && "bg-green-500",
                            member.status === "busy" && "bg-yellow-500",
                            member.status === "away" && "bg-orange-500",
                            member.status === "offline" && "bg-gray-500",
                            member.status === "vacation" && "bg-blue-500"
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{member.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className={cn("text-xs", roleInfo.color)}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleInfo.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", statusInfo.color)}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{member.performance}%</span>
                        <Progress value={member.performance} className="w-16 h-2" />
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{member.workload}%</span>
                        <Progress 
                          value={member.workload} 
                          className={cn(
                            "w-16 h-2",
                            member.workload > 90 && "[&>div]:bg-red-500",
                            member.workload > 75 && member.workload <= 90 && "[&>div]:bg-yellow-500",
                            member.workload <= 75 && "[&>div]:bg-green-500"
                          )}
                        />
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {member.lastActive.toLocaleString()}
                      </div>
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem>
                            <Calendar className="h-4 w-4 mr-2" />
                            View Schedule
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>

                          {canManageMembers && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Edit Profile
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem>
                                <Shield className="h-4 w-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                className="text-red-600 dark:text-red-400"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove Member
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>

        {filteredMembers.length === 0 && (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">No team members found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try adjusting your search or filters" : "Start by inviting team members"}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
} 