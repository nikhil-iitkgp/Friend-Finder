import { apiClient, handleAPIError, rateLimiter } from './api';
import type {
  UserProfileResponse,
  ProfileUpdateInput,
  LocationUpdate,
  PresenceUpdate,
  BluetoothUpdate,
  NearbyUser,
  NearbyUsersQuery,
  BluetoothScan,
} from '@/lib/validations';

/**
 * Users service for profile management and discovery
 */
export class UsersService {
  private readonly baseEndpoint = '/users';
  
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfileResponse> {
    try {
      return await apiClient.get<UserProfileResponse>(`${this.baseEndpoint}/me`);
    } catch (error) {
      throw new Error(`Failed to get current user: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(data: ProfileUpdateInput): Promise<UserProfileResponse> {
    try {
      // Client-side rate limiting
      if (!rateLimiter.isAllowed('profile-update', 5, 60000)) {
        throw new Error('Too many profile update requests. Please wait a moment.');
      }
      
      return await apiClient.put<UserProfileResponse>(
        `${this.baseEndpoint}/profile`,
        data
      );
    } catch (error) {
      throw new Error(`Failed to update profile: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Update user location (GPS coordinates)
   */
  async updateLocation(coordinates: LocationUpdate): Promise<void> {
    try {
      // Rate limit location updates (max 10 per minute)
      if (!rateLimiter.isAllowed('location-update', 10, 60000)) {
        throw new Error('Too many location updates. Please wait a moment.');
      }
      
      await apiClient.post<void>(
        `${this.baseEndpoint}/location`,
        coordinates
      );
    } catch (error) {
      throw new Error(`Failed to update location: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Update Wi-Fi presence (BSSID)
   */
  async updatePresence(presence: PresenceUpdate): Promise<void> {
    try {
      // Rate limit presence updates
      if (!rateLimiter.isAllowed('presence-update', 20, 60000)) {
        throw new Error('Too many presence updates. Please wait a moment.');
      }
      
      await apiClient.post<void>(
        `${this.baseEndpoint}/presence`,
        presence
      );
    } catch (error) {
      throw new Error(`Failed to update presence: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Update Bluetooth ID
   */
  async updateBluetoothId(bluetooth: BluetoothUpdate): Promise<void> {
    try {
      // Rate limit Bluetooth updates
      if (!rateLimiter.isAllowed('bluetooth-update', 10, 60000)) {
        throw new Error('Too many Bluetooth updates. Please wait a moment.');
      }
      
      await apiClient.post<void>(
        `${this.baseEndpoint}/bluetooth`,
        bluetooth
      );
    } catch (error) {
      throw new Error(`Failed to update Bluetooth ID: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get nearby users via GPS
   */
  async getNearbyByGPS(query: NearbyUsersQuery = {}): Promise<NearbyUser[]> {
    try {
      // Rate limit discovery requests
      if (!rateLimiter.isAllowed('gps-discovery', 10, 60000)) {
        throw new Error('Too many discovery requests. Please wait a moment.');
      }
      
      const params = new URLSearchParams();
      if (query.radius) {
        params.append('radius', query.radius.toString());
      }
      
      const endpoint = `${this.baseEndpoint}/nearby${params.toString() ? `?${params.toString()}` : ''}`;
      return await apiClient.get<NearbyUser[]>(endpoint);
    } catch (error) {
      throw new Error(`Failed to get nearby users by GPS: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get nearby users via Wi-Fi network
   */
  async getNearbyByWiFi(): Promise<NearbyUser[]> {
    try {
      // Rate limit Wi-Fi discovery
      if (!rateLimiter.isAllowed('wifi-discovery', 10, 60000)) {
        throw new Error('Too many Wi-Fi discovery requests. Please wait a moment.');
      }
      
      return await apiClient.get<NearbyUser[]>(`${this.baseEndpoint}/nearby-wifi`);
    } catch (error) {
      throw new Error(`Failed to get nearby users by Wi-Fi: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get nearby users via Bluetooth scan
   */
  async getNearbyByBluetooth(scan: BluetoothScan): Promise<NearbyUser[]> {
    try {
      // Rate limit Bluetooth discovery
      if (!rateLimiter.isAllowed('bluetooth-discovery', 10, 60000)) {
        throw new Error('Too many Bluetooth discovery requests. Please wait a moment.');
      }
      
      return await apiClient.post<NearbyUser[]>(
        `${this.baseEndpoint}/nearby/bluetooth`,
        scan
      );
    } catch (error) {
      throw new Error(`Failed to get nearby users by Bluetooth: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get user by ID (for friend profiles, etc.)
   */
  async getUserById(userId: string): Promise<UserProfileResponse> {
    try {
      return await apiClient.get<UserProfileResponse>(`${this.baseEndpoint}/${userId}`);
    } catch (error) {
      throw new Error(`Failed to get user profile: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Search users by username
   */
  async searchUsers(query: string, limit: number = 10): Promise<NearbyUser[]> {
    try {
      // Rate limit search requests
      if (!rateLimiter.isAllowed('user-search', 20, 60000)) {
        throw new Error('Too many search requests. Please wait a moment.');
      }
      
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString()
      });
      
      return await apiClient.get<NearbyUser[]>(`${this.baseEndpoint}/search?${params.toString()}`);
    } catch (error) {
      throw new Error(`Failed to search users: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Toggle user discoverable status
   */
  async toggleDiscoverable(isDiscoverable: boolean): Promise<void> {
    try {
      await this.updateProfile({ isDiscoverable });
    } catch (error) {
      throw new Error(`Failed to toggle discoverable status: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Update discovery range
   */
  async updateDiscoveryRange(range: number): Promise<void> {
    try {
      await this.updateProfile({ discoveryRange: range });
    } catch (error) {
      throw new Error(`Failed to update discovery range: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    try {
      await apiClient.delete<void>(`${this.baseEndpoint}/me`);
    } catch (error) {
      throw new Error(`Failed to delete account: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    friendsCount: number;
    messagesCount: number;
    joinedDate: string;
    lastActiveDate: string;
  }> {
    try {
      return await apiClient.get(`${this.baseEndpoint}/me/stats`);
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${handleAPIError(error)}`);
    }
  }
}

// Export singleton instance
export const usersService = new UsersService();