
import React from 'react';
import { Clock, Check, AlertCircle } from 'lucide-react';

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'failed' | undefined;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ status }) => {
  if (status === 'sending') {
    return <Clock className="w-4 h-4 text-gray-400" />;
  }

  if (status === 'sent') {
    return <Check className="w-4 h-4 text-green-500" />;
  }

  if (status === 'failed') {
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  }

  return null;
};
