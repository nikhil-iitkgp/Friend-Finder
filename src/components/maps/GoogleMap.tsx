"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Loader2 } from 'lucide-react';
import type { NearbyUser } from '@/lib/validations';

interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  users?: NearbyUser[];
  onUserClick?: (user: NearbyUser) => void;
  currentUserLocation?: { lat: number; lng: number };
  searchRadius?: number;
  className?: string;
}

interface MarkerInfo {
  marker: google.maps.Marker;
  infoWindow: google.maps.InfoWindow;
  user: NearbyUser;
}

export function GoogleMap({
  center,
  zoom = 15,
  users = [],
  onUserClick,
  currentUserLocation,
  searchRadius,
  className = "w-full h-96"
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<MarkerInfo[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();

        const mapInstance = new google.maps.Map(mapRef.current!, {
          center,
          zoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        setMap(mapInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load map. Please check your internet connection.');
        setIsLoading(false);
      }
    };

    initMap();
  }, [center, zoom]);

  // Update current user location marker
  useEffect(() => {
    if (!map || !currentUserLocation) return;

    // Remove existing current location marker
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null);
    }

    // Create current user marker
    const currentMarker = new google.maps.Marker({
      position: currentUserLocation,
      map,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#4285f4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8
      },
      zIndex: 1000
    });

    currentLocationMarkerRef.current = currentMarker;

    return () => {
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setMap(null);
      }
    };
  }, [map, currentUserLocation]);

  // Update search radius circle
  useEffect(() => {
    if (!map || !currentUserLocation || !searchRadius) return;

    // Remove existing circle
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // Create search radius circle
    const circle = new google.maps.Circle({
      strokeColor: '#4285f4',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#4285f4',
      fillOpacity: 0.1,
      map,
      center: currentUserLocation,
      radius: searchRadius
    });

    circleRef.current = circle;

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [map, currentUserLocation, searchRadius]);

  // Update user markers
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(({ marker, infoWindow }) => {
      marker.setMap(null);
      infoWindow.close();
    });
    markersRef.current = [];

    // Create markers for nearby users
    users.forEach((user) => {
      if (!user.location?.coordinates) return;

      const position = {
        lat: user.location.coordinates[1],
        lng: user.location.coordinates[0]
      };

      const marker = new google.maps.Marker({
        position,
        map,
        title: user.username,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: user.isFriend ? '#10b981' : user.hasPendingRequest ? '#f59e0b' : '#ef4444',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 6
        }
      });

      const infoWindowContent = `
        <div class="p-2 max-w-xs">
          <div class="flex items-center space-x-3">
            ${user.profilePicture ? 
              `<img src="${user.profilePicture}" alt="${user.username}" class="w-10 h-10 rounded-full object-cover">` :
              `<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">${user.username.charAt(0).toUpperCase()}</div>`
            }
            <div>
              <h3 class="font-medium text-gray-900">${user.username}</h3>
              <p class="text-sm text-gray-600">${user.distance ? `${Math.round(user.distance)}m away` : ''}</p>
              ${user.bio ? `<p class="text-xs text-gray-500 mt-1">${user.bio.substring(0, 50)}${user.bio.length > 50 ? '...' : ''}</p>` : ''}
            </div>
          </div>
          <div class="mt-2 flex space-x-2">
            ${user.isFriend ? 
              '<span class="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Friend</span>' :
              user.hasPendingRequest ?
              '<span class="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Request Sent</span>' :
              '<button onclick="window.sendFriendRequest && window.sendFriendRequest(\'${user.id}\')" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">Add Friend</button>'
            }
          </div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent
      });

      marker.addListener('click', () => {
        // Close other info windows
        markersRef.current.forEach(({ infoWindow: iw }) => {
          if (iw !== infoWindow) iw.close();
        });
        
        infoWindow.open(map, marker);
        onUserClick?.(user);
      });

      markersRef.current.push({ marker, infoWindow, user });
    });

    return () => {
      markersRef.current.forEach(({ marker, infoWindow }) => {
        marker.setMap(null);
        infoWindow.close();
      });
    };
  }, [map, users, onUserClick]);

  // Center map when center prop changes
  useEffect(() => {
    if (map) {
      map.setCenter(center);
    }
  }, [map, center]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load map</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <div
        ref={mapRef}
        className={`${className} rounded-lg overflow-hidden`}
        style={{ minHeight: '384px' }}
      />
    </div>
  );
}