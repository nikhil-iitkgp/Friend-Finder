"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStatus } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login',
  fallback
}: AuthGuardProps) {
  const router = useRouter();
  const { isLoading, isInitialized, isAuthenticated } = useAuthStatus();

  useEffect(() => {
    if (!isInitialized || isLoading) {
      return; // Wait for auth to initialize
    }

    if (requireAuth && !isAuthenticated) {
      // Redirect to login if authentication is required but user is not authenticated
      router.push(redirectTo);
      return;
    }

    if (!requireAuth && isAuthenticated) {
      // Redirect authenticated users away from auth pages
      router.push('/dashboard/discover');
      return;
    }
  }, [isInitialized, isLoading, isAuthenticated, requireAuth, router, redirectTo]);

  // Show loading state while auth is initializing
  if (!isInitialized || isLoading) {
    return fallback || <AuthLoadingScreen />;
  }

  // Show loading if we're about to redirect
  if (requireAuth && !isAuthenticated) {
    return fallback || <AuthLoadingScreen />;
  }

  if (!requireAuth && isAuthenticated) {
    return fallback || <AuthLoadingScreen />;
  }

  return <>{children}</>;
}

// Loading screen component
function AuthLoadingScreen() {
  return (
    <div className=\"min-h-screen flex items-center justify-center bg-background\">
      <div className=\"text-center space-y-4\">
        <LoadingSpinner size=\"lg\" />
        <div className=\"space-y-2\">
          <h2 className=\"text-xl font-semibold text-foreground\">
            FriendFinder
          </h2>
          <p className=\"text-muted-foreground\">
            Loading your profile...
          </p>
        </div>
      </div>
    </div>
  );
}

// Higher-order component for protecting pages
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  const WrappedComponent = (props: P) => {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };

  WrappedComponent.displayName = `withAuthGuard(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for conditional rendering based on auth status
export function useAuthGuard(requireAuth: boolean = true) {
  const { isLoading, isInitialized, isAuthenticated } = useAuthStatus();

  const shouldShow = isInitialized && !isLoading && (
    requireAuth ? isAuthenticated : !isAuthenticated
  );

  const shouldRedirect = isInitialized && !isLoading && (
    (requireAuth && !isAuthenticated) || (!requireAuth && isAuthenticated)
  );

  return {
    shouldShow,
    shouldRedirect,
    isLoading: !isInitialized || isLoading,
    isAuthenticated,
  };
}"