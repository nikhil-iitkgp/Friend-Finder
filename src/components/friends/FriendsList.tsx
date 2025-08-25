"use client";

import { useEffect } from 'react';
import { useFriendStore, useChatStore, useCallStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, MoreVertical, MessageCircle, Phone, VideoIcon, UserMinus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function FriendsList() {
  const {
    friends,
    isLoading,
    error,
    loadFriends,
    removeFriend,
    clearError,
  } = useFriendStore();
  
  const { startConversation } = useChatStore();
  const { initiateCall } = useCallStore();

  useEffect(() => {
    loadFriends();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading friends...</p>
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
            <Users className="h-5 w-5" />
            Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-destructive mb-2">{error}</p>
            <Button variant="outline" onClick={() => {
              clearError();
              loadFriends();
            }}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Friends
          {friends.length > 0 && (
            <Badge variant="outline" className="ml-auto">
              {friends.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {friends.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No friends yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start discovering people nearby to make friends!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {friends.map((friend) => (
              <FriendItem
                key={friend.id}
                friend={friend}
                onRemove={removeFriend}
                onStartConversation={startConversation}
                onInitiateCall={initiateCall}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FriendItemProps {
  friend: any; // Friend type
  onRemove: (friendId: string) => Promise<boolean>;
  onStartConversation: (participantId: string) => Promise<any>;
  onInitiateCall: (participantId: string, isVideo: boolean) => void;
}

function FriendItem({ friend, onRemove, onStartConversation, onInitiateCall }: FriendItemProps) {
  const handleRemove = async () => {
    if (confirm(`Are you sure you want to remove ${friend.username} from your friends?`)) {
      await onRemove(friend.id);
    }
  };

  const handleMessage = async () => {
    try {
      const conversation = await onStartConversation(friend.id);
      if (conversation) {
        // Navigate to chat page
        window.location.href = '/dashboard/chat';
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleCall = () => {
    onInitiateCall(friend.id, false); // Voice call
  };

  const handleVideoCall = () => {
    onInitiateCall(friend.id, true); // Video call
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={friend.profilePicture} alt={friend.username} />
            <AvatarFallback>
              {friend.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {friend.isOnline && (
            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>
        <div>
          <p className="font-medium text-foreground flex items-center gap-2">
            {friend.username}
            {friend.isOnline && (
              <Badge variant="secondary" className="text-xs">
                Online
              </Badge>
            )}
          </p>
          {friend.bio && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {friend.bio}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Last seen {formatDistanceToNow(new Date(friend.lastSeen), { addSuffix: true })}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleMessage}
          className="h-8 w-8 p-0"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCall}
          className="h-8 w-8 p-0"
        >
          <Phone className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleVideoCall}>
              <VideoIcon className="h-4 w-4 mr-2" />
              Video Call
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleRemove}
              className="text-destructive focus:text-destructive"
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Remove Friend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}