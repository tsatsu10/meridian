/**
 * 🎯 Goal Setting API - TypeScript Types
 * 
 * Shared types and interfaces for the Goal Setting system
 */

export interface CreateGoalRequest {
  title: string;
  description?: string;
  type: 'objective' | 'personal' | 'team' | 'strategic';
  timeframe: string;
  startDate?: string;
  endDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  privacy?: 'private' | 'team' | 'organization';
  parentGoalId?: string;
}

export interface UpdateGoalRequest extends Partial<CreateGoalRequest> {
  status?: 'draft' | 'active' | 'completed' | 'abandoned';
  progress?: number;
}

export interface GoalFilters {
  status?: string;
  type?: string;
  userId?: string;
  privacy?: string;
}

export interface CreateKeyResultRequest {
  title: string;
  description?: string;
  targetValue: number;
  currentValue?: number;
  unit: '%' | 'count' | 'currency' | 'hours' | 'custom';
  dueDate?: string;
}

export interface UpdateKeyResultRequest extends Partial<CreateKeyResultRequest> {
  status?: 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed';
}

export interface LogProgressRequest {
  goalId?: string;
  keyResultId?: string;
  value: number;
  note?: string;
}


