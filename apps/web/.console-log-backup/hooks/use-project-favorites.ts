import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/constants/urls";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { toast } from "sonner";

const FAVORITES_KEY = "meridian_pinned_projects";

export function useProjectFavorites() {
  const { user } = useAuth();
  const [pinnedProjects, setPinnedProjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pinned projects from API (with localStorage fallback)
  useEffect(() => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    const loadPinnedProjects = async () => {
      try {
        // Try loading from API first
        const response = await fetch(`${API_URL}/api/user-preferences?userEmail=${encodeURIComponent(user.email)}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const pinned = Array.isArray(data.pinnedProjects) ? data.pinnedProjects : [];
          setPinnedProjects(pinned);
          // Sync to localStorage for offline access
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(pinned));
        } else {
          // Fallback to localStorage if API fails
          const stored = localStorage.getItem(FAVORITES_KEY);
          if (stored) {
            setPinnedProjects(JSON.parse(stored));
          }
        }
      } catch (error) {
        console.error("Failed to load pinned projects:", error);
        // Fallback to localStorage
        const stored = localStorage.getItem(FAVORITES_KEY);
        if (stored) {
          try {
            setPinnedProjects(JSON.parse(stored));
          } catch (e) {
            console.error("Failed to parse stored pinned projects:", e);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPinnedProjects();
  }, [user?.email]);

  // Save to API whenever it changes
  const savePinnedProjects = useCallback(async (newPinned: string[]) => {
    // Early return if user email is not available or already syncing
    if (!user?.email || isSyncing) {
      console.warn('[Favorites] Cannot save: user.email =', user?.email, 'isSyncing =', isSyncing);
      // Still save to localStorage
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newPinned));
      return;
    }

    setIsSyncing(true);
    
    try {
      const payload = {
        userEmail: user.email,
        pinnedProjects: newPinned,
      };
      
      console.log('[Favorites] Saving to API:', payload);
      console.log('[Favorites] API_URL:', API_URL);
      console.log('[Favorites] Full URL:', `${API_URL}/api/user-preferences`);
      
      const bodyString = JSON.stringify(payload);
      console.log('[Favorites] Stringified body:', bodyString);
      console.log('[Favorites] Body length:', bodyString.length);
      
      const response = await fetch(`${API_URL}/api/user-preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: bodyString,
      });
      
      console.log('[Favorites] Response status:', response.status);
      console.log('[Favorites] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Favorites] API error response:', errorText);
        throw new Error(`Failed to save pinned projects: ${response.status} ${errorText}`);
      }

      // Also save to localStorage for offline access
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newPinned));
      console.log('[Favorites] Successfully saved to API and localStorage');
    } catch (error) {
      console.error("[Favorites] Failed to save pinned projects:", error);
      toast.error("Failed to save pinned project. Changes saved locally.");
      // Still save to localStorage even if API fails
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newPinned));
    } finally {
      setIsSyncing(false);
    }
  }, [user?.email, isSyncing]);

  const togglePin = useCallback(async (projectId: string) => {
    setPinnedProjects((prev) => {
      const newPinned = prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId];
      
      // Save to API asynchronously
      savePinnedProjects(newPinned);
      
      return newPinned;
    });
  }, [savePinnedProjects]);

  const isPinned = useCallback((projectId: string) => pinnedProjects.includes(projectId), [pinnedProjects]);

  const sortWithPinned = useCallback(<T extends { id: string }>(projects: T[]): T[] => {
    const pinned = projects.filter((p) => isPinned(p.id));
    const unpinned = projects.filter((p) => !isPinned(p.id));
    return [...pinned, ...unpinned];
  }, [isPinned]);

  return {
    pinnedProjects,
    togglePin,
    isPinned,
    sortWithPinned,
    isLoading,
    isSyncing,
  };
}

