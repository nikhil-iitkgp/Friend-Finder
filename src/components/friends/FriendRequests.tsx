"use client";

import { useEffect } from 'react';
import { useFriendStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function FriendRequests() {
  const {
    friendRequests,
    isLoading,
    error,
    loadFriendRequests,
    respondToFriendRequest,
    getFriendRequestCount,
    clearError,
  } = useFriendStore();

  useEffect(() => {
    loadFriendRequests();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Friend Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading friend requests...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Friend Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-destructive mb-2">{error}</p>
            <Button variant="outline" onClick={() => {
              clearError();
              loadFriendRequests();
            }}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = friendRequests.filter(req => req.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Friend Requests
          {pendingRequests.length > 0 && (
            <Badge variant="default" className="ml-auto">
              {pendingRequests.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pending friend requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <FriendRequestItem
                key={request.id}
                request={request}
                onRespond={respondToFriendRequest}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FriendRequestItemProps {
  request: any; // FriendRequest type
  onRespond: (requestId: string, action: 'accepted' | 'rejected') => Promise<boolean>;
}

function FriendRequestItem({ request, onRespond }: FriendRequestItemProps) {
  const handleAccept = async () => {
    await onRespond(request.id, 'accepted');
  };

  const handleReject = async () => {
    await onRespond(request.id, 'rejected');
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={request.from.profilePicture} alt={request.from.username} />
          <AvatarFallback>
            {request.from.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">
            {request.from.username}
          </p>
          {request.from.bio && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {request.from.bio}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="default"
          onClick={handleAccept}
          className="h-8 px-3"
        >
          <Check className="h-4 w-4 mr-1" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          className="h-8 px-3"
        >
          <X className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  );
}