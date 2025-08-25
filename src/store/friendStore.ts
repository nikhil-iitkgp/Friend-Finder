import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Friend, FriendRequest } from '@/lib/validations';
import { friendService } from '@/services/friendService';
import { toast } from 'sonner';

interface FriendState {
  // State
  friends: Friend[];
  friendRequests: FriendRequest[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFriends: () => Promise<void>;
  loadFriendRequests: () => Promise<void>;
  sendFriendRequest: (toUserId: string) => Promise<boolean>;
  respondToFriendRequest: (requestId: string, action: 'accepted' | 'rejected') => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  
  // Real-time updates
  addFriendRequest: (request: FriendRequest) => void;
  removeFriendRequest: (requestId: string) => void;
  addFriend: (friend: Friend) => void;
  updateFriendStatus: (friendId: string, isOnline: boolean) => void;
  
  // Utils
  isFriend: (userId: string) => boolean;
  hasPendingRequest: (userId: string) => boolean;
  getFriendRequestCount: () => number;
  clearError: () => void;
}

export const useFriendStore = create<FriendState>()(
  devtools(
    (set, get) => ({
      // Initial state
      friends: [],
      friendRequests: [],
      isLoading: false,
      error: null,

      // Load friends from API
      loadFriends: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await friendService.getFriends();
          set({ friends: response.data, isLoading: false });
        } catch (error) {
          console.error('Load friends error:', error);
          set({ 
            error: 'Failed to load friends', 
            isLoading: false 
          });
        }
      },

      // Load friend requests from API
      loadFriendRequests: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await friendService.getFriendRequests();
          set({ friendRequests: response.data, isLoading: false });
        } catch (error) {
          console.error('Load friend requests error:', error);
          set({ 
            error: 'Failed to load friend requests', 
            isLoading: false 
          });
        }
      },

      // Send friend request
      sendFriendRequest: async (toUserId: string) => {
        try {
          set({ error: null });
          await friendService.sendFriendRequest(toUserId);
          toast.success('Friend request sent!');
          return true;
        } catch (error: any) {
          console.error('Send friend request error:', error);
          const message = error.response?.data?.error || 'Failed to send friend request';
          set({ error: message });
          toast.error(message);
          return false;
        }
      },

      // Respond to friend request
      respondToFriendRequest: async (requestId: string, action: 'accepted' | 'rejected') => {
        try {
          set({ error: null });
          await friendService.respondToFriendRequest(requestId, action);
          
          // Remove from pending requests
          set(state => ({
            friendRequests: state.friendRequests.filter(req => req.id !== requestId)
          }));

          if (action === 'accepted') {
            toast.success('Friend request accepted!');
            // Reload friends list to get updated data
            get().loadFriends();
          } else {
            toast.success('Friend request rejected');
          }
          
          return true;
        } catch (error: any) {
          console.error('Respond to friend request error:', error);
          const message = error.response?.data?.error || 'Failed to respond to friend request';
          set({ error: message });
          toast.error(message);
          return false;
        }
      },

      // Remove friend
      removeFriend: async (friendId: string) => {
        try {
          set({ error: null });
          await friendService.removeFriend(friendId);
          
          // Remove from friends list
          set(state => ({
            friends: state.friends.filter(friend => friend.id !== friendId)
          }));
          
          toast.success('Friend removed');
          return true;
        } catch (error: any) {
          console.error('Remove friend error:', error);
          const message = error.response?.data?.error || 'Failed to remove friend';
          set({ error: message });
          toast.error(message);
          return false;
        }
      },

      // Real-time: Add incoming friend request
      addFriendRequest: (request: FriendRequest) => {
        set(state => {
          // Check if request already exists
          const exists = state.friendRequests.some(req => req.id === request.id);
          if (exists) return state;
          
          return {
            friendRequests: [...state.friendRequests, request]
          };
        });
      },

      // Real-time: Remove friend request
      removeFriendRequest: (requestId: string) => {
        set(state => ({
          friendRequests: state.friendRequests.filter(req => req.id !== requestId)
        }));
      },

      // Real-time: Add new friend
      addFriend: (friend: Friend) => {
        set(state => {
          // Check if friend already exists
          const exists = state.friends.some(f => f.id === friend.id);
          if (exists) return state;
          
          return {
            friends: [...state.friends, friend]
          };
        });
      },

      // Real-time: Update friend online status
      updateFriendStatus: (friendId: string, isOnline: boolean) => {
        set(state => ({
          friends: state.friends.map(friend =>
            friend.id === friendId 
              ? { ...friend, isOnline, lastSeen: new Date() }
              : friend
          )
        }));
      },

      // Check if user is a friend
      isFriend: (userId: string) => {
        const { friends } = get();
        return friends.some(friend => friend.id === userId);
      },

      // Check if there's a pending friend request from user
      hasPendingRequest: (userId: string) => {
        const { friendRequests } = get();
        return friendRequests.some(
          request => request.from.id === userId && request.status === 'pending'
        );
      },

      // Get friend request count
      getFriendRequestCount: () => {
        const { friendRequests } = get();
        return friendRequests.filter(req => req.status === 'pending').length;
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'friend-store',
    }
  )
);