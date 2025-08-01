import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AppDashboard from './pages/AppDashboard';
import PhotoCapture from './pages/PhotoCapture';
import ItemDetails from './pages/ItemDetails';
import ListingPreview from './pages/ListingPreview';
import AuthProvider from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={
              <ProtectedRoute>
                <AppDashboard />
              </ProtectedRoute>
            } />
            <Route path="/capture" element={
              <ProtectedRoute>
                <PhotoCapture />
              </ProtectedRoute>
            } />
            <Route path="/details/:itemId" element={
              <ProtectedRoute>
                <ItemDetails />
              </ProtectedRoute>
            } />
            <Route path="/preview/:itemId" element={
              <ProtectedRoute>
                <ListingPreview />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
