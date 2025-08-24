import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { UserProfileResponse, ProfileUpdateInput } from '@/lib/validations';
import { usersService } from '@/services';

interface UserState {
  // User data
  user: UserProfileResponse | null;
  isLoading: boolean;
  error: string | null;
  
  // Session state
  isAuthenticated: boolean;
  isInitialized: boolean;
  
  // Actions
  setUser: (user: UserProfileResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Async actions
  fetchCurrentUser: () => Promise<void>;
  updateProfile: (data: ProfileUpdateInput) => Promise<void>;
  clearUser: () => void;
  
  // Privacy controls
  toggleDiscoverability: () => Promise<void>;
  updateDiscoveryRange: (range: number) => Promise<void>;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
        isInitialized: false,
        
        // Synchronous actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
        setInitialized: (isInitialized) => set({ isInitialized }),
        
        // Async actions
        fetchCurrentUser: async () => {
          try {
            set({ isLoading: true, error: null });
            const user = await usersService.getCurrentUser();
            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false,
              isInitialized: true 
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
            set({ 
              error: errorMessage, 
              isLoading: false,
              isAuthenticated: false,
              user: null,
              isInitialized: true
            });
          }
        },
        
        updateProfile: async (data) => {
          try {
            set({ isLoading: true, error: null });
            const updatedUser = await usersService.updateProfile(data);
            set({ 
              user: updatedUser, 
              isLoading: false 
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
            set({ 
              error: errorMessage, 
              isLoading: false 
            });
            throw error; // Re-throw for component handling
          }
        },
        
        clearUser: () => set({ 
          user: null, 
          isAuthenticated: false, 
          error: null,
          isInitialized: true
        }),
        
        // Privacy controls
        toggleDiscoverability: async () => {
          const { user } = get();
          if (!user) return;
          
          try {
            set({ isLoading: true, error: null });
            await usersService.toggleDiscoverable(!user.isDiscoverable);
            set({ 
              user: { ...user, isDiscoverable: !user.isDiscoverable },
              isLoading: false 
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to toggle discoverability';
            set({ 
              error: errorMessage, 
              isLoading: false 
            });
            throw error;
          }
        },
        
        updateDiscoveryRange: async (range) => {
          const { user } = get();
          if (!user) return;
          
          try {
            set({ isLoading: true, error: null });
            await usersService.updateDiscoveryRange(range);
            set({ 
              user: { ...user, discoveryRange: range },
              isLoading: false 
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update discovery range';
            set({ 
              error: errorMessage, 
              isLoading: false 
            });
            throw error;
          }
        },
      }),
      {
        name: 'user-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'UserStore' }
  )
);

// Selectors for commonly used state combinations
export const useUser = () => useUserStore((state) => state.user);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const useUserLoading = () => useUserStore((state) => state.isLoading);
export const useUserError = () => useUserStore((state) => state.error);
export const useIsUserInitialized = () => useUserStore((state) => state.isInitialized);

// Actions selectors
export const useUserActions = () => useUserStore((state) => ({
  setUser: state.setUser,
  setLoading: state.setLoading,
  setError: state.setError,
  setAuthenticated: state.setAuthenticated,
  setInitialized: state.setInitialized,
  fetchCurrentUser: state.fetchCurrentUser,
  updateProfile: state.updateProfile,
  clearUser: state.clearUser,
  toggleDiscoverability: state.toggleDiscoverability,
  updateDiscoveryRange: state.updateDiscoveryRange,
}));