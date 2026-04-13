import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  BookTemplate, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare,
  Users,
  Calendar,
  FileText,
  Star,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: 'meeting' | 'status' | 'request' | 'announcement' | 'follow-up' | 'custom';
  variables?: string[];
  icon?: React.ReactElement;
  isCustom?: boolean;
}

interface MessageTemplatesProps {
  onTemplateSelect: (template: MessageTemplate) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

// Predefined professional message templates
const DEFAULT_TEMPLATES: MessageTemplate[] = [
  // Meeting templates
  {
    id: 'meeting-invite',
    title: 'Meeting Invitation',
    content: `Hi everyone! 👋

I'd like to schedule a meeting to discuss {{topic}}.

📅 **When:** {{date}} at {{time}}
📍 **Where:** {{location}}
⏱️ **Duration:** {{duration}}

**Agenda:**
- {{agenda_item_1}}
- {{agenda_item_2}}
- {{agenda_item_3}}

Please let me know if you can attend. Thanks!`,
    category: 'meeting',
    variables: ['topic', 'date', 'time', 'location', 'duration', 'agenda_item_1', 'agenda_item_2', 'agenda_item_3'],
    icon: <Calendar className="h-4 w-4" />
  },
  {
    id: 'meeting-follow-up',
    title: 'Meeting Follow-up',
    content: `Thanks everyone for joining today's meeting! 📝

**Key decisions:**
- {{decision_1}}
- {{decision_2}}

**Action items:**
- {{action_1}} (Owner: {{owner_1}}, Due: {{due_1}})
- {{action_2}} (Owner: {{owner_2}}, Due: {{due_2}})

**Next steps:**
{{next_steps}}

Let me know if I missed anything!`,
    category: 'follow-up',
    variables: ['decision_1', 'decision_2', 'action_1', 'owner_1', 'due_1', 'action_2', 'owner_2', 'due_2', 'next_steps'],
    icon: <FileText className="h-4 w-4" />
  },

  // Status updates
  {
    id: 'status-update',
    title: 'Status Update',
    content: `📊 **Status Update - {{project_name}}**

**Completed this week:**
✅ {{completed_1}}
✅ {{completed_2}}

**In progress:**
🔄 {{in_progress_1}}
🔄 {{in_progress_2}}

**Upcoming:**
📋 {{upcoming_1}}
📋 {{upcoming_2}}

**Blockers:**
{{blockers}}

Overall status: {{status}} 🎯`,
    category: 'status',
    variables: ['project_name', 'completed_1', 'completed_2', 'in_progress_1', 'in_progress_2', 'upcoming_1', 'upcoming_2', 'blockers', 'status'],
    icon: <CheckCircle className="h-4 w-4" />
  },
  {
    id: 'quick-update',
    title: 'Quick Status',
    content: `Quick update on {{task_name}}: {{status}} {{emoji}}

{{details}}

ETA: {{eta}}`,
    category: 'status',
    variables: ['task_name', 'status', 'emoji', 'details', 'eta'],
    icon: <Clock className="h-4 w-4" />
  },

  // Requests
  {
    id: 'help-request',
    title: 'Help Request',
    content: `Hi {{name}}! 🙋‍♂️

I need help with {{issue}}. 

**What I've tried:**
- {{attempt_1}}
- {{attempt_2}}

**Expected outcome:**
{{expected}}

**Urgency:** {{urgency}}

Would you be able to help when you have a moment? Thanks!`,
    category: 'request',
    variables: ['name', 'issue', 'attempt_1', 'attempt_2', 'expected', 'urgency'],
    icon: <AlertCircle className="h-4 w-4" />
  },
  {
    id: 'feedback-request',
    title: 'Feedback Request',
    content: `Hi {{name}}! 

I'd love to get your feedback on {{item}}. 

{{context}}

**Specific questions:**
- {{question_1}}
- {{question_2}}

No rush, but if you could review by {{deadline}}, that would be great! 

Thanks! 🙏`,
    category: 'request',
    variables: ['name', 'item', 'context', 'question_1', 'question_2', 'deadline'],
    icon: <MessageSquare className="h-4 w-4" />
  },

  // Announcements
  {
    id: 'team-announcement',
    title: 'Team Announcement',
    content: `📢 **Team Announcement**

{{announcement_title}}

{{details}}

**Important dates:**
- {{date_1}}: {{event_1}}
- {{date_2}}: {{event_2}}

{{action_required}}

Questions? Feel free to reach out!`,
    category: 'announcement',
    variables: ['announcement_title', 'details', 'date_1', 'event_1', 'date_2', 'event_2', 'action_required'],
    icon: <Users className="h-4 w-4" />
  },

  // Simple templates
  {
    id: 'thanks',
    title: 'Thank You',
    content: `Thanks {{name}}! 🙏 

{{reason}}

Really appreciate it!`,
    category: 'follow-up',
    variables: ['name', 'reason'],
    icon: <Star className="h-4 w-4" />
  },
  {
    id: 'congrats',
    title: 'Congratulations',
    content: `Congratulations {{name}}! 🎉

{{achievement}} - that's awesome!

{{personal_message}}

Well deserved! 👏`,
    category: 'announcement',
    variables: ['name', 'achievement', 'personal_message'],
    icon: <Star className="h-4 w-4" />
  }
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: BookTemplate },
  { id: 'meeting', name: 'Meetings', icon: Calendar },
  { id: 'status', name: 'Status', icon: CheckCircle },
  { id: 'request', name: 'Requests', icon: AlertCircle },
  { id: 'announcement', name: 'Announcements', icon: Users },
  { id: 'follow-up', name: 'Follow-up', icon: MessageSquare },
  { id: 'custom', name: 'Custom', icon: Plus },
];

export default function MessageTemplates({ onTemplateSelect, trigger, disabled = false }: MessageTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customTemplates, setCustomTemplates] = useState<MessageTemplate[]>([]);

  // Combine default and custom templates
  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  // Filter templates
  const filteredTemplates = allTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Handle template selection and variable replacement
  const handleTemplateSelect = (template: MessageTemplate) => {
    let content = template.content;
    
    // Simple variable replacement with placeholders
    template.variables?.forEach(variable => {
      const placeholder = `[${variable.replace(/_/g, ' ').toUpperCase()}]`;
      content = content.replace(new RegExp(`{{${variable}}}`, 'g'), placeholder);
    });
    
    onTemplateSelect({
      ...template,
      content
    });
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" disabled={disabled} title="Message templates">
      <BookTemplate className="w-4 h-4" />
    </Button>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" align="start">
        <div className="p-3 border-b bg-white dark:bg-gray-900">
          <div className="relative mb-3">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Category filters */}
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="h-7 text-xs"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {category.name}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto bg-white dark:bg-gray-900">
          {filteredTemplates.length > 0 ? (
            <div className="p-2 space-y-1">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="w-full p-3 text-left hover:bg-muted rounded-md transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-muted-foreground group-hover:text-foreground">
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{template.title}</span>
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                        {template.isCustom && (
                          <Badge variant="outline" className="text-xs">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.content.split('\n')[0].substring(0, 80)}...
                      </p>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.variables.slice(0, 3).map((variable) => (
                            <Badge key={variable} variant="outline" className="text-xs px-1 py-0">
                              {variable}
                            </Badge>
                          ))}
                          {template.variables.length > 3 && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              +{template.variables.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookTemplate className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No templates found</p>
              <p className="text-xs">Try adjusting your search or category</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-muted-foreground">
            💡 Templates use variables like {`{{name}}`}. They'll be replaced with placeholders for easy editing.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}