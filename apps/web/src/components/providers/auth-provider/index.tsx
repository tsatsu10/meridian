import useGetMe from "@/hooks/queries/use-get-me";
import { useInitializeUserSettings } from "@/hooks/use-initialize-user-settings";
import { useThemeSync } from "@/hooks/use-theme-sync";
import type { LoggedInUser } from "@/types/user";
import { AppLoadingScreen } from "@/components/branding/app-loading-screen";
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

  useInitializeUserSettings(user?.email);

  // Mounted here so appearance preferences — theme schedules, accessibility
  // toggles, typography, background — apply across the whole app. This hook
  // used to be mounted only by the Appearance settings page, which is why the
  // settings it wrote took effect on that one screen and nowhere else.
  useThemeSync();

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
    return <AppLoadingScreen />;
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
