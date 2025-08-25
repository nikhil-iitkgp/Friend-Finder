"use client";

import { useState, useEffect, useRef } from 'react';
import { useChatStore, useUser, useCallStore } from '@/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Send, 
  Phone, 
  Video, 
  MoreVertical,
  Loader2,
  Paperclip,
  Smile
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { chatService } from '@/services/chatService';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ChatWindowProps {
  onBack?: () => void;
}

export function ChatWindow({ onBack }: ChatWindowProps) {
  const {
    activeThread,
    messages,
    conversations,
    isLoadingMessages,
    sendMessage,
    loadMessages,
    markAsRead,
  } = useChatStore();

  const { initiateCall } = useCallStore();
  const user = useUser();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current conversation
  const conversation = conversations.find(conv => conv.threadId === activeThread);
  const participant = conversation?.participant;

  useEffect(() => {
    if (activeThread) {
      loadMessages(activeThread);
      // Mark messages as read when opening thread
      markAsRead(activeThread);
    }
  }, [activeThread, loadMessages, markAsRead]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Focus input when thread changes
    inputRef.current?.focus();
  }, [activeThread]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !activeThread || isSending) {
      return;
    }

    const text = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      await sendMessage(activeThread, {
        text,
        messageType: 'text',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setMessageText(text); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const handleCall = () => {
    if (participant?.id) {
      initiateCall(participant.id, false); // Voice call
    }
  };

  const handleVideoCall = () => {
    if (participant?.id) {
      initiateCall(participant.id, true); // Video call
    }
  };

  if (!activeThread || !conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={participant?.profilePicture} alt={participant?.username} />
              <AvatarFallback>
                {participant?.username?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {participant?.isOnline && (
              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div>
            <h2 className="font-semibold text-foreground">
              {participant?.username || 'Unknown User'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {participant?.isOnline ? 'Online' : 
                participant?.lastSeen ? 
                  `Last seen ${formatDistanceToNow(new Date(participant.lastSeen), { addSuffix: true })}` : 
                  'Offline'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={handleCall}>
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleVideoCall}>
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Send a message to start the conversation!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === user?.id}
                  participant={participant}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <Smile className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            size="icon"
            disabled={!messageText.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
  participant?: any;
}

function MessageBubble({ message, isOwn, participant }: MessageBubbleProps) {
  return (
    <div className={cn(
      "flex items-end space-x-2",
      isOwn ? "justify-end" : "justify-start"
    )}>
      {!isOwn && (
        <Avatar className="h-6 w-6">
          <AvatarImage src={participant?.profilePicture} alt={participant?.username} />
          <AvatarFallback className="text-xs">
            {participant?.username?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        "max-w-xs lg:max-w-md px-3 py-2 rounded-lg",
        isOwn 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        <p className="text-sm">{message.text}</p>
        <div className="flex items-center justify-between mt-1 space-x-2">
          <span className={cn(
            "text-xs",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {chatService.formatMessageTime(message.createdAt)}
          </span>
          {isOwn && message.readAt && (
            <span className="text-xs text-primary-foreground/70">✓✓</span>
          )}
        </div>
      </div>
    </div>
  );
}