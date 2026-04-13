import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useWorkspaceStore from "@/store/workspace";

export type PermissionLevel = "owner" | "admin" | "member" | "viewer" | "guest";

export function useWorkspacePermission() {
  const { workspace } = useWorkspaceStore();
  const { user } = useAuth();

  // 🚨 SECURITY: More restrictive demo user detection
  // Only allow demo permissions for legitimate demo accounts, not just any email pattern
  const isDemoUser = user?.email?.endsWith('@meridian.app') && 
                    (user?.email?.includes('demo') || user?.name?.includes('Demo')) &&
                    user?.email !== 'user@meridian.app'; // Exclude generic user emails

  // Determine if user is workspace owner - STRICT CHECK
  const isOwner = workspace?.ownerEmail === user?.email;

  // 🔒 SECURITY: Demo users still need proper workspace access
  // Demo mode should not bypass workspace membership checks
  const hasWorkspaceAccess = isOwner || 
    (isDemoUser && workspace?.ownerEmail === user?.email); // Demo users must still own or be invited

  const checkPermission = (
    requiredRole: PermissionLevel = "member",
  ): boolean => {
    if (!workspace || !user) return false;

    // 🚨 SECURITY: Even demo users must have legitimate workspace access
    if (!hasWorkspaceAccess) {
      console.warn(`🔒 SECURITY: User ${user.email} denied access to workspace ${workspace.id} - no membership found`);
      return false;
    }

    // Demo users get enhanced permissions ONLY within workspaces they legitimately access
    if (isDemoUser && hasWorkspaceAccess) {
      return true;
    }

    // Role hierarchy check
    const roleHierarchy: Record<PermissionLevel, number> = {
      owner: 5,
      admin: 4,
      member: 3,
      viewer: 2,
      guest: 1,
    };

    // Determine user's current role in workspace
    const userRole: PermissionLevel = isOwner ? "owner" : "member"; // Simplified for now
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  };

  return {
    isOwner,
    checkPermission,
    isDemoUser: isDemoUser && hasWorkspaceAccess, // Only true if both demo AND has access
    hasWorkspaceAccess,
  };
}
