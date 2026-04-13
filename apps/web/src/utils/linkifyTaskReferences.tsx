import React from 'react';

export function linkifyTaskReferences(content: string, onTaskClick: (taskNumber: string) => void) {
  return content.split(/(#[0-9]+)/g).map((part, i) => {
    if (/^#[0-9]+$/.test(part)) {
      const taskNumber = part.slice(1);
      return (
        <span
          key={i}
          className="text-blue-600 cursor-pointer underline"
          onClick={() => onTaskClick(taskNumber)}
        >
          {part}
        </span>
      );
    }
    return part;
  });
} 