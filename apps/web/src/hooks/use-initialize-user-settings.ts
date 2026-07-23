import { useEffect } from "react";
import { useSettingsStore } from "@/store/settings";

/**
 * Wires the settings store's user id — required before saveSettings() will
 * ever attempt a network call — to the authenticated user's email. Nothing
 * previously called useSettingsStore's `initialize`, so every settings save
 * silently no-opped: state updated locally, the autosave guard on
 * `currentUserId` bailed out before touching the network.
 */
export function useInitializeUserSettings(
  userEmail: string | null | undefined,
) {
  const initialize = useSettingsStore((state) => state.initialize);

  useEffect(() => {
    if (userEmail) {
      initialize(userEmail);
    }
  }, [userEmail, initialize]);
}

export default useInitializeUserSettings;
