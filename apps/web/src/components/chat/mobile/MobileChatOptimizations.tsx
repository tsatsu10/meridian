// Mobile-optimized chat components for enhanced mobile experience
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
// Note: Using Sheet for mobile drawer functionality
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff,
  Camera,
  Image,
  Plus,
  X,
  ArrowLeft,
  Search,
  MoreVertical,
  Smile,
  Hash,
  Users,
  Phone,
  Video,
  Settings,
  VolumeX,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Mobile-specific hooks
export const useMobileKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && 'visualViewport' in window) {
        const viewport = window.visualViewport!;
        const newKeyboardHeight = window.innerHeight - viewport.height;
        setKeyboardHeight(newKeyboardHeight);
        setIsKeyboardVisible(newKeyboardHeight > 50);
      }
    };

    if (typeof window !== 'undefined' && 'visualViewport' in window) {
      window.visualViewport!.addEventListener('resize', handleResize);
      return () => window.visualViewport!.removeEventListener('resize', handleResize);
    }
  }, []);

  return { keyboardHeight, isKeyboardVisible };
};

export const useTouchGestures = () => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = Math.sqrt(
      Math.pow(touchEnd.x - touchStart.x, 2) + Math.pow(touchEnd.y - touchStart.y, 2)
    );

    if (distance < 10) return; // Ignore small movements

    const isLeftSwipe = touchStart.x - touchEnd.x > 50;
    const isRightSwipe = touchEnd.x - touchStart.x > 50;
    const isUpSwipe = touchStart.y - touchEnd.y > 50;
    const isDownSwipe = touchEnd.y - touchStart.y > 50;

    return { isLeftSwipe, isRightSwipe, isUpSwipe, isDownSwipe };
  }, [touchStart, touchEnd]);

  return { onTouchStart, onTouchMove, onTouchEnd };
};

// Mobile message composer with enhanced features
interface MobileMessageComposerProps {
  onSendMessage: (content: string, type: 'text' | 'voice' | 'file') => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const MobileMessageComposer: React.FC<MobileMessageComposerProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  placeholder = "Type a message...",
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [expandedInput, setExpandedInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const { keyboardHeight, isKeyboardVisible } = useMobileKeyboard();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Typing indicators
  useEffect(() => {
    if (message) {
      onTypingStart();
      const timer = setTimeout(() => {
        onTypingStop();
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      onTypingStop();
    }
  }, [message, onTypingStart, onTypingStop]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
      setExpandedInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      recordingRef.current = mediaRecorder;
      
      mediaRecorder.start();
      setIsRecording(true);
      
      mediaRecorder.ondataavailable = (event) => {
        // Handle voice recording data
        // Voice data received
      };
      
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopVoiceRecording = () => {
    if (recordingRef.current && isRecording) {
      recordingRef.current.stop();
    }
  };

  const handleFileUpload = (type: 'camera' | 'gallery' | 'file') => {
    const input = document.createElement('input');
    input.type = 'file';
    
    switch (type) {
      case 'camera':
        input.accept = 'image/*';
        input.capture = 'environment';
        break;
      case 'gallery':
        input.accept = 'image/*,video/*';
        break;
      case 'file':
        input.accept = '*/*';
        break;
    }
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onSendMessage(URL.createObjectURL(file), 'file');
      }
    };
    
    input.click();
    setShowAttachmentMenu(false);
  };

  return (
    <div 
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 transition-all duration-300',
        isKeyboardVisible && 'transform translate-y-0'
      )}
      style={{ 
        paddingBottom: isKeyboardVisible ? `${Math.max(keyboardHeight - 80, 0)}px` : '1rem' 
      }}
    >
      {/* Expanded input overlay */}
      {expandedInput && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedInput(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">Message</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSend}
              disabled={!message.trim()}
            >
              Send
            </Button>
          </div>
          
          <div className="flex-1 p-4">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholder}
              className="min-h-[200px] resize-none border-none focus:ring-0 text-base"
              autoFocus
            />
          </div>
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* Attachment menu */}
        <Sheet open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
              <Plus className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Add Attachment</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4 mt-6 mb-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => handleFileUpload('camera')}
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">Camera</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => handleFileUpload('gallery')}
              >
                <Image className="h-6 w-6" />
                <span className="text-xs">Gallery</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => handleFileUpload('file')}
              >
                <Paperclip className="h-6 w-6" />
                <span className="text-xs">File</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-[120px] resize-none pr-20 text-base leading-6"
            rows={1}
            onFocus={() => {
              if (message.length > 50) {
                setExpandedInput(true);
              }
            }}
          />
          
          {/* Emoji button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => {/* Open emoji picker */}}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        {/* Send/Voice button */}
        {message.trim() ? (
          <Button
            onClick={handleSend}
            disabled={disabled}
            size="sm"
            className="h-10 w-10 p-0 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant={isRecording ? "destructive" : "secondary"}
            size="sm"
            className="h-10 w-10 p-0 rounded-full"
            onTouchStart={startVoiceRecording}
            onTouchEnd={stopVoiceRecording}
            onMouseDown={startVoiceRecording}
            onMouseUp={stopVoiceRecording}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center text-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
            Recording... Release to send
          </div>
        </div>
      )}
    </div>
  );
};

// Mobile message item with touch gestures
interface MobileMessageItemProps {
  message: any;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  isOwn: boolean;
}

export const MobileMessageItem: React.FC<MobileMessageItemProps> = ({
  message,
  onReply,
  onReact,
  onDelete,
  onEdit,
  isOwn,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchGestures();

  const handleTouchStart = (e: React.TouchEvent) => {
    onTouchStart(e);
    const timer = setTimeout(() => {
      setShowActions(true);
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    const gesture = onTouchEnd();
    
    if (gesture?.isRightSwipe && onReply) {
      onReply();
    }
  };

  return (
    <>
      <div
        className={cn(
          'group relative px-4 py-2 rounded-lg max-w-[85%] break-words',
          isOwn 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-muted mr-auto'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {!isOwn && (
          <div className="text-xs opacity-70 mb-1">{message.authorName}</div>
        )}
        
        <div className="text-sm leading-relaxed">{message.content}</div>
        
        <div className={cn(
          'text-xs opacity-70 mt-1 flex items-center gap-1',
          isOwn ? 'justify-end' : 'justify-start'
        )}>
          <span>{new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</span>
          {isOwn && (
            <span className="text-xs">
              {message.deliveryStatus === 'delivered' ? '✓✓' : '✓'}
            </span>
          )}
        </div>

        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction: any, index: number) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs h-6 px-2"
              >
                {reaction.emoji} {reaction.count || 1}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Action sheet */}
      <Sheet open={showActions} onOpenChange={setShowActions}>
        <SheetContent side="bottom" className="h-auto">
          <div className="grid grid-cols-2 gap-4 py-4">
            {onReply && (
              <Button variant="outline" onClick={() => { onReply(); setShowActions(false); }}>
                Reply
              </Button>
            )}
            {onReact && (
              <Button variant="outline" onClick={() => { onReact('👍'); setShowActions(false); }}>
                React
              </Button>
            )}
            {isOwn && onEdit && (
              <Button variant="outline" onClick={() => { onEdit(); setShowActions(false); }}>
                Edit
              </Button>
            )}
            {isOwn && onDelete && (
              <Button variant="destructive" onClick={() => { onDelete(); setShowActions(false); }}>
                Delete
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

// Mobile chat header with team info
interface MobileChatHeaderProps {
  team: any;
  onlineCount: number;
  onBack?: () => void;
  onTeamInfo?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
}

export const MobileChatHeader: React.FC<MobileChatHeaderProps> = ({
  team,
  onlineCount,
  onBack,
  onTeamInfo,
  onCall,
  onVideoCall,
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onTeamInfo}
        >
          <h2 className="font-semibold truncate">{team.name}</h2>
          <p className="text-sm text-muted-foreground">
            {onlineCount} online • {team.memberCount} members
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {onCall && (
          <Button variant="ghost" size="sm" onClick={onCall}>
            <Phone className="h-5 w-5" />
          </Button>
        )}
        {onVideoCall && (
          <Button variant="ghost" size="sm" onClick={onVideoCall}>
            <Video className="h-5 w-5" />
          </Button>
        )}
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

// Mobile-optimized message search
export const MobileMessageSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Search className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Search Messages</SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in conversation..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          
          <ScrollArea className="h-[60vh]">
            {results.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {query ? 'No messages found' : 'Start typing to search'}
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result: any) => (
                  <div key={result.id} className="p-3 border border-border rounded-lg">
                    <div className="font-medium text-sm">{result.authorName}</div>
                    <div className="text-sm text-muted-foreground">{result.content}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(result.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default {
  MobileMessageComposer,
  MobileMessageItem,
  MobileChatHeader,
  MobileMessageSearch,
  useMobileKeyboard,
  useTouchGestures,
};