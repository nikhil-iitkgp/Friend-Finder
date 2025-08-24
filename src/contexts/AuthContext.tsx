"use client";

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useUserStore, useUserActions } from '@/store';
import { toast } from 'sonner';

interface AuthContextType {
  isLoading: boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status } = useSession();
  const user = useUserStore((state) => state.user);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const isInitialized = useUserStore((state) => state.isInitialized);
  const userLoading = useUserStore((state) => state.isLoading);
  const userError = useUserStore((state) => state.error);
  
  const {
    setUser,
    setAuthenticated,
    setInitialized,
    fetchCurrentUser,
    clearUser,
    setError
  } = useUserActions();

  // Sync NextAuth session with user store
  useEffect(() => {
    const syncSession = async () => {
      try {
        if (status === 'loading') {
          // NextAuth is still loading
          return;
        }

        if (status === 'unauthenticated') {
          // User is not authenticated
          clearUser();
          return;
        }

        if (status === 'authenticated' && session?.user) {
          // User is authenticated
          if (!isAuthenticated || !user) {
            // Fetch full user profile from our backend
            try {
              await fetchCurrentUser();
            } catch (error) {
              console.error('Failed to fetch user profile:', error);
              
              // If backend fetch fails, create minimal user from session
              const minimalUser = {
                id: session.user.id,
                username: session.user.name || 'Unknown',
                email: session.user.email || '',
                bio: '',
                profilePicture: session.user.image || '',
                isDiscoverable: true,
                discoveryRange: 5000,
                lastSeen: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              
              setUser(minimalUser);
              setAuthenticated(true);
              
              toast.error('Could not load complete profile. Some features may be limited.');
            }
          }
        }
      } catch (error) {
        console.error('Session sync error:', error);
        setError('Authentication error occurred');
      } finally {
        if (!isInitialized) {
          setInitialized(true);
        }
      }
    };

    syncSession();
  }, [status, session, isAuthenticated, user, isInitialized]);

  // Handle user errors with toast notifications
  useEffect(() => {
    if (userError) {
      toast.error(userError);
      setError(null); // Clear error after showing
    }
  }, [userError, setError]);

  // Auto-refresh user data periodically if authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Refresh user data every 5 minutes
    const refreshInterval = setInterval(() => {
      if (isAuthenticated && !userLoading) {
        fetchCurrentUser().catch(error => {
          console.warn('Background user refresh failed:', error);
          // Don't show error toast for background refresh failures
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, user, userLoading, fetchCurrentUser]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      if (isAuthenticated && !userLoading) {
        // Refresh user data when coming back online
        fetchCurrentUser().catch(error => {
          console.warn('Online refresh failed:', error);
        });
      }
    };

    const handleOffline = () => {
      toast.warning('You are offline. Some features may not work.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, userLoading, fetchCurrentUser]);

  const contextValue: AuthContextType = {
    isLoading: status === 'loading' || userLoading,
    isInitialized: isInitialized && status !== 'loading',
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Additional hook for checking authentication status
export function useAuthStatus() {
  const { isLoading, isInitialized } = useAuth();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const user = useUserStore((state) => state.user);
  
  return {
    isLoading,
    isInitialized,
    isAuthenticated,
    user,
    isReady: isInitialized && !isLoading,
  };
}

// Hook for getting user actions with auth context
export function useAuthActions() {
  const userActions = useUserActions();
  const { isAuthenticated } = useAuthStatus();
  
  return {
    ...userActions,
    isAuthenticated,
  };
}"