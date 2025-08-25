import { APIService } from './apiService';
import { FriendRequest, Friend } from '@/lib/validations';

export class FriendService extends APIService {
  /**
   * Send a friend request to another user
   */
  async sendFriendRequest(toUserId: string): Promise<{ message: string; data: any }> {
    const response = await this.post('/api/friends/request', {
      toUserId,
    });
    return response;
  }

  /**
   * Get pending friend requests for current user
   */
  async getFriendRequests(): Promise<{ data: FriendRequest[]; count: number }> {
    const response = await this.get('/api/friends/request');
    return response;
  }

  /**
   * Respond to a friend request (accept/reject)
   */
  async respondToFriendRequest(
    requestId: string, 
    action: 'accepted' | 'rejected'
  ): Promise<{ message: string; data: any }> {
    const response = await this.post('/api/friends/respond', {
      requestId,
      action,
    });
    return response;
  }

  /**
   * Get user's friends list
   */
  async getFriends(): Promise<{ data: Friend[]; count: number }> {
    const response = await this.get('/api/friends');
    return response;
  }

  /**
   * Remove a friend
   */
  async removeFriend(friendId: string): Promise<{ message: string; data: any }> {
    const response = await this.delete(`/api/friends?friendId=${friendId}`);
    return response;
  }

  /**
   * Check if users are friends
   */
  async checkFriendship(userId: string): Promise<{ isFriend: boolean; hasPendingRequest: boolean }> {
    try {
      const [friends, requests] = await Promise.all([
        this.getFriends(),
        this.getFriendRequests(),
      ]);

      const isFriend = friends.data.some(friend => friend.id === userId);
      const hasPendingRequest = requests.data.some(
        request => request.from.id === userId && request.status === 'pending'
      );

      return { isFriend, hasPendingRequest };
    } catch (error) {
      console.error('Check friendship error:', error);
      return { isFriend: false, hasPendingRequest: false };
    }
  }

  /**
   * Get friend request count for notifications
   */
  async getFriendRequestCount(): Promise<number> {
    try {
      const response = await this.getFriendRequests();
      return response.count;
    } catch (error) {
      console.error('Get friend request count error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const friendService = new FriendService();