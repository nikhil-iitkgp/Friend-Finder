import { APIService } from './apiService';
import type { Message, SendMessage, MessagesQuery } from '@/lib/validations';

export interface Conversation {
  id: string;
  threadId: string;
  participant: {
    id: string;
    username: string;
    profilePicture?: string;
    lastSeen: Date;
    isOnline: boolean;
  } | null;
  lastMessage: {
    id: string;
    text: string;
    messageType: string;
    senderId: string;
    createdAt: Date;
  } | null;
  lastMessageAt: Date;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  groupImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderInfo: {
    username: string;
    profilePicture?: string;
  };
  receiverId: string;
  threadId: string;
  text: string;
  messageType: 'text' | 'image' | 'file';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    cloudinaryUrl?: string;
    width?: number;
    height?: number;
  };
  readAt?: Date;
  editedAt?: Date;
  replyTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ChatService extends APIService {
  /**
   * Get user's conversations
   */
  async getConversations(options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: Conversation[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    
    const response = await this.get(`/api/chat/conversations?${params}`);
    return response;
  }

  /**
   * Get messages for a specific thread
   */
  async getMessages(
    threadId: string,
    options: MessagesQuery = {}
  ): Promise<{ data: ChatMessage[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.before) params.append('before', options.before);
    
    const response = await this.get(`/api/chat/${threadId}/messages?${params}`);
    return response;
  }

  /**
   * Send a message to a thread
   */
  async sendMessage(
    threadId: string,
    messageData: SendMessage & { tempId?: string }
  ): Promise<{ message: string; data: ChatMessage }> {
    const response = await this.post(`/api/chat/${threadId}/send`, messageData);
    return response;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(
    threadId: string,
    messageId?: string
  ): Promise<{ message: string; data: any }> {
    const response = await this.post(`/api/chat/${threadId}/read`, {
      messageId,
    });
    return response;
  }

  /**
   * Start a new conversation
   */
  async startConversation(participantId: string): Promise<{ message: string; data: Conversation }> {
    const response = await this.post('/api/chat/start', {
      participantId,
    });
    return response;
  }

  /**
   * Generate thread ID from two user IDs
   */
  static createThreadId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  /**
   * Format message timestamp
   */
  static formatMessageTime(date: Date | string): string {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffMs < 60000) { // Less than 1 minute
      return 'now';
    } else if (diffHours < 1) { // Less than 1 hour
      const minutes = Math.floor(diffMs / (1000 * 60));
      return `${minutes}m`;
    } else if (diffHours < 24) { // Less than 1 day
      return messageDate.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays < 7) { // Less than 1 week
      return messageDate.toLocaleDateString([], { 
        weekday: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return messageDate.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  }

  /**
   * Get conversation preview text
   */
  static getConversationPreview(conversation: Conversation): string {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    const { lastMessage } = conversation;
    
    switch (lastMessage.messageType) {
      case 'image':
        return '📷 Image';
      case 'file':
        return '📎 File';
      case 'text':
      default:
        return lastMessage.text.length > 50 
          ? `${lastMessage.text.substring(0, 50)}...`
          : lastMessage.text;
    }
  }

  /**
   * Calculate total unread messages across all conversations
   */
  static getTotalUnreadCount(conversations: Conversation[]): number {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }
}

// Export singleton instance
export const chatService = new ChatService();