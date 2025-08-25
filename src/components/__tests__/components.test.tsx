import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import ChatWindow from '@/components/chat/ChatWindow';
import FriendRequests from '@/components/friends/FriendRequests';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { useChatStore } from '@/store/chatStore';
import { useFriendStore } from '@/store/friendStore';
import { useNotificationStore } from '@/store/notificationStore';

// Mock next-auth
jest.mock('next-auth/react');

// Mock stores
jest.mock('@/store/chatStore');
jest.mock('@/store/friendStore');
jest.mock('@/store/notificationStore');

// Mock hooks
jest.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    socket: { emit: jest.fn() },
    isConnected: true
  })
}));

jest.mock('@/hooks/useWebRTC', () => ({
  useWebRTC: () => ({
    startCall: jest.fn(),
    endCall: jest.fn(),
    localVideoRef: { current: null },
    remoteVideoRef: { current: null },
    isCallActive: false
  })
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseChatStore = useChatStore as jest.MockedFunction<typeof useChatStore>;
const mockUseFriendStore = useFriendStore as jest.MockedFunction<typeof useFriendStore>;
const mockUseNotificationStore = useNotificationStore as jest.MockedFunction<typeof useNotificationStore>;

describe('ChatWindow Component', () => {
  const mockConversation = {
    id: 'conv1',
    threadId: 'user1_user2',
    participant: {
      id: 'user2',
      username: 'user2',
      profilePicture: null,
      lastSeen: new Date(),
      isOnline: true
    },
    lastMessage: null,
    lastMessageAt: new Date(),
    unreadCount: 0,
    isGroup: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMessages = [
    {
      id: 'msg1',
      senderId: 'user2',
      senderInfo: {
        username: 'user2',
        profilePicture: null
      },
      receiverId: 'user1',
      threadId: 'user1_user2',
      text: 'Hello there!',
      messageType: 'text' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user1', email: 'user1@test.com' }
      }
    } as any);

    mockUseChatStore.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      sendMessage: jest.fn(),
      loadMessages: jest.fn(),
      markAsRead: jest.fn()
    } as any);
  });

  it('renders chat window with conversation', () => {
    render(<ChatWindow conversation={mockConversation} />);
    
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    const mockSendMessage = jest.fn();
    mockUseChatStore.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      sendMessage: mockSendMessage,
      loadMessages: jest.fn(),
      markAsRead: jest.fn()
    } as any);

    render(<ChatWindow conversation={mockConversation} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        'user1_user2',
        expect.objectContaining({
          receiverId: 'user2',
          text: 'Test message',
          messageType: 'text'
        })
      );
    });
  });
});

describe('FriendRequests Component', () => {
  const mockFriendRequests = [
    {
      id: 'req1',
      from: {
        _id: 'user2',
        username: 'user2',
        profilePicture: null,
        bio: 'Hello world'
      },
      createdAt: new Date()
    }
  ];

  beforeEach(() => {
    mockUseFriendStore.mockReturnValue({
      friendRequests: mockFriendRequests,
      isLoading: false,
      respondToRequest: jest.fn(),
      loadFriendRequests: jest.fn()
    } as any);
  });

  it('renders friend requests list', () => {
    render(<FriendRequests />);
    
    expect(screen.getByText('Friend Requests')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('accepts friend request', async () => {
    const mockRespondToRequest = jest.fn();
    mockUseFriendStore.mockReturnValue({
      friendRequests: mockFriendRequests,
      isLoading: false,
      respondToRequest: mockRespondToRequest,
      loadFriendRequests: jest.fn()
    } as any);

    render(<FriendRequests />);
    
    const acceptButton = screen.getByText('Accept');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockRespondToRequest).toHaveBeenCalledWith('req1', 'accept');
    });
  });
});

describe('NotificationPanel Component', () => {
  const mockNotifications = [
    {
      id: 'notif1',
      type: 'friend_request' as const,
      title: 'New Friend Request',
      message: 'user2 sent you a friend request',
      read: false,
      createdAt: new Date()
    },
    {
      id: 'notif2',
      type: 'message' as const,
      title: 'New Message',
      message: 'You have a new message from user3',
      read: true,
      createdAt: new Date()
    }
  ];

  beforeEach(() => {
    mockUseNotificationStore.mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 1,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      removeNotification: jest.fn()
    } as any);
  });

  it('renders notifications list', () => {
    render(<NotificationPanel />);
    
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('New Friend Request')).toBeInTheDocument();
    expect(screen.getByText('New Message')).toBeInTheDocument();
  });

  it('marks notification as read when clicked', async () => {
    const mockMarkAsRead = jest.fn();
    mockUseNotificationStore.mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 1,
      markAsRead: mockMarkAsRead,
      markAllAsRead: jest.fn(),
      removeNotification: jest.fn()
    } as any);

    render(<NotificationPanel />);
    
    const notification = screen.getByText('New Friend Request');
    fireEvent.click(notification);

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith('notif1');
    });
  });

  it('marks all as read', async () => {
    const mockMarkAllAsRead = jest.fn();
    mockUseNotificationStore.mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 1,
      markAsRead: jest.fn(),
      markAllAsRead: mockMarkAllAsRead,
      removeNotification: jest.fn()
    } as any);

    render(<NotificationPanel />);
    
    const markAllButton = screen.getByText('Mark all as read');
    fireEvent.click(markAllButton);

    await waitFor(() => {
      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });
  });
});