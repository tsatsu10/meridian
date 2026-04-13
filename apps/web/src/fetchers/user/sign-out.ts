import { API_BASE_URL } from "../../constants/urls";

const signOut = async () => {
  const response = await fetch(`${API_BASE_URL}/users/sign-out`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
};

export default signOut;
