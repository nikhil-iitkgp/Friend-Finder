import { chatService } from '../chatService';

describe('ChatService', () => {
  describe('createThreadId', () => {
    it('should create consistent thread ID regardless of user order', () => {
      const user1 = '507f1f77bcf86cd799439011';
      const user2 = '507f1f77bcf86cd799439012';
      
      const thread1 = chatService.createThreadId(user1, user2);
      const thread2 = chatService.createThreadId(user2, user1);
      
      expect(thread1).toBe(thread2);
      expect(thread1).toBe(`${user1}_${user2}`);
    });
  });

  describe('formatMessageTime', () => {
    it('should format recent messages as "now"', () => {
      const now = new Date();
      const result = chatService.formatMessageTime(now);
      expect(result).toBe('now');
    });

    it('should format messages from hours ago with time', () => {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - 2);
      
      const result = chatService.formatMessageTime(hoursAgo);
      expect(result).toMatch(/^\d{1,2}:\d{2}$/);
    });

    it('should format old messages with date', () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - 10);
      
      const result = chatService.formatMessageTime(daysAgo);
      expect(result).toContain(':');
    });
  });

  describe('getConversationPreview', () => {
    it('should return "No messages yet" for empty conversation', () => {
      const conversation = {
        id: '1',
        threadId: 'test',
        participant: null,
        lastMessage: null,
        lastMessageAt: new Date(),
        unreadCount: 0,
        isGroup: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = chatService.getConversationPreview(conversation);
      expect(result).toBe('No messages yet');
    });

    it('should return truncated text for long messages', () => {
      const longText = 'A'.repeat(60);
      const conversation = {
        id: '1',
        threadId: 'test',
        participant: null,
        lastMessage: {
          id: '1',
          text: longText,
          messageType: 'text',
          senderId: '1',
          createdAt: new Date(),
        },
        lastMessageAt: new Date(),
        unreadCount: 0,
        isGroup: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = chatService.getConversationPreview(conversation);
      expect(result).toBe(longText.substring(0, 50) + '...');
    });

    it('should return emoji for image messages', () => {
      const conversation = {
        id: '1',
        threadId: 'test',
        participant: null,
        lastMessage: {
          id: '1',
          text: 'image.jpg',
          messageType: 'image',
          senderId: '1',
          createdAt: new Date(),
        },
        lastMessageAt: new Date(),
        unreadCount: 0,
        isGroup: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = chatService.getConversationPreview(conversation);
      expect(result).toBe('📷 Image');
    });
  });

  describe('getTotalUnreadCount', () => {
    it('should calculate total unread messages correctly', () => {
      const conversations = [
        { unreadCount: 3 },
        { unreadCount: 0 },
        { unreadCount: 5 },
        { unreadCount: 1 },
      ] as any[];
      
      const total = chatService.getTotalUnreadCount(conversations);
      expect(total).toBe(9);
    });

    it('should return 0 for empty conversations', () => {
      const total = chatService.getTotalUnreadCount([]);
      expect(total).toBe(0);
    });
  });
});