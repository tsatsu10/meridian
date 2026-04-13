import { API_BASE_URL } from "../../constants/urls";

const me = async () => {
  // Get session token from localStorage (fallback for cross-port development)
  const sessionToken = localStorage.getItem('sessionToken');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // If we have a session token in localStorage, send it as a header
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    credentials: "include", // Still try to send cookies
    headers,
  });
  // Unauthenticated is a valid state (e.g. on sign-in / sign-up pages).
  if (response.status === 401 || response.status === 403) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch user (HTTP ${response.status})`);
  }
  const data = await response.json();
  return data;
};

export const meKey = "me";

export default me;
