import React, { useState, useRef, useEffect } from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  Settings, 
  X, 
  Maximize2, 
  Minimize2, 
  RefreshCw,
  MoreHorizontal,
  Eye,
  EyeOff,
  Copy,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';

export type WidgetSize = 'small' | 'medium' | 'large' | 'extra-large';
export type WidgetType = 
  | 'metric-card' 
  | 'chart' 
  | 'list' 
  | 'calendar' 
  | 'progress' 
  | 'kanban-mini' 
  | 'team-activity' 
  | 'notifications'
  | 'quick-actions'
  | 'custom';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  size: WidgetSize;
  position: { x: number; y: number };
  isVisible: boolean;
  isExpanded: boolean;
  refreshInterval?: number; // in seconds
  customProps?: Record<string, any>;
  permissions?: string[];
}

export interface WidgetContainerProps {
  widget: WidgetConfig;
  children: React.ReactNode;
  onUpdate: (widget: WidgetConfig) => void;
  onRemove: (widgetId: string) => void;
  onDuplicate: (widget: WidgetConfig) => void;
  onResize: (widgetId: string, size: WidgetSize) => void;
  onRefresh: (widgetId: string) => void;
  isDraggable?: boolean;
  isEditing?: boolean;
  className?: string;
}

const sizeClasses = {
  small: 'w-full sm:w-1/2 lg:w-1/3 xl:w-1/4',
  medium: 'w-full sm:w-1/2 lg:w-2/3 xl:w-1/2',
  large: 'w-full lg:w-2/3 xl:w-3/4',
  'extra-large': 'w-full'
};

const heightClasses = {
  small: 'h-48',
  medium: 'h-64',
  large: 'h-80',
  'extra-large': 'h-96'
};

export function WidgetContainer({
  widget,
  children,
  onUpdate,
  onRemove,
  onDuplicate,
  onResize,
  onRefresh,
  isDraggable = true,
  isEditing = false,
  className
}: WidgetContainerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-refresh functionality
  useEffect(() => {
    if (widget.refreshInterval && widget.refreshInterval > 0) {
      const interval = setInterval(() => {
        handleRefresh();
      }, widget.refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [widget.refreshInterval]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh(widget.id);
      toast.success(`${widget.title} refreshed`);
    } catch (error) {
      toast.error('Failed to refresh widget');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleVisibility = () => {
    onUpdate({
      ...widget,
      isVisible: !widget.isVisible
    });
  };

  const handleToggleExpanded = () => {
    onUpdate({
      ...widget,
      isExpanded: !widget.isExpanded
    });
  };

  const handleSizeChange = (newSize: WidgetSize) => {
    onResize(widget.id, newSize);
  };

  const handleDuplicate = () => {
    onDuplicate(widget);
    toast.success(`${widget.title} duplicated`);
  };

  const handleRemove = () => {
    onRemove(widget.id);
    toast.success(`${widget.title} removed`);
  };

  const getWidgetIcon = () => {
    switch (widget.type) {
      case 'metric-card': return '📊';
      case 'chart': return '📈';
      case 'list': return '📋';
      case 'calendar': return '📅';
      case 'progress': return '⏳';
      case 'kanban-mini': return '🔲';
      case 'team-activity': return '👥';
      case 'notifications': return '🔔';
      case 'quick-actions': return '⚡';
      default: return '🔧';
    }
  };

  if (!widget.isVisible && !isEditing) {
    return null;
  }

  const widgetContent = (
    <motion.div
      ref={containerRef}
      className={cn(
        'widget-container',
        sizeClasses[widget.size],
        className,
        widget.isExpanded && 'col-span-full',
        !widget.isVisible && isEditing && 'opacity-50',
        isEditing && 'ring-2 ring-primary/20'
      )}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: widget.isVisible ? 1 : (isEditing ? 0.5 : 0), 
        scale: 1 
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className={cn(
        'h-full transition-all duration-300',
        'glass-card border-border/50',
        isHovered && 'shadow-lg scale-[1.02]',
        isEditing && 'border-primary/50',
        !widget.isVisible && 'grayscale'
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            {isDraggable && isEditing && (
              <button
                className="cursor-grab hover:cursor-grabbing p-1 hover:bg-accent rounded-sm"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <span className="text-sm">{getWidgetIcon()}</span>
            <CardTitle className="text-sm font-medium">
              {widget.title}
            </CardTitle>
            {widget.refreshInterval && (
              <Badge variant="outline" className="text-xs">
                Auto: {widget.refreshInterval}s
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {(isHovered || isEditing) && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className={cn(
                    "h-3 w-3",
                    isRefreshing && "animate-spin"
                  )} />
                </Button>
                
                {isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleExpanded}
                      className="h-6 w-6 p-0"
                    >
                      {widget.isExpanded ? (
                        <Minimize2 className="h-3 w-3" />
                      ) : (
                        <Maximize2 className="h-3 w-3" />
                      )}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleToggleVisibility}>
                          {widget.isVisible ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Hide Widget
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Show Widget
                            </>
                          )}
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={handleDuplicate}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => handleSizeChange('small')}
                          disabled={widget.size === 'small'}
                        >
                          Size: Small
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleSizeChange('medium')}
                          disabled={widget.size === 'medium'}
                        >
                          Size: Medium
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleSizeChange('large')}
                          disabled={widget.size === 'large'}
                        >
                          Size: Large
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleSizeChange('extra-large')}
                          disabled={widget.size === 'extra-large'}
                        >
                          Size: Extra Large
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={handleRemove}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={cn(
          'p-4',
          heightClasses[widget.size],
          'overflow-hidden'
        )}>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (isDraggable && isEditing) {
    return (
      <Reorder.Item
        value={widget}
        dragListener={false}
        dragControls={dragControls}
        className="w-full"
      >
        {widgetContent}
      </Reorder.Item>
    );
  }

  return widgetContent;
} 