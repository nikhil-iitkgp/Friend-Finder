"use client";

import { FriendRequests } from '@/components/friends/FriendRequests';
import { FriendsList } from '@/components/friends/FriendsList';

export default function FriendsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Friends</h1>
        <p className="text-muted-foreground">
          Manage your friend requests and connections
        </p>
      </div>

      {/* Friend Requests Section */}
      <FriendRequests />

      {/* Friends List Section */}
      <FriendsList />
    </div>
  );
}