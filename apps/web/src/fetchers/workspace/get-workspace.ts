import { API_BASE_URL } from "../../constants/urls";

type GetWorkspaceRequest = {
  id: string;
};

async function getWorkspace({ id }: GetWorkspaceRequest) {
  const sessionToken = localStorage.getItem("sessionToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status}: ${error}`);
  }

  const workspace = await response.json();

  return workspace;
}

export default getWorkspace;
