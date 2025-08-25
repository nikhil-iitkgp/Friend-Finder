import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { GET as NearbyUsers } from '../../discover/nearby/route';
import { POST as UpdateLocation } from '../../location/update/route';
import { GET as WiFiUsers } from '../../discover/wifi/route';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/db');
jest.mock('@/models/User');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockUser = User as jest.Mocked<typeof User>;

describe('Discovery API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { email: 'user1@test.com' }
    } as any);
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('/api/location/update', () => {
    it('should update user location successfully', async () => {
      const mockUser = {
        _id: 'user1_id',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        lastSeen: new Date(),
        save: jest.fn()
      };

      mockUser.findOne.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/location/update', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 40.7128,
          longitude: -74.0060
        })
      });

      const response = await UpdateLocation(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Location updated');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should reject invalid coordinates', async () => {
      const request = new NextRequest('http://localhost:3000/api/location/update', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 200, // Invalid latitude
          longitude: -74.0060
        })
      });

      const response = await UpdateLocation(request);
      expect(response.status).toBe(400);
    });
  });

  describe('/api/discover/nearby', () => {
    it('should return nearby users', async () => {
      const mockCurrentUser = {
        _id: 'user1_id',
        location: {
          type: 'Point',
          coordinates: [-74.0060, 40.7128]
        }
      };

      const mockNearbyUsers = [
        {
          _id: 'user2_id',
          username: 'user2',
          bio: 'Hello world',
          profilePicture: null,
          distance: 1000, // 1km away
          location: {
            type: 'Point',
            coordinates: [-74.0070, 40.7138]
          },
          lastSeen: new Date()
        }
      ];

      mockUser.findOne.mockResolvedValue(mockCurrentUser);
      mockUser.aggregate.mockResolvedValue(mockNearbyUsers);

      const request = new NextRequest(
        'http://localhost:3000/api/discover/nearby?radius=5000'
      );
      const response = await NearbyUsers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].distance).toBe(1000);
    });

    it('should require user location', async () => {
      const mockCurrentUser = {
        _id: 'user1_id',
        location: null // No location set
      };

      mockUser.findOne.mockResolvedValue(mockCurrentUser);

      const request = new NextRequest(
        'http://localhost:3000/api/discover/nearby'
      );
      const response = await NearbyUsers(request);

      expect(response.status).toBe(400);
    });
  });

  describe('/api/discover/wifi', () => {
    it('should return users on same WiFi network', async () => {
      const mockCurrentUser = {
        _id: 'user1_id',
        currentWiFi: {
          bssid: 'aa:bb:cc:dd:ee:ff',
          ssid: 'TestNetwork',
          lastConnected: new Date()
        }
      };

      const mockWiFiUsers = [
        {
          _id: 'user2_id',
          username: 'user2',
          bio: 'On same network',
          profilePicture: null,
          currentWiFi: {
            bssid: 'aa:bb:cc:dd:ee:ff',
            ssid: 'TestNetwork',
            lastConnected: new Date()
          },
          lastSeen: new Date()
        }
      ];

      mockUser.findOne.mockResolvedValue(mockCurrentUser);
      mockUser.find.mockResolvedValue(mockWiFiUsers);

      const request = new NextRequest('http://localhost:3000/api/discover/wifi');
      const response = await WiFiUsers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].currentWiFi.bssid).toBe('aa:bb:cc:dd:ee:ff');
    });

    it('should require WiFi connection', async () => {
      const mockCurrentUser = {
        _id: 'user1_id',
        currentWiFi: null // Not connected to WiFi
      };

      mockUser.findOne.mockResolvedValue(mockCurrentUser);

      const request = new NextRequest('http://localhost:3000/api/discover/wifi');
      const response = await WiFiUsers(request);

      expect(response.status).toBe(400);
    });
  });
});