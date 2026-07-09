// Task field editor: controlled input/textarea with save-on-blur.
import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface RealTimeTaskEditorProps {
  taskId: string;
  field: 'title' | 'description';
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RealTimeTaskEditor({
  taskId,
  field,
  value,
  onChange,
  onSave,
  placeholder = 'Edit task...',
  className = ''
}: RealTimeTaskEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local value with prop value when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  const handleInputChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);

    if (onSave) {
      onSave(localValue);
    }
  };

  return (
    <div className="space-y-1">
      {field === 'title' ? (
        <Input
          ref={inputRef}
          value={localValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={className}
          data-task-field={`${taskId}-${field}`}
        />
      ) : (
        <Textarea
          ref={textareaRef}
          value={localValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={className}
          rows={3}
          data-task-field={`${taskId}-${field}`}
        />
      )}
    </div>
  );
}

// Kept for import compatibility; collaborative editing was removed.
export function TaskEditorsIndicator(_props: { taskId: string }) {
  return null;
}
