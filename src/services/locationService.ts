import { APIService } from './api';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationResponse {
  hasLocation: boolean;
  location?: {
    latitude: number;
    longitude: number;
    lastUpdate: string;
  };
  discovery?: {
    isDiscoverable: boolean;
    discoveryRange: number;
  };
  message?: string;
}

export interface LocationUpdateResponse {
  success: boolean;
  message: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    lastUpdate: string;
  };
  discovery: {
    isDiscoverable: boolean;
    discoveryRange: number;
  };
}

class LocationService extends APIService {
  constructor() {
    super();
  }

  /**
   * Update user's current location
   */
  async updateLocation(locationData: LocationData): Promise<LocationUpdateResponse> {
    return this.put<LocationUpdateResponse>('/api/location', locationData);
  }

  /**
   * Get user's current location
   */
  async getCurrentLocation(): Promise<LocationResponse> {
    return this.get<LocationResponse>('/api/location');
  }

  /**
   * Get current position using browser Geolocation API
   */
  async getCurrentPosition(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let message = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    });
  }

  /**
   * Watch user's position and update automatically
   */
  watchPosition(
    onUpdate: (location: LocationData) => void,
    onError: (error: Error) => void,
    autoUpdate: boolean = false
  ): number | null {
    if (!navigator.geolocation) {
      onError(new Error('Geolocation is not supported by this browser'));
      return null;
    }

    return navigator.geolocation.watchPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        onUpdate(locationData);

        // Automatically update server if enabled
        if (autoUpdate) {
          try {
            await this.updateLocation(locationData);
          } catch (error) {
            console.warn('Failed to auto-update location on server:', error);
          }
        }
      },
      (error) => {
        let message = 'Failed to watch location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        
        onError(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // Cache for 30 seconds when watching
      }
    );
  }

  /**
   * Stop watching position
   */
  clearWatch(watchId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Calculate distance between two points in meters
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
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
   * Check if user has granted location permission
   */
  async checkLocationPermission(): Promise<PermissionState> {
    if (!navigator.permissions) {
      throw new Error('Permissions API not supported');
    }

    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state;
  }
}

export const locationService = new LocationService();