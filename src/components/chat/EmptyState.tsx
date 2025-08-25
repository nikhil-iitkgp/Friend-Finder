"use client";

import { MessageCircle, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="h-12 w-12 text-primary" />
        </div>
        
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Welcome to Messages
        </h2>
        
        <p className="text-muted-foreground mb-6">
          Select a conversation from the left to start chatting, or discover new friends to connect with.
        </p>

        <div className="space-y-3">
          <Link href="/dashboard/discover">
            <Button className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Discover People
            </Button>
          </Link>
          
          <Link href="/dashboard/friends">
            <Button variant="outline" className="w-full">
              <Users className="h-4 w-4 mr-2" />
              View Friends
            </Button>
          </Link>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          <p className="mb-2">💡 <strong>Tips:</strong></p>
          <ul className="text-left space-y-1">
            <li>• Use GPS, WiFi, or Bluetooth to find people nearby</li>
            <li>• Send friend requests to start conversations</li>
            <li>• Your messages are private and secure</li>
          </ul>
        </div>
      </div>
    </div>
  );
}