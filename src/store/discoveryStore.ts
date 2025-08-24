import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { NearbyUser, Coordinates } from '@/lib/validations';
import type { DiscoveryMode } from '@/types';
import { usersService, geolocationService, wifiService, bluetoothService } from '@/services';

interface DiscoveryState {
  // Discovery mode and settings
  mode: DiscoveryMode;
  radius: number;
  isDiscoverable: boolean;
  
  // Discovery results
  lastResults: NearbyUser[];
  lastDiscoveryTime: Date | null;
  
  // Loading and error states
  isDiscovering: boolean;
  error: string | null;
  
  // Location state (for GPS mode)
  lastLocation: Coordinates | null;
  locationError: string | null;
  
  // WiFi state
  currentNetwork: string | null;
  wifiError: string | null;
  
  // Bluetooth state
  bluetoothDevices: string[];
  bluetoothError: string | null;
  
  // Actions
  setMode: (mode: DiscoveryMode) => void;
  setRadius: (radius: number) => void;
  setDiscoverable: (discoverable: boolean) => void;
  setDiscovering: (discovering: boolean) => void;
  setError: (error: string | null) => void;
  setResults: (results: NearbyUser[]) => void;
  clearResults: () => void;
  
  // Location actions
  setLocation: (location: Coordinates | null) => void;
  setLocationError: (error: string | null) => void;
  updateLocation: () => Promise<void>;
  
  // WiFi actions
  setCurrentNetwork: (network: string | null) => void;
  setWiFiError: (error: string | null) => void;
  updateWiFiPresence: () => Promise<void>;
  
  // Bluetooth actions
  setBluetoothDevices: (devices: string[]) => void;
  setBluetoothError: (error: string | null) => void;
  scanBluetooth: () => Promise<void>;
  
  // Discovery triggers
  triggerDiscovery: () => Promise<void>;
  triggerGPSDiscovery: () => Promise<void>;
  triggerWiFiDiscovery: () => Promise<void>;
  triggerBluetoothDiscovery: () => Promise<void>;
}

export const useDiscoveryStore = create<DiscoveryState>()(
  devtools(
    (set, get) => ({
      // Initial state
      mode: 'gps',
      radius: 5000, // 5km default
      isDiscoverable: true,
      lastResults: [],
      lastDiscoveryTime: null,
      isDiscovering: false,
      error: null,
      
      // Location state
      lastLocation: null,
      locationError: null,
      
      // WiFi state
      currentNetwork: null,
      wifiError: null,
      
      // Bluetooth state
      bluetoothDevices: [],
      bluetoothError: null,
      
      // Basic actions
      setMode: (mode) => set({ mode, error: null }),
      setRadius: (radius) => set({ radius }),
      setDiscoverable: (isDiscoverable) => set({ isDiscoverable }),
      setDiscovering: (isDiscovering) => set({ isDiscovering }),
      setError: (error) => set({ error }),
      setResults: (lastResults) => set({ 
        lastResults, 
        lastDiscoveryTime: new Date(),
        error: null 
      }),
      clearResults: () => set({ 
        lastResults: [], 
        lastDiscoveryTime: null,
        error: null 
      }),
      
      // Location actions
      setLocation: (lastLocation) => set({ lastLocation, locationError: null }),
      setLocationError: (locationError) => set({ locationError }),
      
      updateLocation: async () => {
        try {
          set({ locationError: null });
          
          const permission = await geolocationService.checkPermission();
          if (permission !== 'granted') {
            const requestResult = await geolocationService.requestPermission();
            if (requestResult !== 'granted') {
              throw new Error('Location permission denied');
            }
          }
          
          const position = await geolocationService.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
          
          const coordinates = {
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
          };
          
          // Update location in backend
          await usersService.updateLocation(coordinates);
          set({ lastLocation: coordinates, locationError: null });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update location';
          set({ locationError: errorMessage });
          throw error;
        }
      },
      
      // WiFi actions
      setCurrentNetwork: (currentNetwork) => set({ currentNetwork, wifiError: null }),
      setWiFiError: (wifiError) => set({ wifiError }),
      
      updateWiFiPresence: async () => {
        try {
          set({ wifiError: null });
          
          const network = await wifiService.getNetwork();
          const bssid = network.bssid;
          
          // Update presence in backend
          await usersService.updatePresence({ bssid });
          set({ currentNetwork: bssid || null, wifiError: null });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update WiFi presence';
          set({ wifiError: errorMessage });
          throw error;
        }
      },
      
      // Bluetooth actions
      setBluetoothDevices: (bluetoothDevices) => set({ bluetoothDevices, bluetoothError: null }),
      setBluetoothError: (bluetoothError) => set({ bluetoothError }),
      
      scanBluetooth: async () => {
        try {
          set({ bluetoothError: null });
          
          const permission = await bluetoothService.checkPermission();
          if (permission === 'denied') {
            throw new Error('Bluetooth permission denied');
          }
          
          if (permission === 'prompt') {
            const requestResult = await bluetoothService.requestPermission();
            if (requestResult !== 'granted') {
              throw new Error('Bluetooth permission denied');
            }
          }
          
          const scanResult = await bluetoothService.scan({
            duration: 5000,
            allowDuplicates: false,
          });
          
          const deviceIds = scanResult.devices.map(device => device.id);
          set({ bluetoothDevices: deviceIds, bluetoothError: null });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to scan Bluetooth devices';
          set({ bluetoothError: errorMessage });
          throw error;
        }
      },
      
      // Discovery triggers
      triggerDiscovery: async () => {
        const { mode } = get();
        
        switch (mode) {
          case 'gps':
            return get().triggerGPSDiscovery();
          case 'wifi':
            return get().triggerWiFiDiscovery();
          case 'bluetooth':
            return get().triggerBluetoothDiscovery();
          default:
            throw new Error(`Unknown discovery mode: ${mode}`);
        }
      },
      
      triggerGPSDiscovery: async () => {
        try {
          set({ isDiscovering: true, error: null });
          
          // First update location
          await get().updateLocation();
          
          // Then discover nearby users
          const { radius } = get();
          const nearbyUsers = await usersService.getNearbyByGPS({ radius });
          
          set({ 
            lastResults: nearbyUsers,
            lastDiscoveryTime: new Date(),
            isDiscovering: false,
            error: null
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'GPS discovery failed';
          set({ 
            error: errorMessage,
            isDiscovering: false 
          });
          throw error;
        }
      },
      
      triggerWiFiDiscovery: async () => {
        try {
          set({ isDiscovering: true, error: null });
          
          // First update WiFi presence
          await get().updateWiFiPresence();
          
          // Then discover nearby users
          const nearbyUsers = await usersService.getNearbyByWiFi();
          
          set({ 
            lastResults: nearbyUsers,
            lastDiscoveryTime: new Date(),
            isDiscovering: false,
            error: null
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'WiFi discovery failed';
          set({ 
            error: errorMessage,
            isDiscovering: false 
          });
          throw error;
        }
      },
      
      triggerBluetoothDiscovery: async () => {
        try {
          set({ isDiscovering: true, error: null });
          
          // First scan for Bluetooth devices
          await get().scanBluetooth();
          
          // Then discover nearby users
          const { bluetoothDevices } = get();
          const nearbyUsers = await usersService.getNearbyByBluetooth({
            nearbyDevices: bluetoothDevices
          });
          
          set({ 
            lastResults: nearbyUsers,
            lastDiscoveryTime: new Date(),
            isDiscovering: false,
            error: null
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Bluetooth discovery failed';
          set({ 
            error: errorMessage,
            isDiscovering: false 
          });
          throw error;
        }
      },
    }),
    { name: 'DiscoveryStore' }
  )
);

// Selectors
export const useDiscoveryMode = () => useDiscoveryStore((state) => state.mode);
export const useDiscoveryResults = () => useDiscoveryStore((state) => state.lastResults);
export const useIsDiscovering = () => useDiscoveryStore((state) => state.isDiscovering);
export const useDiscoveryError = () => useDiscoveryStore((state) => state.error);
export const useLastLocation = () => useDiscoveryStore((state) => state.lastLocation);
export const useCurrentNetwork = () => useDiscoveryStore((state) => state.currentNetwork);
export const useBluetoothDevices = () => useDiscoveryStore((state) => state.bluetoothDevices);

// Actions selectors
export const useDiscoveryActions = () => useDiscoveryStore((state) => ({
  setMode: state.setMode,
  setRadius: state.setRadius,
  triggerDiscovery: state.triggerDiscovery,
  clearResults: state.clearResults,
  updateLocation: state.updateLocation,
  updateWiFiPresence: state.updateWiFiPresence,
  scanBluetooth: state.scanBluetooth,
}));