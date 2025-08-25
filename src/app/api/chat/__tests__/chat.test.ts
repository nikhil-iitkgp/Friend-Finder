import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { Message, Thread } from '@/models/Message';
import { GET as GetConversations } from '../../chat/conversations/route';
import { POST as SendMessage } from '../../chat/[threadId]/send/route';
import { GET as GetMessages } from '../../chat/[threadId]/messages/route';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/db');
jest.mock('@/models/User');
jest.mock('@/models/Message');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockUser = User as jest.Mocked<typeof User>;
const mockMessage = Message as jest.Mocked<typeof Message>;
const mockThread = Thread as jest.Mocked<typeof Thread>;

describe('Chat API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { email: 'user1@test.com' }
    } as any);
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('/api/chat/conversations', () => {
    it('should return user conversations', async () => {
      const mockCurrentUser = {
        _id: 'user1_id',
        email: 'user1@test.com'
      };

      const mockConversations = [
        {
          _id: 'thread1',
          threadId: 'user1_id_user2_id',
          participants: [
            {
              _id: 'user2_id',
              username: 'user2',
              profilePicture: null,
              lastSeen: new Date(),
              isOnline: true
            }
          ],
          lastMessage: {
            _id: 'msg1',
            text: 'Hello there',
            messageType: 'text',
            senderId: 'user2_id',
            createdAt: new Date()
          },
          lastMessageAt: new Date(),
          unreadCount: 1,
          isGroup: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockUser.findOne.mockResolvedValue(mockCurrentUser);
      mockThread.aggregate.mockResolvedValue(mockConversations);

      const request = new NextRequest('http://localhost:3000/api/chat/conversations');
      const response = await GetConversations(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].threadId).toBe('user1_id_user2_id');
    });
  });

  describe('/api/chat/[threadId]/send', () => {
    it('should send message successfully', async () => {
      const mockCurrentUser = {
        _id: 'user1_id',
        friends: ['user2_id']
      };

      const mockThread = {
        _id: 'thread1',
        threadId: 'user1_id_user2_id',
        participants: ['user1_id', 'user2_id'],
        save: jest.fn()
      };

      const mockMessage = {
        _id: 'msg1',
        senderId: 'user1_id',
        receiverId: 'user2_id',
        threadId: 'user1_id_user2_id',
        text: 'Hello',
        messageType: 'text',
        createdAt: new Date(),
        save: jest.fn()
      };

      mockUser.findOne.mockResolvedValue(mockCurrentUser);
      mockThread.findOne.mockResolvedValue(mockThread);
      mockMessage.prototype.save = jest.fn().mockResolvedValue(mockMessage);

      const request = new NextRequest('http://localhost:3000/api/chat/user1_id_user2_id/send', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: 'user2_id',
          text: 'Hello',
          messageType: 'text'
        })
      });

      // Mock the params
      const params = { threadId: 'user1_id_user2_id' };
      const response = await SendMessage(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Message sent');
    });

    it('should reject sending to non-friends', async () => {
      const mockCurrentUser = {
        _id: 'user1_id',
        friends: [] // Not friends with user2
      };

      mockUser.findOne.mockResolvedValue(mockCurrentUser);

      const request = new NextRequest('http://localhost:3000/api/chat/user1_id_user2_id/send', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: 'user2_id',
          text: 'Hello',
          messageType: 'text'
        })
      });

      const params = { threadId: 'user1_id_user2_id' };
      const response = await SendMessage(request, { params });

      expect(response.status).toBe(403);
    });
  });

  describe('/api/chat/[threadId]/messages', () => {
    it('should return thread messages', async () => {
      const mockCurrentUser = {
        _id: 'user1_id'
      };

      const mockThread = {
        _id: 'thread1',
        threadId: 'user1_id_user2_id',
        participants: ['user1_id', 'user2_id']
      };

      const mockMessages = [
        {
          _id: 'msg1',
          senderId: {
            _id: 'user2_id',
            username: 'user2',
            profilePicture: null
          },
          receiverId: 'user1_id',
          threadId: 'user1_id_user2_id',
          text: 'Hello',
          messageType: 'text',
          createdAt: new Date()
        }
      ];

      mockUser.findOne.mockResolvedValue(mockCurrentUser);
      mockThread.findOne.mockResolvedValue(mockThread);
      mockMessage.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockMessages)
          })
        })
      } as any);

      const request = new NextRequest('http://localhost:3000/api/chat/user1_id_user2_id/messages');
      const params = { threadId: 'user1_id_user2_id' };
      const response = await GetMessages(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });
  });
});