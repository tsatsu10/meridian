import { API_BASE_URL } from "../../constants/urls";

const getConnections = async (userId?: string) => {
  const endpoint = userId 
    ? `${API_BASE_URL}/profile/${userId}/connections` 
    : `${API_BASE_URL}/profile/connections`;
  
  const response = await fetch(endpoint, {
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch connections");
  }
  
  const result = await response.json();
  return result.data || result; // Handle both new and old response formats
};

export const getConnectionsKey = (userId?: string) => 
  userId ? `connections-${userId}` : "connections";

export default getConnections; 