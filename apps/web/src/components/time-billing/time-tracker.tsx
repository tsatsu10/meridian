/**
 * Time Tracker Component
 * Start/stop timer, view time entries
 * Phase 3.5 - Advanced Time Tracking & Billing
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Play, Pause, Square, Clock, Edit2, Trash2, Calendar } from 'lucide-react';

interface TimeEntry {
  id: string;
  projectId: string;
  taskId?: string;
  description: string;
  startTime: string;
  endTime?: string;
  duration: number;
  isBillable: boolean;
  status: string;
  tags: string[];
}

interface TimeTrackerProps {
  workspaceId: string;
  userId: string;
  projects: any[];
}

export function TimeTracker({ workspaceId, userId, projects }: TimeTrackerProps) {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // New entry form
  const [newEntry, setNewEntry] = useState({
    projectId: '',
    taskId: '',
    description: '',
    isBillable: true,
    tags: [] as string[],
  });

  useEffect(() => {
    loadEntries();
  }, [workspaceId, userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && activeEntry) {
      interval = setInterval(() => {
        const start = new Date(activeEntry.startTime).getTime();
        const now = Date.now();
        setElapsed(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeEntry]);

  const loadEntries = async () => {
    try {
      const response = await fetch(`/api/time/entries?workspaceId=${workspaceId}&userId=${userId}`);
      const data = await response.json();
      
      const active = data.entries.find((e: TimeEntry) => e.status === 'active');
      if (active) {
        setActiveEntry(active);
        setIsRunning(true);
      }
      
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  };

  const startTimer = async () => {
    try {
      const response = await fetch('/api/time/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          userId,
          ...newEntry,
        }),
      });

      const data = await response.json();
      setActiveEntry(data.entry);
      setIsRunning(true);
      setElapsed(0);
      loadEntries();
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const stopTimer = async () => {
    if (!activeEntry) return;

    try {
      await fetch(`/api/time/${activeEntry.id}/stop`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      setActiveEntry(null);
      setIsRunning(false);
      setElapsed(0);
      loadEntries();
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await fetch(`/api/time/${id}`, { method: 'DELETE' });
      loadEntries();
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Active Timer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Time Tracker
          </CardTitle>
          <CardDescription>Track your time on projects and tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRunning && activeEntry ? (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Currently tracking</div>
                  <div className="font-medium">{activeEntry.description || 'No description'}</div>
                </div>
                <div className="text-3xl font-bold font-mono text-blue-600">
                  {formatDuration(elapsed)}
                </div>
              </div>
              <Button onClick={stopTimer} variant="destructive" className="w-full">
                <Square className="w-4 h-4 mr-2" />
                Stop Timer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Project</Label>
                  <Select value={newEntry.projectId} onValueChange={(value) => setNewEntry({ ...newEntry, projectId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Task (optional)</Label>
                  <Input
                    placeholder="Task ID"
                    value={newEntry.taskId}
                    onChange={(e) => setNewEntry({ ...newEntry, taskId: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  placeholder="What are you working on?"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="billable"
                  checked={newEntry.isBillable}
                  onChange={(e) => setNewEntry({ ...newEntry, isBillable: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="billable">Billable</Label>
              </div>

              <Button onClick={startTimer} className="w-full" disabled={!newEntry.projectId}>
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No time entries yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{entry.description || 'No description'}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.startTime).toLocaleString()}
                      {entry.isBillable && (
                        <Badge variant="secondary" className="ml-2">
                          Billable
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono font-semibold">
                        {entry.duration ? formatMinutes(entry.duration) : 'Running...'}
                      </div>
                      <Badge variant={entry.status === 'active' ? 'default' : 'outline'}>
                        {entry.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteEntry(entry.id)} title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

