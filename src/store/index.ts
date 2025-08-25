// Export stores
export { useUserStore } from './userStore';
export { useDiscoveryStore } from './discoveryStore';
export { useChatStore } from './chatStore';
export { useCallStore } from './callStore';
export { useFriendStore } from './friendStore';
export { useNotificationStore } from './notificationStore';

// Export user store selectors
export {
  useUser,
  useIsAuthenticated,
  useUserLoading,
  useUserError,
  useIsUserInitialized,
  useUserActions,
} from './userStore';

// Export discovery store selectors
export {
  useDiscoveryMode,
  useDiscoveryResults,
  useIsDiscovering,
  useDiscoveryError,
  useLastLocation,
  useCurrentNetwork,
  useBluetoothDevices,
  useDiscoveryActions,
} from './discoveryStore';

// Export chat store selectors
export {
  useActiveThread,
  useMessages,
  useTypingUsers,
  useUnreadCount,
  useTotalUnreadCount,
  useConversations,
  useIsLoadingMessages,
  useMessageError,
  useChatActions,
} from './chatStore';

// Export call store selectors
export {
  useCallStatus,
  useIsInCall,
  useCurrentCallUser,
  useLocalStream,
  useRemoteStream,
  useCallDuration,
  useCallError,
  useIsCallModalOpen,
  useMediaControls,
  useCallActions,
} from './callStore';