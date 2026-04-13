/**
 * 🎯 useUserProfileNavigation Hook
 * 
 * Provides utilities for navigating to user profiles
 */

import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

interface UseUserProfileNavigationOptions {
  defaultMode?: "modal" | "page";
}

export function useUserProfileNavigation(options: UseUserProfileNavigationOptions = {}) {
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { defaultMode = "modal" } = options;
  
  const openProfile = useCallback((userId: string, mode?: "modal" | "page") => {
    const openMode = mode || defaultMode;
    
    if (openMode === "page") {
      navigate({ to: `/dashboard/profile/${userId}` });
    } else {
      setSelectedUserId(userId);
      setIsModalOpen(true);
    }
  }, [navigate, defaultMode]);
  
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUserId(null);
  }, []);
  
  const viewFullProfile = useCallback(() => {
    if (selectedUserId) {
      setIsModalOpen(false);
      navigate({ to: `/dashboard/profile/${selectedUserId}` });
    }
  }, [selectedUserId, navigate]);
  
  return {
    openProfile,
    closeModal,
    viewFullProfile,
    selectedUserId,
    isModalOpen,
  };
}

