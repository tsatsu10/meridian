import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/consolidated/auth';
import {
  getProfile,
  getExperience,
  getEducation,
  getSkills,
  getConnections,
  getProfileKey,
  getExperienceKey,
  getEducationKey,
  getSkillsKey,
  getConnectionsKey,
} from '@/fetchers/profile';

/**
 * Custom hook to fetch all profile-related data
 * Centralizes data fetching logic and provides consistent error handling
 * 
 * @returns Object containing all profile data and loading states
 * 
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const { profile, experience, education, isLoading } = useProfileData();
 *   
 *   if (isLoading) return <ProfilePageSkeleton />;
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useProfileData() {
  const { user } = useAuthStore();

  // Profile data
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: [getProfileKey()],
    queryFn: () => getProfile(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Experience data
  const {
    data: experienceData,
    isLoading: experienceLoading,
    error: experienceError,
    refetch: refetchExperience,
  } = useQuery({
    queryKey: [getExperienceKey()],
    queryFn: () => getExperience(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Education data
  const {
    data: educationData,
    isLoading: educationLoading,
    error: educationError,
    refetch: refetchEducation,
  } = useQuery({
    queryKey: [getEducationKey()],
    queryFn: () => getEducation(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Skills data
  const {
    data: skillsData,
    isLoading: skillsLoading,
    error: skillsError,
    refetch: refetchSkills,
  } = useQuery({
    queryKey: [getSkillsKey()],
    queryFn: () => getSkills(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Connections data
  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    error: connectionsError,
    refetch: refetchConnections,
  } = useQuery({
    queryKey: [getConnectionsKey()],
    queryFn: () => getConnections(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Combined loading state
  const isLoading =
    profileLoading ||
    experienceLoading ||
    educationLoading ||
    skillsLoading ||
    connectionsLoading;

  // Combined error state
  const hasError =
    profileError ||
    experienceError ||
    educationError ||
    skillsError ||
    connectionsError;

  // Refetch all data
  const refetchAll = () => {
    refetchProfile();
    refetchExperience();
    refetchEducation();
    refetchSkills();
    refetchConnections();
  };

  return {
    // Data
    profile: profileData,
    experience: experienceData || [],
    education: educationData || [],
    skills: skillsData || [],
    connections: connectionsData || [],

    // Loading states
    isLoading,
    profileLoading,
    experienceLoading,
    educationLoading,
    skillsLoading,
    connectionsLoading,

    // Errors
    hasError,
    profileError,
    experienceError,
    educationError,
    skillsError,
    connectionsError,

    // Refetch functions
    refetchAll,
    refetchProfile,
    refetchExperience,
    refetchEducation,
    refetchSkills,
    refetchConnections,
  };
}

export default useProfileData;

