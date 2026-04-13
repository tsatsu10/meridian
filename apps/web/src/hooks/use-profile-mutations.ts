import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  updateProfile,
  uploadProfilePicture,
  createExperience,
  updateExperience,
  deleteExperience,
  createEducation,
  updateEducation,
  deleteEducation,
  createSkill,
  updateSkill,
  deleteSkill,
  createConnection,
  updateConnection,
  deleteConnection,
  getProfileKey,
  getExperienceKey,
  getEducationKey,
  getSkillsKey,
  getConnectionsKey,
} from '@/fetchers/profile';
import type {
  ProfileData,
  ExperienceData,
  EducationData,
  SkillData,
  ConnectionData,
} from '@/fetchers/profile/profile-mutations';

/**
 * Custom hook for all profile-related mutations
 * Centralizes mutation logic with optimistic updates and error handling
 * 
 * @returns Object containing all mutation functions and their states
 * 
 * @example
 * ```tsx
 * function ProfileForm() {
 *   const { updateProfileMutation, addExperience } = useProfileMutations();
 *   
 *   const handleSubmit = (data) => {
 *     updateProfileMutation.mutate(data);
 *   };
 *   
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useProfileMutations() {
  const queryClient = useQueryClient();

  // Profile mutations
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileData) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getProfileKey()] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const uploadPictureMutation = useMutation({
    mutationFn: (file: File) => uploadProfilePicture(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getProfileKey()] });
      toast.success('Profile picture updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload picture: ${error.message}`);
    },
  });

  // Experience mutations
  const addExperience = useMutation({
    mutationFn: (data: ExperienceData) => createExperience(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getExperienceKey()] });
      toast.success('Experience added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add experience: ${error.message}`);
    },
  });

  const editExperience = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExperienceData }) =>
      updateExperience(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getExperienceKey()] });
      toast.success('Experience updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update experience: ${error.message}`);
    },
  });

  const removeExperience = useMutation({
    mutationFn: (id: string) => deleteExperience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getExperienceKey()] });
      toast.success('Experience deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete experience: ${error.message}`);
    },
  });

  // Education mutations
  const addEducation = useMutation({
    mutationFn: (data: EducationData) => createEducation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getEducationKey()] });
      toast.success('Education added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add education: ${error.message}`);
    },
  });

  const editEducation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EducationData }) =>
      updateEducation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getEducationKey()] });
      toast.success('Education updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update education: ${error.message}`);
    },
  });

  const removeEducation = useMutation({
    mutationFn: (id: string) => deleteEducation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getEducationKey()] });
      toast.success('Education deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete education: ${error.message}`);
    },
  });

  // Skills mutations
  const addSkill = useMutation({
    mutationFn: (data: SkillData) => createSkill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getSkillsKey()] });
      toast.success('Skill added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add skill: ${error.message}`);
    },
  });

  const editSkill = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SkillData }) =>
      updateSkill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getSkillsKey()] });
      toast.success('Skill updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update skill: ${error.message}`);
    },
  });

  const removeSkill = useMutation({
    mutationFn: (id: string) => deleteSkill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getSkillsKey()] });
      toast.success('Skill deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete skill: ${error.message}`);
    },
  });

  // Connection mutations
  const addConnection = useMutation({
    mutationFn: (data: ConnectionData) => createConnection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getConnectionsKey()] });
      toast.success('Connection request sent');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send connection request: ${error.message}`);
    },
  });

  const editConnection = useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: 'pending' | 'accepted' | 'blocked';
      note?: string;
    }) => updateConnection(id, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getConnectionsKey()] });
      toast.success('Connection updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update connection: ${error.message}`);
    },
  });

  const removeConnection = useMutation({
    mutationFn: (id: string) => deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getConnectionsKey()] });
      toast.success('Connection removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove connection: ${error.message}`);
    },
  });

  return {
    // Profile
    updateProfileMutation,
    uploadPictureMutation,

    // Experience
    addExperience,
    editExperience,
    removeExperience,

    // Education
    addEducation,
    editEducation,
    removeEducation,

    // Skills
    addSkill,
    editSkill,
    removeSkill,

    // Connections
    addConnection,
    editConnection,
    removeConnection,
  };
}

export default useProfileMutations;

