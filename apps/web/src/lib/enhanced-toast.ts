import { toast } from 'sonner';

interface ShortcutToastOptions {
  message: string;
  shortcut?: string;
  action?: string;
  duration?: number;
}

function formatShortcut(shortcut: string): string {
  const isMac = navigator.platform.toLowerCase().includes('mac');
  
  return shortcut
    .replace('Cmd', isMac ? '⌘' : 'Ctrl')
    .replace('Ctrl', isMac ? '⌘' : 'Ctrl')
    .replace('Alt', isMac ? '⌥' : 'Alt')
    .replace('Shift', isMac ? '⇧' : 'Shift');
}

export const enhancedToast = {
  success: (message: string, shortcut?: string) => {
    const formattedMessage = shortcut 
      ? `${message} (${formatShortcut(shortcut)})`
      : message;
    return toast.success(formattedMessage);
  },

  info: (message: string, shortcut?: string) => {
    const formattedMessage = shortcut 
      ? `${message} (${formatShortcut(shortcut)})`
      : message;
    return toast.info(formattedMessage);
  },

  error: (message: string, shortcut?: string) => {
    const formattedMessage = shortcut 
      ? `${message} (${formatShortcut(shortcut)})`
      : message;
    return toast.error(formattedMessage);
  },

  // Specific shortcuts for common actions
  taskCreated: (taskTitle?: string) => {
    const message = taskTitle 
      ? `Task "${taskTitle}" created successfully!`
      : 'Task created successfully!';
    return enhancedToast.success(message, 'Cmd+N');
  },

  statusUpdated: (count: number, status: string) => {
    const message = `${count} task${count > 1 ? 's' : ''} updated to ${status}`;
    const shortcut = count > 1 ? 'Select + 1-4' : '1-4';
    return enhancedToast.success(message, shortcut);
  },

  priorityUpdated: (count: number, priority: string) => {
    const message = `${count} task${count > 1 ? 's' : ''} set to ${priority} priority`;
    const shortcut = count > 1 ? 'Select + U/H/M/L' : 'U/H/M/L';
    return enhancedToast.success(message, shortcut);
  },

  tasksSelected: (count: number) => {
    return enhancedToast.info(`${count} tasks selected`, 'Cmd+A for all');
  },

  selectionCleared: () => {
    return enhancedToast.info('Selection cleared', 'Esc');
  },

  commandPalette: () => {
    return enhancedToast.info('Command palette opened', 'Cmd+K');
  },

  helpShown: () => {
    return enhancedToast.info('Keyboard shortcuts help', '?');
  },

  shortcutHint: (action: string, shortcut: string) => {
    return enhancedToast.info(`Tip: ${action}`, shortcut);
  },
};

export default enhancedToast; 