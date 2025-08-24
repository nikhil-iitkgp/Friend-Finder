import { apiClient, handleAPIError, rateLimiter } from './api';
import type { UploadResult } from '@/lib/validations';

/**
 * Upload service for handling file uploads to Cloudinary
 */
export class UploadsService {
  private readonly baseEndpoint = '/upload';
  
  // File type validation
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  private readonly allowedFileTypes = [
    ...this.allowedImageTypes,
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  private readonly maxImageSize = 5 * 1024 * 1024; // 5MB
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  
  /**
   * Validate file before upload
   */
  private validateFile(
    file: File, 
    allowedTypes: string[], 
    maxSize: number
  ): void {
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      );
    }
    
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }
    
    if (file.size === 0) {
      throw new Error('File is empty');
    }
  }
  
  /**
   * Create FormData for file upload
   */
  private createFormData(
    file: File, 
    additionalFields?: Record<string, string>
  ): FormData {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    return formData;
  }
  
  /**
   * Upload file with progress tracking
   */
  private async uploadWithProgress(
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.data || response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });
      
      xhr.open('POST', `${this.baseEndpoint}`);
      xhr.send(formData);
    });
  }
  
  /**
   * Upload profile picture
   */
  async uploadProfilePicture(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    try {
      // Rate limit uploads (max 10 per hour)
      if (!rateLimiter.isAllowed('profile-upload', 10, 3600000)) {
        throw new Error('Too many uploads. Please wait before uploading again.');
      }
      
      this.validateFile(file, this.allowedImageTypes, this.maxImageSize);
      
      const formData = this.createFormData(file, {
        type: 'profile-picture',
        transformation: 'profile' // Cloudinary transformation preset
      });
      
      if (onProgress) {
        return await this.uploadWithProgress(formData, onProgress);
      }
      
      return await apiClient.request<UploadResult>(this.baseEndpoint, {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      }).then(response => response.data);
      
    } catch (error) {
      throw new Error(`Failed to upload profile picture: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Upload message attachment (image or file)
   */
  async uploadMessageAttachment(
    file: File,
    messageType: 'image' | 'file' = 'image',
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    try {
      // Rate limit message uploads (max 30 per hour)
      if (!rateLimiter.isAllowed('message-upload', 30, 3600000)) {
        throw new Error('Too many file uploads. Please wait before uploading again.');
      }
      
      const allowedTypes = messageType === 'image' 
        ? this.allowedImageTypes 
        : this.allowedFileTypes;
      
      const maxSize = messageType === 'image' 
        ? this.maxImageSize 
        : this.maxFileSize;
      
      this.validateFile(file, allowedTypes, maxSize);
      
      const formData = this.createFormData(file, {
        type: 'message-attachment',
        messageType
      });
      
      if (onProgress) {
        return await this.uploadWithProgress(formData, onProgress);
      }
      
      return await apiClient.request<UploadResult>(this.baseEndpoint, {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      }).then(response => response.data);
      
    } catch (error) {
      throw new Error(`Failed to upload attachment: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Delete uploaded file by public ID
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await apiClient.delete<void>(`${this.baseEndpoint}/${publicId}`);
    } catch (error) {
      throw new Error(`Failed to delete file: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get optimized image URL with transformations
   */
  getOptimizedImageUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'auto' | 'webp' | 'jpg' | 'png';
      crop?: 'fill' | 'fit' | 'scale' | 'crop';
    } = {}
  ): string {
    const {
      width,
      height,
      quality = 80,
      format = 'auto',
      crop = 'fill'
    } = options;
    
    let transformation = `q_${quality},f_${format}`;
    
    if (width || height) {
      transformation += `,c_${crop}`;
      if (width) transformation += `,w_${width}`;
      if (height) transformation += `,h_${height}`;
    }
    
    // This would be replaced with actual Cloudinary URL in production
    return `https://res.cloudinary.com/your-cloud-name/image/upload/${transformation}/${publicId}`;
  }
  
  /**
   * Generate upload widget signature (for direct uploads)
   */
  async getUploadSignature(uploadPreset: string): Promise<{
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
  }> {
    try {
      return await apiClient.post(`${this.baseEndpoint}/signature`, {
        uploadPreset
      });
    } catch (error) {
      throw new Error(`Failed to get upload signature: ${handleAPIError(error)}`);
    }
  }
  
  /**
   * Get file info by public ID
   */
  async getFileInfo(publicId: string): Promise<{
    publicId: string;
    url: string;
    secureUrl: string;
    format: string;
    width?: number;
    height?: number;
    bytes: number;
    createdAt: string;
  }> {
    try {
      return await apiClient.get(`${this.baseEndpoint}/info/${publicId}`);
    } catch (error) {
      throw new Error(`Failed to get file info: ${handleAPIError(error)}`);
    }
  }
}

// Export singleton instance
export const uploadsService = new UploadsService();