import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth';
import { API_BASE_URL } from '@/constants/urls';
import { toast } from 'sonner';

export interface Skill {
  id: string;
  userEmail: string;
  skillName: string;
  proficiencyLevel: number; // 1-5
  yearsOfExperience?: number;
  isVerified: boolean;
  endorsedBy: string[];
  lastUsed?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SkillWithUser extends Skill {
  userName?: string;
  userAvatar?: string;
}

export function useSkills(userEmail?: string) {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch user skills
  const fetchSkills = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/skills/user/${email}`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success) {
        setSkills(data.data.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
          lastUsed: s.lastUsed ? new Date(s.lastUsed) : undefined,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initial fetch
  useEffect(() => {
    if (userEmail) {
      fetchSkills(userEmail);
    }
  }, [userEmail, fetchSkills]);
  
  // Add skill
  const addSkill = useCallback(async (
    skillName: string,
    proficiencyLevel: number,
    yearsOfExperience?: number
  ) => {
    try {
      const res = await fetch(`${API_BASE_URL}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          skillName,
          proficiencyLevel,
          yearsOfExperience,
        }),
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to add skill');
      }
      
      toast.success('Skill added successfully!');
      
      // Refresh skills
      if (user?.email) {
        await fetchSkills(user.email);
      }
      
      return data.data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add skill');
      throw error;
    }
  }, [user?.email, fetchSkills]);
  
  // Search skills
  const searchSkills = useCallback(async (query: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/skills/search?q=${encodeURIComponent(query)}&limit=50`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success) {
        return data.data as SkillWithUser[];
      }
      return [];
    } catch (error) {
      console.error('Failed to search skills:', error);
      return [];
    }
  }, []);
  
  // Endorse skill
  const endorseSkill = useCallback(async (skillId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/skills/endorse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ skillId }),
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to endorse skill');
      }
      
      toast.success('Skill endorsed!');
      
      // Refresh skills
      if (userEmail) {
        await fetchSkills(userEmail);
      }
      
      return data.data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to endorse skill');
      throw error;
    }
  }, [userEmail, fetchSkills]);
  
  // Delete skill
  const deleteSkill = useCallback(async (skillId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/skills/${skillId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete skill');
      }
      
      toast.success('Skill deleted');
      
      // Refresh skills
      if (user?.email) {
        await fetchSkills(user.email);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete skill');
      throw error;
    }
  }, [user?.email, fetchSkills]);
  
  return {
    skills,
    loading,
    addSkill,
    searchSkills,
    endorseSkill,
    deleteSkill,
    refetch: () => {
      if (userEmail) {
        fetchSkills(userEmail);
      }
    },
  };
}

