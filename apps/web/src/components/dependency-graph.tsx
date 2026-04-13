import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, Target, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DependencyNode {
  id: string;
  title: string;
  type: 'task' | 'milestone';
  status: string;
  dependencies: string[];
  level: number;
  x: number;
  y: number;
}

interface DependencyGraphProps {
  tasks: any[];
  milestones: any[];
  focusId?: string;
  onClose?: () => void;
}

/**
 * Visual Dependency Graph Component
 * Shows task and milestone dependencies in a hierarchical layout
 */
export function DependencyGraph({ tasks, milestones, focusId, onClose }: DependencyGraphProps) {
  const { nodes, edges, focusNode } = useMemo(() => {
    const allItems = [
      ...tasks.map(t => ({ ...t, type: 'task' as const })),
      ...milestones.map(m => ({ ...m, type: 'milestone' as const }))
    ];

    // Build dependency graph
    const nodeMap = new Map<string, DependencyNode>();
    const visited = new Set<string>();
    const levels = new Map<string, number>();

    // Calculate levels (depth in dependency tree)
    const calculateLevel = (id: string): number => {
      if (levels.has(id)) return levels.get(id)!;
      
      const item = allItems.find(i => i.id === id);
      if (!item) return 0;

      if (!item.dependencies || item.dependencies.length === 0) {
        levels.set(id, 0);
        return 0;
      }

      const maxDepLevel = Math.max(
        ...item.dependencies.map(depId => calculateLevel(depId))
      );
      const level = maxDepLevel + 1;
      levels.set(id, level);
      return level;
    };

    // Calculate levels for all items
    allItems.forEach(item => calculateLevel(item.id));

    // Group nodes by level
    const levelGroups = new Map<number, string[]>();
    allItems.forEach(item => {
      const level = levels.get(item.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(item.id);
    });

    // Position nodes
    const nodeWidth = 200;
    const nodeHeight = 80;
    const levelWidth = 250;
    const levelHeight = 100;

    allItems.forEach(item => {
      const level = levels.get(item.id) || 0;
      const itemsInLevel = levelGroups.get(level) || [];
      const indexInLevel = itemsInLevel.indexOf(item.id);

      nodeMap.set(item.id, {
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        dependencies: item.dependencies || [],
        level,
        x: level * levelWidth,
        y: indexInLevel * levelHeight
      });
    });

    // Build edges
    const edges: Array<{ from: string; to: string }> = [];
    allItems.forEach(item => {
      if (item.dependencies) {
        item.dependencies.forEach((depId: string) => {
          edges.push({ from: depId, to: item.id });
        });
      }
    });

    // Find focus node and its related nodes
    let focusNode: DependencyNode | null = null;
    let relevantNodes = Array.from(nodeMap.values());
    
    if (focusId) {
      focusNode = nodeMap.get(focusId) || null;
      
      if (focusNode) {
        // Get all ancestors and descendants
        const relatedIds = new Set<string>([focusId]);
        
        const addAncestors = (id: string) => {
          const node = nodeMap.get(id);
          if (node) {
            node.dependencies.forEach(depId => {
              if (!relatedIds.has(depId)) {
                relatedIds.add(depId);
                addAncestors(depId);
              }
            });
          }
        };
        
        const addDescendants = (id: string) => {
          edges.filter(e => e.from === id).forEach(edge => {
            if (!relatedIds.has(edge.to)) {
              relatedIds.add(edge.to);
              addDescendants(edge.to);
            }
          });
        };
        
        addAncestors(focusId);
        addDescendants(focusId);
        
        relevantNodes = Array.from(nodeMap.values()).filter(n => relatedIds.has(n.id));
      }
    }

    return {
      nodes: relevantNodes,
      edges: edges.filter(e => 
        relevantNodes.some(n => n.id === e.from) && 
        relevantNodes.some(n => n.id === e.to)
      ),
      focusNode
    };
  }, [tasks, milestones, focusId]);

  const getStatusColor = (status: string, type: 'task' | 'milestone') => {
    if (type === 'milestone') {
      switch (status) {
        case 'achieved': return 'bg-green-500 border-green-600';
        case 'missed': return 'bg-red-500 border-red-600';
        default: return 'bg-orange-500 border-orange-600';
      }
    }

    switch (status) {
      case 'done': return 'bg-green-500 border-green-600';
      case 'in_progress': return 'bg-blue-500 border-blue-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
      case 'achieved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'missed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No dependencies to visualize</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate viewBox dimensions
  const maxX = Math.max(...nodes.map(n => n.x)) + 250;
  const maxY = Math.max(...nodes.map(n => n.y)) + 100;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-blue-500" />
          <CardTitle>Dependency Graph</CardTitle>
          {focusNode && (
            <Badge variant="outline">
              Focused on: {focusNode.title}
            </Badge>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative overflow-auto border rounded-lg bg-muted/20" style={{ maxHeight: '600px' }}>
          <svg
            width="100%"
            height="600"
            viewBox={`0 0 ${maxX} ${maxY}`}
            className="min-w-max"
            style={{ minWidth: `${maxX}px` }}
          >
            {/* Draw edges */}
            <g className="edges">
              {edges.map((edge, i) => {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);
                
                if (!fromNode || !toNode) return null;

                const x1 = fromNode.x + 200;
                const y1 = fromNode.y + 40;
                const x2 = toNode.x;
                const y2 = toNode.y + 40;

                const midX = (x1 + x2) / 2;

                return (
                  <g key={`edge-${i}`}>
                    <path
                      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-muted-foreground/30"
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                );
              })}
            </g>

            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
                className="text-muted-foreground/30"
              >
                <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
              </marker>
            </defs>

            {/* Draw nodes */}
            <g className="nodes">
              {nodes.map(node => (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                  <foreignObject width="200" height="80">
                    <div className="p-1">
                      <div
                        className={cn(
                          'rounded-lg border-2 p-3 bg-card shadow-sm transition-all hover:shadow-md',
                          getStatusColor(node.status, node.type),
                          node.id === focusId && 'ring-2 ring-primary ring-offset-2'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1">
                            {node.type === 'milestone' ? (
                              <Target className="h-3 w-3 text-white" />
                            ) : (
                              <GitBranch className="h-3 w-3 text-white" />
                            )}
                            <span className="text-xs font-medium text-white capitalize">
                              {node.type}
                            </span>
                          </div>
                          {getStatusIcon(node.status) && (
                            <div className="text-white">
                              {getStatusIcon(node.status)}
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white truncate" title={node.title}>
                          {node.title}
                        </p>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-muted-foreground">Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-muted-foreground">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-muted-foreground">Upcoming</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-500"></div>
            <span className="text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Task</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-500" />
            <span className="text-muted-foreground">Milestone</span>
          </div>
        </div>

        {focusNode && nodes.length > 1 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-medium">Dependency Chain:</span> Showing {nodes.length - 1} related {nodes.length - 1 === 1 ? 'item' : 'items'} connected to "{focusNode.title}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DependencyGraph;

