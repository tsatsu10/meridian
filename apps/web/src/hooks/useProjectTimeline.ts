// @epic-3.4-teams: Project timeline integration for team coordination
import { useMemo } from "react";
import useGetProjects from "./queries/project/use-get-projects";
import useWorkspaceStore from "@/store/workspace";

export interface TimelineEvent {
  id: string;
  title: string;
  type: 'milestone' | 'deadline' | 'sprint' | 'release' | 'dependency';
  date: string;
  endDate?: string;
  projectId: string;
  projectName: string;
  teamId?: string;
  teamName?: string;
  assignedMembers?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'at-risk' | 'completed' | 'overdue';
  progress: number; // 0-100
  dependencies?: string[]; // IDs of other events this depends on
  estimatedHours?: number;
  actualHours?: number;
  description?: string;
  color: string;
  impactedTeams?: string[]; // Teams affected by this event
}

export interface TeamImpact {
  teamId: string;
  teamName: string;
  currentWorkload: number; // percentage
  projectedWorkload: number; // with upcoming timeline events
  capacityRisk: 'low' | 'medium' | 'high'; // risk of exceeding capacity
  upcomingDeadlines: number;
  criticalPath: boolean; // is this team on the critical path
}

export interface ProjectTimelineData {
  projectId: string;
  projectName: string;
  events: TimelineEvent[];
  teams: TeamImpact[];
  criticalPath: TimelineEvent[];
  riskFactors: string[];
  estimatedCompletion: string;
  actualProgress: number;
}

// Sample timeline data - would come from API in real implementation
const sampleTimelineEvents: TimelineEvent[] = [
  {
    id: "1",
    title: "Sprint 1 Planning",
    type: "sprint",
    date: "2024-01-15",
    endDate: "2024-01-29",
    projectId: "1",
    projectName: "Web Application Redesign",
    teamId: "1",
    teamName: "Web Redesign Team",
    assignedMembers: ["Sarah Chen", "Mike Johnson", "Lisa Wang"],
    priority: "high",
    status: "in_progress",
    progress: 65,
    estimatedHours: 120,
    actualHours: 78,
    description: "Initial sprint for new user interface components",
    color: "bg-blue-500",
    impactedTeams: ["1"]
  },
  {
    id: "2",
    title: "UI Component Library",
    type: "milestone",
    date: "2024-01-25",
    projectId: "1",
    projectName: "Web Application Redesign",
    teamId: "1",
    teamName: "Web Redesign Team",
    assignedMembers: ["Lisa Wang", "Sarah Chen"],
    priority: "critical",
    status: "pending",
    progress: 30,
    dependencies: ["1"],
    estimatedHours: 80,
    description: "Complete reusable UI component library",
    color: "bg-purple-500",
    impactedTeams: ["1", "2"]
  },
  {
    id: "3",
    title: "Mobile App Beta Release",
    type: "release",
    date: "2024-02-01",
    projectId: "2",
    projectName: "Mobile App Development",
    teamId: "2",
    teamName: "Mobile Development Team",
    assignedMembers: ["David Kim", "Emma Davis"],
    priority: "high",
    status: "pending",
    progress: 85,
    estimatedHours: 160,
    actualHours: 145,
    description: "Beta version for internal testing",
    color: "bg-green-500",
    impactedTeams: ["2"]
  },
  {
    id: "4",
    title: "Cross-Platform Integration",
    type: "dependency",
    date: "2024-02-10",
    projectId: "1",
    projectName: "Web Application Redesign",
    teamId: "1",
    teamName: "Web Redesign Team",
    assignedMembers: ["Sarah Chen", "David Kim"],
    priority: "medium",
    status: "pending",
    progress: 0,
    dependencies: ["2", "3"],
    estimatedHours: 40,
    description: "Integrate web and mobile components",
    color: "bg-orange-500",
    impactedTeams: ["1", "2"]
  },
  {
    id: "5",
    title: "E-commerce Platform MVP",
    type: "deadline",
    date: "2024-02-15",
    projectId: "3",
    projectName: "E-commerce Platform",
    teamId: "3",
    teamName: "E-commerce Platform Team",
    assignedMembers: ["Jennifer Lee", "Alex Thompson"],
    priority: "critical",
    status: "at-risk",
    progress: 45,
    estimatedHours: 200,
    actualHours: 120,
    description: "Minimum viable product for client demo",
    color: "bg-red-500",
    impactedTeams: ["3"]
  }
];

export function useProjectTimeline(teams: any[] = []) {
  const { workspace } = useWorkspaceStore();
  const { data: projects } = useGetProjects({ 
    workspaceId: workspace?.id || "" 
  });

  const timelineData = useMemo(() => {
    if (!projects || teams.length === 0) return [];

    return projects.map(project => {
      // Filter events for this project
      const projectEvents = sampleTimelineEvents.filter(
        event => event.projectId === project.id
      );

      // Calculate team impacts
      const teamImpacts: TeamImpact[] = teams.map(team => {
        const teamEvents = projectEvents.filter(
          event => event.impactedTeams?.includes(team.id)
        );

        const upcomingDeadlines = teamEvents.filter(
          event => new Date(event.date) > new Date() && 
                   (event.type === 'deadline' || event.type === 'milestone')
        ).length;

        // Calculate projected workload based on upcoming events
        const upcomingHours = teamEvents
          .filter(event => new Date(event.date) > new Date())
          .reduce((total, event) => total + (event.estimatedHours || 0), 0);

        const projectedWorkload = Math.min(
          team.workload + (upcomingHours / 40) * 10, // Assume 40 hours per week
          100
        );

        // Determine capacity risk
        const capacityRisk: 'low' | 'medium' | 'high' = 
          projectedWorkload > 90 ? 'high' :
          projectedWorkload > 75 ? 'medium' : 'low';

        // Check if team is on critical path
        const criticalPath = teamEvents.some(
          event => event.priority === 'critical' || 
                   event.dependencies && event.dependencies.length > 0
        );

        return {
          teamId: team.id,
          teamName: team.name,
          currentWorkload: team.workload,
          projectedWorkload,
          capacityRisk,
          upcomingDeadlines,
          criticalPath
        };
      });

      // Calculate critical path events
      const criticalPath = projectEvents.filter(
        event => event.priority === 'critical' || 
                 event.dependencies && event.dependencies.length > 0
      );

      // Identify risk factors
      const riskFactors: string[] = [];
      
      const overCapacityTeams = teamImpacts.filter(t => t.capacityRisk === 'high');
      if (overCapacityTeams.length > 0) {
        riskFactors.push(`${overCapacityTeams.length} team(s) over capacity`);
      }

      const atRiskEvents = projectEvents.filter(e => e.status === 'at-risk');
      if (atRiskEvents.length > 0) {
        riskFactors.push(`${atRiskEvents.length} event(s) at risk`);
      }

      const overdueEvents = projectEvents.filter(e => e.status === 'overdue');
      if (overdueEvents.length > 0) {
        riskFactors.push(`${overdueEvents.length} overdue event(s)`);
      }

      // Calculate overall project progress
      const totalProgress = projectEvents.reduce((sum, event) => sum + event.progress, 0);
      const actualProgress = projectEvents.length > 0 ? totalProgress / projectEvents.length : 0;

      // Estimate completion date based on current progress
      const completedEvents = projectEvents.filter(e => e.status === 'completed').length;
      const totalEvents = projectEvents.length;
      const progressRatio = totalEvents > 0 ? completedEvents / totalEvents : 0;
      
      // Simple estimation - would be more sophisticated in real implementation
      const estimatedDaysRemaining = Math.ceil((1 - progressRatio) * 30); // Assume 30 days base
      const estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDaysRemaining);

      return {
        projectId: project.id,
        projectName: project.name,
        events: projectEvents,
        teams: teamImpacts,
        criticalPath,
        riskFactors,
        estimatedCompletion: estimatedCompletion.toISOString().split('T')[0],
        actualProgress
      };
    });
  }, [projects, teams]);

  const getEventsForDateRange = useMemo(() => {
    return (startDate: string, endDate: string, teamId?: string) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return sampleTimelineEvents.filter(event => {
        const eventDate = new Date(event.date);
        const inDateRange = eventDate >= start && eventDate <= end;
        const matchesTeam = !teamId || event.impactedTeams?.includes(teamId);
        
        return inDateRange && matchesTeam;
      });
    };
  }, []);

  const getTeamWorkloadForecast = useMemo(() => {
    return (teamId: string, days: number = 30) => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      
      const upcomingEvents = sampleTimelineEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate <= endDate && 
               eventDate >= new Date() &&
               event.impactedTeams?.includes(teamId);
      });

      // Calculate weekly workload distribution
      const weeklyForecast = [];
      for (let week = 0; week < Math.ceil(days / 7); week++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() + (week * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekEvents = upcomingEvents.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= weekStart && eventDate <= weekEnd;
        });

        const weeklyHours = weekEvents.reduce(
          (total, event) => total + (event.estimatedHours || 0), 0
        );

        weeklyForecast.push({
          week: week + 1,
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
          estimatedHours: weeklyHours,
          events: weekEvents.length,
          workloadPercentage: Math.min((weeklyHours / 40) * 100, 100) // 40 hours = 100%
        });
      }

      return weeklyForecast;
    };
  }, []);

  return {
    timelineData,
    getEventsForDateRange,
    getTeamWorkloadForecast,
    allEvents: sampleTimelineEvents
  };
} 