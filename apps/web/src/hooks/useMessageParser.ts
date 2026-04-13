import { useState, useCallback, useRef } from 'react';

interface MessageParseResult {
  type: 'task' | 'meeting' | 'reminder' | 'question' | 'decision' | 'action_item' | 'general';
  confidence: number; // 0-1
  intent: MessageIntent;
  entities: ExtractedEntities;
  suggestions: MessageSuggestion[];
  metadata: {
    processingTime: number;
    parserVersion: string;
    languageDetected: string;
  };
}

interface MessageIntent {
  primary: string;
  secondary: string[];
  actionRequired: boolean;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  timeframe: 'immediate' | 'today' | 'this_week' | 'later' | 'unspecified';
}

interface ExtractedEntities {
  users: UserMention[];
  dates: DateEntity[];
  times: TimeEntity[];
  locations: LocationEntity[];
  projects: ProjectMention[];
  tags: TagEntity[];
  links: LinkEntity[];
  files: FileEntity[];
  priorities: PriorityEntity[];
  durations: DurationEntity[];
  actions: ActionEntity[];
  questions: QuestionEntity[];
}

interface UserMention {
  userId?: string;
  username: string;
  displayName?: string;
  email?: string;
  position: { start: number; end: number };
  context: 'assignee' | 'mention' | 'cc' | 'participant';
  confidence: number;
}

interface DateEntity {
  date: Date;
  originalText: string;
  position: { start: number; end: number };
  type: 'absolute' | 'relative' | 'recurring';
  confidence: number;
  timezone?: string;
}

interface TimeEntity {
  time: string; // HH:MM format
  originalText: string;
  position: { start: number; end: number };
  period?: 'AM' | 'PM';
  timezone?: string;
  confidence: number;
}

interface LocationEntity {
  name: string;
  type: 'room' | 'building' | 'city' | 'address' | 'online' | 'url';
  coordinates?: { lat: number; lng: number };
  position: { start: number; end: number };
  confidence: number;
}

interface ProjectMention {
  projectId?: string;
  projectName: string;
  position: { start: number; end: number };
  confidence: number;
}

interface TagEntity {
  tag: string;
  category?: string;
  position: { start: number; end: number };
  confidence: number;
}

interface LinkEntity {
  url: string;
  title?: string;
  type: 'http' | 'https' | 'mailto' | 'tel' | 'file';
  position: { start: number; end: number };
}

interface FileEntity {
  filename: string;
  type: string;
  size?: number;
  url?: string;
  position: { start: number; end: number };
}

interface PriorityEntity {
  level: 'low' | 'medium' | 'high' | 'urgent';
  originalText: string;
  position: { start: number; end: number };
  confidence: number;
}

interface DurationEntity {
  duration: number; // in minutes
  originalText: string;
  position: { start: number; end: number };
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
  confidence: number;
}

interface ActionEntity {
  action: string;
  verb: string;
  object?: string;
  position: { start: number; end: number };
  confidence: number;
}

interface QuestionEntity {
  question: string;
  type: 'yes_no' | 'multiple_choice' | 'open_ended' | 'factual';
  position: { start: number; end: number };
  requiresResponse: boolean;
}

interface MessageSuggestion {
  type: 'create_task' | 'schedule_meeting' | 'set_reminder' | 'add_to_project' | 'assign_user' | 'set_deadline';
  title: string;
  description: string;
  confidence: number;
  action: () => void;
  metadata: Record<string, any>;
}

interface ParserConfig {
  enabledFeatures: {
    taskDetection: boolean;
    meetingDetection: boolean;
    reminderDetection: boolean;
    entityExtraction: boolean;
    intentAnalysis: boolean;
    suggestionGeneration: boolean;
  };
  thresholds: {
    minimumConfidence: number;
    taskCreationThreshold: number;
    meetingSchedulingThreshold: number;
    entityExtractionThreshold: number;
  };
  patterns: {
    taskKeywords: string[];
    meetingKeywords: string[];
    urgencyKeywords: Record<string, string[]>;
    timePatterns: RegExp[];
    datePatterns: RegExp[];
    userMentionPatterns: RegExp[];
    priorityPatterns: Record<string, RegExp>;
  };
  nlpSettings: {
    language: string;
    enableSentimentAnalysis: boolean;
    enableNamedEntityRecognition: boolean;
    enableIntentClassification: boolean;
  };
}

interface ParsingContext {
  chatId: string;
  channelType: 'direct' | 'group' | 'project' | 'public';
  participants: string[];
  previousMessages: MessageContext[];
  currentUser: string;
  timestamp: Date;
  threadId?: string;
}

interface MessageContext {
  content: string;
  author: string;
  timestamp: Date;
  parsed?: MessageParseResult;
}

export function useMessageParser(config?: Partial<ParserConfig>) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseHistory, setParseHistory] = useState<Map<string, MessageParseResult>>(new Map());

  const parserConfig = useRef<ParserConfig>({
    enabledFeatures: {
      taskDetection: true,
      meetingDetection: true,
      reminderDetection: true,
      entityExtraction: true,
      intentAnalysis: true,
      suggestionGeneration: true
    },
    thresholds: {
      minimumConfidence: 0.3,
      taskCreationThreshold: 0.7,
      meetingSchedulingThreshold: 0.6,
      entityExtractionThreshold: 0.5
    },
    patterns: {
      taskKeywords: [
        'task', 'todo', 'action item', 'follow up', 'complete', 'finish',
        'implement', 'fix', 'create', 'build', 'develop', 'design',
        'review', 'test', 'deploy', 'update', 'research', 'investigate'
      ],
      meetingKeywords: [
        'meeting', 'call', 'conference', 'discussion', 'sync', 'standup',
        'retrospective', 'planning', 'review', 'demo', 'presentation'
      ],
      urgencyKeywords: {
        urgent: ['urgent', 'asap', 'immediately', 'critical', 'emergency'],
        high: ['important', 'priority', 'soon', 'quick', 'fast'],
        medium: ['normal', 'standard', 'regular'],
        low: ['low', 'minor', 'when possible', 'nice to have', 'eventually']
      },
      timePatterns: [
        /\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?\b/g,
        /\b(\d{1,2})\s*(am|pm|AM|PM)\b/g,
        /\bat\s+(\d{1,2}):(\d{2})/gi,
        /\bat\s+(\d{1,2})\s*(am|pm)/gi
      ],
      datePatterns: [
        /\b(today|tomorrow|yesterday)\b/gi,
        /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
        /\b(this|next)\s+(week|month|year)\b/gi,
        /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
        /\b(\d{1,2})-(\d{1,2})-(\d{2,4})\b/g,
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/gi
      ],
      userMentionPatterns: [
        /@([a-zA-Z0-9_.-]+)/g,
        /\bassign\s+to\s+([a-zA-Z\s]+)/gi,
        /\b([a-zA-Z\s]+)\s+should\b/gi,
        /\bcan\s+([a-zA-Z\s]+)\s+/gi
      ],
      priorityPatterns: {
        urgent: /\b(urgent|asap|critical|emergency|immediately)\b/gi,
        high: /\b(important|priority|high|soon)\b/gi,
        medium: /\b(medium|normal|standard)\b/gi,
        low: /\b(low|minor|nice.to.have|eventually)\b/gi
      }
    },
    nlpSettings: {
      language: 'en',
      enableSentimentAnalysis: true,
      enableNamedEntityRecognition: true,
      enableIntentClassification: true
    },
    ...config
  });

  // Main parsing function
  const parseMessage = useCallback(async (
    content: string,
    context: ParsingContext
  ): Promise<MessageParseResult> => {
    setIsProcessing(true);
    const startTime = Date.now();

    try {
      // Normalize and clean the message
      const normalizedContent = normalizeMessage(content);
      
      // Extract entities
      const entities = await extractEntities(normalizedContent, context);
      
      // Analyze intent
      const intent = analyzeIntent(normalizedContent, entities, context);
      
      // Determine message type and confidence
      const { type, confidence } = classifyMessage(normalizedContent, entities, intent);
      
      // Generate suggestions
      const suggestions = await generateSuggestions(normalizedContent, entities, intent, type, context);
      
      const result: MessageParseResult = {
        type,
        confidence,
        intent,
        entities,
        suggestions: suggestions.filter(s => s.confidence >= parserConfig.current.thresholds.minimumConfidence),
        metadata: {
          processingTime: Date.now() - startTime,
          parserVersion: '1.0.0',
          languageDetected: detectLanguage(normalizedContent)
        }
      };

      // Store in history
      const messageId = generateMessageId(content, context.timestamp);
      setParseHistory(prev => new Map(prev).set(messageId, result));

      return result;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Extract entities from message
  const extractEntities = async (
    content: string,
    context: ParsingContext
  ): Promise<ExtractedEntities> => {
    const entities: ExtractedEntities = {
      users: [],
      dates: [],
      times: [],
      locations: [],
      projects: [],
      tags: [],
      links: [],
      files: [],
      priorities: [],
      durations: [],
      actions: [],
      questions: []
    };

    // Extract user mentions
    entities.users = extractUserMentions(content, context);
    
    // Extract dates
    entities.dates = extractDates(content);
    
    // Extract times
    entities.times = extractTimes(content);
    
    // Extract locations
    entities.locations = extractLocations(content);
    
    // Extract project mentions
    entities.projects = extractProjectMentions(content);
    
    // Extract tags
    entities.tags = extractTags(content);
    
    // Extract links
    entities.links = extractLinks(content);
    
    // Extract files
    entities.files = extractFiles(content);
    
    // Extract priorities
    entities.priorities = extractPriorities(content);
    
    // Extract durations
    entities.durations = extractDurations(content);
    
    // Extract actions
    entities.actions = extractActions(content);
    
    // Extract questions
    entities.questions = extractQuestions(content);

    return entities;
  };

  // Analyze message intent
  const analyzeIntent = (
    content: string,
    entities: ExtractedEntities,
    context: ParsingContext
  ): MessageIntent => {
    const lowerContent = content.toLowerCase();
    
    // Determine primary intent
    let primary = 'general';
    const actionWords = ['need', 'should', 'must', 'have to', 'let\'s', 'can we'];
    const questionWords = ['what', 'when', 'where', 'who', 'why', 'how', '?'];
    const decisionWords = ['decide', 'choose', 'pick', 'select', 'approve'];
    
    if (actionWords.some(word => lowerContent.includes(word))) {
      primary = 'action_request';
    } else if (questionWords.some(word => lowerContent.includes(word))) {
      primary = 'question';
    } else if (decisionWords.some(word => lowerContent.includes(word))) {
      primary = 'decision_needed';
    } else if (entities.dates.length > 0 && entities.users.length > 0) {
      primary = 'scheduling';
    }

    // Determine secondary intents
    const secondary: string[] = [];
    if (entities.users.length > 0) secondary.push('collaboration');
    if (entities.dates.length > 0 || entities.times.length > 0) secondary.push('time_sensitive');
    if (entities.priorities.length > 0) secondary.push('prioritized');

    // Determine urgency
    let urgency: MessageIntent['urgency'] = 'medium';
    if (entities.priorities.length > 0) {
      const highestPriority = entities.priorities.reduce((max, p) => 
        p.level === 'urgent' ? p : p.level === 'high' && max.level !== 'urgent' ? p : max
      );
      urgency = highestPriority.level;
    }

    // Determine timeframe
    let timeframe: MessageIntent['timeframe'] = 'unspecified';
    const immediateWords = ['now', 'immediately', 'asap', 'urgent'];
    const todayWords = ['today', 'end of day', 'eod'];
    const weekWords = ['this week', 'by friday', 'end of week'];
    
    if (immediateWords.some(word => lowerContent.includes(word))) {
      timeframe = 'immediate';
    } else if (todayWords.some(word => lowerContent.includes(word))) {
      timeframe = 'today';
    } else if (weekWords.some(word => lowerContent.includes(word))) {
      timeframe = 'this_week';
    } else if (entities.dates.length > 0) {
      const nearestDate = entities.dates.reduce((min, d) => 
        d.date < min.date ? d : min
      );
      const daysFromNow = (nearestDate.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      
      if (daysFromNow < 1) timeframe = 'today';
      else if (daysFromNow < 7) timeframe = 'this_week';
      else timeframe = 'later';
    }

    return {
      primary,
      secondary,
      actionRequired: primary === 'action_request' || entities.actions.length > 0,
      urgency,
      timeframe
    };
  };

  // Classify message type
  const classifyMessage = (
    content: string,
    entities: ExtractedEntities,
    intent: MessageIntent
  ): { type: MessageParseResult['type']; confidence: number } => {
    const config = parserConfig.current;
    let confidence = 0;
    let type: MessageParseResult['type'] = 'general';

    // Check for task indicators
    const hasTaskKeywords = config.patterns.taskKeywords.some(keyword =>
      content.toLowerCase().includes(keyword)
    );
    
    if (hasTaskKeywords) {
      confidence += 0.3;
      type = 'task';
    }

    // Check for meeting indicators
    const hasMeetingKeywords = config.patterns.meetingKeywords.some(keyword =>
      content.toLowerCase().includes(keyword)
    );
    
    if (hasMeetingKeywords) {
      const meetingConfidence = 0.3;
      if (meetingConfidence > confidence) {
        confidence = meetingConfidence;
        type = 'meeting';
      }
    }

    // Boost confidence based on entities
    if (entities.users.length > 1) confidence += 0.2;
    if (entities.dates.length > 0) confidence += 0.2;
    if (entities.times.length > 0) confidence += 0.1;
    if (entities.priorities.length > 0) confidence += 0.1;
    if (intent.actionRequired) confidence += 0.2;

    // Adjust based on intent
    if (intent.primary === 'question') {
      type = 'question';
      confidence = Math.max(confidence, 0.5);
    } else if (intent.primary === 'decision_needed') {
      type = 'decision';
      confidence = Math.max(confidence, 0.4);
    }

    return { type, confidence: Math.min(confidence, 1.0) };
  };

  // Generate actionable suggestions
  const generateSuggestions = async (
    content: string,
    entities: ExtractedEntities,
    intent: MessageIntent,
    type: MessageParseResult['type'],
    context: ParsingContext
  ): Promise<MessageSuggestion[]> => {
    const suggestions: MessageSuggestion[] = [];
    const config = parserConfig.current;

    // Task creation suggestion
    if (type === 'task' || (intent.actionRequired && entities.users.length > 0)) {
      const taskConfidence = calculateTaskConfidence(content, entities, intent);
      
      if (taskConfidence >= config.thresholds.taskCreationThreshold) {
        suggestions.push({
          type: 'create_task',
          title: 'Create Task',
          description: 'Convert this message into a task',
          confidence: taskConfidence,
          action: () => {}, // Would be implemented by consumer
          metadata: {
            suggestedTitle: extractSuggestedTitle(content),
            suggestedAssignees: entities.users.map(u => u.userId).filter(Boolean),
            suggestedDueDate: entities.dates[0]?.date,
            suggestedPriority: entities.priorities[0]?.level || 'medium'
          }
        });
      }
    }

    // Meeting scheduling suggestion
    if (type === 'meeting' || (entities.users.length > 1 && (entities.dates.length > 0 || entities.times.length > 0))) {
      const meetingConfidence = calculateMeetingConfidence(content, entities, intent);
      
      if (meetingConfidence >= config.thresholds.meetingSchedulingThreshold) {
        suggestions.push({
          type: 'schedule_meeting',
          title: 'Schedule Meeting',
          description: 'Create a calendar event from this message',
          confidence: meetingConfidence,
          action: () => {}, // Would be implemented by consumer
          metadata: {
            suggestedTitle: extractSuggestedTitle(content),
            suggestedParticipants: entities.users.map(u => u.userId).filter(Boolean),
            suggestedDate: entities.dates[0]?.date,
            suggestedTime: entities.times[0]?.time,
            suggestedDuration: entities.durations[0]?.duration || 30,
            suggestedLocation: entities.locations[0]?.name
          }
        });
      }
    }

    // Reminder suggestion
    if (entities.dates.length > 0 && intent.timeframe !== 'immediate') {
      suggestions.push({
        type: 'set_reminder',
        title: 'Set Reminder',
        description: 'Create a reminder for this date',
        confidence: 0.6,
        action: () => {},
        metadata: {
          reminderDate: entities.dates[0].date,
          reminderText: content
        }
      });
    }

    // Project assignment suggestion
    if (entities.projects.length > 0) {
      suggestions.push({
        type: 'add_to_project',
        title: 'Add to Project',
        description: `Add this to project: ${entities.projects[0].projectName}`,
        confidence: 0.5,
        action: () => {},
        metadata: {
          projectId: entities.projects[0].projectId,
          projectName: entities.projects[0].projectName
        }
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  };

  // Entity extraction functions
  const extractUserMentions = (content: string, context: ParsingContext): UserMention[] => {
    const mentions: UserMention[] = [];
    const patterns = parserConfig.current.patterns.userMentionPatterns;

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        mentions.push({
          username: match[1],
          position: { start: match.index, end: match.index + match[0].length },
          context: 'mention',
          confidence: 0.8
        });
      }
    });

    return mentions;
  };

  const extractDates = (content: string): DateEntity[] => {
    const dates: DateEntity[] = [];
    const patterns = parserConfig.current.patterns.datePatterns;

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const parsedDate = parseDate(match[0]);
        if (parsedDate) {
          dates.push({
            date: parsedDate,
            originalText: match[0],
            position: { start: match.index, end: match.index + match[0].length },
            type: isRelativeDate(match[0]) ? 'relative' : 'absolute',
            confidence: 0.7
          });
        }
      }
    });

    return dates;
  };

  const extractTimes = (content: string): TimeEntity[] => {
    const times: TimeEntity[] = [];
    const patterns = parserConfig.current.patterns.timePatterns;

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const timeStr = normalizeTime(match[0]);
        if (timeStr) {
          times.push({
            time: timeStr,
            originalText: match[0],
            position: { start: match.index, end: match.index + match[0].length },
            period: extractPeriod(match[0]),
            confidence: 0.8
          });
        }
      }
    });

    return times;
  };

  const extractLocations = (content: string): LocationEntity[] => {
    const locations: LocationEntity[] = [];
    const locationPatterns = [
      /\broom\s+([a-zA-Z0-9]+)\b/gi,
      /\bbuilding\s+([a-zA-Z0-9]+)\b/gi,
      /\b(conference room|meeting room)\s+([a-zA-Z0-9]+)\b/gi,
      /\bonline\b/gi,
      /\bzoom\b/gi,
      /\bteams\b/gi
    ];

    locationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        locations.push({
          name: match[0],
          type: determineLocationType(match[0]),
          position: { start: match.index, end: match.index + match[0].length },
          confidence: 0.6
        });
      }
    });

    return locations;
  };

  const extractProjectMentions = (content: string): ProjectMention[] => {
    const projects: ProjectMention[] = [];
    const projectPattern = /#([a-zA-Z0-9_-]+)/g;

    let match;
    while ((match = projectPattern.exec(content)) !== null) {
      projects.push({
        projectName: match[1],
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.7
      });
    }

    return projects;
  };

  const extractTags = (content: string): TagEntity[] => {
    const tags: TagEntity[] = [];
    const tagPattern = /\B#([a-zA-Z0-9_]+)\b/g;

    let match;
    while ((match = tagPattern.exec(content)) !== null) {
      tags.push({
        tag: match[1],
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.8
      });
    }

    return tags;
  };

  const extractLinks = (content: string): LinkEntity[] => {
    const links: LinkEntity[] = [];
    const urlPattern = /(https?:\/\/[^\s]+)/g;

    let match;
    while ((match = urlPattern.exec(content)) !== null) {
      links.push({
        url: match[1],
        type: match[1].startsWith('https') ? 'https' : 'http',
        position: { start: match.index, end: match.index + match[0].length }
      });
    }

    return links;
  };

  const extractFiles = (content: string): FileEntity[] => {
    const files: FileEntity[] = [];
    const filePattern = /([a-zA-Z0-9_-]+\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|png|gif))/gi;

    let match;
    while ((match = filePattern.exec(content)) !== null) {
      files.push({
        filename: match[1],
        type: match[2],
        position: { start: match.index, end: match.index + match[0].length }
      });
    }

    return files;
  };

  const extractPriorities = (content: string): PriorityEntity[] => {
    const priorities: PriorityEntity[] = [];
    const patterns = parserConfig.current.patterns.priorityPatterns;

    Object.entries(patterns).forEach(([level, pattern]) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        priorities.push({
          level: level as PriorityEntity['level'],
          originalText: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          confidence: 0.7
        });
      }
    });

    return priorities;
  };

  const extractDurations = (content: string): DurationEntity[] => {
    const durations: DurationEntity[] = [];
    const durationPattern = /(\d+)\s*(minutes?|mins?|hours?|hrs?|days?|weeks?)/gi;

    let match;
    while ((match = durationPattern.exec(content)) !== null) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      let minutes = value;

      if (unit.startsWith('hour') || unit.startsWith('hr')) {
        minutes = value * 60;
      } else if (unit.startsWith('day')) {
        minutes = value * 24 * 60;
      } else if (unit.startsWith('week')) {
        minutes = value * 7 * 24 * 60;
      }

      durations.push({
        duration: minutes,
        originalText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        unit: unit.startsWith('min') ? 'minutes' : 
              unit.startsWith('hour') || unit.startsWith('hr') ? 'hours' :
              unit.startsWith('day') ? 'days' : 'weeks',
        confidence: 0.8
      });
    }

    return durations;
  };

  const extractActions = (content: string): ActionEntity[] => {
    const actions: ActionEntity[] = [];
    const actionVerbs = [
      'create', 'build', 'develop', 'implement', 'design', 'review',
      'test', 'deploy', 'update', 'fix', 'research', 'analyze',
      'complete', 'finish', 'start', 'begin', 'schedule', 'plan'
    ];

    actionVerbs.forEach(verb => {
      const pattern = new RegExp(`\\b${verb}\\s+([^.!?]+)`, 'gi');
      let match;
      while ((match = pattern.exec(content)) !== null) {
        actions.push({
          action: match[0],
          verb,
          object: match[1].trim(),
          position: { start: match.index, end: match.index + match[0].length },
          confidence: 0.6
        });
      }
    });

    return actions;
  };

  const extractQuestions = (content: string): QuestionEntity[] => {
    const questions: QuestionEntity[] = [];
    const sentences = content.split(/[.!?]/);

    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed.includes('?') || 
          trimmed.toLowerCase().startsWith('what') ||
          trimmed.toLowerCase().startsWith('when') ||
          trimmed.toLowerCase().startsWith('where') ||
          trimmed.toLowerCase().startsWith('who') ||
          trimmed.toLowerCase().startsWith('why') ||
          trimmed.toLowerCase().startsWith('how')) {
        
        questions.push({
          question: trimmed,
          type: determineQuestionType(trimmed),
          position: { start: 0, end: trimmed.length }, // Simplified
          requiresResponse: true
        });
      }
    });

    return questions;
  };

  // Utility functions
  const normalizeMessage = (content: string): string => {
    return content.trim().replace(/\s+/g, ' ');
  };

  const detectLanguage = (content: string): string => {
    // Simple language detection - would use a proper library in production
    return 'en';
  };

  const generateMessageId = (content: string, timestamp: Date): string => {
    return `msg_${timestamp.getTime()}_${content.substring(0, 10).replace(/\W/g, '')}`;
  };

  const parseDate = (dateStr: string): Date | null => {
    const now = new Date();
    const lowerStr = dateStr.toLowerCase();

    if (lowerStr === 'today') {
      return now;
    } else if (lowerStr === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return tomorrow;
    } else if (lowerStr === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return yesterday;
    }

    // Try standard date parsing
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const isRelativeDate = (dateStr: string): boolean => {
    const relativeDates = ['today', 'tomorrow', 'yesterday', 'this week', 'next week'];
    return relativeDates.some(relative => dateStr.toLowerCase().includes(relative));
  };

  const normalizeTime = (timeStr: string): string | null => {
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2] || '00';
      return `${hours}:${minutes}`;
    }
    return null;
  };

  const extractPeriod = (timeStr: string): 'AM' | 'PM' | undefined => {
    const period = timeStr.match(/(am|pm)/i);
    return period ? period[1].toUpperCase() as 'AM' | 'PM' : undefined;
  };

  const determineLocationType = (location: string): LocationEntity['type'] => {
    const lowerLocation = location.toLowerCase();
    if (lowerLocation.includes('room')) return 'room';
    if (lowerLocation.includes('building')) return 'building';
    if (lowerLocation.includes('online') || lowerLocation.includes('zoom') || lowerLocation.includes('teams')) return 'online';
    return 'address';
  };

  const determineQuestionType = (question: string): QuestionEntity['type'] => {
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('yes') || lowerQuestion.includes('no') || lowerQuestion.includes('?')) {
      return 'yes_no';
    }
    if (lowerQuestion.startsWith('what') || lowerQuestion.startsWith('who') || lowerQuestion.startsWith('when')) {
      return 'factual';
    }
    return 'open_ended';
  };

  const extractSuggestedTitle = (content: string): string => {
    const firstSentence = content.split(/[.!?]/)[0].trim();
    return firstSentence.length > 80 ? firstSentence.substring(0, 77) + '...' : firstSentence;
  };

  const calculateTaskConfidence = (
    content: string,
    entities: ExtractedEntities,
    intent: MessageIntent
  ): number => {
    let confidence = 0.3; // Base confidence for detected task keywords
    
    if (entities.users.length > 0) confidence += 0.2;
    if (entities.dates.length > 0) confidence += 0.2;
    if (entities.priorities.length > 0) confidence += 0.1;
    if (intent.actionRequired) confidence += 0.2;
    if (entities.actions.length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  };

  const calculateMeetingConfidence = (
    content: string,
    entities: ExtractedEntities,
    intent: MessageIntent
  ): number => {
    let confidence = 0.3; // Base confidence for detected meeting keywords
    
    if (entities.users.length > 1) confidence += 0.3;
    if (entities.dates.length > 0) confidence += 0.2;
    if (entities.times.length > 0) confidence += 0.2;
    if (entities.locations.length > 0) confidence += 0.1;
    if (entities.durations.length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  };

  // Public API for parsing meeting and task data
  const parseMessageForMeetingData = useCallback(async (
    content: string,
    context: Partial<ParsingContext>
  ) => {
    const fullContext: ParsingContext = {
      chatId: context.chatId || 'unknown',
      channelType: context.channelType || 'direct',
      participants: context.participants || [],
      previousMessages: context.previousMessages || [],
      currentUser: context.currentUser || 'unknown',
      timestamp: context.timestamp || new Date()
    };

    const result = await parseMessage(content, fullContext);
    
    if (result.type === 'meeting' || result.suggestions.some(s => s.type === 'schedule_meeting')) {
      const meetingSuggestion = result.suggestions.find(s => s.type === 'schedule_meeting');
      return meetingSuggestion?.metadata || null;
    }
    
    return null;
  }, [parseMessage]);

  const parseMessageForTaskData = useCallback(async (
    content: string,
    context: Partial<ParsingContext>
  ) => {
    const fullContext: ParsingContext = {
      chatId: context.chatId || 'unknown',
      channelType: context.channelType || 'direct',
      participants: context.participants || [],
      previousMessages: context.previousMessages || [],
      currentUser: context.currentUser || 'unknown',
      timestamp: context.timestamp || new Date()
    };

    const result = await parseMessage(content, fullContext);
    
    if (result.type === 'task' || result.suggestions.some(s => s.type === 'create_task')) {
      const taskSuggestion = result.suggestions.find(s => s.type === 'create_task');
      return taskSuggestion?.metadata || null;
    }
    
    return null;
  }, [parseMessage]);

  return {
    // State
    isProcessing,
    parseHistory: Array.from(parseHistory.values()),
    
    // Main parsing functions
    parseMessage,
    parseMessageForMeetingData,
    parseMessageForTaskData,
    
    // Utility functions
    extractEntities,
    analyzeIntent,
    classifyMessage,
    
    // Configuration
    updateConfig: (newConfig: Partial<ParserConfig>) => {
      parserConfig.current = { ...parserConfig.current, ...newConfig };
    },
    
    // Computed values
    recentParses: Array.from(parseHistory.values())
      .sort((a, b) => b.metadata.processingTime - a.metadata.processingTime)
      .slice(0, 10)
  };
}