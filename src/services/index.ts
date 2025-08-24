// Export all service instances
export { usersService } from './usersService';
export { friendsService } from './friendsService';
export { messagesService } from './messagesService';
export { uploadsService } from './uploadsService';

// Export API client and utilities
export { 
  apiClient,
  APIError,
  NetworkError,
  handleAPIError,
  isAPIError,
  isNetworkError,
  rateLimiter
} from './api';

// Export service classes (for testing or custom instances)
export { UsersService } from './usersService';
export { FriendsService } from './friendsService';
export { MessagesService } from './messagesService';
export { UploadsService } from './uploadsService';

// Export types
export type { RequestConfig, APIResponseWithMeta } from './api';