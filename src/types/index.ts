import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
    };
  }
  
  interface User {
    id: string;
    email: string;
    name: string;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
  }
}

// Discovery related types
export type DiscoveryMode = \"gps\" | \"wifi\" | \"bluetooth\";

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface NearbyUser {
  id: string;
  username: string;
  profilePicture?: string;
  distance?: number; // in meters for GPS
  lastSeen: Date;
  isFriend: boolean;
  hasPendingRequest: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  profilePicture?: string;
  isDiscoverable: boolean;
  discoveryRange: number;
  lastSeen: Date;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface PresenceUpdate {
  bssid?: string;
}

export interface BluetoothUpdate {
  bluetoothId: string;
}

export interface BluetoothScan {
  nearbyDevices: string[];
}

// Friend system types
export interface FriendRequest {
  to: string;
}

export interface FriendResponse {
  from: string;
  status: \"accepted\" | \"rejected\";
}

export interface Friend {
  id: string;
  username: string;
  profilePicture?: string;
  lastSeen: Date;
  isOnline?: boolean;
}

// Message types
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  messageType: \"text\" | \"image\" | \"file\";
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    cloudinaryUrl?: string;
  };
  createdAt: Date;
  readAt?: Date;
  editedAt?: Date;
}

// Upload types
export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Socket.io event types
export interface SocketEvents {
  // Friend events
  \"friend:request\": (data: { from: UserProfile }) => void;
  \"friend:response\": (data: { from: UserProfile; status: string }) => void;
  
  // Message events
  \"message:new\": (message: Message) => void;
  \"message:typing\": (data: { userId: string; isTyping: boolean }) => void;
  \"message:read\": (data: { messageId: string; readBy: string }) => void;
  
  // Call events
  \"call:incoming\": (data: { from: UserProfile; isVideo: boolean }) => void;
  \"call:accepted\": () => void;
  \"call:rejected\": () => void;
  \"call:ended\": () => void;
  \"call:ice-candidate\": (candidate: RTCIceCandidate) => void;
  \"call:offer\": (offer: RTCSessionDescriptionInit) => void;
  \"call:answer\": (answer: RTCSessionDescriptionInit) => void;
  
  // Presence events
  \"user:online\": (userId: string) => void;
  \"user:offline\": (userId: string) => void;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProfileUpdateForm {
  username?: string;
  bio?: string;
  isDiscoverable?: boolean;
  discoveryRange?: number;
}