// Export all service instances
export { usersService } from './usersService';
export { friendsService } from './friendsService';
export { messagesService } from './messagesService';
export { uploadsService } from './uploadsService';

// Export native service instances
export { geolocationService } from './geolocationService';
export { wifiService, manualWiFiService } from './wifiService';
export { bluetoothService } from './bluetoothService';

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

// Export native service classes and factories
export { 
  GeolocationServiceInterface,
  WebGeolocationService,
  ReactNativeGeolocationService,
  createGeolocationService,
  GeolocationError
} from './geolocationService';

export {
  WiFiServiceInterface,
  WebWiFiService,
  ReactNativeWiFiService,
  ManualWiFiService,
  createWiFiService,
  createManualWiFiService
} from './wifiService';

export {
  BluetoothServiceInterface,
  WebBluetoothService,
  ReactNativeBluetoothService,
  createBluetoothService
} from './bluetoothService';

// Export types
export type { RequestConfig, APIResponseWithMeta } from './api';
export type { 
  GeolocationPosition, 
  GeolocationOptions, 
  PermissionState 
} from './geolocationService';
export type { 
  WiFiNetwork, 
  WiFiScanResult, 
  WiFiPermissionState 
} from './wifiService';
export type { 
  BluetoothDevice, 
  BluetoothScanResult, 
  BluetoothPermissionState, 
  BluetoothScanOptions 
} from './bluetoothService';