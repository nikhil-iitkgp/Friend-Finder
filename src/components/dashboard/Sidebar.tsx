"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, MessageCircle, User, Settings, Users, Wifi, Bluetooth, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useTotalUnreadCount } from '@/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const navigation = [
  {
    name: 'Discover',
    href: '/dashboard/discover',
    icon: Search,
    description: 'Find people nearby',
  },
  {
    name: 'Chat',
    href: '/dashboard/chat',
    icon: MessageCircle,
    description: 'Messages and conversations',
    badge: true, // Will show unread count
  },
  {
    name: 'Profile',
    href: '/dashboard/profile',
    icon: User,
    description: 'Manage your profile',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'App preferences',
  },
];

const discoveryModes = [
  {
    name: 'GPS Location',
    icon: MapPin,
    description: 'Find people by GPS coordinates',
  },
  {
    name: 'Wi-Fi Network',
    icon: Wifi,
    description: 'Find people on same network',
  },
  {
    name: 'Bluetooth',
    icon: Bluetooth,
    description: 'Find people via Bluetooth',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useUser();
  const unreadCount = useTotalUnreadCount();

  return (
    <div className=\"flex h-full flex-col border-r border-border bg-card\">
      {/* Header */}
      <div className=\"flex h-16 items-center px-6 border-b border-border\">
        <div className=\"flex items-center space-x-2\">
          <div className=\"flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold\">
            F
          </div>
          <span className=\"text-lg font-semibold text-foreground\">
            FriendFinder
          </span>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className=\"flex items-center space-x-3 px-6 py-4 border-b border-border\">
          <Avatar className=\"h-10 w-10\">
            <AvatarImage src={user.profilePicture} alt={user.username} />
            <AvatarFallback>
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className=\"flex-1 min-w-0\">
            <p className=\"text-sm font-medium text-foreground truncate\">
              {user.username}
            </p>
            <p className=\"text-xs text-muted-foreground truncate\">
              {user.email}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className=\"flex-1 space-y-2 px-3 py-4\">
        <div className=\"space-y-1\">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const showBadge = item.badge && unreadCount > 0;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                  )}
                />
                <span className=\"flex-1\">{item.name}</span>
                {showBadge && (
                  <Badge 
                    variant={isActive ? \"secondary\" : \"default\"}
                    className=\"ml-2 h-5 px-1.5 text-xs\"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>

        {/* Discovery Section */}
        <div className=\"pt-6\">
          <div className=\"px-3 pb-2\">
            <h3 className=\"text-xs font-semibold text-muted-foreground uppercase tracking-wide\">
              Discovery Methods
            </h3>
          </div>
          <div className=\"space-y-1\">
            {discoveryModes.map((mode) => (
              <div
                key={mode.name}
                className=\"group flex items-center rounded-lg px-3 py-2 text-sm\"
              >
                <mode.icon className=\"mr-3 h-4 w-4 flex-shrink-0 text-muted-foreground\" />
                <div className=\"flex-1 min-w-0\">
                  <p className=\"text-sm font-medium text-foreground truncate\">
                    {mode.name}
                  </p>
                  <p className=\"text-xs text-muted-foreground truncate\">
                    {mode.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className=\"border-t border-border p-4\">
        <div className=\"text-xs text-muted-foreground text-center\">
          <p>FriendFinder v1.0</p>
          <p className=\"mt-1\">Privacy-first discovery</p>
        </div>
      </div>
    </div>
  );
}"