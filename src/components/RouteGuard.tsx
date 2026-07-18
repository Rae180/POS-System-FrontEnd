import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'cashier')[];
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]" id="auth-loader">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1b1b18] border-t-transparent dark:border-[#eeeeec] dark:border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page and keep the current location in state so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
    const userRoles = user.roles?.map((r) => r.name.toLowerCase()) || [];
    const hasAllowedRole = allowedRoles.some((role) => userRoles.includes(role.toLowerCase()));

    if (!hasAllowedRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-6" id="access-denied">
          <div className="max-w-md w-full bg-white dark:bg-[#161615] rounded-xl shadow-lg border border-gray-200 dark:border-[#3E3E3A] p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDEC] mb-2">Access Denied</h1>
            <p className="text-gray-600 dark:text-[#A1A09A] mb-6">
              You do not have permission to access this screen. Please contact your administrator if you believe this is an error.
            </p>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#1b1b18] hover:bg-black text-white dark:bg-[#eeeeec] dark:hover:bg-white dark:text-[#1C1C1A] text-sm font-semibold rounded-md transition shadow-sm"
              id="back-btn"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
