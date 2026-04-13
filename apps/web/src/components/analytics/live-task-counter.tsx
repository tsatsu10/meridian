import { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@/store/workspace';
import { API_BASE_URL } from '@/constants/urls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp, Users, Clock } from 'lucide-react';
import { motion, useSpring, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useSocket } from '@/hooks/use-socket';

interface TaskStats {
  completed: number;
  total: number;
  percentage: number;
  completedToday: number;
  milestone?: number;
}

interface LiveStats {
  inProgress: number;
  pending: number;
  completed: number;
  overdue: number;
  activeUsers: number;
}

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const springValue = useSpring(value, { duration });
  const display = useTransform(springValue, (latest) => Math.round(latest));
  
  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);
  
  return <motion.span>{display}</motion.span>;
}

export function LiveTaskCounter() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const prevCompletedToday = useRef(0);
  
  const workspaceId = currentWorkspace?.id;
  
  // Listen to WebSocket for real-time task completions
  const { socket } = useSocket();
  
  useEffect(() => {
    if (!workspaceId || !socket || typeof socket.on !== 'function') return;
    
    const handleTaskCompleted = (data: any) => {
      // Update counter
      fetchStats();
      
      // Trigger confetti if it's a milestone
      if (taskStats && taskStats.completedToday > 0) {
        const newCount = taskStats.completedToday + 1;
        if (newCount === 5 || newCount === 10 || newCount === 25 || 
            newCount === 50 || newCount === 100 || newCount % 100 === 0) {
          triggerConfetti();
        }
      }
    };
    
    socket.on('task:completed', handleTaskCompleted);
    
    return () => {
      socket.off('task:completed', handleTaskCompleted);
    };
  }, [socket, workspaceId, taskStats]);
  
  const fetchStats = async () => {
    if (!workspaceId) return;
    
    try {
      const [statsRes, liveRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/tasks/today/${workspaceId}`, {
          credentials: 'include',
        }),
        fetch(`${API_BASE_URL}/analytics/tasks/live/${workspaceId}`, {
          credentials: 'include',
        }),
      ]);
      
      const statsData = await statsRes.json();
      const liveData = await liveRes.json();
      
      if (statsData.success) {
        const newStats = statsData.data;
        
        // Check for milestone achievement
        if (prevCompletedToday.current < newStats.completedToday && newStats.milestone) {
          triggerConfetti();
        }
        
        prevCompletedToday.current = newStats.completedToday;
        setTaskStats(newStats);
      }
      
      if (liveData.success) {
        setLiveStats(liveData.data);
      }
    } catch (error) {
      console.error('Failed to fetch task stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
    };
    
    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }
    
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    
    fire(0.2, {
      spread: 60,
    });
    
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };
  
  useEffect(() => {
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, [workspaceId]);
  
  if (loading || !taskStats || !liveStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Live Task Counter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Live Task Counter
          </div>
          <Badge variant="secondary" className="animate-pulse">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Today's Completion Count */}
        <div className="text-center">
          <motion.div
            className="text-6xl font-bold text-green-500"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <AnimatedCounter value={taskStats.completedToday} />
          </motion.div>
          <p className="text-sm text-muted-foreground mt-2">Tasks Completed Today</p>
          {taskStats.milestone && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Badge className="mt-2 bg-gradient-to-r from-purple-500 to-pink-500">
                🎉 {taskStats.milestone} Milestone Reached!
              </Badge>
            </motion.div>
          )}
        </div>
        
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{taskStats.percentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${taskStats.percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            <AnimatedCounter value={taskStats.completed} /> of {taskStats.total} tasks completed
          </p>
        </div>
        
        {/* Live Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                <AnimatedCounter value={liveStats.inProgress} />
              </div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <div>
              <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                <AnimatedCounter value={liveStats.pending} />
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                <AnimatedCounter value={liveStats.completed} />
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <Users className="h-4 w-4 text-orange-500" />
            <div>
              <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                <AnimatedCounter value={liveStats.activeUsers} />
              </div>
              <p className="text-xs text-muted-foreground">Active Users</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

