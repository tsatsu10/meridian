// @epic-3.6-communication: Message formatting system
import { WebSocketMessage } from '../websocket-server';
import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import logger from '../../utils/logger';

// Initialize DOMPurify with JSDOM
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {
        logger.error('Highlight.js error:', err);
      }
    }
    return code; // Use plain text if language not found
  },
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
  headerIds: false, // Disable header IDs for security
});

export interface FormattedMessage {
  raw: string;
  html: string;
  preview: string;
  codeBlocks: Array<{
    language: string;
    code: string;
  }>;
  hasPreview: boolean;
}

class MessageFormatter {
  private static instance: MessageFormatter;

  private constructor() {}

  public static getInstance(): MessageFormatter {
    if (!MessageFormatter.instance) {
      MessageFormatter.instance = new MessageFormatter();
    }
    return MessageFormatter.instance;
  }

  public formatMessage(content: string): FormattedMessage {
    // Extract code blocks before processing
    const codeBlocks: Array<{ language: string; code: string }> = [];
    const processedContent = content.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
      codeBlocks.push({
        language: lang || 'plaintext',
        code: code.trim(),
      });
      return `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
    });

    // Convert Markdown to HTML
    const html = marked(processedContent);

    // Sanitize HTML
    const sanitizedHtml = purify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
        'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'hr', 'img', 'del', 'span',
      ],
      ALLOWED_ATTR: ['href', 'src', 'class', 'alt', 'title'],
    });

    // Create preview (first 100 characters of plain text)
    const preview = this.createPreview(content);

    return {
      raw: content,
      html: sanitizedHtml,
      preview,
      codeBlocks,
      hasPreview: preview.length > 0,
    };
  }

  public formatCodeBlock(code: string, language: string = 'plaintext'): string {
    if (language && hljs.getLanguage(language)) {
      try {
        return hljs.highlight(code, { language }).value;
      } catch (err) {
        logger.error('Highlight.js error:', err);
      }
    }
    return hljs.highlightAuto(code).value;
  }

  private createPreview(content: string, maxLength: number = 100): string {
    // Remove code blocks
    const withoutCode = content.replace(/```[\s\S]+?```/g, '');
    
    // Remove Markdown syntax
    const plainText = withoutCode
      .replace(/[#*_~`]/g, '') // Remove basic formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '[Image]') // Replace images
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    return plainText.length > maxLength
      ? plainText.slice(0, maxLength) + '...'
      : plainText;
  }
}

export const messageFormatter = MessageFormatter.getInstance(); 
