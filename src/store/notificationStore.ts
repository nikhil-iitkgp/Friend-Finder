import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'friend_request' | 'message' | 'call' | 'system' | 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationState {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  clearExpired: () => void;
  
  // Getters
  getUnreadNotifications: () => Notification[];
  getNotificationsByType: (type: Notification['type']) => Notification[];
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      isLoading: false,

      // Add new notification
      addNotification: (notificationData) => {
        const notification: Notification = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          read: false,
          createdAt: new Date(),
          ...notificationData,
        };

        set((state) => {
          const newNotifications = [notification, ...state.notifications];
          return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter(n => !n.read).length,
          };
        });

        // Auto-remove system notifications after 30 seconds
        if (notification.type === 'system') {
          setTimeout(() => {
            get().removeNotification(notification.id);
          }, 30000);
        }
      },

      // Mark notification as read
      markAsRead: (id) => {
        set((state) => {
          const updatedNotifications = state.notifications.map(notification =>
            notification.id === id 
              ? { ...notification, read: true }
              : notification
          );
          
          return {
            notifications: updatedNotifications,
            unreadCount: updatedNotifications.filter(n => !n.read).length,
          };
        });
      },

      // Mark all notifications as read
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(notification => ({
            ...notification,
            read: true,
          })),
          unreadCount: 0,
        }));
      },

      // Remove specific notification
      removeNotification: (id) => {
        set((state) => {
          const updatedNotifications = state.notifications.filter(
            notification => notification.id !== id
          );
          
          return {
            notifications: updatedNotifications,
            unreadCount: updatedNotifications.filter(n => !n.read).length,
          };
        });
      },

      // Clear all notifications
      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      // Clear expired notifications
      clearExpired: () => {
        const now = new Date();
        set((state) => {
          const activeNotifications = state.notifications.filter(
            notification => !notification.expiresAt || notification.expiresAt > now
          );
          
          return {
            notifications: activeNotifications,
            unreadCount: activeNotifications.filter(n => !n.read).length,
          };
        });
      },

      // Get unread notifications
      getUnreadNotifications: () => {
        return get().notifications.filter(notification => !notification.read);
      },

      // Get notifications by type
      getNotificationsByType: (type) => {
        return get().notifications.filter(notification => notification.type === type);
      },
    }),
    {
      name: 'notification-store',
    }
  )
);