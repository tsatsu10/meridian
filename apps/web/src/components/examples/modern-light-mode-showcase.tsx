// @epic-3.5-communication: Modern light mode showcase inspired by Behance shipment dashboard
// @persona-jennifer: Executive dashboard with sophisticated light mode design
// @persona-sarah: PM dashboard with clean, professional appearance
// @persona-david: Analytics dashboard with modern card system

import React from "react";
import { cn } from "@/lib/utils";
import { MeridianCard } from "../ui/meridian-card";
import { MeridianButton } from "../ui/meridian-button";
import { MeridianBadge } from "../ui/meridian-badge";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  ArrowUpRight,
  Filter,
  MoreHorizontal,
  Plus,
  Download
} from "lucide-react";

export const ModernLightModeShowcase = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-meridian-neutral-900 mb-2">
              Enhanced Light Mode Dashboard
            </h1>
            <p className="text-medium text-lg">
              Modern, clean interface inspired by contemporary dashboard design trends
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MeridianButton variant="outline" size="sm" leftIcon={<Filter className="h-4 w-4" />}>
              Filter
            </MeridianButton>
            <MeridianButton variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </MeridianButton>
            <MeridianButton variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              New Project
            </MeridianButton>
          </div>
        </div>
        
        {/* Stats Grid - Inspired by Behance dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              title: "Active Projects", 
              value: "24", 
              change: "+12%", 
              trend: "up",
              icon: BarChart3,
              color: "primary"
            },
            { 
              title: "Team Members", 
              value: "156", 
              change: "+8%", 
              trend: "up",
              icon: Users,
              color: "success"
            },
            { 
              title: "Completed Tasks", 
              value: "1,247", 
              change: "+23%", 
              trend: "up",
              icon: TrendingUp,
              color: "warning"
            },
            { 
              title: "Upcoming Deadlines", 
              value: "18", 
              change: "-5%", 
              trend: "down",
              icon: Calendar,
              color: "error"
            }
          ].map((stat, index) => (
            <div key={index} className="card-modern p-6 group hover:shadow-colored-primary">
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-lg",
                  stat.color === 'primary' && "bg-meridian-primary-100 text-meridian-primary-700",
                  stat.color === 'success' && "bg-meridian-success-100 text-meridian-success-700", 
                  stat.color === 'warning' && "bg-meridian-warning-100 text-meridian-warning-700",
                  stat.color === 'error' && "bg-meridian-error-100 text-meridian-error-700"
                )}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-soft group-hover:text-meridian-primary-600 transition-colors" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-meridian-neutral-900 mb-1">
                  {stat.value}
                </h3>
                <p className="text-soft text-sm mb-2">{stat.title}</p>
                <div className="flex items-center gap-2">
                  <MeridianBadge 
                    variant={stat.trend === 'up' ? 'success' : 'error'}
                    size="sm"
                  >
                    {stat.change}
                  </MeridianBadge>
                  <span className="text-xs text-soft">vs last month</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Charts & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Card - Modern elevated style */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-strong">Project Performance</h3>
              <div className="flex items-center gap-2">
                <MeridianButton variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </MeridianButton>
              </div>
            </div>
            
            {/* Simulated Chart Area */}
            <div className="h-64 bg-gradient-accent rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-meridian-primary-400 mx-auto mb-3" />
                <p className="text-medium">Interactive chart would go here</p>
                <p className="text-soft text-sm">Showing performance trends and analytics</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-soft">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-meridian-primary-500"></div>
                  <span className="text-sm text-medium">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-meridian-warning-500"></div>
                  <span className="text-sm text-medium">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-meridian-neutral-300"></div>
                  <span className="text-sm text-medium">Pending</span>
                </div>
              </div>
              <MeridianButton variant="ghost" size="sm">
                View Details
              </MeridianButton>
            </div>
          </div>

          {/* Activity Feed - Glass morphism style */}
          <div className="card-glass p-6">
            <h3 className="text-xl font-semibold text-strong mb-6">Recent Activity</h3>
            
            <div className="space-y-4">
              {[
                { user: "Sarah Chen", action: "completed task", item: "Design Review", time: "2 min ago" },
                { user: "Mike Johnson", action: "created", item: "New Sprint", time: "15 min ago" },
                { user: "Lisa Wong", action: "updated", item: "Project Timeline", time: "1 hour ago" },
                { user: "David Kim", action: "commented on", item: "API Documentation", time: "2 hours ago" },
              ].map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-accent transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-medium">
                    {activity.user.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium text-strong">{activity.user}</span>
                      <span className="text-medium"> {activity.action} </span>
                      <span className="font-medium text-meridian-primary-600">{activity.item}</span>
                    </p>
                    <p className="text-xs text-soft mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar Content */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card-modern p-6">
            <h3 className="text-lg font-semibold text-strong mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: "Create New Task", icon: Plus, color: "primary" },
                { label: "Schedule Meeting", icon: Calendar, color: "success" },
                { label: "Generate Report", icon: BarChart3, color: "warning" },
                { label: "Invite Team Member", icon: Users, color: "primary" },
              ].map((action, index) => (
                <MeridianButton
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  leftIcon={<action.icon className="h-4 w-4" />}
                >
                  {action.label}
                </MeridianButton>
              ))}
            </div>
          </div>

          {/* Team Overview */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-strong">Team Status</h3>
              <MeridianBadge variant="success" size="sm">5 Online</MeridianBadge>
            </div>
            
            <div className="space-y-3">
              {[
                { name: "Sarah Chen", role: "Product Manager", status: "online", avatar: "SC" },
                { name: "Mike Johnson", role: "Developer", status: "busy", avatar: "MJ" },
                { name: "Lisa Wong", role: "Designer", status: "online", avatar: "LW" },
                { name: "David Kim", role: "Team Lead", status: "away", avatar: "DK" },
              ].map((member, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-accent transition-colors">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-medium">
                      {member.avatar}
                    </div>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                      member.status === 'online' && "bg-meridian-success-500",
                      member.status === 'busy' && "bg-meridian-error-500", 
                      member.status === 'away' && "bg-meridian-warning-500"
                    )}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-strong truncate">{member.name}</p>
                    <p className="text-xs text-soft truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="card-modern p-6">
            <h3 className="text-lg font-semibold text-strong mb-4">Notifications</h3>
            <div className="space-y-3">
              {[
                { type: "info", message: "New project template available", time: "5 min ago" },
                { type: "warning", message: "Sprint deadline approaching", time: "1 hour ago" },
                { type: "success", message: "Code review completed", time: "3 hours ago" },
              ].map((notification, index) => (
                <div key={index} className="p-3 rounded-lg bg-surface-accent border-l-4 border-meridian-primary-400">
                  <p className="text-sm text-strong">{notification.message}</p>
                  <p className="text-xs text-soft mt-1">{notification.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-20">
        <svg
          className="absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="modern-grid"
              width="64"
              height="64"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M.5 64V.5H64"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-meridian-primary-200"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#modern-grid)" />
        </svg>
      </div>
    </div>
  );
};

export default ModernLightModeShowcase; 