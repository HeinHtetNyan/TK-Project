import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Voucher from './pages/Voucher';
import Payment from './pages/Payment';
import History from './pages/History';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Spending from './pages/Spending';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { startSyncEngine, stopSyncEngine, syncAll } from './services/syncService';
import { useNetworkStatus } from './hooks/useNetworkStatus';

/**
 * Inner component so that useNetworkStatus (which uses hooks) works inside
 * the AuthProvider tree if needed, while App() stays a plain component.
 */
function SyncBootstrap() {
  useNetworkStatus({
    onReconnect: () => {
      // Immediately flush the queue whenever we come back online
      syncAll();
    },
  });

  useEffect(() => {
    startSyncEngine();
    return () => stopSyncEngine();
  }, []);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <SyncBootstrap />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/voucher"
            element={
              <ProtectedRoute>
                <Voucher />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute adminOnly={true}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute adminOnly={true}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/spending"
            element={
              <ProtectedRoute adminOnly={true}>
                <Spending />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
