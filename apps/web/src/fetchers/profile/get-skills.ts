import { API_BASE_URL } from "../../constants/urls";

const getSkills = async (userId?: string) => {
  const endpoint = userId 
    ? `${API_BASE_URL}/profile/${userId}/skills` 
    : `${API_BASE_URL}/profile/skills`;
  
  const response = await fetch(endpoint, {
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch skills");
  }
  
  const result = await response.json();
  return result.data || result; // Handle both new and old response formats
};

export const getSkillsKey = (userId?: string) => 
  userId ? `skills-${userId}` : "skills";

export default getSkills; 