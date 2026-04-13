/**
 * 🔔 Gamification Notifications Hook
 * 
 * Listens to WebSocket events and shows toast notifications for:
 * - Achievement unlocks
 * - Streak milestones
 * - Challenge completions
 * - Goal completions
 */

import { useEffect } from "react";
import { toast } from "sonner";
import { useUnifiedWebSocket } from "./useUnifiedWebSocket";
import { useAuth } from "@/components/providers/unified-context-provider";
import Confetti from "react-confetti";

export function useGamificationNotifications() {
  // Get workspace and user from auth context
  const { user, workspace } = useAuth();
  
  // Only enable WebSocket if we have user and workspace
  const { subscribe, connectionState } = useUnifiedWebSocket({ 
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    enabled: !!(user?.email && workspace?.id),
  });
  
  useEffect(() => {
    // Don't set up listeners if WebSocket not connected or missing auth
    if (!connectionState?.isConnected) {
      if (user?.email && workspace?.id) {
        console.warn('⚠️ Gamification notifications: WebSocket not connected yet');
      }
      return;
    }
    // Achievement unlocked notification
    const unsubAchievement = subscribe('achievement:unlocked', (data: any) => {
      const achievement = data.achievement;
      
      // Show notification based on rarity
      if (achievement.rarity === 'legendary') {
        toast.success(
          <div className="flex items-center gap-3">
            <span className="text-3xl">{achievement.icon}</span>
            <div>
              <p className="font-bold text-lg">🌈 LEGENDARY ACHIEVEMENT!</p>
              <p className="text-sm">{achievement.name}</p>
              <p className="text-xs text-muted-foreground">+{achievement.points} points</p>
            </div>
          </div>,
          {
            duration: 8000,
            className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
          }
        );
        
        // Trigger confetti for legendary
        triggerConfetti();
      } else if (achievement.rarity === 'epic') {
        toast.success(
          <div className="flex items-center gap-3">
            <span className="text-2xl">{achievement.icon}</span>
            <div>
              <p className="font-bold">⭐ Epic Achievement!</p>
              <p className="text-sm">{achievement.name}</p>
              <p className="text-xs text-muted-foreground">+{achievement.points} points</p>
            </div>
          </div>,
          {
            duration: 6000,
            className: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
          }
        );
      } else if (achievement.rarity === 'rare') {
        toast.success(
          <div className="flex items-center gap-2">
            <span className="text-xl">{achievement.icon}</span>
            <div>
              <p className="font-semibold">💎 {achievement.name}</p>
              <p className="text-xs">+{achievement.points} points</p>
            </div>
          </div>,
          {
            duration: 5000,
            className: 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white',
          }
        );
      } else {
        toast.success(
          <div className="flex items-center gap-2">
            <span className="text-lg">{achievement.icon}</span>
            <div>
              <p className="font-medium">{achievement.name}</p>
              <p className="text-xs">+{achievement.points} points</p>
            </div>
          </div>,
          { duration: 4000 }
        );
      }
    });
    
    // Streak updated notification
    const unsubStreak = subscribe('streak:updated', (data: any) => {
      const { streakType, currentStreak, isAtMilestone } = data;
      
      if (isAtMilestone) {
        toast.success(
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-bold">Streak Milestone!</p>
              <p className="text-sm">{currentStreak}-day {streakType} streak</p>
            </div>
          </div>,
          {
            duration: 6000,
            className: 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
          }
        );
      } else {
        toast.success(
          <div className="flex items-center gap-2">
            <span>🔥</span>
            <p className="text-sm">{currentStreak}-day {streakType} streak!</p>
          </div>,
          { duration: 3000 }
        );
      }
    });
    
    // Challenge completed notification
    const unsubChallenge = subscribe('challenge:completed', (data: any) => {
      const { title, points, difficulty } = data;
      
      const difficultyColors = {
        easy: 'bg-green-500',
        medium: 'bg-yellow-500',
        hard: 'bg-red-500',
      };
      
      toast.success(
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <div>
            <p className="font-semibold">Challenge Complete!</p>
            <p className="text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">+{points} points</p>
          </div>
        </div>,
        {
          duration: 5000,
          className: difficultyColors[difficulty as keyof typeof difficultyColors],
        }
      );
    });
    
    // Goal completed notification
    const unsubGoal = subscribe('goal:completed', (data: any) => {
      const { title } = data;
      
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎊</span>
          <div>
            <p className="font-bold">Goal Completed!</p>
            <p className="text-sm">{title}</p>
          </div>
        </div>,
        {
          duration: 7000,
          className: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
        }
      );
      
      triggerConfetti();
    });
    
    // Celebration trigger (for team-wide events)
    const unsubCelebration = subscribe('celebration:trigger', (data: any) => {
      const { title, type, rarity } = data;
      
      if (type === 'achievement' && rarity === 'legendary') {
        triggerConfetti();
      }
      
      toast.success(
        <div className="flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <p className="font-semibold">{title}</p>
        </div>,
        { duration: 5000 }
      );
    });
    
    return () => {
      unsubAchievement?.();
      unsubStreak?.();
      unsubChallenge?.();
      unsubGoal?.();
      unsubCelebration?.();
    };
  }, [subscribe, connectionState?.isConnected, user?.email, workspace?.id]);
}

/**
 * Trigger confetti animation
 */
function triggerConfetti() {
  // Create temporary confetti container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);
  
  // Import confetti dynamically
  import('canvas-confetti').then((confetti) => {
    const myConfetti = confetti.default;
    
    // Fire confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      
      if (timeLeft <= 0) {
        clearInterval(interval);
        document.body.removeChild(container);
        return;
      }
      
      myConfetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#bb0000', '#ffffff', '#00bb00']
      });
      
      myConfetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#bb0000', '#ffffff', '#00bb00']
      });
    }, 100);
  });
}

