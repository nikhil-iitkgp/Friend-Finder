import { apiClient, handleAPIError, rateLimiter } from './api';
import type {
  Message,
  SendMessage,
  MessagesQuery,
  PaginatedResponse,
} from '@/lib/validations';

/**
 * Messages service for chat functionality
 */
export class MessagesService {
  private readonly baseEndpoint = '/messages';
  
  /**
   * Get message history with a user
   */
  async getMessages(
    userId: string, 
    query: MessagesQuery = {}
  ): Promise<PaginatedResponse<Message>> {
    try {
      const params = new URLSearchParams();
      
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.offset) params.append('offset', query.offset.toString());
      if (query.before) params.append('before', query.before);
      
      const endpoint = `${this.baseEndpoint}/${userId}${params.toString() ? `?${params.toString()}` : ''}`;
      return await apiClient.get<PaginatedResponse<Message>>(endpoint);
    } catch (error) {
      throw new Error(`Failed to get messages: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Send a message to a user
   */
  async sendMessage(userId: string, message: SendMessage): Promise<Message> {
    try {
      // Rate limit message sending (max 60 per minute)
      if (!rateLimiter.isAllowed(`send-message-${userId}`, 60, 60000)) {
        throw new Error('Too many messages sent. Please slow down.');
      }
      
      return await apiClient.post<Message>(`${this.baseEndpoint}/${userId}`, message);
    } catch (error) {
      throw new Error(`Failed to send message: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Mark messages as read
   */
  async markAsRead(userId: string, messageIds?: string[]): Promise<void> {
    try {
      const body = messageIds ? { messageIds } : undefined;
      await apiClient.post<void>(`${this.baseEndpoint}/${userId}/read`, body);
    } catch (error) {
      throw new Error(`Failed to mark messages as read: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Edit a message
   */
  async editMessage(messageId: string, newText: string): Promise<Message> {
    try {
      return await apiClient.put<Message>(`${this.baseEndpoint}/edit/${messageId}`, {
        text: newText
      });
    } catch (error) {
      throw new Error(`Failed to edit message: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await apiClient.delete<void>(`${this.baseEndpoint}/${messageId}`);
    } catch (error) {
      throw new Error(`Failed to delete message: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get recent conversations
   */
  async getConversations(limit: number = 20): Promise<{
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
  }[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      return await apiClient.get(`${this.baseEndpoint}/conversations?${params.toString()}`);
    } catch (error) {
      throw new Error(`Failed to get conversations: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get unread message count
   */
  async getUnreadCount(userId?: string): Promise<number> {
    try {
      const endpoint = userId 
        ? `${this.baseEndpoint}/unread/${userId}`
        : `${this.baseEndpoint}/unread`;
      
      const result = await apiClient.get<{ count: number }>(endpoint);
      return result.count;
    } catch (error) {
      throw new Error(`Failed to get unread count: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Search messages
   */
  async searchMessages(
    query: string, 
    userId?: string, 
    limit: number = 20
  ): Promise<Message[]> {
    try {
      // Rate limit search requests
      if (!rateLimiter.isAllowed('message-search', 10, 60000)) {
        throw new Error('Too many search requests. Please wait a moment.');
      }
      
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString()
      });
      
      if (userId) params.append('userId', userId);
      
      return await apiClient.get<Message[]>(`${this.baseEndpoint}/search?${params.toString()}`);
    } catch (error) {
      throw new Error(`Failed to search messages: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get message by ID
   */
  async getMessageById(messageId: string): Promise<Message> {
    try {
      return await apiClient.get<Message>(`${this.baseEndpoint}/single/${messageId}`);
    } catch (error) {
      throw new Error(`Failed to get message: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Report a message
   */
  async reportMessage(
    messageId: string, 
    reason: 'spam' | 'harassment' | 'inappropriate' | 'other',
    details?: string
  ): Promise<void> {
    try {
      await apiClient.post<void>(`${this.baseEndpoint}/report/${messageId}`, {
        reason,
        details
      });
    } catch (error) {
      throw new Error(`Failed to report message: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Clear conversation history
   */
  async clearConversation(userId: string): Promise<void> {
    try {
      await apiClient.delete<void>(`${this.baseEndpoint}/conversation/${userId}`);
    } catch (error) {
      throw new Error(`Failed to clear conversation: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Export conversation
   */
  async exportConversation(userId: string, format: 'json' | 'txt' = 'json'): Promise<Blob> {
    try {
      const params = new URLSearchParams({ format });
      const response = await apiClient.request(`${this.baseEndpoint}/export/${userId}?${params.toString()}`, {
        method: 'GET'
      });
      
      // Handle blob response
      return new Blob([JSON.stringify(response.data)], {
        type: format === 'json' ? 'application/json' : 'text/plain'
      });
    } catch (error) {
      throw new Error(`Failed to export conversation: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Send typing indicator
   */
  async sendTypingIndicator(userId: string, isTyping: boolean): Promise<void> {
    try {
      // Rate limit typing indicators (max 10 per 10 seconds)
      if (!rateLimiter.isAllowed(`typing-${userId}`, 10, 10000)) {
        return; // Silently fail for typing indicators
      }
      
      await apiClient.post<void>(`${this.baseEndpoint}/${userId}/typing`, {
        isTyping
      });
    } catch (error) {
      // Silently fail for typing indicators to avoid disrupting UX
      console.warn('Failed to send typing indicator:', error);
    }
  }
}

// Export singleton instance
export const messagesService = new MessagesService();