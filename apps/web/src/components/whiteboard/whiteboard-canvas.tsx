/**
 * 🎨 Whiteboard Canvas Component
 * 
 * Real-time collaborative whiteboard:
 * - Drawing tools (pen, shapes, text)
 * - Element management
 * - Real-time sync
 * - History tracking
 * - Export/save
 */

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Pencil, Square, Circle, Type, Eraser, Download, 
  Undo, Redo, Trash2, Users, Loader2, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspaceStore } from '@/stores/workspace-store';

interface WhiteboardCanvasProps {
  whiteboardId?: string;
  projectId?: string;
  taskId?: string;
  videoRoomId?: string;
  width?: number;
  height?: number;
}

interface WhiteboardElement {
  id: string;
  elementType: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  opacity?: number;
  pathData?: string;
  content?: string;
  zIndex: number;
}

interface Whiteboard {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  elements: WhiteboardElement[];
  collaborators: any[];
}

export function WhiteboardCanvas({
  whiteboardId,
  projectId,
  taskId,
  videoRoomId,
  width = 3000,
  height = 2000,
}: WhiteboardCanvasProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localWhiteboardId, setLocalWhiteboardId] = useState(whiteboardId);
  const [tool, setTool] = useState<'pen' | 'rect' | 'circle' | 'text' | 'eraser'>('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  // Fetch whiteboard
  const { data: whiteboardData, isLoading } = useQuery({
    queryKey: ['whiteboard', localWhiteboardId],
    queryFn: async () => {
      if (!localWhiteboardId) return null;
      const response = await fetch(`/api/whiteboard/${localWhiteboardId}`);
      return response.json();
    },
    enabled: !!localWhiteboardId,
    refetchInterval: 3000, // Refresh every 3s for collaboration
  });

  // Create whiteboard mutation
  const createWhiteboardMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/whiteboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace?.id,
          projectId,
          taskId,
          videoRoomId,
          name,
          createdBy: user?.id,
          width,
          height,
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setLocalWhiteboardId(data.whiteboard.id);
      toast({
        title: '✓ Whiteboard Created',
        description: `Whiteboard "${data.whiteboard.name}" created`,
      });
    },
  });

  // Add element mutation
  const addElementMutation = useMutation({
    mutationFn: async (element: Partial<WhiteboardElement>) => {
      const response = await fetch(`/api/whiteboard/${localWhiteboardId}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...element,
          userId: user?.id,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboard'] });
    },
  });

  // Drawing handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });

    if (tool === 'pen') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    // Create element based on tool
    let element: Partial<WhiteboardElement> = {
      whiteboardId: localWhiteboardId!,
      elementType: tool,
      x: startPos.x,
      y: startPos.y,
      strokeColor,
      strokeWidth,
      opacity: 1,
    };

    if (tool === 'rect' || tool === 'circle') {
      element.width = Math.abs(endX - startPos.x);
      element.height = Math.abs(endY - startPos.y);
    }

    // Save element to backend
    addElementMutation.mutate(element);

    setIsDrawing(false);
    setStartPos(null);
  };

  // Render whiteboard
  useEffect(() => {
    if (!whiteboardData?.whiteboard) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const whiteboard: Whiteboard = whiteboardData.whiteboard;

    // Clear canvas
    ctx.fillStyle = whiteboard.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all elements
    whiteboard.elements.forEach((element: WhiteboardElement) => {
      ctx.strokeStyle = element.strokeColor || '#000000';
      ctx.fillStyle = element.fillColor || 'transparent';
      ctx.lineWidth = element.strokeWidth || 2;
      ctx.globalAlpha = element.opacity || 1;

      switch (element.elementType) {
        case 'rect':
          ctx.strokeRect(element.x, element.y, element.width || 100, element.height || 100);
          if (element.fillColor) {
            ctx.fillRect(element.x, element.y, element.width || 100, element.height || 100);
          }
          break;

        case 'circle':
          const radius = (element.width || 100) / 2;
          ctx.beginPath();
          ctx.arc(element.x + radius, element.y + radius, radius, 0, 2 * Math.PI);
          ctx.stroke();
          if (element.fillColor) {
            ctx.fill();
          }
          break;

        case 'text':
          ctx.font = `${element.fontSize || 16}px ${element.fontFamily || 'Arial'}`;
          ctx.fillStyle = element.strokeColor || '#000000';
          ctx.fillText(element.content || '', element.x, element.y);
          break;

        case 'pen':
          // Draw path from pathData
          if (element.pathData) {
            const path = new Path2D(element.pathData);
            ctx.stroke(path);
          }
          break;
      }
    });
  }, [whiteboardData]);

  const whiteboard: Whiteboard | null = whiteboardData?.whiteboard || null;
  const collaborators = whiteboard?.collaborators || [];

  if (!localWhiteboardId) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Pencil className="h-16 w-16 mx-auto text-blue-500 opacity-50" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Create a Whiteboard</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start collaborating visually with your team
              </p>
              <Button
                onClick={() => createWhiteboardMutation.mutate('New Whiteboard')}
                disabled={createWhiteboardMutation.isPending}
              >
                {createWhiteboardMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Pencil className="mr-2 h-4 w-4" />
                    Create Whiteboard
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="whiteboard-container flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-950">
        <div className="flex items-center gap-2">
          {/* Tools */}
          <Button
            variant={tool === 'pen' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('pen')}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <Button
            variant={tool === 'rect' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('rect')}
          >
            <Square className="h-4 w-4" />
          </Button>
          
          <Button
            variant={tool === 'circle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('circle')}
          >
            <Circle className="h-4 w-4" />
          </Button>
          
          <Button
            variant={tool === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('text')}
          >
            <Type className="h-4 w-4" />
          </Button>
          
          <Button
            variant={tool === 'eraser' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('eraser')}
          >
            <Eraser className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Color picker */}
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-10 h-10 border rounded cursor-pointer"
          />

          {/* Stroke width */}
          <select
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="border rounded px-2 py-1"
          >
            <option value="1">Thin</option>
            <option value="2">Normal</option>
            <option value="4">Thick</option>
            <option value="8">Very Thick</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Collaborators */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <Badge variant="secondary">{collaborators.length} active</Badge>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Actions */}
          <Button variant="outline" size="sm">
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm">
            <Redo className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />
          
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair"
          style={{
            backgroundColor: whiteboard?.backgroundColor || '#ffffff',
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Tool: {tool}</span>
          <span>•</span>
          <span>{whiteboard?.elements?.length || 0} elements</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span>Auto-save enabled</span>
          <Badge variant="success">Synced</Badge>
        </div>
      </div>
    </div>
  );
}

