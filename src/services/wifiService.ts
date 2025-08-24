/**
 * WiFi service interface for network-based discovery
 * This abstraction allows easy swapping between web and React Native implementations
 */

export interface WiFiNetwork {
  bssid?: string; // MAC address of the access point
  ssid?: string; // Network name (may not be available in web)
  signalStrength?: number; // Signal strength in dBm
  frequency?: number; // Frequency in MHz
  capabilities?: string[]; // Security capabilities
  timestamp: number;
}

export interface WiFiScanResult {
  networks: WiFiNetwork[];
  currentNetwork?: WiFiNetwork;
  timestamp: number;
}

export type WiFiPermissionState = 'granted' | 'denied' | 'prompt' | 'not-supported';

/**
 * Abstract WiFi service interface
 */
export abstract class WiFiServiceInterface {
  abstract getNetwork(): Promise<WiFiNetwork>;
  abstract scanNetworks(): Promise<WiFiScanResult>;
  abstract checkPermission(): Promise<WiFiPermissionState>;
  abstract requestPermission(): Promise<WiFiPermissionState>;
  abstract isSupported(): boolean;
}

/**
 * Web implementation (limited capabilities)
 * Note: Web browsers have very limited WiFi access for security reasons
 */
export class WebWiFiService extends WiFiServiceInterface {
  private simulatedBSSIDs: string[] = [
    '00:11:22:33:44:55',
    'AA:BB:CC:DD:EE:FF',
    '12:34:56:78:90:AB',
    'FE:DC:BA:98:76:54',
  ];

  /**
   * Check if WiFi scanning is supported (always false in web)
   */
  isSupported(): boolean {
    // Web browsers don't support WiFi network scanning for security reasons
    return false;
  }

  /**
   * Get current network information (simulated in web)
   */
  async getNetwork(): Promise<WiFiNetwork> {
    if (!this.isSupported()) {
      // Simulate a network for testing purposes
      // In production, this would show a warning or use a different discovery method
      return this.simulateNetwork();
    }

    throw new Error('WiFi network detection not supported in web browsers');
  }

  /**
   * Scan for available networks (not supported in web)
   */
  async scanNetworks(): Promise<WiFiScanResult> {
    if (!this.isSupported()) {
      // Return simulated results for testing
      return {
        networks: [
          this.simulateNetwork(),
          this.simulateNetwork('Coffee Shop WiFi', '12:34:56:78:90:AB'),
          this.simulateNetwork('Home Network', 'AA:BB:CC:DD:EE:FF'),
        ],
        currentNetwork: this.simulateNetwork(),
        timestamp: Date.now(),
      };
    }

    throw new Error('WiFi scanning not supported in web browsers');
  }

  /**
   * Check WiFi permission (not applicable in web)
   */
  async checkPermission(): Promise<WiFiPermissionState> {
    return 'not-supported';
  }

  /**
   * Request WiFi permission (not applicable in web)
   */
  async requestPermission(): Promise<WiFiPermissionState> {
    return 'not-supported';
  }

  /**
   * Simulate a WiFi network for testing
   */
  private simulateNetwork(
    ssid: string = 'Test Network',
    bssid?: string
  ): WiFiNetwork {
    const randomBSSID = bssid || this.simulatedBSSIDs[
      Math.floor(Math.random() * this.simulatedBSSIDs.length)
    ];

    return {
      bssid: randomBSSID,
      ssid,
      signalStrength: Math.floor(Math.random() * 40) - 80, // -80 to -40 dBm
      frequency: Math.random() > 0.5 ? 2400 : 5000, // 2.4GHz or 5GHz
      capabilities: ['WPA2'],
      timestamp: Date.now(),
    };
  }

  /**
   * Generate a simulated BSSID for testing
   * In a real web implementation, this might derive from some browser fingerprinting
   * or ask the user to manually specify their network
   */
  static generateSimulatedBSSID(): string {
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
   * Validate BSSID format
   */
  static isValidBSSID(bssid: string): boolean {
    const bssidRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return bssidRegex.test(bssid);
  }

  /**
   * Normalize BSSID format (uppercase with colons)
   */
  static normalizeBSSID(bssid: string): string {
    return bssid
      .toUpperCase()
      .replace(/[-]/g, ':')
      .replace(/[^0-9A-F:]/g, '');
  }

  /**
   * Get network display name
   */
  static getNetworkDisplayName(network: WiFiNetwork): string {
    if (network.ssid && network.ssid !== '') {
      return network.ssid;
    }
    return network.bssid || 'Unknown Network';
  }
}

/**
 * React Native implementation placeholder
 * This would use react-native-wifi-reborn or similar library
 */
export class ReactNativeWiFiService extends WiFiServiceInterface {
  async getNetwork(): Promise<WiFiNetwork> {
    throw new Error('React Native WiFi service not implemented in web environment');
  }

  async scanNetworks(): Promise<WiFiScanResult> {
    throw new Error('React Native WiFi service not implemented in web environment');
  }

  async checkPermission(): Promise<WiFiPermissionState> {
    throw new Error('React Native WiFi service not implemented in web environment');
  }

  async requestPermission(): Promise<WiFiPermissionState> {
    throw new Error('React Native WiFi service not implemented in web environment');
  }

  isSupported(): boolean {
    return false;
  }
}

/**
 * Manual WiFi service for web users
 * Allows users to manually specify their network for discovery
 */
export class ManualWiFiService extends WiFiServiceInterface {
  private currentNetwork: WiFiNetwork | null = null;

  isSupported(): boolean {
    return true; // Manual input is always supported
  }

  async getNetwork(): Promise<WiFiNetwork> {
    if (!this.currentNetwork) {
      throw new Error('No network set. Please set network manually.');
    }
    return this.currentNetwork;
  }

  async scanNetworks(): Promise<WiFiScanResult> {
    // For manual service, just return current network if set
    return {
      networks: this.currentNetwork ? [this.currentNetwork] : [],
      currentNetwork: this.currentNetwork || undefined,
      timestamp: Date.now(),
    };
  }

  async checkPermission(): Promise<WiFiPermissionState> {
    return 'granted'; // Manual input doesn't need permissions
  }

  async requestPermission(): Promise<WiFiPermissionState> {
    return 'granted';
  }

  /**
   * Manually set the current network
   */
  setNetwork(bssid: string, ssid?: string): void {
    if (!WebWiFiService.isValidBSSID(bssid)) {
      throw new Error('Invalid BSSID format');
    }

    this.currentNetwork = {
      bssid: WebWiFiService.normalizeBSSID(bssid),
      ssid: ssid || undefined,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear the current network
   */
  clearNetwork(): void {
    this.currentNetwork = null;
  }

  /**
   * Get the currently set network
   */
  getCurrentNetwork(): WiFiNetwork | null {
    return this.currentNetwork;
  }
}

// Factory function to get appropriate service implementation
export function createWiFiService(): WiFiServiceInterface {
  // In a React Native environment, this would return ReactNativeWiFiService
  // For web, we use the simulated service for testing
  return new WebWiFiService();
}

// Factory for manual WiFi service
export function createManualWiFiService(): ManualWiFiService {
  return new ManualWiFiService();
}

// Singleton instances
export const wifiService = createWiFiService();
export const manualWiFiService = createManualWiFiService();