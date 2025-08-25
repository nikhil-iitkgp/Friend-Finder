"use client";

import { createContext, useContext, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/hooks/useSocket';
import { useNotificationStore } from '@/store/notificationStore';
import { toast } from 'sonner';

interface NotificationContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { data: session, status } = useSession();
  const { addNotification } = useNotificationStore();

  const {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  } = useSocket({
    autoConnect: true,
    onConnect: () => {
      console.log('🔔 Notifications connected');
      addNotification({
        type: 'system',
        title: 'Connected',
        message: 'Real-time notifications are now active',
        expiresAt: new Date(Date.now() + 5000), // Auto-expire in 5 seconds
      });
    },
    onDisconnect: () => {
      console.log('🔕 Notifications disconnected');
      addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Trying to reconnect to notifications...',
        expiresAt: new Date(Date.now() + 10000), // Auto-expire in 10 seconds
      });
    },
    onError: (error) => {
      console.error('🚨 Notification connection error:', error);
      addNotification({
        type: 'error',
        title: 'Connection Error',
        message: `Failed to connect to notifications: ${error.message}`,
        expiresAt: new Date(Date.now() + 15000), // Auto-expire in 15 seconds
      });
    },
  });

  // Handle authentication state changes
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      // Connection will be handled automatically by useSocket
      console.log('📧 User authenticated, notifications will connect');
    } else if (status === 'unauthenticated') {
      console.log('🚪 User unauthenticated, disconnecting notifications');
      disconnect();
    }
  }, [status, session?.user?.email, disconnect]);

  // Add welcome notification on first connection
  useEffect(() => {
    if (isConnected && session?.user) {
      const welcomeShown = sessionStorage.getItem('welcome_notification_shown');
      if (!welcomeShown) {
        addNotification({
          type: 'success',
          title: `Welcome back, ${session.user.name || 'Friend'}!`,
          message: 'You\'ll receive real-time notifications for friend requests, messages, and more.',
          expiresAt: new Date(Date.now() + 10000), // Auto-expire in 10 seconds
        });
        sessionStorage.setItem('welcome_notification_shown', 'true');
      }
    }
  }, [isConnected, session?.user, addNotification]);

  // Show connection status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (isConnecting) {
        console.log('🔄 Connecting to notifications...');
      } else if (isConnected) {
        console.log('✅ Notifications connected');
      } else if (error) {
        console.log('❌ Notification connection failed:', error);
      }
    }
  }, [isConnected, isConnecting, error]);

  const value: NotificationContextType = {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}