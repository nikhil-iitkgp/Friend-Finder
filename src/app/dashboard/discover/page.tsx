"use client";

import { useState, useEffect } from 'react';
import { MapPin, Wifi, Bluetooth, Users, Search, RefreshCw, Settings, UserPlus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { useDiscoveryStore, useDiscoveryActions } from '@/store/discoveryStore';
import { discoveryService } from '@/services/discoveryService';
import { toast } from 'sonner';
import type { NearbyUser } from '@/lib/validations';

interface UserCardProps {
  user: NearbyUser;
  onSendFriendRequest: (userId: string) => void;
  onSendMessage: (userId: string) => void;
}

function UserCard({ user, onSendFriendRequest, onSendMessage }: UserCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.profilePicture} alt={user.username} />
            <AvatarFallback>
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground truncate">
                {user.firstName && user.lastName ? 
                  `${user.firstName} ${user.lastName}` : 
                  user.username
                }
              </h3>
              {user.distance && (
                <Badge variant="secondary" className="text-xs">
                  {discoveryService.formatDistance(user.distance)}
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            
            {user.bio && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {user.bio}
              </p>
            )}
            
            {user.interests && user.interests.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {user.interests.slice(0, 3).map((interest, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {interest}
                  </Badge>
                ))}
                {user.interests.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{user.interests.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                {user.isOnline && (
                  <div className="flex items-center text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Online
                  </div>
                )}
                {user.showLastSeen && user.lastSeen && (
                  <span className="text-xs text-muted-foreground">
                    {discoveryService.getRelativeTime(user.lastSeen)}
                  </span>
                )}
              </div>
              
              <div className="flex space-x-2">
                {user.isFriend ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSendMessage(user.id)}
                    className="text-xs"
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Message
                  </Button>
                ) : user.hasPendingRequest ? (
                  <Badge variant="secondary" className="text-xs">
                    Request Sent
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onSendFriendRequest(user.id)}
                    className="text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add Friend
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DiscoverPage() {
  const {
    mode,
    radius,
    lastResults,
    isDiscovering,
    error,
    lastLocation,
    currentNetwork,
    bluetoothDevices,
    lastDiscoveryTime
  } = useDiscoveryStore();
  
  const {
    setMode,
    setRadius,
    triggerDiscovery,
    clearResults,
    updateLocation
  } = useDiscoveryActions();
  
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // Default to NYC
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);

  // Update map center when location changes
  useEffect(() => {
    if (lastLocation) {
      setMapCenter({
        lat: lastLocation.latitude,
        lng: lastLocation.longitude
      });
    }
  }, [lastLocation]);

  const handleDiscovery = async () => {
    try {
      await triggerDiscovery();
      toast.success(`Found ${lastResults.length} people nearby!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Discovery failed';
      toast.error(errorMessage);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      // This will be implemented in the friend requests step
      toast.success('Friend request sent!');
    } catch (error) {
      toast.error('Failed to send friend request');
    }
  };

  const handleSendMessage = async (userId: string) => {
    try {
      // This will be implemented in the chat step
      toast.success('Opening chat...');
    } catch (error) {
      toast.error('Failed to open chat');
    }
  };

  const handleLocationUpdate = async () => {
    try {
      await updateLocation();
      toast.success('Location updated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update location';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Discover</h1>
          <p className="text-muted-foreground">
            Find friends nearby using different discovery methods
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearResults}
            disabled={lastResults.length === 0}
          >
            Clear Results
          </Button>
          
          <Button
            onClick={handleDiscovery}
            disabled={isDiscovering}
            className="min-w-[120px]"
          >
            {isDiscovering ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Discover
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Discovery Mode Tabs */}
      <Tabs value={mode} onValueChange={(value) => setMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gps" className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>GPS</span>
          </TabsTrigger>
          <TabsTrigger value="wifi" className="flex items-center space-x-2">
            <Wifi className="h-4 w-4" />
            <span>Wi-Fi</span>
          </TabsTrigger>
          <TabsTrigger value="bluetooth" className="flex items-center space-x-2">
            <Bluetooth className="h-4 w-4" />
            <span>Bluetooth</span>
          </TabsTrigger>
        </TabsList>

        {/* GPS Discovery */}
        <TabsContent value="gps" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Map View */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <span>GPS Discovery</span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLocationUpdate}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Update Location
                  </Button>
                </div>
                <CardDescription>
                  Find people within {discoveryService.formatDistance(radius)} of your GPS location
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Radius Control */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Search Radius: {discoveryService.formatDistance(radius)}
                    </label>
                    <Slider
                      value={[radius]}
                      onValueChange={([value]) => setRadius(value)}
                      max={50000}
                      min={100}
                      step={100}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Map */}
                  <GoogleMap
                    center={mapCenter}
                    zoom={15}
                    users={lastResults}
                    onUserClick={setSelectedUser}
                    currentUserLocation={lastLocation ? {
                      lat: lastLocation.latitude,
                      lng: lastLocation.longitude
                    } : undefined}
                    searchRadius={radius}
                    className="w-full h-80"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Nearby People</span>
                  <Badge variant="secondary">
                    {lastResults.length} found
                  </Badge>
                </CardTitle>
                {lastDiscoveryTime && (
                  <CardDescription>
                    Last updated: {discoveryService.getRelativeTime(lastDiscoveryTime)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {lastResults.length > 0 ? (
                    lastResults.map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        onSendFriendRequest={handleSendFriendRequest}
                        onSendMessage={handleSendMessage}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No people found nearby</p>
                      <p className="text-sm mt-2">
                        Try increasing your search radius or updating your location
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Wi-Fi Discovery Placeholder */}
        <TabsContent value="wifi">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wifi className="h-5 w-5 text-green-500" />
                <span>Wi-Fi Network Discovery</span>
              </CardTitle>
              <CardDescription>
                Find people connected to the same Wi-Fi network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Wifi className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Wi-Fi discovery will be implemented in the next step</p>
                <p className="text-sm mt-2">
                  Current network: {currentNetwork || 'Not connected'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bluetooth Discovery Placeholder */}
        <TabsContent value="bluetooth">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bluetooth className="h-5 w-5 text-purple-500" />
                <span>Bluetooth Discovery</span>
              </CardTitle>
              <CardDescription>
                Find people via Bluetooth proximity detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Bluetooth className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Bluetooth discovery will be implemented in upcoming steps</p>
                <p className="text-sm mt-2">
                  Devices detected: {bluetoothDevices.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <Users className="h-5 w-5" />
              <span className="font-medium">Discovery Error</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}