import React, { useState, useEffect } from 'react';
import { useListCalls } from '@/hooks/queries/call/useListCalls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from '@tanstack/react-router';
import { 
  Video, 
  Users, 
  Clock, 
  Calendar,
  Play,
  ExternalLink,
  MoreHorizontal,
  Bell,
  BellOff,
  Copy,
  Edit,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface Call {
  id: string;
  title: string;
  description?: string;
  startTime: number;
  endTime?: number;
  roomId: string;
  participants: string;
  organizerId: string;
  calendarEventId?: string;
}

export function UpcomingCalls({ userId }: { userId: string }) {
  const { data: callsData, isLoading, error } = useListCalls(userId);
  const calls = (callsData as Call[]) || [];
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  // Update countdowns every minute
  useEffect(() => {
    if (!callsData || calls.length === 0) return;

    const updateCountdowns = () => {
      const now = Date.now();
      const newCountdowns: Record<string, string> = {};
      
      calls.forEach((call: Call) => {
        const timeUntil = call.startTime - now;
        if (timeUntil > 0) {
          const minutes = Math.floor(timeUntil / (1000 * 60));
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);
          
          if (days > 0) {
            newCountdowns[call.id] = `${days}d ${hours % 24}h`;
          } else if (hours > 0) {
            newCountdowns[call.id] = `${hours}h ${minutes % 60}m`;
          } else if (minutes > 0) {
            newCountdowns[call.id] = `${minutes}m`;
          } else {
            newCountdowns[call.id] = 'Starting now';
          }
        } else {
          newCountdowns[call.id] = 'Started';
        }
      });
      
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [callsData]);

  const getCallStatus = (call: Call) => {
    const now = Date.now();
    const timeUntil = call.startTime - now;
    
    if (timeUntil < 0) {
      return { status: 'started', color: 'bg-green-500', text: 'In Progress' };
    } else if (timeUntil < 5 * 60 * 1000) { // 5 minutes
      return { status: 'starting', color: 'bg-orange-500', text: 'Starting Soon' };
    } else if (timeUntil < 15 * 60 * 1000) { // 15 minutes
      return { status: 'upcoming', color: 'bg-blue-500', text: 'Upcoming' };
    } else {
      return { status: 'scheduled', color: 'bg-gray-500', text: 'Scheduled' };
    }
  };

  const canJoinCall = (call: Call) => {
    const now = Date.now();
    const timeUntil = call.startTime - now;
    return timeUntil <= 5 * 60 * 1000; // Can join 5 minutes before start
  };

  const copyMeetingLink = (roomId: string) => {
    const link = `${window.location.origin}/video-call/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success('Meeting link copied to clipboard');
  };

  const addToCalendar = (call: Call) => {
    const startDate = new Date(call.startTime);
    const endDate = call.endTime ? new Date(call.endTime) : new Date(call.startTime + 60 * 60 * 1000);
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(call.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(call.description || '')}`;
    
    window.open(calendarUrl, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Upcoming Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-red-600">Error loading calls</div>
        </CardContent>
      </Card>
    );
  }

  if (!calls.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Upcoming Calls
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No upcoming calls scheduled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Upcoming Calls ({calls.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {calls.map((call: Call) => {
            const status = getCallStatus(call);
            const participants = JSON.parse(call.participants || '[]');
            const startDate = new Date(call.startTime);
            const endDate = call.endTime ? new Date(call.endTime) : new Date(call.startTime + 60 * 60 * 1000);
            
            return (
              <div key={call.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{call.title}</h3>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", status.color, "text-white")}
                      >
                        {status.text}
                      </Badge>
                    </div>
                    
                    {call.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {call.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {startDate.toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {participants.length + 1} participants
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {countdowns[call.id] && (
                      <Badge variant="outline" className="text-xs">
                        {countdowns[call.id]}
                      </Badge>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyMeetingLink(call.roomId)}
                      title="Copy meeting link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addToCalendar(call)}
                      title="Add to calendar"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Participants */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex -space-x-2">
                    {participants.slice(0, 5).map((email: string, index: number) => (
                      <Avatar key={index} className="h-8 w-8 border-2 border-background">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">
                          {email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {participants.length > 5 && (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                        +{participants.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                                     {canJoinCall(call) ? (
                     <Button 
                       size="sm" 
                       className="bg-green-600 hover:bg-green-700"
                       onClick={() => window.location.href = `/video-call/${call.roomId}`}
                     >
                       <Play className="h-4 w-4 mr-1" />
                       Join Call
                     </Button>
                   ) : (
                    <Button size="sm" variant="outline" disabled>
                      <Clock className="h-4 w-4 mr-1" />
                      Join in {countdowns[call.id]}
                    </Button>
                  )}

                  {call.organizerId === userId && (
                    <>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 