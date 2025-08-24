import { apiClient, handleAPIError, rateLimiter } from './api';
import type {
  FriendRequest,
  FriendResponse,
  Friend,
} from '@/lib/validations';

/**
 * Friends service for managing friendships and friend requests
 */
export class FriendsService {
  private readonly baseEndpoint = '/friends';
  
  /**
   * Send a friend request
   */
  async sendFriendRequest(userId: string): Promise<void> {
    try {
      // Rate limit friend requests (max 10 per hour)
      if (!rateLimiter.isAllowed('friend-request', 10, 3600000)) {
        throw new Error('Too many friend requests. Please wait before sending more.');
      }
      
      const request: FriendRequest = { to: userId };
      await apiClient.post<void>(this.baseEndpoint, request);
    } catch (error) {
      throw new Error(`Failed to send friend request: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Respond to a friend request (accept/reject)
   */
  async respondToFriendRequest(
    fromUserId: string, 
    status: 'accepted' | 'rejected'
  ): Promise<void> {
    try {
      const response: FriendResponse = {
        from: fromUserId,
        status
      };
      
      await apiClient.put<void>(this.baseEndpoint, response);
    } catch (error) {
      throw new Error(`Failed to respond to friend request: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Accept a friend request
   */
  async acceptFriendRequest(fromUserId: string): Promise<void> {
    return this.respondToFriendRequest(fromUserId, 'accepted');
  }
  
  /**
   * Reject a friend request
   */
  async rejectFriendRequest(fromUserId: string): Promise<void> {
    return this.respondToFriendRequest(fromUserId, 'rejected');
  }
  
  /**
   * Get list of friends
   */
  async getFriends(): Promise<Friend[]> {
    try {
      return await apiClient.get<Friend[]>(this.baseEndpoint);
    } catch (error) {
      throw new Error(`Failed to get friends list: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get pending friend requests (received)
   */
  async getPendingRequests(): Promise<Friend[]> {
    try {
      return await apiClient.get<Friend[]>(`${this.baseEndpoint}/pending`);
    } catch (error) {
      throw new Error(`Failed to get pending requests: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get sent friend requests
   */
  async getSentRequests(): Promise<Friend[]> {
    try {
      return await apiClient.get<Friend[]>(`${this.baseEndpoint}/sent`);
    } catch (error) {
      throw new Error(`Failed to get sent requests: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Remove a friend (unfriend)
   */
  async removeFriend(friendId: string): Promise<void> {
    try {
      await apiClient.delete<void>(`${this.baseEndpoint}/${friendId}`);
    } catch (error) {
      throw new Error(`Failed to remove friend: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Cancel a sent friend request
   */
  async cancelFriendRequest(userId: string): Promise<void> {
    try {
      await apiClient.delete<void>(`${this.baseEndpoint}/request/${userId}`);
    } catch (error) {
      throw new Error(`Failed to cancel friend request: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Check if users are friends
   */
  async checkFriendship(userId: string): Promise<{
    isFriend: boolean;
    hasPendingRequest: boolean;
    hasSentRequest: boolean;
  }> {
    try {
      return await apiClient.get(`${this.baseEndpoint}/status/${userId}`);
    } catch (error) {
      throw new Error(`Failed to check friendship status: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get mutual friends with another user
   */
  async getMutualFriends(userId: string): Promise<Friend[]> {
    try {
      return await apiClient.get<Friend[]>(`${this.baseEndpoint}/mutual/${userId}`);
    } catch (error) {
      throw new Error(`Failed to get mutual friends: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get friend suggestions based on mutual friends, location, etc.
   */
  async getFriendSuggestions(limit: number = 10): Promise<Friend[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      return await apiClient.get<Friend[]>(`${this.baseEndpoint}/suggestions?${params.toString()}`);
    } catch (error) {
      throw new Error(`Failed to get friend suggestions: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<void> {
    try {
      await apiClient.post<void>(`${this.baseEndpoint}/block`, { userId });
    } catch (error) {
      throw new Error(`Failed to block user: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    try {
      await apiClient.delete<void>(`${this.baseEndpoint}/block/${userId}`);
    } catch (error) {
      throw new Error(`Failed to unblock user: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get blocked users list
   */
  async getBlockedUsers(): Promise<Friend[]> {
    try {
      return await apiClient.get<Friend[]>(`${this.baseEndpoint}/blocked`);
    } catch (error) {
      throw new Error(`Failed to get blocked users: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get online friends
   */
  async getOnlineFriends(): Promise<Friend[]> {
    try {
      return await apiClient.get<Friend[]>(`${this.baseEndpoint}/online`);
    } catch (error) {
      throw new Error(`Failed to get online friends: ${handleAPIError(error)}`);
    }
  }
}

// Export singleton instance
export const friendsService = new FriendsService();