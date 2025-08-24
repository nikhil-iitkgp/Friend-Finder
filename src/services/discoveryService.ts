import { APIService } from './api';
import type { NearbyUser } from '@/lib/validations';

export interface DiscoveryOptions {
  radius?: number;
}

export interface GPSDiscoveryResponse {
  success: boolean;
  users: NearbyUser[];
  totalFound: number;
  searchRadius: number;
  centerLocation: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export interface WiFiDiscoveryResponse {
  success: boolean;
  users: NearbyUser[];
  totalFound: number;
  networkId: string;
  timestamp: string;
}

export interface BluetoothDiscoveryResponse {
  success: boolean;
  users: NearbyUser[];
  totalFound: number;
  scannedDevices: string[];
  timestamp: string;
}

class DiscoveryService extends APIService {
  constructor() {
    super();
  }

  /**
   * Discover nearby users using GPS location
   */
  async discoverByGPS(options: DiscoveryOptions = {}): Promise<GPSDiscoveryResponse> {
    const params = new URLSearchParams();
    if (options.radius) {
      params.append('radius', options.radius.toString());
    }

    const url = `/api/discovery/gps${params.toString() ? `?${params.toString()}` : ''}`;
    return this.get<GPSDiscoveryResponse>(url);
  }

  /**
   * Discover nearby users on the same WiFi network
   */
  async discoverByWiFi(): Promise<WiFiDiscoveryResponse> {
    return this.get<WiFiDiscoveryResponse>('/api/discovery/wifi');
  }

  /**
   * Update WiFi presence (network BSSID)
   */
  async updateWiFiPresence(bssid: string): Promise<{ success: boolean; message: string }> {
    return this.put<{ success: boolean; message: string }>('/api/discovery/wifi', { bssid });
  }

  /**
   * Discover nearby users via Bluetooth
   */
  async discoverByBluetooth(deviceIds: string[]): Promise<BluetoothDiscoveryResponse> {
    return this.post<BluetoothDiscoveryResponse>('/api/discovery/bluetooth', { deviceIds });
  }

  /**
   * Update Bluetooth device ID
   */
  async updateBluetoothId(bluetoothId: string): Promise<{ success: boolean; message: string }> {
    return this.put<{ success: boolean; message: string }>('/api/discovery/bluetooth', { bluetoothId });
  }

  /**
   * Get discovery statistics
   */
  async getDiscoveryStats(): Promise<{
    totalDiscoveries: number;
    recentDiscoveries: number;
    popularMethods: Array<{ method: string; count: number }>;
  }> {
    return this.get('/api/discovery/stats');
  }

  /**
   * Get user's discovery settings
   */
  async getDiscoverySettings(): Promise<{
    isDiscoverable: boolean;
    discoveryRange: number;
    lastLocationUpdate: string | null;
    currentWiFiNetwork: string | null;
    bluetoothId: string | null;
  }> {
    return this.get('/api/discovery/settings');
  }

  /**
   * Update discovery settings
   */
  async updateDiscoverySettings(settings: {
    isDiscoverable?: boolean;
    discoveryRange?: number;
  }): Promise<{ success: boolean; message: string }> {
    return this.put('/api/discovery/settings', settings);
  }

  /**
   * Calculate distance between two coordinates
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
   * Format distance for display
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else if (meters < 10000) {
      return `${(meters / 1000).toFixed(1)}km`;
    } else {
      return `${Math.round(meters / 1000)}km`;
    }
  }

  /**
   * Get relative time string
   */
  getRelativeTime(date: string | Date): string {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now.getTime() - target.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else if (diffDay < 7) {
      return `${diffDay}d ago`;
    } else {
      return target.toLocaleDateString();
    }
  }
}

export const discoveryService = new DiscoveryService();