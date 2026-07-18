import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthInitializer } from './components/AuthInitializer';
import { RouteGuard } from './components/RouteGuard';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

// Instantiate the TanStack Query client for fetching state management
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Root Dashboard Route */}
            <Route
              path="/"
              element={
                <RouteGuard allowedRoles={['admin', 'cashier']}>
                  <Dashboard />
                </RouteGuard>
              }
            />

            {/* Catch-all redirect to Root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
