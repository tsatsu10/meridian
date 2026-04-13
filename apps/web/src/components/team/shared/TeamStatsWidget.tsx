import React from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, Clock, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import { WorkspaceStats } from '@/types/unified-team';
import { cn } from '@/lib/utils';

interface TeamStatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  index?: number;
}

interface TeamStatsWidgetProps {
  stats: WorkspaceStats | null;
  isLoading?: boolean;
  showTrends?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

const TeamStatCard: React.FC<TeamStatCardProps> = ({ 
  label, 
  value, 
  icon, 
  color, 
  trend, 
  index = 0 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1 }}
      className="text-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
      whileHover={{ scale: 1.02 }}
    >
      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${color} mb-3`}>
        {icon}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {value.toLocaleString()}
          </p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.direction === 'up' ? "text-green-600" : "text-red-600"
            )}>
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </motion.div>
  );
};

const LoadingSkeleton: React.FC<{ variant: string }> = ({ variant }) => {
  const isCompact = variant === 'compact';
  const cardCount = isCompact ? 2 : 4;
  
  return (
    <div className={cn(
      "grid gap-4",
      isCompact ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-4"
    )}>
      {Array.from({ length: cardCount }).map((_, i) => (
        <div
          key={i}
          className="text-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse"
        >
          <div className="w-12 h-12 bg-gray-200 rounded-xl mx-auto mb-3"></div>
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
        </div>
      ))}
    </div>
  );
};

export const TeamStatsWidget: React.FC<TeamStatsWidgetProps> = ({
  stats,
  isLoading = false,
  showTrends = false,
  variant = 'default',
  className
}) => {
  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';

  if (isLoading) {
    return (
      <div className={cn("bg-white border border-gray-200 shadow-sm rounded-2xl p-6", className)}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Team Overview
            </h3>
            <p className="text-sm text-gray-500">Loading team statistics...</p>
          </div>
        </div>
        <LoadingSkeleton variant={variant} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={cn("bg-white border border-gray-200 shadow-sm rounded-2xl p-6", className)}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Team Overview
            </h3>
            <p className="text-sm text-gray-500">No team data available</p>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          No team statistics available
        </div>
      </div>
    );
  }

  // Calculate admin count (workspace managers, department heads, project managers)
  const adminCount = (stats.roleDistribution?.['workspace-manager'] || 0) +
                    (stats.roleDistribution?.['department-head'] || 0) +
                    (stats.roleDistribution?.['project-manager'] || 0);

  const statCards = [
    {
      label: "Total Members",
      value: stats.totalMembers,
      icon: <Users className="h-6 w-6 text-white" />,
      color: "from-blue-500 to-cyan-500",
      trend: showTrends ? { value: 12, direction: 'up' as const } : undefined
    },
    {
      label: "Active",
      value: stats.activeMembers,
      icon: <UserCheck className="h-6 w-6 text-white" />,
      color: "from-green-500 to-emerald-500",
      trend: showTrends ? { value: 5, direction: 'up' as const } : undefined
    },
    {
      label: "Pending",
      value: stats.pendingInvites,
      icon: <Clock className="h-6 w-6 text-white" />,
      color: "from-yellow-500 to-orange-500",
      trend: showTrends ? { value: 2, direction: 'down' as const } : undefined
    },
    {
      label: "Admins",
      value: adminCount,
      icon: <Shield className="h-6 w-6 text-white" />,
      color: "from-purple-500 to-pink-500"
    }
  ];

  // For compact variant, show only first 2 stats
  const displayedStats = isCompact ? statCards.slice(0, 2) : statCards;

  return (
    <div className={cn("bg-white border border-gray-200 shadow-sm rounded-2xl p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Team Overview
          </h3>
          <p className="text-sm text-gray-500">
            {stats.totalMembers === 0 
              ? "No team members yet" 
              : `${stats.totalMembers} team member${stats.totalMembers === 1 ? '' : 's'} total`
            }
          </p>
        </div>
      </div>

      <div className={cn(
        "grid gap-4",
        isCompact ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-4"
      )}>
        {displayedStats.map((stat, index) => (
          <TeamStatCard
            key={stat.label}
            {...stat}
            index={index}
          />
        ))}
      </div>

      {/* Detailed View Additional Info */}
      {isDetailed && stats.roleDistribution && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
            Role Distribution
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.roleDistribution).map(([role, count]) => (
              <div key={role} className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-slate-900">{count}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {role.replace('-', ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics for Detailed View */}
      {isDetailed && stats.averagePerformance && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-600">
                {stats.averagePerformance.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">Avg Performance</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-600">
                {stats.averageWorkload?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-500">Avg Workload</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-lg font-bold text-purple-600">
                {stats.teamsCount || 0}
              </p>
              <p className="text-xs text-gray-500">Active Teams</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};