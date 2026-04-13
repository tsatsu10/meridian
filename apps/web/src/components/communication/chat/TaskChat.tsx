import { useTaskChannel } from '@/hooks/use-task-channel';
import ChatArea from './ChatArea';
import React from 'react';
import { API_BASE_URL, API_URL } from '@/constants/urls';

export function TaskChat({ taskId, currentUserEmail }: { taskId: string; currentUserEmail: string }) {
  const { data, isLoading, error } = useTaskChannel(taskId);

  if (isLoading) return <div>Loading chat…</div>;
  if (error) return <div>Error loading chat channel.</div>;
  if (!data?.channel) return <div>No chat channel found for this task.</div>;

  return <ChatArea channelId={data.channel.channelId} currentUserEmail={currentUserEmail} />;
}

export function TaskPreview({ taskId }: { taskId: string }) {
  const [task, setTask] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/tasks/${taskId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch task');
        return res.json();
      })
      .then(data => {
        setTask(data.task || data);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [taskId]);

  if (loading) return <div className="bg-gray-100 border rounded p-2 text-xs">Loading task…</div>;
  if (error) return <div className="bg-red-100 border border-red-400 rounded p-2 text-xs">Error: {error}</div>;
  if (!task) return <div className="bg-gray-100 border rounded p-2 text-xs">Task not found</div>;

  return (
    <div className="bg-white border rounded p-2 text-xs shadow-sm">
      <div className="font-bold text-sm mb-1">{task.title}</div>
      <div>Status: <span className="font-medium">{task.status}</span></div>
      {task.assigneeEmail && <div>Assignee: {task.assigneeEmail}</div>}
      {task.dueDate && <div>Due: {new Date(task.dueDate).toLocaleDateString()}</div>}
      <div className="mt-1 text-gray-500">Task ID: {taskId}</div>
    </div>
  );
} 