import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// @epic-1.3-milestones: Team Leads and Admins need milestone tracking
// @epic-2.1-dashboard: Milestone persistence across browser sessions
// @role-team-lead @role-admin: Project oversight requires reliable milestone storage

interface MilestoneTask {
  id: string;
  title: string;
  date: string;
  status: "upcoming" | "achieved" | "missed";
  description: string;
  type: "milestone";
  dependencies: string[];
  milestoneType: "phase_completion" | "deliverable" | "approval" | "deadline";
  stakeholders: string[];
  successCriteria: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'meridian_milestones';

export function useMilestones(projectId?: string) {
  const [milestones, setMilestones] = useState<MilestoneTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load milestones from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allMilestones: MilestoneTask[] = JSON.parse(stored);
        setMilestones(allMilestones);
      }
    } catch (error) {
      console.error('Failed to load milestones from storage:', error);
      toast.error('Failed to load saved milestones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save milestones to localStorage whenever they change
  const saveMilestones = (updatedMilestones: MilestoneTask[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMilestones));
      setMilestones(updatedMilestones);
    } catch (error) {
      console.error('Failed to save milestones to storage:', error);
      toast.error('Failed to save milestone changes');
    }
  };

  // Get milestones for a specific project
  const getProjectMilestones = (targetProjectId: string) => {
    return milestones.filter(milestone => milestone.projectId === targetProjectId);
  };

  // Create a new milestone
  const createMilestone = (milestoneData: Omit<MilestoneTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newMilestone: MilestoneTask = {
      ...milestoneData,
      id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    const updatedMilestones = [...milestones, newMilestone];
    saveMilestones(updatedMilestones);
    
    return newMilestone;
  };

  // Update an existing milestone
  const updateMilestone = (milestoneId: string, updates: Partial<MilestoneTask>) => {
    const milestoneIndex = milestones.findIndex(m => m.id === milestoneId);
    if (milestoneIndex === -1) {
      toast.error('Milestone not found');
      return null;
    }

    const updatedMilestone = {
      ...milestones[milestoneIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedMilestones = [...milestones];
    updatedMilestones[milestoneIndex] = updatedMilestone;
    saveMilestones(updatedMilestones);

    return updatedMilestone;
  };

  // Delete a milestone
  const deleteMilestone = (milestoneId: string) => {
    const updatedMilestones = milestones.filter(m => m.id !== milestoneId);
    saveMilestones(updatedMilestones);
  };

  // Get filtered milestones based on projectId if provided
  const filteredMilestones = projectId 
    ? getProjectMilestones(projectId) 
    : milestones;

  // Calculate milestone statistics
  const stats = {
    total: filteredMilestones.length,
    upcoming: filteredMilestones.filter(m => m.status === 'upcoming').length,
    achieved: filteredMilestones.filter(m => m.status === 'achieved').length,
    missed: filteredMilestones.filter(m => m.status === 'missed').length,
    highRisk: filteredMilestones.filter(m => m.riskLevel === 'high' || m.riskLevel === 'critical').length,
    dueSoon: filteredMilestones.filter(m => {
      const dueDate = new Date(m.date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 7 && daysUntilDue > 0 && m.status === 'upcoming';
    }).length,
  };

  return {
    milestones: filteredMilestones,
    allMilestones: milestones,
    isLoading,
    stats,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    getProjectMilestones,
  };
} 