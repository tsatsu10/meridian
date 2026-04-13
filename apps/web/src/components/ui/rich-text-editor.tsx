import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
  Link,
  AtSign,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string, plainText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  maxLength?: number;
  mentionSuggestions?: { id: string; name: string; email?: string }[];
  onMentionSearch?: (query: string) => void;
}

interface MentionSuggestion {
  id: string;
  name: string;
  email?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Type your message...",
  disabled = false,
  className,
  onKeyDown,
  maxLength = 1000,
  mentionSuggestions = [],
  onMentionSearch,
}: RichTextEditorProps) {
  const [htmlContent, setHtmlContent] = useState(value);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 });
  const editorRef = useRef<HTMLDivElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);

  // Convert HTML to plain text for character counting
  const getPlainText = (html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Format text with given command
  const formatText = useCallback((command: string, value?: string) => {
    if (disabled) return;
    
    document.execCommand(command, false, value);
    const newHtml = editorRef.current?.innerHTML || '';
    const plainText = getPlainText(newHtml);
    
    setHtmlContent(newHtml);
    onChange(newHtml, plainText);
    editorRef.current?.focus();
  }, [disabled, onChange]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const newHtml = editorRef.current.innerHTML;
    const plainText = getPlainText(newHtml);
    
    // Check for mentions
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        const query = mentionMatch[1];
        setMentionQuery(query);
        setShowMentions(true);
        
        // Position mentions dropdown
        const rect = range.getBoundingClientRect();
        setMentionPosition({ x: rect.left, y: rect.bottom + 5 });
        
        // Trigger mention search
        if (onMentionSearch) {
          onMentionSearch(query);
        }
      } else {
        setShowMentions(false);
      }
    }
    
    setHtmlContent(newHtml);
    onChange(newHtml, plainText);
  }, [onChange, onMentionSearch]);

  // Insert mention
  const insertMention = useCallback((mention: MentionSuggestion) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      const offset = range.startOffset;
      
      if (textNode.nodeType === Node.TEXT_NODE) {
        const textContent = textNode.textContent || '';
        const beforeAt = textContent.lastIndexOf('@', offset - 1);
        
        if (beforeAt !== -1) {
          // Create mention element
          const mention = document.createElement('span');
          mention.className = 'mention bg-blue-100 text-blue-800 px-1 rounded';
          mention.setAttribute('data-mention-id', mention.id);
          mention.textContent = `@${mention.name}`;
          mention.contentEditable = 'false';
          
          // Replace the @query with the mention
          const beforeText = textContent.substring(0, beforeAt);
          const afterText = textContent.substring(offset);
          
          // Create new range and insert mention
          range.setStart(textNode, beforeAt);
          range.setEnd(textNode, offset);
          range.deleteContents();
          range.insertNode(mention);
          
          // Add space after mention
          const spaceNode = document.createTextNode(' ');
          range.insertNode(spaceNode);
          
          // Move cursor after space
          range.setStartAfter(spaceNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
    
    setShowMentions(false);
    handleInput();
  }, [handleInput]);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showMentions) {
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // Handle mention navigation (simplified)
        return;
      }
      if (e.key === 'Enter' && mentionSuggestions.length > 0) {
        e.preventDefault();
        insertMention(mentionSuggestions[0]);
        return;
      }
    }
    
    // Check character limit
    const plainText = getPlainText(editorRef.current?.innerHTML || '');
    if (plainText.length >= maxLength && e.key !== 'Backspace' && e.key !== 'Delete') {
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        return;
      }
    }
    
    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [showMentions, mentionSuggestions, insertMention, maxLength, onKeyDown]);

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      formatText('createLink', url);
    }
  }, [formatText]);

  // Sync external value changes
  useEffect(() => {
    if (editorRef.current && htmlContent !== value) {
      setHtmlContent(value);
      editorRef.current.innerHTML = value;
    }
  }, [value, htmlContent]);

  const plainTextLength = getPlainText(htmlContent).length;

  return (
    <div className={cn("relative border rounded-md", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('bold')}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('italic')}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('underline')}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title="Insert Link"
        >
          <Link className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('insertUnorderedList')}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('insertOrderedList')}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('formatBlock', 'blockquote')}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        
        <div className="flex-1" />
        
        <span className="text-xs text-muted-foreground">
          {plainTextLength}/{maxLength}
        </span>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={cn(
          "min-h-[120px] p-3 focus:outline-none",
          "prose prose-sm max-w-none",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        data-placeholder={placeholder}
        style={{
          '--placeholder-color': 'rgb(156 163 175)',
        }}
      />
      
      {/* Mention Suggestions */}
      {showMentions && mentionSuggestions.length > 0 && (
        <div
          ref={mentionsRef}
          className="absolute z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto"
          style={{
            left: mentionPosition.x,
            top: mentionPosition.y,
            minWidth: '200px',
          }}
        >
          {mentionSuggestions
            .filter(suggestion => 
              suggestion.name.toLowerCase().includes(mentionQuery.toLowerCase())
            )
            .slice(0, 5)
            .map((suggestion) => (
              <button
                key={suggestion.id}
                className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                onClick={() => insertMention(suggestion)}
              >
                <AtSign className="h-4 w-4" />
                <div>
                  <div className="font-medium">{suggestion.name}</div>
                  {suggestion.email && (
                    <div className="text-xs text-muted-foreground">{suggestion.email}</div>
                  )}
                </div>
              </button>
            ))}
        </div>
      )}
      
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: var(--placeholder-color);
          pointer-events: none;
        }
        
        .mention {
          background-color: rgb(239 246 255);
          color: rgb(30 64 175);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          user-select: none;
        }
      `}</style>
    </div>
  );
}