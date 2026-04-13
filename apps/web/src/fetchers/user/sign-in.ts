import type { SignInFormValues } from "@/components/auth/sign-in-form";
import { API_BASE_URL } from "../../constants/urls";

const signIn = async ({ email, password }: SignInFormValues) => {
  // Add timeout to prevent infinite loading
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}/users/sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = "Sign-in failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, try to get text
        try {
          errorMessage = await response.text();
        } catch {
          // Use default message
        }
      }
      
      // Provide specific error messages for common status codes
      if (response.status === 429) {
        throw new Error("Too many sign-in attempts. Please wait a moment and try again.");
      } else if (response.status === 404) {
        throw new Error("Sign-in endpoint not found. Please check if the API server is running.");
      } else if (response.status === 500) {
        throw new Error("Server error. Please try again later.");
      }
      
      throw new Error(errorMessage);
    }

    const user = await response.json();

    // Store session token in localStorage if provided (for WebSocket auth and E2E tests)
    if (user.sessionToken) {
      localStorage.setItem('sessionToken', user.sessionToken);
      console.log('✅ Session token stored in localStorage');
    }

    return user;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error("Request timeout. Please check your internet connection and that the API server is running.");
      }
      throw error;
    }
    
    throw new Error("An unexpected error occurred during sign-in");
  }
};

export default signIn;
