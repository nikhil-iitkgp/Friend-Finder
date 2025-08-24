"use client";

import { MapPin, Wifi, Bluetooth, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DiscoverPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Discover</h1>
        <p className="text-muted-foreground">
          Find friends nearby using different discovery methods
        </p>
      </div>

      {/* Discovery Methods */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* GPS Discovery */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <CardTitle>GPS Location</CardTitle>
            </div>
            <CardDescription>
              Find people within your GPS radius
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Users className="mr-2 h-4 w-4" />
              Start GPS Discovery
            </Button>
          </CardContent>
        </Card>

        {/* Wi-Fi Discovery */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Wifi className="h-5 w-5 text-green-500" />
              <CardTitle>Wi-Fi Network</CardTitle>
            </div>
            <CardDescription>
              Find people on the same Wi-Fi network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Start Wi-Fi Discovery
            </Button>
          </CardContent>
        </Card>

        {/* Bluetooth Discovery */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bluetooth className="h-5 w-5 text-purple-500" />
              <CardTitle>Bluetooth</CardTitle>
            </div>
            <CardDescription>
              Find people via Bluetooth proximity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Start Bluetooth Discovery
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Discoveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Discoveries</CardTitle>
          <CardDescription>
            People you&apos;ve recently discovered nearby
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No recent discoveries</p>
            <p className="text-sm mt-2">
              Start discovering to find friends nearby!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}