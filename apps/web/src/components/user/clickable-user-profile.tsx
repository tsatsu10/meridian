/**
 * 👤 Clickable User Profile Component
 * 
 * Makes user names and avatars clickable to view their profile
 * Can open either a quick view modal or navigate to full profile
 */

import { useState, lazy, Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

// Lazy load the modal to improve performance when many profiles are displayed
const TeamMemberProfileModal = lazy(() => 
  import("@/components/profile/team-member/team-member-profile-modal").then(m => ({ 
    default: m.TeamMemberProfileModal 
  }))
);

interface ClickableUserProfileProps {
  userId?: string;
  userEmail?: string;
  userName: string;
  userAvatar?: string;
  className?: string;
  avatarClassName?: string;
  nameClassName?: string;
  showAvatar?: boolean;
  showName?: boolean;
  openMode?: "modal" | "page" | "both"; // modal = quick view, page = full profile, both = modal with "view full" option
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: {
    avatar: "h-6 w-6",
    text: "text-xs",
  },
  md: {
    avatar: "h-8 w-8",
    text: "text-sm",
  },
  lg: {
    avatar: "h-10 w-10",
    text: "text-base",
  },
};

export function ClickableUserProfile({
  userId,
  userEmail,
  userName,
  userAvatar,
  className,
  avatarClassName,
  nameClassName,
  showAvatar = true,
  showName = true,
  openMode = "modal",
  size = "md",
  children,
}: ClickableUserProfileProps) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Use userId if available, otherwise fall back to userEmail
  const profileId = userId || userEmail;
  
  if (!profileId) {
    // If no ID available, render without click functionality
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showAvatar && (
          <Avatar className={cn(sizeClasses[size].avatar, avatarClassName)}>
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className={cn(sizeClasses[size].text)}>
              {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        )}
        {showName && (
          <span className={cn("font-medium", sizeClasses[size].text, nameClassName)}>
            {userName}
          </span>
        )}
        {children}
      </div>
    );
  }
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (openMode === "page") {
      navigate({ to: `/dashboard/profile/${profileId}` });
    } else {
      // Open modal for "modal" or "both" modes
      setIsModalOpen(true);
    }
  };
  
  const handleViewFull = () => {
    setIsModalOpen(false);
    navigate({ to: `/dashboard/profile/${profileId}` });
  };
  
  return (
    <>
      <div 
        className={cn(
          "flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity",
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick(e as any);
          }
        }}
      >
        {showAvatar && (
          <Avatar className={cn(sizeClasses[size].avatar, avatarClassName)}>
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className={cn(sizeClasses[size].text)}>
              {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        )}
        {showName && (
          <span className={cn(
            "font-medium hover:underline",
            sizeClasses[size].text,
            nameClassName
          )}>
            {userName}
          </span>
        )}
        {children}
      </div>
      
      {(openMode === "modal" || openMode === "both") && isModalOpen && (
        <Suspense fallback={null}>
          <TeamMemberProfileModal
            userId={profileId}
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onViewFull={openMode === "both" ? handleViewFull : undefined}
            onMessage={() => {
              // Navigate to chat/DM with user
              setIsModalOpen(false);
              navigate({ to: '/dashboard/chat', search: { userId: profileId } });
            }}
            onGiveKudos={() => {
              // Kudos modal is handled internally by the profile modal now
              // This callback is for external handling if needed
            }}
          />
        </Suspense>
      )}
    </>
  );
}

