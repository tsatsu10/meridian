import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import ChatInterfaceTest from '@/components/communication/chat/ChatInterfaceTest';

export const Route = createFileRoute('/__dev__/chat-interface-test')({
  component: ChatInterfaceTestPage,
});

function ChatInterfaceTestPage() {
  return (
    <div className="h-full flex flex-col">
      <ChatInterfaceTest />
    </div>
  );
} 