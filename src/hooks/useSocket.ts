"use client";

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { useFriendStore } from '@/store';
import { useChatStore } from '@/store';
import { toast } from 'sonner';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents 
} from '@/lib/socket';

interface UseSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const { addFriendRequest, updateFriendStatus } = useFriendStore();
  const { addMessage, updateMessageStatus, addTypingUser, removeTypingUser } = useChatStore();
  const { 
    autoConnect = true, 
    onConnect, 
    onDisconnect, 
    onError 
  } = options;

  // Initialize socket connection
  const connect = async () => {
    if (!session?.user?.email || socketRef.current?.connected) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin, {
        path: '/api/socket',
        auth: {
          token: session.user.email, // Use email as token for now
        },
        transports: ['websocket', 'polling'],
        autoConnect: false,
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        onConnect?.();
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnect?.();
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setError(error.message);
        setIsConnecting(false);
        onError?.(error);
      });

      // Friend system event handlers
      socket.on('friend_request_received', (data) => {
        console.log('Friend request received:', data);
        
        // Add to friend store
        addFriendRequest({
          id: `${data.from.id}_${Date.now()}`,
          from: data.from,
          status: 'pending',
          createdAt: data.createdAt,
        });

        // Show notification
        toast.success(`Friend request from ${data.from.username}`, {
          description: 'Check your friend requests to accept or decline',
          action: {
            label: 'View',
            onClick: () => {
              // Navigate to friends page
              window.location.href = '/dashboard/friends';
            },
          },
        });
      });

      socket.on('friend_request_accepted', (data) => {
        console.log('Friend request accepted:', data);
        
        toast.success(`${data.by.username} accepted your friend request!`, {
          description: 'You are now friends',
          action: {
            label: 'View Friends',
            onClick: () => {
              window.location.href = '/dashboard/friends';
            },
          },
        });
      });

      socket.on('friend_removed', (data) => {
        console.log('Friend removed:', data);
        
        toast.info(`${data.by.username} removed you from their friends`, {
          description: 'Your friendship has ended',
        });
      });

      // Presence event handlers
      socket.on('user_online', (data) => {
        console.log('User came online:', data.userId);
        updateFriendStatus(data.userId, true);
      });

      socket.on('user_offline', (data) => {
        console.log('User went offline:', data.userId);
        updateFriendStatus(data.userId, false);
      });

      // General notification handler
      socket.on('notification', (data) => {
        console.log('Notification received:', data);
        
        switch (data.type) {
          case 'friend_request':
            toast.info(data.title, {
              description: data.message,
            });
            break;
          case 'message':
            toast.info(data.title, {
              description: data.message,
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = '/dashboard/chat';
                },
              },
            });
            break;
          case 'call':
            toast.info(data.title, {
              description: data.message,
              duration: 10000, // Longer duration for calls
            });
            break;
          default:
            toast.info(data.title, {
              description: data.message,
            });
        }
      });

      socketRef.current = socket;
      socket.connect();

    } catch (error) {
      console.error('Failed to create socket:', error);
      setError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnecting(false);
      onError?.(error instanceof Error ? error : new Error('Connection failed'));
    }
  };

  // Disconnect socket
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    }
  };

  // Send presence update
  const updatePresence = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_presence');
    }
  };

  // Mark friend request as seen
  const markFriendRequestSeen = (requestId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('friend_request_seen', requestId);
    }
  };

  // Auto-connect when session is available
  useEffect(() => {
    if (session?.user?.email && autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session?.user?.email, autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Send periodic presence updates when connected
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      updatePresence();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    updatePresence,
    markFriendRequestSeen,
  };
}