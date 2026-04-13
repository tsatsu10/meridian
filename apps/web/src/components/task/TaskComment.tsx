import { useState } from 'react';

export default function TaskComment({ comment, ...props }) {
  const [copied, setCopied] = useState(false);
  const permalink = `/dashboard/task/${comment.taskId}/comment/${comment.id}`;
  const handleCopyPermalink = () => {
    navigator.clipboard.writeText(window.location.origin + permalink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div id={`comment-${comment.id}`} className="relative group">
      {/* ...existing comment rendering... */}
      <button
        className="absolute right-2 top-2 text-xs text-gray-400 hover:text-blue-700 opacity-0 group-hover:opacity-100"
        onClick={handleCopyPermalink}
        title={copied ? 'Copied!' : 'Copy permalink'}
      >
        🔗
      </button>
      {/* ...rest of comment UI... */}
    </div>
  );
} 