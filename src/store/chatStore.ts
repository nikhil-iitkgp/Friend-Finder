import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message, SendMessage } from '@/lib/validations';
import { messagesService } from '@/services';

interface ChatState {
  // Active conversation
  activeThread: string | null;
  
  // Messages organized by conversation
  messages: Map<string, Message[]>;
  
  // Typing indicators
  typingUsers: Set<string>;
  
  // Unread counts per conversation
  unreadCounts: Map<string, number>;
  
  // Loading states per conversation
  loadingStates: Map<string, boolean>;
  
  // Error states per conversation
  errorStates: Map<string, string | null>;
  
  // Conversation metadata
  conversations: Array<{
    userId: string;
    user: {
      id: string;
      username: string;
      profilePicture?: string;
      lastSeen: Date;
      isOnline?: boolean;
    };
    lastMessage: Message;
    unreadCount: number;
  }>;
  
  // Global loading states
  isLoadingConversations: boolean;
  conversationsError: string | null;
  
  // Actions
  setActiveThread: (userId: string | null) => void;
  setMessages: (userId: string, messages: Message[]) => void;
  addMessage: (userId: string, message: Message) => void;
  updateMessage: (userId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (userId: string, messageId: string) => void;
  
  // Typing indicators
  setTyping: (userId: string, isTyping: boolean) => void;
  clearTyping: (userId: string) => void;
  
  // Unread counts
  setUnreadCount: (userId: string, count: number) => void;
  markAsRead: (userId: string, messageIds?: string[]) => void;
  
  // Loading and error states
  setLoading: (userId: string, loading: boolean) => void;
  setError: (userId: string, error: string | null) => void;
  
  // Async actions
  loadMessages: (userId: string, limit?: number, offset?: number) => Promise<void>;
  sendMessage: (userId: string, message: SendMessage) => Promise<void>;
  loadConversations: () => Promise<void>;
  markConversationAsRead: (userId: string) => Promise<void>;
  
  // Real-time updates
  handleIncomingMessage: (message: Message) => void;
  handleMessageRead: (messageId: string, readBy: string) => void;
  handleTypingUpdate: (userId: string, isTyping: boolean) => void;
  
  // Utility functions
  clearThread: (userId: string) => void;
  clearAllThreads: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeThread: null,
      messages: new Map(),
      typingUsers: new Set(),
      unreadCounts: new Map(),
      loadingStates: new Map(),
      errorStates: new Map(),
      conversations: [],
      isLoadingConversations: false,
      conversationsError: null,
      
      // Basic actions
      setActiveThread: (activeThread) => set({ activeThread }),
      
      setMessages: (userId, messages) => {
        const { messages: currentMessages } = get();
        const newMessages = new Map(currentMessages);
        newMessages.set(userId, messages);
        set({ messages: newMessages });
      },
      
      addMessage: (userId, message) => {
        const { messages } = get();
        const newMessages = new Map(messages);
        const userMessages = newMessages.get(userId) || [];
        
        // Avoid duplicates
        const exists = userMessages.some(m => m.id === message.id);
        if (!exists) {
          newMessages.set(userId, [...userMessages, message]);
          set({ messages: newMessages });
        }
      },
      
      updateMessage: (userId, messageId, updates) => {
        const { messages } = get();
        const newMessages = new Map(messages);
        const userMessages = newMessages.get(userId) || [];
        
        const updatedMessages = userMessages.map(msg => 
          msg.id === messageId ? { ...msg, ...updates } : msg
        );
        
        newMessages.set(userId, updatedMessages);
        set({ messages: newMessages });
      },
      
      removeMessage: (userId, messageId) => {
        const { messages } = get();
        const newMessages = new Map(messages);
        const userMessages = newMessages.get(userId) || [];
        
        const filteredMessages = userMessages.filter(msg => msg.id !== messageId);
        newMessages.set(userId, filteredMessages);
        set({ messages: newMessages });
      },
      
      // Typing indicators
      setTyping: (userId, isTyping) => {
        const { typingUsers } = get();
        const newTypingUsers = new Set(typingUsers);
        
        if (isTyping) {
          newTypingUsers.add(userId);
        } else {
          newTypingUsers.delete(userId);
        }
        
        set({ typingUsers: newTypingUsers });
      },
      
      clearTyping: (userId) => {
        const { typingUsers } = get();
        const newTypingUsers = new Set(typingUsers);
        newTypingUsers.delete(userId);
        set({ typingUsers: newTypingUsers });
      },
      
      // Unread counts
      setUnreadCount: (userId, count) => {
        const { unreadCounts } = get();
        const newUnreadCounts = new Map(unreadCounts);
        newUnreadCounts.set(userId, count);
        set({ unreadCounts: newUnreadCounts });
      },
      
      markAsRead: (userId, messageIds) => {
        // Clear unread count
        get().setUnreadCount(userId, 0);
        
        // Update message read status if specific messages provided
        if (messageIds) {
          const { messages } = get();
          const userMessages = messages.get(userId) || [];
          
          messageIds.forEach(messageId => {
            get().updateMessage(userId, messageId, { readAt: new Date() });
          });
        }
      },
      
      // Loading and error states
      setLoading: (userId, loading) => {
        const { loadingStates } = get();
        const newLoadingStates = new Map(loadingStates);
        newLoadingStates.set(userId, loading);
        set({ loadingStates: newLoadingStates });
      },
      
      setError: (userId, error) => {
        const { errorStates } = get();
        const newErrorStates = new Map(errorStates);
        newErrorStates.set(userId, error);
        set({ errorStates: newErrorStates });
      },
      
      // Async actions
      loadMessages: async (userId, limit = 20, offset = 0) => {
        try {
          get().setLoading(userId, true);
          get().setError(userId, null);
          
          const response = await messagesService.getMessages(userId, { limit, offset });
          
          if (offset === 0) {
            // New conversation load
            get().setMessages(userId, response.data);
          } else {
            // Pagination - prepend older messages
            const { messages } = get();
            const existingMessages = messages.get(userId) || [];
            const newMessages = new Map(messages);
            newMessages.set(userId, [...response.data, ...existingMessages]);
            set({ messages: newMessages });
          }
          
          get().setLoading(userId, false);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
          get().setError(userId, errorMessage);
          get().setLoading(userId, false);
          throw error;
        }
      },
      
      sendMessage: async (userId, message) => {
        try {
          get().setError(userId, null);
          
          const sentMessage = await messagesService.sendMessage(userId, message);
          get().addMessage(userId, sentMessage);
          
          // Clear typing indicator
          get().clearTyping(userId);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
          get().setError(userId, errorMessage);
          throw error;
        }
      },
      
      loadConversations: async () => {
        try {
          set({ isLoadingConversations: true, conversationsError: null });
          
          const conversations = await messagesService.getConversations();
          
          // Update unread counts
          const { unreadCounts } = get();
          const newUnreadCounts = new Map(unreadCounts);
          
          conversations.forEach(conv => {
            newUnreadCounts.set(conv.userId, conv.unreadCount);
          });
          
          set({ 
            conversations,
            unreadCounts: newUnreadCounts,
            isLoadingConversations: false 
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations';
          set({ 
            conversationsError: errorMessage,
            isLoadingConversations: false 
          });
          throw error;
        }
      },
      
      markConversationAsRead: async (userId) => {
        try {
          await messagesService.markAsRead(userId);
          get().markAsRead(userId);
          
          // Update conversations list
          const { conversations } = get();
          const updatedConversations = conversations.map(conv =>
            conv.userId === userId ? { ...conv, unreadCount: 0 } : conv
          );
          set({ conversations: updatedConversations });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to mark as read';
          get().setError(userId, errorMessage);
          throw error;
        }
      },
      
      // Real-time updates
      handleIncomingMessage: (message) => {
        const { activeThread } = get();
        const otherUserId = message.senderId;
        
        // Add message to conversation
        get().addMessage(otherUserId, message);
        
        // Update unread count if not in active thread
        if (activeThread !== otherUserId) {
          const { unreadCounts } = get();
          const currentCount = unreadCounts.get(otherUserId) || 0;
          get().setUnreadCount(otherUserId, currentCount + 1);
        } else {
          // Auto-mark as read if in active thread
          get().markConversationAsRead(otherUserId);
        }
        
        // Update conversations list
        get().loadConversations();
      },
      
      handleMessageRead: (messageId, readBy) => {
        // Find and update the message across all conversations
        const { messages } = get();
        
        messages.forEach((userMessages, userId) => {
          const messageIndex = userMessages.findIndex(m => m.id === messageId);
          if (messageIndex !== -1) {
            get().updateMessage(userId, messageId, { readAt: new Date() });
          }
        });
      },
      
      handleTypingUpdate: (userId, isTyping) => {
        get().setTyping(userId, isTyping);
        
        // Auto-clear typing after 3 seconds
        if (isTyping) {
          setTimeout(() => {
            get().clearTyping(userId);
          }, 3000);
        }
      },
      
      // Utility functions
      clearThread: (userId) => {
        const { messages, loadingStates, errorStates } = get();
        const newMessages = new Map(messages);
        const newLoadingStates = new Map(loadingStates);
        const newErrorStates = new Map(errorStates);
        
        newMessages.delete(userId);
        newLoadingStates.delete(userId);
        newErrorStates.delete(userId);
        
        set({ 
          messages: newMessages,
          loadingStates: newLoadingStates,
          errorStates: newErrorStates
        });
        
        get().clearTyping(userId);
      },
      
      clearAllThreads: () => {
        set({
          activeThread: null,
          messages: new Map(),
          typingUsers: new Set(),
          unreadCounts: new Map(),
          loadingStates: new Map(),
          errorStates: new Map(),
          conversations: [],
        });
      },
    }),
    { name: 'ChatStore' }
  )
);

// Selectors
export const useActiveThread = () => useChatStore((state) => state.activeThread);
export const useMessages = (userId: string) => useChatStore((state) => 
  state.messages.get(userId) || []
);
export const useTypingUsers = () => useChatStore((state) => state.typingUsers);
export const useUnreadCount = (userId: string) => useChatStore((state) => 
  state.unreadCounts.get(userId) || 0
);
export const useTotalUnreadCount = () => useChatStore((state) => {
  let total = 0;
  state.unreadCounts.forEach(count => total += count);
  return total;
});
export const useConversations = () => useChatStore((state) => state.conversations);
export const useIsLoadingMessages = (userId: string) => useChatStore((state) => 
  state.loadingStates.get(userId) || false
);
export const useMessageError = (userId: string) => useChatStore((state) => 
  state.errorStates.get(userId) || null
);

// Actions selectors
export const useChatActions = () => useChatStore((state) => ({
  setActiveThread: state.setActiveThread,
  loadMessages: state.loadMessages,
  sendMessage: state.sendMessage,
  loadConversations: state.loadConversations,
  markConversationAsRead: state.markConversationAsRead,
  handleIncomingMessage: state.handleIncomingMessage,
  handleMessageRead: state.handleMessageRead,
  handleTypingUpdate: state.handleTypingUpdate,
  clearThread: state.clearThread,
  clearAllThreads: state.clearAllThreads,
}));