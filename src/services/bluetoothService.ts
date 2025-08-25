/**
 * Bluetooth service interface for proximity-based discovery
 * This abstraction allows easy swapping between web and React Native implementations
 */

export interface BluetoothDevice {
  id: string; // Device ID/MAC address
  name?: string; // Device name
  rssi?: number; // Signal strength
  txPower?: number; // Transmission power
  distance?: number; // Estimated distance in meters
  advertisementData?: any; // Raw advertisement data
  timestamp: number;
}

export interface BluetoothScanResult {
  devices: BluetoothDevice[];
  scanDuration: number;
  timestamp: number;
}

export type BluetoothPermissionState = 'granted' | 'denied' | 'prompt' | 'not-supported';

export interface BluetoothScanOptions {
  duration?: number; // Scan duration in milliseconds
  allowDuplicates?: boolean; // Allow duplicate discoveries
  requireName?: boolean; // Only return devices with names
}

/**
 * Abstract Bluetooth service interface
 */
export abstract class BluetoothServiceInterface {
  abstract scan(options?: BluetoothScanOptions): Promise<BluetoothScanResult>;
  abstract getDeviceInfo(): Promise<BluetoothDevice>;
  abstract checkPermission(): Promise<BluetoothPermissionState>;
  abstract requestPermission(): Promise<BluetoothPermissionState>;
  abstract isSupported(): boolean;
  abstract startAdvertising(data?: any): Promise<void>;
  abstract stopAdvertising(): Promise<void>;
}

/**
 * Web implementation using Web Bluetooth API (limited capabilities)
 */
export class WebBluetoothService extends BluetoothServiceInterface {
  private simulatedDevices: BluetoothDevice[] = [];
  private isAdvertising: boolean = false;
  private ownDeviceId: string;

  constructor() {
    super();
    // Generate a persistent device ID for this browser session
    this.ownDeviceId = this.generateDeviceId();
    this.initializeSimulatedDevices();
  }

  /**
   * Check if Bluetooth is supported
   */
  isSupported(): boolean {
    // Web Bluetooth API is supported in some browsers but with limitations
    return 'bluetooth' in navigator;
  }

  /**
   * Scan for Bluetooth devices (simulated in web)
   */
  async scan(options: BluetoothScanOptions = {}): Promise<BluetoothScanResult> {
    const {
      duration = 5000,
      allowDuplicates = false,
      requireName = false
    } = options;

    console.log('🔵 Starting Bluetooth scan (simulated)...');
    
    // Simulate scan delay
    await new Promise(resolve => setTimeout(resolve, Math.min(duration, 2000)));

    let devices = [...this.simulatedDevices];

    // Filter by name requirement
    if (requireName) {
      devices = devices.filter(device => device.name && device.name.trim() !== '');
    }

    // Remove duplicates if not allowed
    if (!allowDuplicates) {
      const seen = new Set();
      devices = devices.filter(device => {
        if (seen.has(device.id)) {
          return false;
        }
        seen.add(device.id);
        return true;
      });
    }

    // Simulate some devices being discovered
    const discoveredDevices = devices
      .filter(() => Math.random() > 0.3) // 70% chance of discovery
      .map(device => ({
        ...device,
        rssi: this.generateRSSI(),
        distance: this.estimateDistance(this.generateRSSI()),
        timestamp: Date.now(),
      }));

    console.log(`🔵 Bluetooth scan completed. Found ${discoveredDevices.length} devices.`);

    return {
      devices: discoveredDevices,
      scanDuration: duration,
      timestamp: Date.now(),
    };
  }

  /**
   * Get information about this device
   */
  async getDeviceInfo(): Promise<BluetoothDevice> {
    return {
      id: this.ownDeviceId,
      name: this.generateDeviceName(),
      timestamp: Date.now(),
    };
  }

  /**
   * Check Bluetooth permission
   */
  async checkPermission(): Promise<BluetoothPermissionState> {
    if (!this.isSupported()) {
      return 'not-supported';
    }

    // Web Bluetooth requires user gesture to check permission
    // So we'll return 'prompt' as the default state
    return 'prompt';
  }

  /**
   * Request Bluetooth permission
   */
  async requestPermission(): Promise<BluetoothPermissionState> {
    if (!this.isSupported()) {
      return 'not-supported';
    }

    try {
      // This would normally trigger the browser's Bluetooth permission dialog
      // For simulation, we'll just return granted
      console.log('🔵 Requesting Bluetooth permission (simulated)...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'granted';
    } catch (error) {
      console.error('Bluetooth permission denied:', error);
      return 'denied';
    }
  }

  /**
   * Start advertising this device (simulated)
   */
  async startAdvertising(data?: any): Promise<void> {
    console.log('🔵 Starting Bluetooth advertising (simulated)...');
    this.isAdvertising = true;
    
    // In a real implementation, this would make the device discoverable
    // For simulation, we just set a flag
  }

  /**
   * Stop advertising this device
   */
  async stopAdvertising(): Promise<void> {
    console.log('🔵 Stopping Bluetooth advertising...');
    this.isAdvertising = false;
  }

  /**
   * Generate a unique device ID for this browser session
   */
  private generateDeviceId(): string {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      // Generate a temporary ID for server-side rendering
      return this.generateMACAddress();
    }
    
    // In web, we'll generate a session-persistent ID
    let deviceId = localStorage.getItem('bluetooth-device-id');
    
    if (!deviceId) {
      deviceId = this.generateMACAddress();
      localStorage.setItem('bluetooth-device-id', deviceId);
    }
    
    return deviceId;
  }

  /**
   * Generate a MAC address format ID
   */
  private generateMACAddress(): string {
    const chars = '0123456789ABCDEF';
    const segments = [];
    
    for (let i = 0; i < 6; i++) {
      let segment = '';
      for (let j = 0; j < 2; j++) {
        segment += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(segment);
    }
    
    return segments.join(':');
  }

  /**
   * Generate a device name
   */
  private generateDeviceName(): string {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return 'Server Device';
    }
    
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    
    return 'Web Browser';
  }

  /**
   * Initialize simulated devices for testing
   */
  private initializeSimulatedDevices(): void {
    this.simulatedDevices = [
      {
        id: 'AA:BB:CC:DD:EE:F1',
        name: 'iPhone 15',
        timestamp: Date.now(),
      },
      {
        id: 'AA:BB:CC:DD:EE:F2',
        name: 'Samsung Galaxy S24',
        timestamp: Date.now(),
      },
      {
        id: 'AA:BB:CC:DD:EE:F3',
        name: 'MacBook Pro',
        timestamp: Date.now(),
      },
      {
        id: 'AA:BB:CC:DD:EE:F4',
        name: 'AirPods Pro',
        timestamp: Date.now(),
      },
      {
        id: 'AA:BB:CC:DD:EE:F5',
        name: '', // Anonymous device
        timestamp: Date.now(),
      },
    ];
  }

  /**
   * Generate simulated RSSI value
   */
  private generateRSSI(): number {
    // Typical Bluetooth RSSI range: -100 to -30 dBm
    return Math.floor(Math.random() * 70) - 100;
  }

  /**
   * Estimate distance from RSSI
   */
  private estimateDistance(rssi: number): number {
    // Very rough estimation: distance ≈ 10^((Tx Power - RSSI) / (10 * N))
    // Where Tx Power ≈ 0 dBm, N ≈ 2 for free space
    const txPower = 0;
    const pathLoss = 2;
    const distance = Math.pow(10, (txPower - rssi) / (10 * pathLoss));
    
    // Clamp to reasonable range (0.1m to 100m)
    return Math.max(0.1, Math.min(100, distance));
  }

  /**
   * Validate Bluetooth device ID format
   */
  static isValidDeviceId(id: string): boolean {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(id);
  }

  /**
   * Normalize device ID format
   */
  static normalizeDeviceId(id: string): string {
    return id
      .toUpperCase()
      .replace(/[-]/g, ':')
      .replace(/[^0-9A-F:]/g, '');
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1) {
      return `${Math.round(meters * 100)}cm`;
    } else if (meters < 1000) {
      return `${meters.toFixed(1)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Get signal strength description
   */
  static getSignalStrengthDescription(rssi: number): string {
    if (rssi > -50) return 'Excellent';
    if (rssi > -60) return 'Good';
    if (rssi > -70) return 'Fair';
    if (rssi > -80) return 'Weak';
    return 'Very Weak';
  }
}

/**
 * React Native implementation placeholder
 * This would use react-native-bluetooth-classic or react-native-ble-manager
 */
export class ReactNativeBluetoothService extends BluetoothServiceInterface {
  async scan(_options?: BluetoothScanOptions): Promise<BluetoothScanResult> {
    throw new Error('React Native Bluetooth service not implemented in web environment');
  }

  async getDeviceInfo(): Promise<BluetoothDevice> {
    throw new Error('React Native Bluetooth service not implemented in web environment');
  }

  async checkPermission(): Promise<BluetoothPermissionState> {
    throw new Error('React Native Bluetooth service not implemented in web environment');
  }

  async requestPermission(): Promise<BluetoothPermissionState> {
    throw new Error('React Native Bluetooth service not implemented in web environment');
  }

  isSupported(): boolean {
    return false;
  }

  async startAdvertising(_data?: any): Promise<void> {
    throw new Error('React Native Bluetooth service not implemented in web environment');
  }

  async stopAdvertising(): Promise<void> {
    throw new Error('React Native Bluetooth service not implemented in web environment');
  }
}

// Factory function to get appropriate service implementation
export function createBluetoothService(): BluetoothServiceInterface {
  // In a React Native environment, this would return ReactNativeBluetoothService
  // For web, we use the simulated service
  return new WebBluetoothService();
}

// Lazy singleton instance
let _bluetoothService: BluetoothServiceInterface | null = null;
export const bluetoothService = {
  get instance() {
    if (!_bluetoothService) {
      _bluetoothService = createBluetoothService();
    }
    return _bluetoothService;
  }
} as { instance: BluetoothServiceInterface };