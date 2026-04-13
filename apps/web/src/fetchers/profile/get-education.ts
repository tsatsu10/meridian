import { API_BASE_URL } from "../../constants/urls";

const getEducation = async (userId?: string) => {
  const endpoint = userId 
    ? `${API_BASE_URL}/profile/${userId}/education` 
    : `${API_BASE_URL}/profile/education`;
  
  const response = await fetch(endpoint, {
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch education");
  }
  
  const result = await response.json();
  return result.data || result; // Handle both new and old response formats
};

export const getEducationKey = (userId?: string) => 
  userId ? `education-${userId}` : "education";

export default getEducation; 