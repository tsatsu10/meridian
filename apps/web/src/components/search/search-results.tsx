/**
 * Search Results Component
 * Displays grouped search results
 * Phase 0 - Advanced Search Implementation
 */

import React from 'react';
import { 
  User, 
  FolderKanban, 
  CheckSquare, 
  FileText, 
  MessageSquare,
  ArrowRight 
} from 'lucide-react';
import { Badge } from '../ui/badge';

interface SearchResultsProps {
  results: {
    users?: { hits: any[] };
    projects?: { hits: any[] };
    tasks?: { hits: any[] };
    files?: { hits: any[] };
    messages?: { hits: any[] };
  };
  query: string;
  onResultSelect: (result: any) => void;
}

export function SearchResults({
  results,
  query,
  onResultSelect,
}: SearchResultsProps) {
  const sections = [
    {
      key: 'users',
      title: 'Users',
      icon: User,
      color: 'text-blue-500',
      results: results.users?.hits || [],
    },
    {
      key: 'projects',
      title: 'Projects',
      icon: FolderKanban,
      color: 'text-purple-500',
      results: results.projects?.hits || [],
    },
    {
      key: 'tasks',
      title: 'Tasks',
      icon: CheckSquare,
      color: 'text-green-500',
      results: results.tasks?.hits || [],
    },
    {
      key: 'files',
      title: 'Files',
      icon: FileText,
      color: 'text-orange-500',
      results: results.files?.hits || [],
    },
    {
      key: 'messages',
      title: 'Messages',
      icon: MessageSquare,
      color: 'text-pink-500',
      results: results.messages?.hits || [],
    },
  ];

  const hasResults = sections.some(section => section.results.length > 0);

  if (!hasResults) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No results found for "<span className="font-medium">{query}</span>"
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Try different keywords or check your spelling
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {sections.map((section) => {
        if (section.results.length === 0) return null;

        return (
          <div key={section.key} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <section.icon className={`h-4 w-4 ${section.color}`} />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                {section.title}
              </h3>
              <Badge variant="secondary" className="ml-auto">
                {section.results.length}
              </Badge>
            </div>

            <ul className="space-y-1">
              {section.results.map((result: any) => (
                <li
                  key={result.id}
                  className="group flex items-start gap-3 px-3 py-2 hover:bg-accent rounded cursor-pointer transition-colors"
                  onClick={() => onResultSelect(result)}
                >
                  <section.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${section.color}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {highlightText(result.title, query)}
                      </p>
                      
                      {result.metadata?.status && (
                        <Badge 
                          variant={getStatusVariant(result.metadata.status)}
                          className="text-xs"
                        >
                          {result.metadata.status}
                        </Badge>
                      )}
                    </div>
                    
                    {result.content && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {highlightText(result.content, query)}
                      </p>
                    )}

                    {result.metadata?.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {result.metadata.description}
                      </p>
                    )}
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </li>
              ))}
            </ul>

            {section.results.length >= 5 && (
              <button className="text-xs text-muted-foreground hover:text-foreground mt-2 ml-7">
                View all {section.title.toLowerCase()} →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Highlight search query in text
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * Get badge variant based on status
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'active' || statusLower === 'in-progress') {
    return 'default';
  }
  if (statusLower === 'completed' || statusLower === 'done') {
    return 'secondary';
  }
  if (statusLower === 'cancelled' || statusLower === 'blocked') {
    return 'destructive';
  }
  
  return 'outline';
}

