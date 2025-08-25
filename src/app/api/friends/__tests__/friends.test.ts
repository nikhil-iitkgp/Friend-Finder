import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { GET, POST } from '../request/route';
import { POST as RespondPOST } from '../respond/route';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/db');
jest.mock('@/models/User');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockUser = User as jest.Mocked<typeof User>;

describe('/api/friends/request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST - Send Friend Request', () => {
    it('should send friend request successfully', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { email: 'user1@test.com' }
      } as any);

      // Mock database
      mockConnectDB.mockResolvedValue(undefined);

      const mockCurrentUser = {
        _id: 'user1_id',
        email: 'user1@test.com',
        friends: [],
        save: jest.fn()
      };

      const mockTargetUser = {
        _id: 'user2_id',
        friendRequests: [],
        save: jest.fn()
      };

      mockUser.findOne.mockResolvedValueOnce(mockCurrentUser);
      mockUser.findById.mockResolvedValueOnce(mockTargetUser);

      const request = new NextRequest('http://localhost:3000/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ toUserId: 'user2_id' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Friend request sent');
      expect(mockTargetUser.save).toHaveBeenCalled();
    });

    it('should reject request if already friends', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'user1@test.com' }
      } as any);

      mockConnectDB.mockResolvedValue(undefined);

      const mockCurrentUser = {
        _id: 'user1_id',
        friends: ['user2_id'] // Already friends
      };

      mockUser.findOne.mockResolvedValueOnce(mockCurrentUser);
      mockUser.findById.mockResolvedValueOnce({ _id: 'user2_id' });

      const request = new NextRequest('http://localhost:3000/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ toUserId: 'user2_id' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Already friends');
    });

    it('should reject unauthorized requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ toUserId: 'user2_id' })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('GET - Get Friend Requests', () => {
    it('should return pending friend requests', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'user1@test.com' }
      } as any);

      mockConnectDB.mockResolvedValue(undefined);

      const mockUser = {
        friendRequests: [
          {
            _id: 'req1',
            from: {
              _id: 'user2_id',
              username: 'user2',
              profilePicture: null
            },
            status: 'pending',
            createdAt: new Date()
          }
        ]
      };

      mockUser.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser)
      } as any);

      const request = new NextRequest('http://localhost:3000/api/friends/request');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.count).toBe(1);
    });
  });
});

describe('/api/friends/respond', () => {
  it('should accept friend request successfully', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'user1@test.com' }
    } as any);

    mockConnectDB.mockResolvedValue(undefined);

    const mockCurrentUser = {
      _id: 'user1_id',
      friendRequests: [{
        _id: 'req1',
        from: 'user2_id',
        status: 'pending'
      }],
      friends: [],
      save: jest.fn()
    };

    const mockRequestUser = {
      _id: 'user2_id',
      friends: [],
      save: jest.fn()
    };

    mockUser.findOne.mockResolvedValueOnce(mockCurrentUser);
    mockUser.findById.mockResolvedValueOnce(mockRequestUser);

    const request = new NextRequest('http://localhost:3000/api/friends/respond', {
      method: 'POST',
      body: JSON.stringify({ 
        requestId: 'req1',
        action: 'accept'
      })
    });

    const response = await RespondPOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Friend request accepted');
    expect(mockCurrentUser.save).toHaveBeenCalled();
    expect(mockRequestUser.save).toHaveBeenCalled();
  });
});