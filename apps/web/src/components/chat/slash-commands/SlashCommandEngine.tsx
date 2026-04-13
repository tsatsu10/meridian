// Slash command engine for chat with bot integrations
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Zap, 
  Calendar, 
  Users, 
  FolderKanban,
  Search,
  Settings,
  HelpCircle,
  Hash,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle,
} from 'lucide-react';

// Slash command definitions
interface SlashCommand {
  command: string;
  description: string;
  usage: string;
  category: 'task' | 'team' | 'bot' | 'utility' | 'workspace';
  icon: React.ComponentType<{ className?: string }>;
  handler: (args: string[], context: CommandContext) => Promise<CommandResult>;
  aliases?: string[];
  permissions?: string[];
}

interface CommandContext {
  workspaceId: string;
  channelId?: string;
  userId: string;
  teamId?: string;
}

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  embedData?: {
    title: string;
    description: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    color?: string;
  };
}

// Built-in slash commands
const SLASH_COMMANDS: SlashCommand[] = [
  // Task Management Commands
  {
    command: '/task',
    description: 'Create a new task',
    usage: '/task <title> [description]',
    category: 'task',
    icon: CheckCircle,
    handler: async (args, context) => {
      if (args.length === 0) {
        return {
          success: false,
          message: 'Please provide a task title. Usage: /task <title> [description]'
        };
      }
      
      const title = args[0];
      const description = args.slice(1).join(' ');
      
      // TODO: Create task via API
      return {
        success: true,
        message: `Task "${title}" created successfully`,
        embedData: {
          title: 'Task Created',
          description: title,
          fields: description ? [{ name: 'Description', value: description }] : [],
          color: '#10b981'
        }
      };
    },
    aliases: ['/todo', '/create-task']
  },
  
  {
    command: '/assign',
    description: 'Assign a task to a team member',
    usage: '/assign <task-id> <@user>',
    category: 'task',
    icon: Users,
    handler: async (args, context) => {
      if (args.length < 2) {
        return {
          success: false,
          message: 'Usage: /assign <task-id> <@user>'
        };
      }
      
      const taskId = args[0];
      const userId = args[1].replace('@', '');
      
      // TODO: Assign task via API
      return {
        success: true,
        message: `Task ${taskId} assigned to ${userId}`,
        embedData: {
          title: 'Task Assigned',
          description: `Task ${taskId} has been assigned`,
          fields: [{ name: 'Assignee', value: userId }],
          color: '#3b82f6'
        }
      };
    }
  },

  // Team Commands
  {
    command: '/team',
    description: 'Create or manage teams',
    usage: '/team <action> [parameters]',
    category: 'team',
    icon: Users,
    handler: async (args, context) => {
      if (args.length === 0) {
        return {
          success: false,
          message: 'Usage: /team <create|invite|list> [parameters]'
        };
      }
      
      const action = args[0].toLowerCase();
      
      switch (action) {
        case 'create':
          const teamName = args.slice(1).join(' ');
          if (!teamName) {
            return {
              success: false,
              message: 'Usage: /team create <team-name>'
            };
          }
          return {
            success: true,
            message: `Team "${teamName}" created successfully`,
            embedData: {
              title: 'Team Created',
              description: teamName,
              color: '#8b5cf6'
            }
          };
          
        case 'list':
          return {
            success: true,
            message: 'Fetching team list...',
            embedData: {
              title: 'Teams',
              description: 'Your active teams',
              fields: [
                { name: 'Development', value: '5 members', inline: true },
                { name: 'Design', value: '3 members', inline: true },
                { name: 'Marketing', value: '4 members', inline: true },
              ],
              color: '#06b6d4'
            }
          };
          
        default:
          return {
            success: false,
            message: 'Unknown team action. Use: create, invite, or list'
          };
      }
    }
  },

  // Bot Commands
  {
    command: '/remind',
    description: 'Set a reminder',
    usage: '/remind <time> <message>',
    category: 'bot',
    icon: Clock,
    handler: async (args, context) => {
      if (args.length < 2) {
        return {
          success: false,
          message: 'Usage: /remind <time> <message> (e.g., /remind 2h Review the proposal)'
        };
      }
      
      const time = args[0];
      const message = args.slice(1).join(' ');
      
      return {
        success: true,
        message: `Reminder set for ${time}: "${message}"`,
        embedData: {
          title: 'Reminder Set',
          description: message,
          fields: [{ name: 'Time', value: time }],
          color: '#f59e0b'
        }
      };
    },
    aliases: ['/reminder']
  },

  {
    command: '/weather',
    description: 'Get weather information',
    usage: '/weather [location]',
    category: 'bot',
    icon: Bot,
    handler: async (args, context) => {
      const location = args.length > 0 ? args.join(' ') : 'Current location';
      
      // Mock weather data
      return {
        success: true,
        message: `Weather for ${location}`,
        embedData: {
          title: `Weather in ${location}`,
          description: '72°F, Partly Cloudy',
          fields: [
            { name: 'High', value: '78°F', inline: true },
            { name: 'Low', value: '65°F', inline: true },
            { name: 'Humidity', value: '60%', inline: true },
          ],
          color: '#06b6d4'
        }
      };
    }
  },

  // Utility Commands
  {
    command: '/search',
    description: 'Search across workspace',
    usage: '/search <query>',
    category: 'utility',
    icon: Search,
    handler: async (args, context) => {
      if (args.length === 0) {
        return {
          success: false,
          message: 'Usage: /search <query>'
        };
      }
      
      const query = args.join(' ');
      
      return {
        success: true,
        message: `Searching for "${query}"...`,
        embedData: {
          title: 'Search Results',
          description: `Results for "${query}"`,
          fields: [
            { name: 'Messages', value: '12 results' },
            { name: 'Files', value: '3 results' },
            { name: 'Tasks', value: '5 results' },
          ],
          color: '#6366f1'
        }
      };
    }
  },

  {
    command: '/help',
    description: 'Show available commands',
    usage: '/help [command]',
    category: 'utility',
    icon: HelpCircle,
    handler: async (args, context) => {
      if (args.length > 0) {
        const commandName = args[0].startsWith('/') ? args[0] : `/${args[0]}`;
        const command = SLASH_COMMANDS.find(cmd => 
          cmd.command === commandName || cmd.aliases?.includes(commandName)
        );
        
        if (!command) {
          return {
            success: false,
            message: `Command "${commandName}" not found`
          };
        }
        
        return {
          success: true,
          message: `Help for ${command.command}`,
          embedData: {
            title: command.command,
            description: command.description,
            fields: [
              { name: 'Usage', value: command.usage },
              { name: 'Category', value: command.category },
            ],
            color: '#8b5cf6'
          }
        };
      }
      
      const categories = SLASH_COMMANDS.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
      }, {} as Record<string, SlashCommand[]>);
      
      const fields = Object.entries(categories).map(([category, commands]) => ({
        name: category.charAt(0).toUpperCase() + category.slice(1),
        value: commands.map(cmd => cmd.command).join(', ')
      }));
      
      return {
        success: true,
        message: 'Available slash commands',
        embedData: {
          title: 'Slash Commands Help',
          description: 'Type /help <command> for detailed information',
          fields,
          color: '#10b981'
        }
      };
    }
  },

  // Workspace Commands
  {
    command: '/status',
    description: 'Show workspace status',
    usage: '/status',
    category: 'workspace',
    icon: Settings,
    handler: async (args, context) => {
      return {
        success: true,
        message: 'Workspace status',
        embedData: {
          title: 'Workspace Status',
          description: 'Current workspace information',
          fields: [
            { name: 'Active Users', value: '24', inline: true },
            { name: 'Open Tasks', value: '47', inline: true },
            { name: 'Teams', value: '8', inline: true },
            { name: 'Projects', value: '12', inline: true },
            { name: 'Messages Today', value: '156', inline: true },
            { name: 'Storage Used', value: '2.4 GB', inline: true },
          ],
          color: '#059669'
        }
      };
    }
  },
];

// Command parser
export class SlashCommandParser {
  static parse(input: string): { command: string; args: string[] } | null {
    if (!input.startsWith('/')) return null;
    
    const parts = input.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);
    
    return { command, args };
  }
  
  static findCommand(commandName: string): SlashCommand | null {
    return SLASH_COMMANDS.find(cmd => 
      cmd.command === commandName || cmd.aliases?.includes(commandName)
    ) || null;
  }
  
  static getAllCommands(): SlashCommand[] {
    return SLASH_COMMANDS;
  }
  
  static getCommandsByCategory(category: string): SlashCommand[] {
    return SLASH_COMMANDS.filter(cmd => cmd.category === category);
  }
}

// Slash command autocomplete component
interface SlashCommandAutocompleteProps {
  input: string;
  onSelect: (command: string) => void;
  isVisible: boolean;
  position: { top: number; left: number };
}

export const SlashCommandAutocomplete: React.FC<SlashCommandAutocompleteProps> = ({
  input,
  onSelect,
  isVisible,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  
  const parsed = SlashCommandParser.parse(input);
  const searchTerm = parsed?.command.toLowerCase().slice(1) || '';
  
  const filteredCommands = React.useMemo(() => {
    if (!searchTerm) return SLASH_COMMANDS.slice(0, 8);
    
    return SLASH_COMMANDS.filter(cmd =>
      cmd.command.toLowerCase().includes(searchTerm) ||
      cmd.description.toLowerCase().includes(searchTerm) ||
      cmd.aliases?.some(alias => alias.toLowerCase().includes(searchTerm))
    ).slice(0, 8);
  }, [searchTerm]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex].command + ' ');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectedIndex, filteredCommands, onSelect]);

  if (!isVisible || filteredCommands.length === 0) return null;

  const categoryColors = {
    task: 'bg-green-100 text-green-800',
    team: 'bg-purple-100 text-purple-800',
    bot: 'bg-blue-100 text-blue-800',
    utility: 'bg-gray-100 text-gray-800',
    workspace: 'bg-orange-100 text-orange-800',
  };

  return (
    <div
      ref={listRef}
      className="fixed z-50 w-80 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2">
        <div className="flex items-center gap-2 mb-2 px-2 py-1">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Slash Commands</span>
        </div>
        
        {filteredCommands.map((command, index) => {
          const Icon = command.icon;
          return (
            <div
              key={command.command}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded cursor-pointer transition-colors',
                index === selectedIndex 
                  ? 'bg-accent text-accent-foreground' 
                  : 'hover:bg-muted'
              )}
              onClick={() => onSelect(command.command + ' ')}
            >
              <div className="flex items-center justify-center h-8 w-8 rounded bg-muted">
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{command.command}</span>
                  <Badge 
                    variant="outline" 
                    className={cn('text-xs', categoryColors[command.category])}
                  >
                    {command.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {command.description}
                </p>
              </div>
              
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Command execution hook
export const useSlashCommands = () => {
  const executeCommand = useCallback(async (
    input: string,
    context: CommandContext
  ): Promise<CommandResult> => {
    const parsed = SlashCommandParser.parse(input);
    if (!parsed) {
      return {
        success: false,
        message: 'Invalid command format'
      };
    }
    
    const command = SlashCommandParser.findCommand(parsed.command);
    if (!command) {
      return {
        success: false,
        message: `Unknown command: ${parsed.command}. Type /help for available commands.`
      };
    }
    
    try {
      return await command.handler(parsed.args, context);
    } catch (error) {
      console.error('Command execution error:', error);
      return {
        success: false,
        message: 'Command execution failed. Please try again.'
      };
    }
  }, []);
  
  const getCommandSuggestions = useCallback((input: string) => {
    const parsed = SlashCommandParser.parse(input);
    if (!parsed) return [];
    
    const searchTerm = parsed.command.toLowerCase().slice(1);
    return SLASH_COMMANDS.filter(cmd =>
      cmd.command.toLowerCase().includes(searchTerm) ||
      cmd.description.toLowerCase().includes(searchTerm)
    );
  }, []);
  
  return {
    executeCommand,
    getCommandSuggestions,
    getAllCommands: SlashCommandParser.getAllCommands,
    getCommandsByCategory: SlashCommandParser.getCommandsByCategory,
  };
};

export default SlashCommandParser;