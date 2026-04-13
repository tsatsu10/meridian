import { API_BASE_URL } from "../../constants/urls";

const getExperience = async (userId?: string) => {
  const endpoint = userId 
    ? `${API_BASE_URL}/profile/${userId}/experience` 
    : `${API_BASE_URL}/profile/experience`;
  
  const response = await fetch(endpoint, {
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch experience");
  }
  
  const result = await response.json();
  return result.data || result; // Handle both new and old response formats
};

export const getExperienceKey = (userId?: string) => 
  userId ? `experience-${userId}` : "experience";

export default getExperience; 