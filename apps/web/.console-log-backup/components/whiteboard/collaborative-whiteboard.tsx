/**
 * Collaborative Whiteboard Component
 * Real-time collaborative canvas with drawing tools
 * Phase 4.2 - Whiteboard Collaboration
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  Pencil,
  Eraser,
  Square,
  Circle,
  ArrowRight,
  Type,
  Image as ImageIcon,
  Undo,
  Redo,
  Download,
  Users,
  MessageSquare,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
  Hand,
  Layers,
} from 'lucide-react';

interface Element {
  id: string;
  elementType: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  pathData?: string;
  content?: string;
  fontSize?: number;
}

interface Collaborator {
  id: string;
  userId: string;
  displayName: string;
  cursorX: number | null;
  cursorY: number | null;
  cursorColor: string;
  isActive: boolean;
}

interface CollaborativeWhiteboardProps {
  whiteboardId: string;
  userId: string;
  displayName: string;
  onClose?: () => void;
}

export function CollaborativeWhiteboard({
  whiteboardId,
  userId,
  displayName,
  onClose,
}: CollaborativeWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [zoom, setZoom] = useState(1);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [whiteboard, setWhiteboard] = useState<any>(null);

  useEffect(() => {
    // Load whiteboard
    loadWhiteboard();
    // Join whiteboard
    joinWhiteboard();

    // Setup WebSocket for real-time updates
    // In production, this would use Socket.IO
    // io.on('whiteboard:element-added', handleElementAdded);
    // io.on('whiteboard:element-updated', handleElementUpdated);
    // io.on('whiteboard:cursor-moved', handleCursorMoved);

    return () => {
      leaveWhiteboard();
    };
  }, []);

  useEffect(() => {
    // Redraw canvas when elements change
    drawCanvas();
  }, [elements, zoom]);

  const loadWhiteboard = async () => {
    try {
      const response = await fetch(`/api/whiteboard/${whiteboardId}`);
      const data = await response.json();
      setWhiteboard(data.whiteboard);
      setElements(data.whiteboard.elements || []);
      setCollaborators(data.whiteboard.collaborators || []);
    } catch (error) {
      console.error('Failed to load whiteboard:', error);
    }
  };

  const joinWhiteboard = async () => {
    try {
      const response = await fetch(`/api/whiteboard/${whiteboardId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          displayName,
          role: 'editor',
        }),
      });

      const data = await response.json();
      console.log('Joined whiteboard:', data);
    } catch (error) {
      console.error('Failed to join whiteboard:', error);
    }
  };

  const leaveWhiteboard = async () => {
    try {
      await fetch(`/api/whiteboard/${whiteboardId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error('Failed to leave whiteboard:', error);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom
    ctx.save();
    ctx.scale(zoom, zoom);

    // Draw elements
    elements.forEach((element) => {
      ctx.strokeStyle = element.strokeColor;
      ctx.fillStyle = element.fillColor || 'transparent';
      ctx.lineWidth = element.strokeWidth;

      switch (element.elementType) {
        case 'path':
          if (element.pathData) {
            const path = new Path2D(element.pathData);
            ctx.stroke(path);
          }
          break;

        case 'rectangle':
          ctx.strokeRect(element.x, element.y, element.width || 0, element.height || 0);
          if (element.fillColor && element.fillColor !== 'transparent') {
            ctx.fillRect(element.x, element.y, element.width || 0, element.height || 0);
          }
          break;

        case 'circle':
          ctx.beginPath();
          const radius = Math.min(element.width || 0, element.height || 0) / 2;
          ctx.arc(element.x + radius, element.y + radius, radius, 0, Math.PI * 2);
          ctx.stroke();
          if (element.fillColor && element.fillColor !== 'transparent') {
            ctx.fill();
          }
          break;

        case 'text':
          if (element.content) {
            ctx.font = `${element.fontSize || 16}px Arial`;
            ctx.fillStyle = element.strokeColor;
            ctx.fillText(element.content, element.x, element.y);
          }
          break;
      }
    });

    ctx.restore();

    // Draw collaborator cursors
    collaborators.forEach((collab) => {
      if (collab.isActive && collab.cursorX !== null && collab.cursorY !== null && collab.userId !== userId) {
        ctx.fillStyle = collab.cursorColor;
        ctx.beginPath();
        ctx.arc(collab.cursorX * zoom, collab.cursorY * zoom, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw name label
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(collab.displayName, (collab.cursorX * zoom) + 10, (collab.cursorY * zoom) - 5);
      }
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Update cursor position
    updateCursor(x, y);

    if (!isDrawing) return;

    setCurrentPath((prev) => [...prev, { x, y }]);

    // Draw preview
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (selectedTool === 'pen') {
      const path = currentPath.concat([{ x, y }]);
      ctx.beginPath();
      ctx.moveTo(path[0].x * zoom, path[0].y * zoom);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * zoom, path[i].y * zoom);
      }
      ctx.stroke();
    }
  };

  const handleMouseUp = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPath.length < 2) return;

    // Create element
    const element: any = {
      whiteboardId,
      elementType: selectedTool === 'pen' ? 'path' : selectedTool,
      userId,
      x: currentPath[0].x,
      y: currentPath[0].y,
      strokeColor,
      fillColor,
      strokeWidth,
    };

    if (selectedTool === 'pen') {
      // Convert path to SVG path data
      let pathData = `M ${currentPath[0].x} ${currentPath[0].y}`;
      for (let i = 1; i < currentPath.length; i++) {
        pathData += ` L ${currentPath[i].x} ${currentPath[i].y}`;
      }
      element.pathData = pathData;
    } else if (selectedTool === 'rectangle' || selectedTool === 'circle') {
      element.width = Math.abs(currentPath[currentPath.length - 1].x - currentPath[0].x);
      element.height = Math.abs(currentPath[currentPath.length - 1].y - currentPath[0].y);
    }

    // Add to server
    try {
      const response = await fetch(`/api/whiteboard/${whiteboardId}/element`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(element),
      });

      const data = await response.json();
      setElements((prev) => [...prev, data.element]);
    } catch (error) {
      console.error('Failed to add element:', error);
    }

    setCurrentPath([]);
  };

  const updateCursor = async (x: number, y: number) => {
    try {
      await fetch(`/api/whiteboard/${whiteboardId}/cursor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cursorX: x, cursorY: y }),
      });
    } catch (error) {
      // Silently fail for cursor updates
    }
  };

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`/api/whiteboard/${whiteboardId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          format,
          resolution: '2x',
        }),
      });

      const data = await response.json();
      // Download file
      window.open(data.export.fileUrl, '_blank');
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleClearCanvas = async () => {
    if (!confirm('Are you sure you want to clear the canvas?')) return;

    // Delete all elements
    for (const element of elements) {
      try {
        await fetch(`/api/whiteboard/${whiteboardId}/element/${element.id}?userId=${userId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete element:', error);
      }
    }

    setElements([]);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">{whiteboard?.name || 'Whiteboard'}</h2>
            <div className="text-sm text-gray-500">
              {Math.round(zoom * 100)}%
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCollaborators(!showCollaborators)}
              variant="outline"
              size="sm"
            >
              <Users className="w-4 h-4 mr-2" />
              {collaborators.filter(c => c.isActive).length}
            </Button>

            <Button onClick={() => handleExport('png')} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            {onClose && (
              <Button onClick={onClose} variant="outline" size="sm">
                Close
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center gap-2 max-w-7xl mx-auto">
          {/* Drawing Tools */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
            <Button
              onClick={() => setSelectedTool('select')}
              variant={selectedTool === 'select' ? 'default' : 'outline'}
              size="sm"
              title="Select"
            >
              <Hand className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => setSelectedTool('pen')}
              variant={selectedTool === 'pen' ? 'default' : 'outline'}
              size="sm"
              title="Pen"
            >
              <Pencil className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => setSelectedTool('eraser')}
              variant={selectedTool === 'eraser' ? 'default' : 'outline'}
              size="sm"
              title="Eraser"
            >
              <Eraser className="w-4 h-4" />
            </Button>
          </div>

          {/* Shapes */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
            <Button
              onClick={() => setSelectedTool('rectangle')}
              variant={selectedTool === 'rectangle' ? 'default' : 'outline'}
              size="sm"
              title="Rectangle"
            >
              <Square className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => setSelectedTool('circle')}
              variant={selectedTool === 'circle' ? 'default' : 'outline'}
              size="sm"
              title="Circle"
            >
              <Circle className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => setSelectedTool('arrow')}
              variant={selectedTool === 'arrow' ? 'default' : 'outline'}
              size="sm"
              title="Arrow"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Text & Media */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
            <Button
              onClick={() => setSelectedTool('text')}
              variant={selectedTool === 'text' ? 'default' : 'outline'}
              size="sm"
              title="Text"
            >
              <Type className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => setSelectedTool('image')}
              variant={selectedTool === 'image' ? 'default' : 'outline'}
              size="sm"
              title="Image"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* Colors */}
          <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
            <label className="text-sm text-gray-600">Stroke:</label>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <label className="text-sm text-gray-600">Fill:</label>
            <input
              type="color"
              value={fillColor === 'transparent' ? '#ffffff' : fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
            <label className="text-sm text-gray-600">Width:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-600 w-6">{strokeWidth}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
            <Button variant="outline" size="sm" title="Undo">
              <Undo className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="sm" title="Redo">
              <Redo className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
            <Button onClick={handleZoomOut} variant="outline" size="sm" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </Button>

            <Button onClick={handleZoomIn} variant="outline" size="sm" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* More Actions */}
          <div className="flex items-center gap-1">
            <Button onClick={handleClearCanvas} variant="outline" size="sm" title="Clear Canvas">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-gray-100">
        <canvas
          ref={canvasRef}
          width={3000}
          height={2000}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="border border-gray-300 bg-white cursor-crosshair mx-auto my-4"
        />
      </div>

      {/* Collaborators Panel */}
      {showCollaborators && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">
            Active Collaborators ({collaborators.filter(c => c.isActive).length})
          </h3>
          <div className="space-y-2">
            {collaborators
              .filter(c => c.isActive)
              .map((collab) => (
                <div key={collab.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: collab.cursorColor }}
                  />
                  <span className="text-sm">{collab.displayName}</span>
                  {collab.userId === userId && (
                    <span className="text-xs text-gray-500">(You)</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

