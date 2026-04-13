import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspace';
import { API_BASE_URL } from '@/constants/urls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSocket } from '@/hooks/use-socket';

interface ProgressData {
  overall: number;
  projects: Array<{
    projectId: string;
    projectName: string;
    progress: number;
    tasksCompleted: number;
    tasksTotal: number;
  }>;
  milestones: Array<{
    milestoneId: string;
    milestoneName: string;
    progress: number;
    isCompleted: boolean;
    dueDate?: Date;
  }>;
}

export function LiveProgressBar() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  
  const workspaceId = currentWorkspace?.id;
  
  const fetchProgress = async () => {
    if (!workspaceId) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/analytics/progress/${workspaceId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success) {
        setProgressData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchProgress();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchProgress, 30000);
    
    return () => clearInterval(interval);
  }, [workspaceId]);
  
  // Listen to WebSocket for real-time updates
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;
    
    const handleTaskUpdate = () => {
      fetchProgress();
    };
    
    socket.on('task:completed', handleTaskUpdate);
    socket.on('task:status_changed', handleTaskUpdate);
    
    return () => {
      socket.off('task:completed', handleTaskUpdate);
      socket.off('task:status_changed', handleTaskUpdate);
    };
  }, [socket]);
  
  if (loading || !progressData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded" />
            <div className="h-2 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-orange-500';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Live Progress
          </div>
          <Badge variant="secondary" className="animate-pulse">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Workspace Progress</span>
            <span className="text-2xl font-bold text-blue-600">
              {progressData.overall}%
            </span>
          </div>
          
          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getProgressColor(progressData.overall)}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressData.overall}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </motion.div>
            
            {/* Milestone Markers */}
            {[25, 50, 75].map((milestone) => (
              <div
                key={milestone}
                className="absolute top-0 bottom-0 w-0.5 bg-border"
                style={{ left: `${milestone}%` }}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
        
        {/* Project Breakdown */}
        {progressData.projects.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4" />
              Projects
            </div>
            
            <div className="space-y-2">
              {progressData.projects.slice(0, 5).map((project) => (
                <motion.div
                  key={project.projectId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{project.projectName}</span>
                    <span className="font-medium ml-2">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {project.tasksCompleted} / {project.tasksTotal} tasks
                  </div>
                </motion.div>
              ))}
              
              {progressData.projects.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-2">
                  +{progressData.projects.length - 5} more projects
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Upcoming Milestones */}
        {progressData.milestones.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Flag className="h-4 w-4" />
              Milestones
            </div>
            
            <div className="space-y-2">
              {progressData.milestones.slice(0, 3).map((milestone) => (
                <motion.div
                  key={milestone.milestoneId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{milestone.milestoneName}</span>
                      {milestone.isCompleted && (
                        <Badge variant="secondary" className="text-xs">
                          ✓ Complete
                        </Badge>
                      )}
                    </div>
                    {milestone.dueDate && (
                      <div className="text-xs text-muted-foreground">
                        Due: {new Date(milestone.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {progressData.milestones.length > 3 && (
                <div className="text-xs text-muted-foreground text-center pt-2">
                  +{progressData.milestones.length - 3} more milestones
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

