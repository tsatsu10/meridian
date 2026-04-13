import useGetMe from "@/hooks/queries/use-get-me";
import type { LoggedInUser } from "@/types/user";
import { MeridianMark } from "@/components/branding/meridian-mark";
import {
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  createContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export const AuthContext = createContext<{
  user: LoggedInUser | null | undefined;
  setUser: Dispatch<SetStateAction<LoggedInUser | null | undefined>>;
}>({
  user: undefined,
  setUser: () => undefined,
});

function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<LoggedInUser | undefined | null>(undefined);
  const { data, isLoading, isError } = useGetMe();

  useLayoutEffect(() => {
    if (isError) {
      setUser(null);
    }
  }, [isError]);

  useEffect(() => {
    if (isError) {
      return;
    }
    // Handle both direct user object and wrapped { user: {...} } format
    if (data === null) {
      setUser(null);
    } else if (data?.user !== undefined) {
      // Wrapped format: { user: {...} } or { user: null }
      setUser(data.user);
    } else if (data?.id) {
      // Direct format: { id, email, ... }
      setUser({ ...data });
    }
  }, [data, isError]);

  const memoizedValues = useMemo(
    () => ({
      user,
      setUser,
    }),
    [user],
  );

  // Only show loading screen on initial load, not on refetches
  // This prevents the router from unmounting during background refetches
  if (isLoading || user === undefined) {
    return (
      <div className="flex w-full items-center justify-center h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
        <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 animate-pulse">
          <MeridianMark className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={memoizedValues}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;

// Re-export useAuth for backward compatibility
export { default as useAuth } from "./hooks/use-auth";