import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Sparkles, 
  Loader2,
  CheckCircle,
  X,
  Zap,
  MessageSquare,
  ArrowRight,
  Brain,
  Lightbulb,
  Target
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface MessageSuggestion {
  id: string;
  text: string;
  type: 'completion' | 'improvement' | 'alternative' | 'translation';
  confidence: number;
  reasoning?: string;
  category?: 'professional' | 'casual' | 'technical' | 'creative';
}

interface SmartSuggestionsProps {
  text: string;
  context?: {
    recipients?: Array<{ name: string; role?: string }>;
    messageType?: 'direct' | 'channel' | 'team';
    projectContext?: string;
    previousMessages?: string[];
  };
  onSuggestionSelect: (suggestion: MessageSuggestion) => void;
  onTextUpdate?: (text: string) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  autoSuggest?: boolean;
  maxSuggestions?: number;
}

// Mock AI service for generating suggestions
class SmartMessageAI {
  private static completionTemplates = [
    { pattern: /let me know/i, completions: ['let me know if you have any questions', 'let me know your thoughts', 'let me know when you\'re available'] },
    { pattern: /thank you/i, completions: ['thank you for your time', 'thank you for your help', 'thank you for the update'] },
    { pattern: /could you/i, completions: ['could you please review this?', 'could you help me with', 'could you let me know when'] },
    { pattern: /i think/i, completions: ['I think we should proceed with', 'I think this looks good', 'I think we need to discuss'] },
    { pattern: /what do you/i, completions: ['what do you think about this?', 'what do you recommend?', 'what do you need from me?'] },
  ];

  private static improvementPatterns = [
    { pattern: /thanks/i, improved: 'Thank you so much', reasoning: 'More polite and professional' },
    { pattern: /ok/i, improved: 'Sounds good!', reasoning: 'More enthusiastic and engaging' },
    { pattern: /cant/i, improved: 'I\'m unable to', reasoning: 'More professional tone' },
    { pattern: /asap/i, improved: 'at your earliest convenience', reasoning: 'More courteous' },
  ];

  private static contextualResponses = {
    professional: [
      'I hope this message finds you well.',
      'Please let me know if you need any additional information.',
      'I appreciate your time and consideration.',
      'Looking forward to your response.',
    ],
    casual: [
      'Hope you\'re doing well!',
      'Let me know what you think!',
      'Thanks again!',
      'Talk soon!',
    ],
    technical: [
      'Please review the implementation details.',
      'Let me know if you need clarification on any technical aspects.',
      'I\'ve attached the relevant documentation.',
      'The solution should address the requirements discussed.',
    ]
  };

  static async generateSuggestions(
    text: string, 
    context?: SmartSuggestionsProps['context']
  ): Promise<MessageSuggestion[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const suggestions: MessageSuggestion[] = [];
    let suggestionId = 1;

    // 1. Completion suggestions
    if (text.length > 5) {
      const lastWords = text.split(' ').slice(-3).join(' ').toLowerCase();
      
      for (const template of this.completionTemplates) {
        if (template.pattern.test(lastWords)) {
          template.completions.forEach(completion => {
            suggestions.push({
              id: `completion-${suggestionId++}`,
              text: completion,
              type: 'completion',
              confidence: 0.8 + Math.random() * 0.2,
              category: 'professional',
              reasoning: 'Complete your thought'
            });
          });
          break;
        }
      }
    }

    // 2. Improvement suggestions
    for (const pattern of this.improvementPatterns) {
      if (pattern.pattern.test(text)) {
        suggestions.push({
          id: `improvement-${suggestionId++}`,
          text: text.replace(pattern.pattern, pattern.improved),
          type: 'improvement',
          confidence: 0.9,
          category: 'professional',
          reasoning: pattern.reasoning
        });
      }
    }

    // 3. Contextual suggestions based on recipients
    if (context?.recipients?.length) {
      const hasManager = context.recipients.some(r => r.role?.includes('manager') || r.role?.includes('lead'));
      const category = hasManager ? 'professional' : 'casual';
      
      const contextResponses = this.contextualResponses[category] || this.contextualResponses.professional;
      const randomResponse = contextResponses[Math.floor(Math.random() * contextResponses.length)];
      
      suggestions.push({
        id: `contextual-${suggestionId++}`,
        text: `${text} ${randomResponse}`,
        type: 'improvement',
        confidence: 0.85,
        category,
        reasoning: `Tailored for ${category} communication`
      });
    }

    // 4. Alternative phrasings
    const alternatives = [
      { pattern: /can you/i, alt: 'Would you be able to', reasoning: 'More polite request' },
      { pattern: /need to/i, alt: 'should', reasoning: 'Softer approach' },
      { pattern: /quickly/i, alt: 'when you have a moment', reasoning: 'Less pressure' },
    ];

    for (const alt of alternatives) {
      if (alt.pattern.test(text)) {
        suggestions.push({
          id: `alternative-${suggestionId++}`,
          text: text.replace(alt.pattern, alt.alt),
          type: 'alternative',
          confidence: 0.75,
          category: 'professional',
          reasoning: alt.reasoning
        });
      }
    }

    // 5. Smart completions based on project context
    if (context?.projectContext) {
      const projectSuggestions = [
        `${text} regarding the ${context.projectContext} project.`,
        `${text} Please keep the ${context.projectContext} timeline in mind.`,
        `${text} This relates to our ${context.projectContext} objectives.`,
      ];
      
      const randomProjectSuggestion = projectSuggestions[Math.floor(Math.random() * projectSuggestions.length)];
      suggestions.push({
        id: `project-${suggestionId++}`,
        text: randomProjectSuggestion,
        type: 'completion',
        confidence: 0.8,
        category: 'professional',
        reasoning: 'Added project context'
      });
    }

    // Shuffle and limit suggestions
    return suggestions
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .sort((a, b) => b.confidence - a.confidence);
  }
}

export default function SmartMessageSuggestions({
  text,
  context,
  onSuggestionSelect,
  onTextUpdate,
  trigger,
  disabled = false,
  className,
  autoSuggest = false,
  maxSuggestions = 5
}: SmartSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MessageSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  
  const lastTextRef = useRef('');
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const defaultTrigger = (
    <Button variant="ghost" size="sm" disabled={disabled} title="Smart suggestions">
      <Sparkles className="w-4 h-4" />
    </Button>
  );

  const generateSuggestions = useCallback(async () => {
    if (!text.trim() || text.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newSuggestions = await SmartMessageAI.generateSuggestions(text, context);
      setSuggestions(newSuggestions.slice(0, maxSuggestions));
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      setError('Failed to generate suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [text, context, maxSuggestions]);

  // Auto-suggest with debouncing
  useEffect(() => {
    if (autoSuggest && text !== lastTextRef.current && text.length >= 10) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        generateSuggestions();
      }, 1000);
    }
    
    lastTextRef.current = text;
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [text, autoSuggest, generateSuggestions]);

  const handleSuggestionClick = (suggestion: MessageSuggestion) => {
    setSelectedSuggestion(suggestion.id);
    onSuggestionSelect(suggestion);
    
    if (onTextUpdate) {
      onTextUpdate(suggestion.text);
    }
    
    toast.success(`Applied ${suggestion.type} suggestion`);
    setIsOpen(false);
    
    // Reset selection after animation
    setTimeout(() => setSelectedSuggestion(null), 500);
  };

  const getSuggestionIcon = (type: MessageSuggestion['type']) => {
    switch (type) {
      case 'completion': return <ArrowRight className="h-3 w-3" />;
      case 'improvement': return <Zap className="h-3 w-3" />;
      case 'alternative': return <MessageSquare className="h-3 w-3" />;
      case 'translation': return <Target className="h-3 w-3" />;
      default: return <Lightbulb className="h-3 w-3" />;
    }
  };

  const getSuggestionColor = (type: MessageSuggestion['type']) => {
    switch (type) {
      case 'completion': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'improvement': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'alternative': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'translation': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getCategoryBadgeColor = (category?: string) => {
    switch (category) {
      case 'professional': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'casual': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'technical': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'creative': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // Auto-open when suggestions are available (for auto-suggest mode)
  useEffect(() => {
    if (autoSuggest && suggestions.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [suggestions, autoSuggest, isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <div className="relative">
            {defaultTrigger}
            {autoSuggest && suggestions.length > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className={cn("w-96 p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700", className)} 
        align="start"
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium">Smart Suggestions</h3>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Generate Button */}
          {!autoSuggest && suggestions.length === 0 && !isLoading && (
            <Button
              onClick={generateSuggestions}
              disabled={!text.trim() || text.length < 3}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Suggestions
            </Button>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          )}

          {/* Suggestions List */}
          {suggestions.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="text-sm font-medium text-muted-foreground">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} available
              </div>
              
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={cn(
                    "p-3 rounded-md border cursor-pointer transition-all hover:shadow-sm",
                    selectedSuggestion === suggestion.id 
                      ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                      : "hover:bg-muted/50",
                    getSuggestionColor(suggestion.type)
                  )}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-1 mt-0.5">
                      {getSuggestionIcon(suggestion.type)}
                      {suggestion.category && (
                        <span className={cn(
                          "px-1.5 py-0.5 text-xs rounded-full font-medium",
                          getCategoryBadgeColor(suggestion.category)
                        )}>
                          {suggestion.category}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium capitalize">
                        {suggestion.type}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {Math.round(suggestion.confidence * 100)}% confident
                        </span>
                      </div>
                      
                      <div className="text-sm mt-1 break-words">
                        {suggestion.text}
                      </div>
                      
                      {suggestion.reasoning && (
                        <div className="text-xs text-muted-foreground mt-1 italic">
                          {suggestion.reasoning}
                        </div>
                      )}
                    </div>
                    
                    {selectedSuggestion === suggestion.id && (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && suggestions.length === 0 && !error && text.trim() && (
            <div className="text-center py-4 text-muted-foreground">
              <Lightbulb className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No suggestions available</div>
              <div className="text-xs mt-1">Try writing more content</div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
              <div className="text-sm text-muted-foreground">Generating suggestions...</div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
            <div className="flex items-start gap-2">
              <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                AI-powered suggestions help improve clarity, tone, and completeness of your messages. 
                {autoSuggest && ' Auto-suggestions appear as you type.'}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for managing smart suggestions settings
export function useSmartSuggestions() {
  const [autoSuggest, setAutoSuggest] = useState(false);
  const [preferredTone, setPreferredTone] = useState<'professional' | 'casual' | 'technical'>('professional');
  const [suggestionsHistory, setSuggestionsHistory] = useState<MessageSuggestion[]>([]);

  const addToHistory = (suggestion: MessageSuggestion) => {
    setSuggestionsHistory(prev => [suggestion, ...prev.slice(0, 49)]); // Keep last 50
  };

  const getMostUsedSuggestionTypes = () => {
    const typeCounts = suggestionsHistory.reduce((acc, suggestion) => {
      acc[suggestion.type] = (acc[suggestion.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }));
  };

  const getPersonalizedSuggestions = (text: string) => {
    // Return suggestions based on user's history and preferences
    const commonPatterns = suggestionsHistory
      .filter(s => s.category === preferredTone)
      .slice(0, 3);
      
    return commonPatterns;
  };

  // Load preferences on init
  useEffect(() => {
    const autoSuggestPref = localStorage.getItem('smart-suggestions-auto');
    const tonePref = localStorage.getItem('smart-suggestions-tone');
    
    if (autoSuggestPref) setAutoSuggest(JSON.parse(autoSuggestPref));
    if (tonePref) setPreferredTone(tonePref as any);
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('smart-suggestions-auto', JSON.stringify(autoSuggest));
    localStorage.setItem('smart-suggestions-tone', preferredTone);
  }, [autoSuggest, preferredTone]);

  return {
    autoSuggest,
    preferredTone,
    suggestionsHistory,
    setAutoSuggest,
    setPreferredTone,
    addToHistory,
    getMostUsedSuggestionTypes,
    getPersonalizedSuggestions,
  };
}