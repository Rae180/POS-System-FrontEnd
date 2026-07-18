import React, { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import api from '../lib/axios';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const { token, setAuth, clearAuth, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      if (!token) {
        clearAuth();
        setLoading(false);
        return;
      }

      try {
        // Fetch current user from /api/me to re-hydrate roles and account state
        const response = await api.get('/me');
        if (response.data?.success && response.data?.user) {
          // Re-hydrate the auth state with the token and fetched user
          setAuth(token, response.data.user);
        } else {
          clearAuth();
        }
      } catch (error) {
        console.error('Failed to rehydrate auth session:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [token, setAuth, clearAuth, setLoading]);

  return <>{children}</>;
};
