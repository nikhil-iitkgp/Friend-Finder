/**
 * Geolocation service interface for GPS-based discovery
 * This abstraction allows easy swapping between web and React Native implementations
 */

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  type: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
}

export type PermissionState = 'granted' | 'denied' | 'prompt';

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * Abstract geolocation service interface
 */
export abstract class GeolocationServiceInterface {
  abstract getCurrentPosition(options?: GeolocationOptions): Promise<GeolocationPosition>;
  abstract checkPermission(): Promise<PermissionState>;
  abstract requestPermission(): Promise<PermissionState>;
  abstract isSupported(): boolean;
}

/**
 * Web implementation using browser Geolocation API
 */
export class WebGeolocationService extends GeolocationServiceInterface {
  private readonly defaultOptions: GeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 10000, // 10 seconds
    maximumAge: 60000, // 1 minute
  };

  /**
   * Check if geolocation is supported in this browser
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Get current position using browser geolocation API
   */
  async getCurrentPosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
    if (!this.isSupported()) {
      throw new GeolocationError(
        4,
        'Geolocation is not supported in this browser',
        'UNKNOWN'
      );
    }

    const opts = { ...this.defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          let errorType: GeolocationError['type'];
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorType = 'PERMISSION_DENIED';
              break;
            case error.POSITION_UNAVAILABLE:
              errorType = 'POSITION_UNAVAILABLE';
              break;
            case error.TIMEOUT:
              errorType = 'TIMEOUT';
              break;
            default:
              errorType = 'UNKNOWN';
          }

          reject(new GeolocationError(
            error.code,
            error.message,
            errorType
          ));
        },
        opts
      );
    });
  }

  /**
   * Check geolocation permission status
   */
  async checkPermission(): Promise<PermissionState> {
    if (!this.isSupported()) {
      return 'denied';
    }

    // Try to use Permissions API if available
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state as PermissionState;
      } catch (error) {
        console.warn('Permissions API not fully supported, falling back to test location');
      }
    }

    // Fallback: Try to get position with minimal settings to test permission
    try {
      await this.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 1000,
        maximumAge: Infinity,
      });
      return 'granted';
    } catch (error) {
      if (error instanceof GeolocationError && error.type === 'PERMISSION_DENIED') {
        return 'denied';
      }
      return 'prompt'; // Assume prompt if we can't determine
    }
  }

  /**
   * Request geolocation permission
   */
  async requestPermission(): Promise<PermissionState> {
    try {
      await this.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0,
      });
      return 'granted';
    } catch (error) {
      if (error instanceof GeolocationError && error.type === 'PERMISSION_DENIED') {
        return 'denied';
      }
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Check if coordinates are within a certain radius
   */
  static isWithinRadius(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= radiusMeters;
  }
}

/**
 * React Native implementation placeholder
 * This would be implemented in a separate file for React Native
 */
export class ReactNativeGeolocationService extends GeolocationServiceInterface {
  async getCurrentPosition(_options?: GeolocationOptions): Promise<GeolocationPosition> {
    throw new Error('React Native geolocation service not implemented in web environment');
  }

  async checkPermission(): Promise<PermissionState> {
    throw new Error('React Native geolocation service not implemented in web environment');
  }

  async requestPermission(): Promise<PermissionState> {
    throw new Error('React Native geolocation service not implemented in web environment');
  }

  isSupported(): boolean {
    return false;
  }
}

// Custom error class
class GeolocationError extends Error {
  constructor(
    public code: number,
    message: string,
    public type: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'GeolocationError';
  }
}

// Factory function to get appropriate service implementation
export function createGeolocationService(): GeolocationServiceInterface {
  // In a React Native environment, this would return ReactNativeGeolocationService
  // For now, always return web implementation
  return new WebGeolocationService();
}

// Singleton instance
export const geolocationService = createGeolocationService();

// Export error class
export { GeolocationError };