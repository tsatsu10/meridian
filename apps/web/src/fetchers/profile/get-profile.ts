import { API_BASE_URL } from "../../constants/urls";

const getProfile = async (userId?: string) => {
  const endpoint = userId ? `${API_BASE_URL}/profile/${userId}` : `${API_BASE_URL}/profile`;
  
  const response = await fetch(endpoint, {
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }
  
  const result = await response.json();
  return result.data || result; // Handle both new and old response formats
};

export const getProfileKey = (userId?: string) => 
  userId ? `profile-${userId}` : "profile";

export default getProfile; 