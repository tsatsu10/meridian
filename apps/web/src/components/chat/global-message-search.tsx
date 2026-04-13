import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Globe, 
  Search, 
  Calendar, 
  User, 
  Hash, 
  Download,
  Info,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useGlobalMessageSearch } from '@/hooks/use-message-search';
import { SafeMessageContent } from '@/components/chat/safe-message-content';

interface GlobalMessageSearchProps {
  trigger?: React.ReactNode;
  onMessageSelect?: (messageId: string, channelId: string) => void;
}

interface SearchQuery {
  text: string;
  from?: string;
  in?: string;
  after?: Date;
  before?: Date;
  type?: string;
  pinned?: boolean;
}

export default function GlobalMessageSearch({
  trigger,
  onMessageSelect
}: GlobalMessageSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Parse advanced search operators from query
  const parsedQuery = useMemo(() => {
    const query: SearchQuery = { text: '' };
    const parts = rawQuery.split(' ');
    const textParts: string[] = [];

    parts.forEach(part => {
      if (part.startsWith('from:')) {
        query.from = part.substring(5);
      } else if (part.startsWith('in:')) {
        query.in = part.substring(3);
      } else if (part.startsWith('after:')) {
        const date = new Date(part.substring(6));
        if (!isNaN(date.getTime())) query.after = date;
      } else if (part.startsWith('before:')) {
        const date = new Date(part.substring(7));
        if (!isNaN(date.getTime())) query.before = date;
      } else if (part.startsWith('type:')) {
        query.type = part.substring(5);
      } else if (part === 'is:pinned') {
        query.pinned = true;
      } else if (part.trim()) {
        textParts.push(part);
      }
    });

    query.text = textParts.join(' ');
    return query;
  }, [rawQuery]);

  // Use the global search hook with parsed filters
  const { data: response, isLoading } = useGlobalMessageSearch({
    query: parsedQuery.text,
    users: parsedQuery.from ? [parsedQuery.from] : undefined,
    dateFrom: parsedQuery.after,
    dateTo: parsedQuery.before,
    messageTypes: parsedQuery.type ? [parsedQuery.type] : undefined,
    pinnedOnly: parsedQuery.pinned,
    limit: 50
  });

  const results = response?.messages || [];

  // Filter by channel if specified
  const filteredResults = useMemo(() => {
    if (!parsedQuery.in) return results;
    return results.filter(msg => 
      msg.channelId.toLowerCase().includes(parsedQuery.in!.toLowerCase())
    );
  }, [results, parsedQuery.in]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-black font-medium">
          {part}
        </mark>
      ) : part
    );
  };

  const exportResults = (format: 'csv' | 'json') => {
    if (!filteredResults.length) return;

    const dataStr = format === 'json' 
      ? JSON.stringify(filteredResults, null, 2)
      : [
          'timestamp,user,channel,content,type',
          ...filteredResults.map(msg => 
            `"${new Date(msg.createdAt).toISOString()}","${msg.userEmail}","${msg.channelId}","${msg.content.replace(/"/g, '""')}","${msg.messageType}"`
          )
        ].join('\n');

    const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `global-search.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Globe className="h-4 w-4 mr-2" />
      Global Search
    </Button>
  );

  const searchOperators = [
    { operator: 'from:user@example.com', description: 'Messages from specific user' },
    { operator: 'in:channel-name', description: 'Messages in specific channel' },
    { operator: 'after:2024-01-01', description: 'Messages after date' },
    { operator: 'before:2024-12-31', description: 'Messages before date' },
    { operator: 'type:file', description: 'Messages with attachments' },
    { operator: 'is:pinned', description: 'Only pinned messages' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Message Search
            <Badge variant="secondary">All Channels</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input with Operators */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search all messages... Try: from:user@example.com hello world"
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                className="pl-9 pr-12"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setShowHelp(!showHelp)}
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show search operators help</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Search Operators Help */}
            {showHelp && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Advanced Search Operators</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {searchOperators.map((op, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800 font-mono text-xs">
                          {op.operator}
                        </code>
                        <span className="text-blue-700">{op.description}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Combine operators: <code className="bg-blue-100 px-1 rounded">from:user@example.com is:pinned hello</code>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Active Filters Display */}
            {(parsedQuery.from || parsedQuery.in || parsedQuery.after || parsedQuery.before || parsedQuery.type || parsedQuery.pinned) && (
              <div className="flex flex-wrap gap-2">
                {parsedQuery.from && (
                  <Badge variant="secondary" className="gap-1">
                    <User className="h-3 w-3" />
                    from: {parsedQuery.from}
                  </Badge>
                )}
                {parsedQuery.in && (
                  <Badge variant="secondary" className="gap-1">
                    <Hash className="h-3 w-3" />
                    in: {parsedQuery.in}
                  </Badge>
                )}
                {parsedQuery.after && (
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    after: {parsedQuery.after.toLocaleDateString()}
                  </Badge>
                )}
                {parsedQuery.before && (
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    before: {parsedQuery.before.toLocaleDateString()}
                  </Badge>
                )}
                {parsedQuery.type && (
                  <Badge variant="secondary">
                    type: {parsedQuery.type}
                  </Badge>
                )}
                {parsedQuery.pinned && (
                  <Badge variant="secondary">
                    pinned only
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Results Header */}
          {filteredResults.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found across all channels
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportResults('csv')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportResults('json')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>
          )}

          {/* Search Results */}
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {rawQuery.trim() ? (
                  <div>
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages found</p>
                    <p className="text-sm">Try adjusting your search terms or operators</p>
                  </div>
                ) : (
                  <div>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Search across all your channels</p>
                    <p className="text-sm">Use operators like <code>from:user@example.com</code> for advanced search</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredResults.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      onMessageSelect?.(result.id, result.channelId);
                      setIsOpen(false);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {result.userEmail.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">
                              {result.userEmail.split('@')[0]}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              <Hash className="h-3 w-3 mr-1" />
                              {result.channelId}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                            </span>
                            {result.isPinned && (
                              <Badge variant="outline" className="text-xs">Pinned</Badge>
                            )}
                            {result.isEdited && (
                              <Badge variant="outline" className="text-xs">edited</Badge>
                            )}
                            {result.parentMessageId && (
                              <Badge variant="outline" className="text-xs">reply</Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-foreground">
                            {parsedQuery.text ? (
                              <div>{highlightText(result.content, parsedQuery.text)}</div>
                            ) : (
                              <SafeMessageContent content={result.content} className="line-clamp-2" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}