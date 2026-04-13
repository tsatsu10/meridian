import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from '@/components/providers/unified-context-provider';
import useWorkspaceStore from "@/store/workspace";
import { useUnifiedWebSocket } from "./useUnifiedWebSocket";

export function useNotificationRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  useUnifiedWebSocket({
    userEmail: user?.email || "",
    workspaceId: workspace?.id || "",
    enabled: !!user?.email && !!workspace?.id,
    onMessage: (msg) => {
      if (msg.type === "notification.created") {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    },
  });
} 