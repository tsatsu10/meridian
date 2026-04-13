import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "../../lib/logger";
import { API_BASE_URL, API_URL } from '@/constants/urls';

export function SimpleSignInForm() {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    logger.info("🚀 SIMPLE: Form submission started");

    try {
      const response = await fetch(`${API_BASE_URL}/users/sign-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      logger.info("📡 SIMPLE: Response received");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Sign-in failed");
      }

      const data = await response.json();
      logger.info("✅ SIMPLE: Sign-in successful");

      // Store user data
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
      }
      sessionStorage.setItem('meridian-user', JSON.stringify(data.user || data));

      logger.info("🧭 SIMPLE: Navigating to dashboard");
      navigate({ to: "/dashboard" });

    } catch (err) {
      console.error("❌ SIMPLE: Sign-in error", err);
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="simple-email">Email</Label>
          <Input
            id="simple-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="simple-password">Password</Label>
          <Input
            id="simple-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="h-12"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12"
        >
          {isLoading ? "Signing In..." : "Sign In (Simple)"}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This is a simplified form without complex dependencies
        </p>
      </div>
    </div>
  );
}