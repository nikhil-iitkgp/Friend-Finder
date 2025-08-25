"use client";

import { useState, useEffect } from 'react';
import { useChatStore } from '@/store';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { EmptyState } from '@/components/chat/EmptyState';
import { MessageCircle } from 'lucide-react';

export default function ChatPage() {
  const {
    conversations,
    activeThread,
    isLoading,
    error,
    loadConversations,
    setActiveThread,
  } = useChatStore();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Load conversations on mount
    loadConversations();

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [loadConversations]);

  // Mobile: show conversation list or chat window, not both
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex-1 overflow-hidden">
          {activeThread ? (
            <ChatWindow onBack={() => setActiveThread(null)} />
          ) : (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="border-b border-border p-4">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <MessageCircle className="h-6 w-6" />
                  Messages
                </h1>
              </div>
              
              {/* Conversation List */}
              <div className="flex-1 overflow-hidden">
                <ConversationList />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: show both conversation list and chat window
  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Sidebar - Conversations */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </h1>
        </div>
        
        {/* Conversation List */}
        <div className="flex-1 overflow-hidden">
          <ConversationList />
        </div>
      </div>

      {/* Right Side - Chat Window */}
      <div className="flex-1 flex flex-col">
        {activeThread ? (
          <ChatWindow />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}