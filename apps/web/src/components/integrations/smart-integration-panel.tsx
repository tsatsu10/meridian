import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Calendar,
  CheckSquare,
  Clock,
  Users,
  Brain,
  Zap,
  MessageSquare,
  AlertCircle,
  ChevronRight,
  Settings,
  Filter,
  Download,
  RefreshCw,
  Lightbulb,
  Target,
  TrendingUp,
  Bell
} from 'lucide-react';
import { useCalendarIntegration } from '../../hooks/useCalendarIntegration';
import { useTaskIntegration } from '../../hooks/useTaskIntegration';
import { useMessageParser } from '../../hooks/useMessageParser';
import { useCalendarNotifications } from '../../hooks/useCalendarNotifications';
import { MeetingSchedulerModal } from '../chat/meeting-scheduler-modal';
import { logger } from "../../lib/logger";

interface SmartIntegrationPanelProps {
  chatId: string;
  messageId?: string;
  messageContent?: string;
  messageAuthor?: string;
  participants?: string[];
  isVisible: boolean;
  onClose: () => void;
}

interface IntegrationSuggestion {
  id: string;
  type: 'task' | 'meeting' | 'reminder' | 'project';
  title: string;
  description: string;
  confidence: number;
  data: any;
  completed: boolean;
}

export const SmartIntegrationPanel: React.FC<SmartIntegrationPanelProps> = ({
  chatId,
  messageId,
  messageContent,
  messageAuthor,
  participants = [],
  isVisible,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [suggestions, setSuggestions] = useState<IntegrationSuggestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<IntegrationSuggestion | null>(null);

  const { 
    scheduleMeetingFromChat, 
    upcomingEvents, 
    isLoading: calendarLoading 
  } = useCalendarIntegration();
  
  const { 
    createTaskFromMessage, 
    extractTaskFromMessage, 
    pendingTasks, 
    metrics: taskMetrics,
    isProcessing: taskProcessing 
  } = useTaskIntegration();
  
  const { 
    parseMessage, 
    parseMessageForMeetingData, 
    parseMessageForTaskData,
    isProcessing: parsingProcessing 
  } = useMessageParser();
  
  const { 
    pendingNotifications, 
    recentNotifications 
  } = useCalendarNotifications();

  // Analyze message and generate suggestions
  useEffect(() => {
    if (messageContent && isVisible) {
      analyzeMessage();
    }
  }, [messageContent, isVisible]);

  const analyzeMessage = async () => {
    if (!messageContent || !messageAuthor) return;

    setIsProcessing(true);
    try {
      const context = {
        chatId,
        channelType: 'group' as const,
        participants,
        previousMessages: [],
        currentUser: messageAuthor,
        timestamp: new Date()
      };

      // Parse message for all types of integrations
      const parseResult = await parseMessage(messageContent, context);
      const generatedSuggestions: IntegrationSuggestion[] = [];

      // Process suggestions from parser
      parseResult.suggestions.forEach((suggestion, index) => {
        generatedSuggestions.push({
          id: `suggestion-${index}`,
          type: suggestion.type === 'create_task' ? 'task' : 
                suggestion.type === 'schedule_meeting' ? 'meeting' : 'reminder',
          title: suggestion.title,
          description: suggestion.description,
          confidence: suggestion.confidence,
          data: suggestion.metadata,
          completed: false
        });
      });

      // Additional analysis for high-confidence suggestions
      if (parseResult.confidence > 0.7) {
        // Check for task creation
        const taskData = await parseMessageForTaskData(messageContent, context);
        if (taskData && !generatedSuggestions.some(s => s.type === 'task')) {
          generatedSuggestions.push({
            id: 'task-suggestion',
            type: 'task',
            title: 'Create Task',
            description: `Convert "${taskData.suggestedTitle}" into a task`,
            confidence: 0.8,
            data: taskData,
            completed: false
          });
        }

        // Check for meeting scheduling
        const meetingData = await parseMessageForMeetingData(messageContent, context);
        if (meetingData && !generatedSuggestions.some(s => s.type === 'meeting')) {
          generatedSuggestions.push({
            id: 'meeting-suggestion',
            type: 'meeting',
            title: 'Schedule Meeting',
            description: `Schedule "${meetingData.suggestedTitle}" with participants`,
            confidence: 0.7,
            data: meetingData,
            completed: false
          });
        }
      }

      setSuggestions(generatedSuggestions.sort((a, b) => b.confidence - a.confidence));
    } catch (error) {
      console.error('Failed to analyze message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestionAction = async (suggestion: IntegrationSuggestion) => {
    if (!messageContent || !messageAuthor) return;

    try {
      switch (suggestion.type) {
        case 'task':
          await createTaskFromMessage(
            messageContent,
            messageAuthor,
            chatId,
            messageId || '',
            participants,
            {
              title: suggestion.data.suggestedTitle,
              priority: suggestion.data.suggestedPriority,
              dueDate: suggestion.data.suggestedDueDate,
              tags: suggestion.data.suggestedTags
            }
          );
          break;

        case 'meeting':
          setSelectedSuggestion(suggestion);
          setShowMeetingModal(true);
          return; // Don't mark as completed yet

        case 'reminder':
          // Would implement reminder creation
          logger.info("Creating reminder:");
          break;

        default:
          logger.info("Unknown suggestion type:");
      }

      // Mark suggestion as completed
      setSuggestions(prev => 
        prev.map(s => 
          s.id === suggestion.id ? { ...s, completed: true } : s
        )
      );
    } catch (error) {
      console.error('Failed to execute suggestion:', error);
    }
  };

  const handleMeetingScheduled = () => {
    if (selectedSuggestion) {
      setSuggestions(prev => 
        prev.map(s => 
          s.id === selectedSuggestion.id ? { ...s, completed: true } : s
        )
      );
      setSelectedSuggestion(null);
    }
    setShowMeetingModal(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'task': return CheckSquare;
      case 'meeting': return Calendar;
      case 'reminder': return Clock;
      case 'project': return Target;
      default: return MessageSquare;
    }
  };

  const renderSuggestions = () => (
    <div className="space-y-4">
      {isProcessing ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 animate-pulse" />
            <span>Analyzing message...</span>
          </div>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No suggestions available for this message</p>
          <p className="text-sm mt-2">Try mentioning dates, tasks, or meetings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => {
            const Icon = getIconForType(suggestion.type);
            return (
              <Card key={suggestion.id} className={`transition-all ${suggestion.completed ? 'opacity-60' : 'hover:shadow-md'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        suggestion.type === 'task' ? 'bg-blue-100 text-blue-600' :
                        suggestion.type === 'meeting' ? 'bg-green-100 text-green-600' :
                        suggestion.type === 'reminder' ? 'bg-orange-100 text-orange-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{suggestion.title}</h4>
                          <Badge className={getConfidenceColor(suggestion.confidence)}>
                            {Math.round(suggestion.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                        
                        {suggestion.data && (
                          <div className="text-xs text-gray-500 space-y-1">
                            {suggestion.data.suggestedTitle && (
                              <div>Title: {suggestion.data.suggestedTitle}</div>
                            )}
                            {suggestion.data.suggestedAssignees && suggestion.data.suggestedAssignees.length > 0 && (
                              <div>Assignees: {suggestion.data.suggestedAssignees.length} person(s)</div>
                            )}
                            {suggestion.data.suggestedDueDate && (
                              <div>Due: {new Date(suggestion.data.suggestedDueDate).toLocaleDateString()}</div>
                            )}
                            {suggestion.data.suggestedParticipants && suggestion.data.suggestedParticipants.length > 0 && (
                              <div>Participants: {suggestion.data.suggestedParticipants.length} person(s)</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {suggestion.completed ? (
                        <Badge variant="outline" className="text-green-600">
                          ✓ Done
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSuggestionAction(suggestion)}
                          disabled={isProcessing || calendarLoading || taskProcessing}
                        >
                          {suggestion.type === 'task' ? 'Create Task' :
                           suggestion.type === 'meeting' ? 'Schedule' :
                           suggestion.type === 'reminder' ? 'Set Reminder' : 'Apply'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingTasks.length}</div>
                <div className="text-sm text-gray-600">Pending Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{upcomingEvents.length}</div>
                <div className="text-sm text-gray-600">Upcoming Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentNotifications.slice(0, 3).map((notification, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                <div className="p-1 bg-blue-100 rounded">
                  <Bell className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{notification.title}</div>
                  <div className="text-xs text-gray-500">
                    {notification.scheduledTime.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {recentNotifications.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Metrics */}
      {taskMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Task Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Completion Rate</span>
                  <span>{Math.round(taskMetrics.completionRate)}%</span>
                </div>
                <Progress value={taskMetrics.completionRate} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Created from Chat</div>
                  <div className="font-medium">{taskMetrics.createdFromChat}</div>
                </div>
                <div>
                  <div className="text-gray-600">Average Time</div>
                  <div className="font-medium">{Math.round(taskMetrics.averageCompletionTime)}h</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integration Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auto-create tasks</div>
              <div className="text-sm text-gray-600">Automatically suggest task creation from messages</div>
            </div>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Meeting scheduling</div>
              <div className="text-sm text-gray-600">Enable smart meeting scheduling suggestions</div>
            </div>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Notifications</div>
              <div className="text-sm text-gray-600">Manage integration notifications</div>
            </div>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connected Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Google Calendar</div>
                <div className="text-sm text-gray-600">Connected</div>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600">Active</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <div className="font-medium">Task Management</div>
                <div className="text-sm text-gray-600">Meridian Tasks</div>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Smart Integrations</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
          
          {messageContent && (
            <div className="mt-3 p-2 bg-white rounded border text-sm">
              <div className="text-gray-600 mb-1">Analyzing message:</div>
              <div className="text-gray-900 line-clamp-2">
                "{messageContent.length > 100 ? messageContent.substring(0, 100) + '...' : messageContent}"
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
              <TabsTrigger value="suggestions" className="text-xs">
                Suggestions
              </TabsTrigger>
              <TabsTrigger value="overview" className="text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-4">
              <TabsContent value="suggestions" className="mt-0">
                {renderSuggestions()}
              </TabsContent>

              <TabsContent value="overview" className="mt-0">
                {renderOverview()}
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                {renderSettings()}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Powered by Meridian AI</span>
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Meeting Scheduler Modal */}
      {showMeetingModal && selectedSuggestion && (
        <MeetingSchedulerModal
          isOpen={showMeetingModal}
          onClose={() => setShowMeetingModal(false)}
          chatId={chatId}
          messageId={messageId}
          initialParticipants={selectedSuggestion.data.suggestedParticipants || participants}
          suggestedTitle={selectedSuggestion.data.suggestedTitle}
          suggestedTime={selectedSuggestion.data.suggestedDate}
          suggestedDuration={selectedSuggestion.data.suggestedDuration}
        />
      )}
    </>
  );
};