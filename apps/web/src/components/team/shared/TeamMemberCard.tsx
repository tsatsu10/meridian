import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Crown, 
  Shield, 
  Settings, 
  Users, 
  UserCheck, 
  User, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Mail,
  UserMinus,
  MoreHorizontal
} from 'lucide-react';
import { UnifiedTeamMember, TeamRole } from '@/types/unified-team';
import { cn } from '@/lib/utils';
import { getAvatarSrc, getUserInitials } from '@/utils/avatar-utils';

interface TeamMemberCardProps {
  member: UnifiedTeamMember;
  onRoleChange?: (memberId: string, newRole: TeamRole) => void;
  onRemoveMember?: (memberId: string) => void;
  onResendInvite?: (email: string) => void;
  showActions?: boolean;
  showPerformance?: boolean;
  showWorkload?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

const getRoleIcon = (role: TeamRole) => {
  switch (role) {
    case "workspace-manager": return <Crown className="h-4 w-4 text-yellow-500" />;
    case "department-head": return <Shield className="h-4 w-4 text-blue-500" />;
    case "project-manager": return <Settings className="h-4 w-4 text-purple-500" />;
    case "team-lead": return <Users className="h-4 w-4 text-green-500" />;
    case "member": return <UserCheck className="h-4 w-4 text-green-500" />;
    case "client": return <User className="h-4 w-4 text-blue-400" />;
    case "contractor": return <Settings className="h-4 w-4 text-orange-500" />;
    case "stakeholder": return <User className="h-4 w-4 text-purple-400" />;
    case "workspace-viewer": return <User className="h-4 w-4 text-gray-500" />;
    case "project-viewer": return <User className="h-4 w-4 text-gray-500" />;
    case "guest": return <User className="h-4 w-4 text-gray-400" />;
    default: return <User className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active": return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
    case "inactive": return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default: return null;
  }
};

const getRoleColor = (role: TeamRole) => {
  switch (role) {
    case "workspace-manager": return "from-yellow-500 to-orange-500";
    case "department-head": return "from-blue-500 to-indigo-500";
    case "project-manager": return "from-purple-500 to-pink-500";
    case "team-lead": return "from-green-500 to-emerald-500";
    case "member": return "from-green-500 to-emerald-500";
    case "client": return "from-blue-400 to-blue-600";
    case "contractor": return "from-orange-500 to-red-500";
    case "stakeholder": return "from-purple-400 to-purple-600";
    case "workspace-viewer": return "from-gray-500 to-slate-500";
    case "project-viewer": return "from-gray-500 to-slate-500";
    case "guest": return "from-gray-400 to-gray-600";
    default: return "from-gray-500 to-slate-500";
  }
};

const getPerformanceColor = (score: number) => {
  if (score >= 90) return "text-green-600 bg-green-50";
  if (score >= 75) return "text-blue-600 bg-blue-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
};

const getWorkloadColor = (load: number) => {
  if (load >= 90) return "text-red-600 bg-red-50";
  if (load >= 75) return "text-orange-600 bg-orange-50";
  if (load >= 50) return "text-blue-600 bg-blue-50";
  return "text-green-600 bg-green-50";
};

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onRoleChange,
  onRemoveMember,
  onResendInvite,
  showActions = true,
  showPerformance = false,
  showWorkload = false,
  variant = 'default',
  className
}) => {
  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm",
        isCompact && "p-3",
        isDetailed && "p-6",
        className
      )}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-center gap-4">
        <Avatar className={cn("h-12 w-12", isCompact && "h-10 w-10", isDetailed && "h-16 w-16")}>
          <AvatarImage src={getAvatarSrc(member)} alt={member.name} />
          <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
            {getUserInitials(member)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {member.name}
            </p>
            {getStatusIcon(member.membershipStatus)}
          </div>
          
          <p className="text-sm text-gray-500">
            {member.email}
          </p>
          
          {!isCompact && (
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Last active: {member.lastActive}
            </p>
          )}
          
          {isDetailed && member.teamMemberships.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1">Teams:</p>
              <div className="flex flex-wrap gap-1">
                {member.teamMemberships.slice(0, 3).map((tm) => (
                  <Badge key={tm.teamId} variant="outline" className="text-xs">
                    {tm.teamName}
                  </Badge>
                ))}
                {member.teamMemberships.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{member.teamMemberships.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Performance & Workload Metrics */}
        {(showPerformance || showWorkload) && !isCompact && (
          <div className="text-right space-y-1">
            {showPerformance && (
              <div className={cn(
                "px-2 py-1 rounded-md text-xs font-medium",
                getPerformanceColor(member.performance.performanceScore)
              )}>
                {member.performance.performanceScore}% Performance
              </div>
            )}
            {showWorkload && (
              <div className={cn(
                "px-2 py-1 rounded-md text-xs font-medium",
                getWorkloadColor(member.workload.currentLoad)
              )}>
                {member.workload.currentLoad}% Workload
              </div>
            )}
          </div>
        )}

        {/* Role Badge */}
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end mb-1">
            {getRoleIcon(member.role)}
            <Badge 
              variant="secondary"
              className={cn(
                "bg-gradient-to-r text-white border-0",
                getRoleColor(member.role),
                isCompact && "text-xs px-2 py-0"
              )}
            >
              {member.role}
            </Badge>
          </div>
          {!isCompact && (
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-1">
            {member.membershipStatus === "pending" && onResendInvite && (
              <Button
                onClick={() => onResendInvite(member.email)}
                size="sm"
                variant="ghost"
                className="p-2"
                title="Resend Invitation"
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
            
            {member.role !== "workspace-manager" && onRoleChange && (
              <Select
                value={member.role}
                onValueChange={(newRole: TeamRole) => onRoleChange(member.id, newRole)}
              >
                <SelectTrigger className="w-auto h-8 text-xs border-0 bg-transparent">
                  <Settings className="h-3 w-3" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace-viewer">Workspace Viewer</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="team-lead">Team Lead</SelectItem>
                  <SelectItem value="project-manager">Project Manager</SelectItem>
                  <SelectItem value="department-head">Department Head</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {member.role !== "workspace-manager" && onRemoveMember && (
              <Button
                onClick={() => onRemoveMember(member.id)}
                size="sm"
                variant="ghost"
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Remove Member"
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};