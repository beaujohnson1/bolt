import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallback from './components/AuthCallback';
import LandingPage from './pages/LandingPage';
import AppDashboard from './pages/AppDashboard';
import PhotoCapture from './pages/PhotoCapture';
import ItemDetails from './pages/ItemDetails';
import ListingPreview from './pages/ListingPreview';
import ConnectionTestPage from './pages/ConnectionTestPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/test-connection" element={<ConnectionTestPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/capture"
            element={
              <ProtectedRoute>
                <PhotoCapture />
              </ProtectedRoute>
            }
          />
          <Route
            path="/details/:itemId"
            element={
              <ProtectedRoute>
                <ItemDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/preview/:itemId"
            element={
              <ProtectedRoute>
                <ListingPreview />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;