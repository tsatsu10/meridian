// @epic-3.5-communication: Markdown renderer for help articles

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/cn';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-slate dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Customize heading styles
          h1: ({ node, ...props }) => (
            <h1 className="text-4xl font-bold mt-8 mb-4 text-foreground" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-3xl font-semibold mt-6 mb-3 text-foreground" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-2xl font-semibold mt-5 mb-2 text-foreground" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xl font-semibold mt-4 mb-2 text-foreground" {...props} />
          ),

          // Customize paragraph
          p: ({ node, ...props }) => (
            <p className="mb-4 text-muted-foreground leading-7" {...props} />
          ),

          // Customize links
          a: ({ node, ...props }) => (
            <a
              className="text-primary hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),

          // Customize lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-muted-foreground" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-muted-foreground" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="ml-4" {...props} />
          ),

          // Customize code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <code
                className={cn(
                  'block p-4 rounded-lg bg-muted overflow-x-auto text-sm',
                  className
                )}
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-primary"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Customize blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-primary pl-4 py-2 my-4 italic text-muted-foreground bg-muted/50 rounded-r"
              {...props}
            />
          ),

          // Customize tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-border" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-muted" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold text-foreground" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-2 text-sm text-muted-foreground border-t border-border" {...props} />
          ),

          // Customize horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-border" {...props} />
          ),

          // Customize images
          img: ({ node, ...props }) => (
            <img
              className="rounded-lg shadow-md my-4 max-w-full h-auto"
              loading="lazy"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
