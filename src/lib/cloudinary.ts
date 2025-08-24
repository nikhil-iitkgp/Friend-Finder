import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  access_mode: string;
  original_filename: string;
}

export interface UploadOptions {
  folder?: string;
  public_id?: string;
  overwrite?: boolean;
  transformation?: any[];
  format?: string;
  quality?: string | number;
  width?: number;
  height?: number;
  crop?: string;
}

/**
 * Upload an image to Cloudinary
 */
export async function uploadImage(
  file: Buffer | string,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const defaultOptions: UploadOptions = {
    folder: 'friendfinder',
    overwrite: true,
    quality: 'auto:good',
    format: 'auto',
    ...options,
  };

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result as CloudinaryUploadResult);
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    if (Buffer.isBuffer(file)) {
      uploadStream.end(file);
    } else {
      // For base64 strings or URLs
      cloudinary.uploader.upload(file, defaultOptions)
        .then(resolve)
        .catch(reject);
    }
  });
}

/**
 * Upload profile picture with optimizations
 */
export async function uploadProfilePicture(
  file: Buffer,
  userId: string
): Promise<CloudinaryUploadResult> {
  return uploadImage(file, {
    folder: 'friendfinder/profiles',
    public_id: `profile_${userId}`,
    overwrite: true,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' },
      { format: 'auto' }
    ],
  });
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<any> {
  return cloudinary.uploader.destroy(publicId);
}

/**
 * Generate a signed upload URL for client-side uploads
 */
export function generateSignedUploadUrl(
  options: UploadOptions = {}
): { url: string; signature: string; timestamp: number } {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const params = {
    timestamp,
    folder: 'friendfinder',
    ...options,
  };

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    signature,
    timestamp,
  };
}

export { cloudinary };