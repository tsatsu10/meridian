import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/magicui/blur-fade";
import { 
  GitBranch, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { useState } from "react";
import type { TaskWithDependencies } from "@/types/task";

interface DependencyGraphProps {
  task: TaskWithDependencies;
  onTaskClick: (taskId: string) => void;
}

interface GraphNode {
  id: string;
  title: string;
  status: string;
  type: 'current' | 'dependency' | 'blocked';
  position: { x: number; y: number };
}

export function DependencyGraph({ task, onTaskClick }: DependencyGraphProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(task.id);
  
  // Generate graph nodes and connections
  const generateGraphData = () => {
    const nodes: GraphNode[] = [
      {
        id: task.id,
        title: task.title,
        status: task.status,
        type: 'current',
        position: { x: 200, y: 100 }
      }
    ];
    
    // Add dependency nodes
    task.dependencies?.forEach((dep, index) => {
      if (dep.requiredTask) {
        nodes.push({
          id: dep.requiredTask.id,
          title: dep.requiredTask.title,
          status: dep.requiredTask.status,
          type: 'dependency',
          position: { x: 50, y: 50 + (index * 60) }
        });
      }
    });
    
    // Add blocked tasks
    task.blockedBy?.forEach((blocked, index) => {
      if (blocked.dependentTask) {
        nodes.push({
          id: blocked.dependentTask.id,
          title: blocked.dependentTask.title,
          status: blocked.dependentTask.status,
          type: 'blocked',
          position: { x: 350, y: 50 + (index * 60) }
        });
      }
    });
    
    return nodes;
  };
  
  const nodes = generateGraphData();
  
  const getNodeColor = (node: GraphNode) => {
    if (node.type === 'current') return 'bg-indigo-500 border-indigo-600';
    if (node.status === 'done') return 'bg-green-500 border-green-600';
    if (node.status === 'in_progress') return 'bg-blue-500 border-blue-600';
    if (node.status === 'blocked') return 'bg-red-500 border-red-600';
    return 'bg-gray-400 border-gray-500';
  };
  
  const getNodeIcon = (node: GraphNode) => {
    if (node.status === 'done') return CheckCircle2;
    if (node.status === 'blocked') return AlertTriangle;
    return Clock;
  };
  
  const criticalPath = nodes.filter(node => 
    node.type === 'dependency' && node.status !== 'done'
  );
  
  return (
    <BlurFade delay={0.2} inView>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Dependency Graph
            {criticalPath.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {criticalPath.length} blockers
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative h-64 overflow-hidden bg-zinc-50 dark:bg-zinc-900 rounded-lg border">
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* Render connections */}
              {nodes.map(node => {
                if (node.type === 'dependency') {
                  const currentNode = nodes.find(n => n.type === 'current');
                  if (currentNode) {
                    return (
                      <line
                        key={`${node.id}-connection`}
                        x1={node.position.x + 40}
                        y1={node.position.y + 15}
                        x2={currentNode.position.x}
                        y2={currentNode.position.y + 15}
                        stroke="#6b7280"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  }
                }
                if (node.type === 'blocked') {
                  const currentNode = nodes.find(n => n.type === 'current');
                  if (currentNode) {
                    return (
                      <line
                        key={`${node.id}-connection`}
                        x1={currentNode.position.x + 80}
                        y1={currentNode.position.y + 15}
                        x2={node.position.x}
                        y2={node.position.y + 15}
                        stroke="#6b7280"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  }
                }
                return null;
              })}
              
              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#6b7280"
                  />
                </marker>
              </defs>
            </svg>
            
            {/* Render nodes */}
            {nodes.map(node => {
              const Icon = getNodeIcon(node);
              return (
                <div
                  key={node.id}
                  className={`absolute cursor-pointer transition-all duration-200 hover:scale-105 ${
                    selectedNode === node.id ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  style={{
                    left: node.position.x * zoomLevel,
                    top: node.position.y * zoomLevel,
                    transform: `scale(${zoomLevel})`
                  }}
                  onClick={() => {
                    setSelectedNode(node.id);
                    if (node.id !== task.id) {
                      onTaskClick(node.id);
                    }
                  }}
                >
                  <div className={`
                    w-20 p-2 rounded-lg border-2 bg-white dark:bg-zinc-800 shadow-sm
                    ${getNodeColor(node)}
                    ${node.type === 'current' ? 'ring-2 ring-indigo-300' : ''}
                  `}>
                    <div className="flex items-center gap-1 mb-1">
                      <Icon className="w-3 h-3 text-white" />
                      <span className="text-xs text-white font-medium truncate">
                        {node.type === 'current' ? 'Current' : 
                         node.type === 'dependency' ? 'Blocks' : 'Blocked'}
                      </span>
                    </div>
                    <div className="text-xs text-white font-medium truncate">
                      {node.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend and Critical Path Info */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-sm" />
                <span>Current Task</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-sm" />
                <span>Blocked</span>
              </div>
            </div>
            
            {criticalPath.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Critical Path Alert</span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {criticalPath.length} incomplete dependencies are blocking this task. 
                  Consider prioritizing these tasks to unblock progress.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </BlurFade>
  );
} 