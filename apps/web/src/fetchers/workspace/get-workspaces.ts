import { API_BASE_URL } from "../../constants/urls";

const getWorkspaces = async () => {
  const sessionToken = localStorage.getItem("sessionToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/workspaces`, {
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const workspaces = await response.json();

  return workspaces;
};

export default getWorkspaces;
