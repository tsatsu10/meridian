import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Clock, 
  Video, 
  Monitor, 
  Circle, 
  Calendar,
  Plus,
  Settings,
  Briefcase,
  GraduationCap,
  Heart,
  Zap
} from 'lucide-react';

interface MeetingTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  maxParticipants: number;
  defaultDuration: number;
  features: string[];
  color: string;
}

interface MeetingTemplatesProps {
  onSelectTemplate: (template: MeetingTemplate) => void;
  onClose: () => void;
}

const meetingTemplates: MeetingTemplate[] = [
  {
    id: '1-on-1',
    name: '1-on-1 Meeting',
    description: 'Personal conversation or coaching session',
    icon: <Users className="w-6 h-6" />,
    maxParticipants: 2,
    defaultDuration: 30,
    features: ['HD Video', 'Screen Sharing', 'Recording'],
    color: 'bg-blue-500'
  },
  {
    id: 'team-standup',
    name: 'Team Standup',
    description: 'Daily team synchronization meeting',
    icon: <Zap className="w-6 h-6" />,
    maxParticipants: 10,
    defaultDuration: 15,
    features: ['Quick Start', 'Screen Sharing', 'Chat'],
    color: 'bg-green-500'
  },
  {
    id: 'client-meeting',
    name: 'Client Meeting',
    description: 'Professional client presentation or review',
    icon: <Briefcase className="w-6 h-6" />,
    maxParticipants: 8,
    defaultDuration: 60,
    features: ['HD Video', 'Screen Sharing', 'Recording', 'Background Blur'],
    color: 'bg-purple-500'
  },
  {
    id: 'training-session',
    name: 'Training Session',
    description: 'Educational or training workshop',
    icon: <GraduationCap className="w-6 h-6" />,
    maxParticipants: 15,
    defaultDuration: 90,
    features: ['Screen Sharing', 'Recording', 'Chat', 'Polls'],
    color: 'bg-orange-500'
  },
  {
    id: 'brainstorming',
    name: 'Brainstorming',
    description: 'Creative collaboration session',
    icon: <Heart className="w-6 h-6" />,
    maxParticipants: 12,
    defaultDuration: 45,
    features: ['Screen Sharing', 'Whiteboard', 'Chat', 'Breakout Rooms'],
    color: 'bg-pink-500'
  },
  {
    id: 'custom',
    name: 'Custom Meeting',
    description: 'Create your own meeting configuration',
    icon: <Settings className="w-6 h-6" />,
    maxParticipants: 20,
    defaultDuration: 60,
    features: ['All Features', 'Customizable'],
    color: 'bg-gray-500'
  }
];

export function MeetingTemplates({ onSelectTemplate, onClose }: MeetingTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplate | null>(null);
  const [customConfig, setCustomConfig] = useState({
    name: '',
    description: '',
    maxParticipants: 10,
    duration: 30,
    enableRecording: true,
    enableScreenShare: true,
    enableBackgroundBlur: false
  });

  const handleTemplateSelect = (template: MeetingTemplate) => {
    if (template.id === 'custom') {
      setSelectedTemplate(template);
    } else {
      onSelectTemplate(template);
    }
  };

  const handleCustomSubmit = () => {
    const customTemplate: MeetingTemplate = {
      id: 'custom-' + Date.now(),
      name: customConfig.name || 'Custom Meeting',
      description: customConfig.description || 'Custom meeting configuration',
      icon: <Settings className="w-6 h-6" />,
      maxParticipants: customConfig.maxParticipants,
      defaultDuration: customConfig.duration,
      features: [
        ...(customConfig.enableRecording ? ['Recording'] : []),
        ...(customConfig.enableScreenShare ? ['Screen Sharing'] : []),
        ...(customConfig.enableBackgroundBlur ? ['Background Blur'] : []),
        'HD Video',
        'Chat'
      ],
      color: 'bg-gray-500'
    };
    onSelectTemplate(customTemplate);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Meeting Templates
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!selectedTemplate ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meetingTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${template.color} text-white`}>
                        {template.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Max Participants:</span>
                      <Badge variant="secondary">{template.maxParticipants}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <Badge variant="outline">{template.defaultDuration} min</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(null)}>
                  ← Back
                </Button>
                <h3 className="text-lg font-semibold">Custom Meeting Configuration</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-name">Meeting Name</Label>
                  <Input
                    id="meeting-name"
                    placeholder="Enter meeting name"
                    value={customConfig.name}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-participants">Max Participants</Label>
                  <Input
                    id="max-participants"
                    type="number"
                    min="2"
                    max="20"
                    value={customConfig.maxParticipants}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="240"
                    value={customConfig.duration}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Meeting description"
                    value={customConfig.description}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Features</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="recording"
                      checked={customConfig.enableRecording}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, enableRecording: e.target.checked }))}
                    />
                                         <Label htmlFor="recording" className="flex items-center gap-2">
                       <Circle className="w-4 h-4" />
                       Recording
                     </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="screen-share"
                      checked={customConfig.enableScreenShare}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, enableScreenShare: e.target.checked }))}
                    />
                    <Label htmlFor="screen-share" className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Screen Sharing
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="background-blur"
                      checked={customConfig.enableBackgroundBlur}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, enableBackgroundBlur: e.target.checked }))}
                    />
                    <Label htmlFor="background-blur" className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Background Blur
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={handleCustomSubmit}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Meeting
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 