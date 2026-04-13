import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  History,
  Calendar,
  Clock,
  Users,
  FileVideo,
  MessageSquare,
  Monitor,
  Download,
  Trash2,
  Search,
  Filter,
  SortDesc,
  SortAsc,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  FileText,
  Star,
  Eye,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface CallHistoryEntry {
  id: string;
  roomId: string;
  title?: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  participants: {
    id: string;
    name?: string;
    email?: string;
    joinTime: Date;
    leaveTime?: Date;
  }[];
  recordings: {
    id: string;
    filename: string;
    size: number;
    duration: number;
    format: string;
    path?: string;
  }[];
  notes?: string;
  meetingType: 'scheduled' | 'instant' | 'recurring';
  quality: {
    avgAudioQuality: number;
    avgVideoQuality: number;
    connectionIssues: number;
  };
  chatMessages: {
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
  }[];
  screenShareEvents: {
    participantId: string;
    startTime: Date;
    endTime?: Date;
  }[];
  createdBy: string;
  status: 'completed' | 'ongoing' | 'failed' | 'cancelled';
}

interface CallHistoryProps {
  callHistory: CallHistoryEntry[];
  onDeleteCall: (callId: string) => void;
  onAddNotes: (callId: string, notes: string) => void;
  formatDuration: (seconds: number) => string;
  getStatistics: () => any;
  isVisible: boolean;
  onClose: () => void;
}

export function CallHistory({
  callHistory,
  onDeleteCall,
  onAddNotes,
  formatDuration,
  getStatistics,
  isVisible,
  onClose
}: CallHistoryProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'analytics'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [selectedCalls, setSelectedCalls] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const statistics = getStatistics();

  const filteredHistory = callHistory.filter(call =>
    call.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    call.participants.some(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    call.roomId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCallSelection = (callId: string) => {
    const newSelection = new Set(selectedCalls);
    if (newSelection.has(callId)) {
      newSelection.delete(callId);
    } else {
      newSelection.add(callId);
    }
    setSelectedCalls(newSelection);
  };

  const selectAllCalls = () => {
    if (selectedCalls.size === filteredHistory.length) {
      setSelectedCalls(new Set());
    } else {
      setSelectedCalls(new Set(filteredHistory.map(c => c.id)));
    }
  };

  const deleteSelectedCalls = () => {
    selectedCalls.forEach(callId => onDeleteCall(callId));
    setSelectedCalls(new Set());
    toast.success(`Deleted ${selectedCalls.size} calls`);
  };

  const exportCallData = (call: CallHistoryEntry) => {
    const exportData = {
      title: call.title,
      startTime: call.startTime.toISOString(),
      endTime: call.endTime?.toISOString(),
      duration: call.duration,
      participants: call.participants,
      recordings: call.recordings,
      notes: call.notes,
      chatMessages: call.chatMessages,
      screenShareEvents: call.screenShareEvents,
      quality: call.quality
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-data-${call.roomId}-${call.startTime.toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Call data exported');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-green-500';
    if (quality >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Call History
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'history' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <History className="w-4 h-4 inline mr-2" />
              Call History ({callHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === 'analytics' 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
          </div>

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Search and Controls */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search calls..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                {selectedCalls.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={deleteSelectedCalls}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedCalls.size})
                  </Button>
                )}
              </div>

              {/* Bulk Actions */}
              {filteredHistory.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCalls.size === filteredHistory.length && filteredHistory.length > 0}
                    onChange={selectAllCalls}
                    className="rounded"
                  />
                  <span className="text-gray-600">
                    {selectedCalls.size > 0 ? `${selectedCalls.size} selected` : 'Select all'}
                  </span>
                </div>
              )}

              {/* Call History List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Call History</h3>
                    <p className="text-gray-600">Your completed calls will appear here</p>
                  </div>
                ) : (
                  filteredHistory.map((call) => (
                    <Card key={call.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedCalls.has(call.id)}
                            onChange={() => toggleCallSelection(call.id)}
                            className="rounded mt-1"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium truncate">{call.title}</h4>
                              <Badge className={getStatusColor(call.status)}>
                                {call.status}
                              </Badge>
                              {call.recordings.length > 0 && (
                                <Badge variant="outline">
                                  <FileVideo className="w-3 h-3 mr-1" />
                                  {call.recordings.length}
                                </Badge>
                              )}
                              {call.notes && (
                                <Badge variant="outline">
                                  <FileText className="w-3 h-3 mr-1" />
                                  Notes
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {call.startTime.toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {call.startTime.toLocaleTimeString()} - {call.endTime?.toLocaleTimeString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(call.duration)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {call.participants.length} participants
                              </div>
                            </div>

                            {/* Participants Preview */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex -space-x-2">
                                {call.participants.slice(0, 4).map((participant, index) => (
                                  <Avatar key={index} className="h-6 w-6 border-2 border-background">
                                    <AvatarFallback className="text-xs">
                                      {participant.name?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {call.participants.length > 4 && (
                                  <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs border-2 border-background">
                                    +{call.participants.length - 4}
                                  </div>
                                )}
                              </div>
                              
                              {/* Quality Indicators */}
                              <div className="flex items-center gap-2 ml-4">
                                <div className="flex items-center gap-1">
                                  <div className={cn("w-2 h-2 rounded-full", getQualityColor(call.quality.avgAudioQuality))} />
                                  <span className="text-xs">Audio: {call.quality.avgAudioQuality}%</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className={cn("w-2 h-2 rounded-full", getQualityColor(call.quality.avgVideoQuality))} />
                                  <span className="text-xs">Video: {call.quality.avgVideoQuality}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedCall === call.id && (
                              <div className="mt-4 pt-4 border-t space-y-3">
                                {/* Detailed Participants */}
                                <div>
                                  <h5 className="font-medium mb-2">Participants</h5>
                                  <div className="space-y-1">
                                    {call.participants.map((participant, index) => (
                                      <div key={index} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-5 w-5">
                                            <AvatarFallback className="text-xs">
                                              {participant.name?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span>{participant.name}</span>
                                          {participant.email && (
                                            <span className="text-gray-400">({participant.email})</span>
                                          )}
                                        </div>
                                        <div className="text-gray-400">
                                          {participant.joinTime.toLocaleTimeString()} - {participant.leaveTime?.toLocaleTimeString() || 'End'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Recordings */}
                                {call.recordings.length > 0 && (
                                  <div>
                                    <h5 className="font-medium mb-2">Recordings</h5>
                                    <div className="space-y-1">
                                      {call.recordings.map((recording, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                          <div className="flex items-center gap-2">
                                            <FileVideo className="w-4 h-4 text-blue-500" />
                                            <span>{recording.filename}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {recording.format.toUpperCase()}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400">
                                              {formatDuration(recording.duration)} • {(recording.size / (1024 * 1024)).toFixed(1)}MB
                                            </span>
                                            <Button variant="ghost" size="sm">
                                              <Download className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Chat Messages */}
                                {call.chatMessages.length > 0 && (
                                  <div>
                                    <h5 className="font-medium mb-2">Chat Messages ({call.chatMessages.length})</h5>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                      {call.chatMessages.slice(-5).map((message, index) => (
                                        <div key={index} className="text-sm">
                                          <span className="font-medium">{message.sender}:</span>
                                          <span className="ml-2">{message.message}</span>
                                          <span className="text-gray-400 ml-2 text-xs">
                                            {message.timestamp.toLocaleTimeString()}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Notes */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium">Notes</h5>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingNotes(call.id);
                                        setNotesText(call.notes || '');
                                      }}
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      {call.notes ? 'Edit' : 'Add'} Notes
                                    </Button>
                                  </div>
                                  {editingNotes === call.id ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={notesText}
                                        onChange={(e) => setNotesText(e.target.value)}
                                        placeholder="Add your meeting notes..."
                                        className="w-full p-2 border rounded-lg resize-none"
                                        rows={3}
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            onAddNotes(call.id, notesText);
                                            setEditingNotes(null);
                                          }}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setEditingNotes(null)}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                      {call.notes || 'No notes added'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                            >
                              {expandedCall === call.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportCallData(call)}
                              title="Export call data"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteCall(call.id)}
                              title="Delete call"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Calls</p>
                        <p className="text-2xl font-bold">{statistics.totalCalls}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Duration</p>
                        <p className="text-2xl font-bold">{formatDuration(statistics.totalDuration)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileVideo className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recordings</p>
                        <p className="text-2xl font-bold">{statistics.totalRecordings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Duration</p>
                        <p className="text-2xl font-bold">{formatDuration(Math.round(statistics.avgDuration))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-pink-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Participants</p>
                        <p className="text-2xl font-bold">{statistics.avgParticipants.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
                        <p className="text-2xl font-bold">{statistics.callsThisMonth}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {callHistory.slice(0, 5).map((call, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="flex-1">
                          <span className="font-medium">{call.title}</span>
                          <span className="text-gray-500 ml-2">
                            {call.startTime.toLocaleDateString()} • {formatDuration(call.duration)} • {call.participants.length} participants
                          </span>
                        </div>
                        {call.recordings.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <FileVideo className="w-3 h-3 mr-1" />
                            Recorded
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}