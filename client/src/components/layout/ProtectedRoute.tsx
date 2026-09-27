import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.js';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isRestoring } = useAuthStore();
  const location = useLocation();

  if (isRestoring) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7C5CFF] to-[#22D3EE] flex items-center justify-center shadow-lg animate-pulse">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
        <p className="text-sm font-medium text-[var(--text-muted)]">Restoring session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
