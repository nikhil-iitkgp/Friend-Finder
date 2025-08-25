"use client";

import { useEffect } from 'react';
import { useChatStore } from '@/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { chatService } from '@/services/chatService';
import { formatDistanceToNow } from 'date-fns';

export function ConversationList() {
  const {
    conversations,
    activeThread,
    isLoading,
    error,
    loadConversations,
    setActiveThread,
    clearError,
  } = useChatStore();

  useEffect(() => {
    if (conversations.length === 0) {
      loadConversations();
    }
  }, [conversations.length, loadConversations]);

  const handleConversationClick = (conversation: any) => {
    setActiveThread(conversation.threadId);
  };

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <button
            onClick={() => {
              clearError();
              loadConversations();
            }}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">No conversations yet</p>
          <p className="text-sm text-muted-foreground">
            Start chatting with your friends from the discover page!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={activeThread === conversation.threadId}
              onClick={() => handleConversationClick(conversation)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: any;
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const participant = conversation.participant;
  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount;

  return (
    <div
      className={cn(
        "p-4 cursor-pointer hover:bg-accent/50 transition-colors",
        isActive && "bg-accent"
      )}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={participant?.profilePicture} alt={participant?.username} />
            <AvatarFallback>
              {participant?.username?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          {participant?.isOnline && (
            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={cn(
              "font-medium truncate",
              unreadCount > 0 ? "text-foreground" : "text-foreground/80"
            )}>
              {participant?.username || 'Unknown User'}
            </h3>
            <div className="flex items-center space-x-2">
              {lastMessage && (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                </span>
              )}
              {unreadCount > 0 && (
                <Badge variant="default" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className={cn(
              "text-sm truncate",
              unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {lastMessage ? chatService.getConversationPreview(conversation) : 'No messages yet'}
            </p>
          </div>

          {participant?.isOnline && (
            <p className="text-xs text-green-600 mt-1">Online</p>
          )}
        </div>
      </div>
    </div>
  );
}