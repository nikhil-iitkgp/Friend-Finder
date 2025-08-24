import { APIService } from './api';
import type { User } from '@/types';

export interface ProfileUpdateData {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  occupation?: string;
  interests?: string[];
  birthday?: string;
  profilePicture?: string;
  isDiscoverable?: boolean;
  discoveryRange?: number;
  privacySettings?: {
    showAge?: boolean;
    showLocation?: boolean;
    showLastSeen?: boolean;
    allowMessages?: boolean;
    allowCalls?: boolean;
  };
}

export interface ProfileResponse {
  user: User;
}

export interface ProfileUpdateResponse {
  message: string;
  user: User;
}

class ProfileService extends APIService {
  constructor() {
    super();
  }

  /**
   * Get the current user's profile
   */
  async getProfile(): Promise<ProfileResponse> {
    return this.get<ProfileResponse>('/api/profile');
  }

  /**
   * Update the current user's profile
   */
  async updateProfile(data: ProfileUpdateData): Promise<ProfileUpdateResponse> {
    return this.put<ProfileUpdateResponse>('/api/profile', data);
  }

  /**
   * Get a specific user's public profile by ID
   */
  async getUserProfile(userId: string): Promise<ProfileResponse> {
    return this.get<ProfileResponse>(`/api/profile/${userId}`);
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: File): Promise<{ url: string; publicId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.post<{ url: string; publicId: string }>('/api/upload/profile-picture', formData);
  }
}

export const profileService = new ProfileService();