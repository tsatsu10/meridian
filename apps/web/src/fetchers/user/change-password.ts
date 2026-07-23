import { API_BASE_URL } from "../../constants/urls";

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

const changePassword = async ({
  currentPassword,
  newPassword,
}: ChangePasswordRequest) => {
  const response = await fetch(`${API_BASE_URL}/users/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error?.message ||
        errorData?.error ||
        "Failed to update password",
    );
  }

  return response.json();
};

export default changePassword;
