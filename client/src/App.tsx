import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/auth.js';
import { useThemeStore } from './stores/ui.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { AppShell } from './components/layout/AppShell.js';
import { Login } from './pages/auth/Login.js';
import { Register } from './pages/auth/Register.js';
import { TasksPage } from './pages/tasks/TasksPage.js';
import { VoicePage } from './pages/voice/VoicePage.js';
import { HistoryPage } from './pages/history/HistoryPage.js';
import { SettingsPage } from './pages/settings/SettingsPage.js';
import { ProfilePage } from './pages/profile/ProfilePage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

export const App: React.FC = () => {
  const { restoreSession } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    restoreSession();
  }, [initTheme, restoreSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/tasks" replace />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="voice" element={<VoicePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>


          {/* Root and Catch-all */}
          <Route path="/" element={<Navigate to="/app/tasks" replace />} />
          <Route path="*" element={<Navigate to="/app/tasks" replace />} />
        </Routes>

        <Toaster richColors position="bottom-right" closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  );
};
