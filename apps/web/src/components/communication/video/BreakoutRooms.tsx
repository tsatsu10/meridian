import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Plus, 
  Minus,
  Play,
  Square,
  Settings,
  Shuffle,
  Clock,
  ArrowRight,
  UserPlus,
  UserMinus,
  RotateCcw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface BreakoutRoom {
  id: string;
  name: string;
  participants: string[];
  isActive: boolean;
  duration?: number;
}

interface BreakoutRoomsProps {
  participants: Set<string>;
  currentUserId: string;
  isHost: boolean;
  onCreateBreakoutRooms?: (rooms: BreakoutRoom[]) => void;
  onJoinRoom?: (roomId: string) => void;
  onStartBreakoutRooms?: () => void;
  onEndBreakoutRooms?: () => void;
  isVisible: boolean;
  onClose: () => void;
}

export function BreakoutRooms({
  participants,
  currentUserId,
  isHost,
  onCreateBreakoutRooms,
  onJoinRoom,
  onStartBreakoutRooms,
  onEndBreakoutRooms,
  isVisible,
  onClose
}: BreakoutRoomsProps) {
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [numberOfRooms, setNumberOfRooms] = useState(2);
  const [duration, setDuration] = useState(15);
  const [isActive, setIsActive] = useState(false);
  const [unassignedParticipants, setUnassignedParticipants] = useState<string[]>(
    Array.from(participants)
  );

  const participantNames = (id: string) => {
    return id === currentUserId ? 'You' : `Participant ${Array.from(participants).indexOf(id) + 1}`;
  };

  const createRooms = () => {
    const newRooms: BreakoutRoom[] = [];
    for (let i = 0; i < numberOfRooms; i++) {
      newRooms.push({
        id: `breakout-${i + 1}`,
        name: `Room ${i + 1}`,
        participants: [],
        isActive: false,
        duration
      });
    }
    setRooms(newRooms);
    setUnassignedParticipants(Array.from(participants));
    toast.success(`Created ${numberOfRooms} breakout rooms`);
  };

  const assignRandomly = () => {
    if (rooms.length === 0) return;
    
    const shuffled = [...Array.from(participants)].sort(() => Math.random() - 0.5);
    const newRooms = rooms.map((room, index) => ({
      ...room,
      participants: []
    }));

    shuffled.forEach((participant, index) => {
      const roomIndex = index % numberOfRooms;
      newRooms[roomIndex].participants.push(participant);
    });

    setRooms(newRooms);
    setUnassignedParticipants([]);
    toast.success('Participants assigned randomly to rooms');
  };

  const moveParticipant = (participantId: string, fromRoomId: string | null, toRoomId: string | null) => {
    if (fromRoomId === toRoomId) return;

    // Remove from source
    if (fromRoomId) {
      setRooms(prev => prev.map(room => 
        room.id === fromRoomId 
          ? { ...room, participants: room.participants.filter(p => p !== participantId) }
          : room
      ));
    } else {
      setUnassignedParticipants(prev => prev.filter(p => p !== participantId));
    }

    // Add to destination
    if (toRoomId) {
      setRooms(prev => prev.map(room => 
        room.id === toRoomId 
          ? { ...room, participants: [...room.participants, participantId] }
          : room
      ));
    } else {
      setUnassignedParticipants(prev => [...prev, participantId]);
    }
  };

  const startBreakoutRooms = () => {
    const assignedParticipants = rooms.reduce((acc, room) => acc + room.participants.length, 0);
    if (assignedParticipants < participants.size) {
      toast.error('Please assign all participants to rooms before starting');
      return;
    }

    setIsActive(true);
    setRooms(prev => prev.map(room => ({ ...room, isActive: true })));
    onStartBreakoutRooms?.();
    toast.success(`Breakout rooms started for ${duration} minutes`);
  };

  const endBreakoutRooms = () => {
    setIsActive(false);
    setRooms(prev => prev.map(room => ({ ...room, isActive: false })));
    onEndBreakoutRooms?.();
    toast.info('All participants returned to main room');
  };

  const resetRooms = () => {
    setRooms([]);
    setUnassignedParticipants(Array.from(participants));
    setIsActive(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Breakout Rooms
          </CardTitle>
          <div className="flex items-center gap-2">
            {isActive && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Setup Section */}
          {!isActive && isHost && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room-count">Number of Rooms</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNumberOfRooms(Math.max(2, numberOfRooms - 1))}
                      disabled={numberOfRooms <= 2}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      id="room-count"
                      type="number"
                      min="2"
                      max="10"
                      value={numberOfRooms}
                      onChange={(e) => setNumberOfRooms(Math.min(10, Math.max(2, parseInt(e.target.value) || 2)))}
                      className="text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNumberOfRooms(Math.min(10, numberOfRooms + 1))}
                      disabled={numberOfRooms >= 10}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    max="60"
                    value={duration}
                    onChange={(e) => setDuration(Math.min(60, Math.max(5, parseInt(e.target.value) || 15)))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Actions</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={createRooms}>
                      Create Rooms
                    </Button>
                    <Button variant="outline" size="sm" onClick={assignRandomly} disabled={rooms.length === 0}>
                      <Shuffle className="w-4 h-4 mr-1" />
                      Auto Assign
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Room Management */}
          {rooms.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Room Assignments</h3>
                {isHost && !isActive && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetRooms}>
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                    <Button onClick={startBreakoutRooms} className="bg-green-600 hover:bg-green-700">
                      <Play className="w-4 h-4 mr-1" />
                      Start Rooms
                    </Button>
                  </div>
                )}
                {isHost && isActive && (
                  <Button variant="destructive" onClick={endBreakoutRooms}>
                    <Square className="w-4 h-4 mr-1" />
                    End All Rooms
                  </Button>
                )}
              </div>

              {/* Unassigned Participants */}
              {unassignedParticipants.length > 0 && !isActive && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      Unassigned Participants ({unassignedParticipants.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {unassignedParticipants.map((participantId) => (
                        <div key={participantId} className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {participantNames(participantId).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{participantNames(participantId)}</span>
                          {isHost && (
                            <div className="flex gap-1">
                              {rooms.map((room) => (
                                <Button
                                  key={room.id}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-xs"
                                  onClick={() => moveParticipant(participantId, null, room.id)}
                                  title={`Move to ${room.name}`}
                                >
                                  {room.name.split(' ')[1]}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Breakout Rooms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <Card key={room.id} className={cn(
                    "transition-all duration-200",
                    room.isActive && "ring-2 ring-green-500"
                  )}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {room.name}
                          {room.isActive && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              Active
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {room.participants.length} / {Math.ceil(participants.size / numberOfRooms)}
                          </Badge>
                          {room.isActive && room.participants.includes(currentUserId) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onJoinRoom?.(room.id)}
                            >
                              <ArrowRight className="w-4 h-4 mr-1" />
                              Join
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {room.participants.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No participants assigned</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {room.participants.map((participantId) => (
                            <div key={participantId} className="flex items-center gap-2 justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {participantNames(participantId).charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{participantNames(participantId)}</span>
                              </div>
                              {isHost && !room.isActive && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveParticipant(participantId, room.id, null)}
                                  className="h-6 w-6 p-0"
                                  title="Remove from room"
                                >
                                  <UserMinus className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {room.isActive && room.duration && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{room.duration} minutes remaining</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {rooms.length === 0 && isHost && (
            <div className="text-center py-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Create Breakout Rooms</h3>
              <p className="text-gray-600 mb-4">
                Split your participants into smaller groups for focused discussions
              </p>
              <Button onClick={createRooms}>
                <Plus className="w-4 h-4 mr-2" />
                Create {numberOfRooms} Rooms
              </Button>
            </div>
          )}

          {/* Non-host view when rooms are active */}
          {!isHost && isActive && (
            <div className="text-center py-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">Breakout Rooms Active</h3>
              <p className="text-gray-600 mb-4">
                You will be automatically moved to your assigned room
              </p>
              {rooms.find(room => room.participants.includes(currentUserId)) && (
                <Button
                  onClick={() => {
                    const myRoom = rooms.find(room => room.participants.includes(currentUserId));
                    if (myRoom) onJoinRoom?.(myRoom.id);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Join My Room
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}