import { API_BASE_URL } from "../../constants/urls";

export type SignUpRequest = {
  email: string;
  password: string;
  name: string;
};

const signUp = async ({ email, password, name }: SignUpRequest) => {
  const response = await fetch(`${API_BASE_URL}/users/sign-up`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      email,
      password,
      name,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const user = await response.json();

  return user;
};

export default signUp;
