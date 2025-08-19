import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import './styles/mobile.css';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallback from './components/AuthCallback';
import EbayAuthCallback from './components/EbayAuthCallback';
import LandingPage from './pages/LandingPage';
import AppDashboard from './pages/AppDashboard';
import PhotoCapture from './pages/PhotoCapture';
import ItemDetails from './pages/ItemDetails';
import ListingPreview from './pages/ListingPreview';
import ConnectionTestPage from './pages/ConnectionTestPage';
import EnvGuard from './components/EnvGuard';
import AutoPromotionDashboard from './components/AutoPromotionDashboard';
import AuthConnectivityTest from './pages/AuthConnectivityTest'; // <--- This import is now valid
import AIInsightsDashboard from './pages/AIInsightsDashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import SupabaseTest from './pages/SupabaseTest';
import NetworkTest from './pages/NetworkTest';
import AIAccuracyTest from './pages/AIAccuracyTest';
import ManualTokenExchange from './pages/ManualTokenExchange';
import EbayTokenTest from './pages/EbayTokenTest';
import EbayAuthTest from './pages/EbayAuthTest';
import { debugEbayAuth } from './utils/debugEbayAuth';

function App() {
  // Make debug function available globally
  React.useEffect(() => {
    (window as any).debugEbayAuth = debugEbayAuth;
    console.log('🔧 [DEBUG] debugEbayAuth() function now available in console');
    console.log('🔧 [DEBUG] Use debugEbayAuth() to check token storage');
  }, []);

  return (
    <AuthProvider>
      <Router>
        <EnvGuard>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/ebay/callback" element={<EbayAuthCallback />} />
            <Route path="/test-connection" element={<ConnectionTestPage />} />
            <Route path="/manual-token-exchange" element={<ManualTokenExchange />} />
            <Route path="/ebay-token-test" element={<EbayTokenTest />} />
            <Route path="/auth-test" element={<AuthConnectivityTest />} /> {/* <--- This route is now valid */}
            <Route path="/ebay-auth-test" element={<EbayAuthTest />} />
            <Route path="/supabase-test" element={<SupabaseTest />} />
            <Route path="/network-test" element={<NetworkTest />} />
            <Route path="/ai-accuracy-test" element={<AIAccuracyTest />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route 
              path="/ai-insights" 
              element={
                <ProtectedRoute>
                  <AIInsightsDashboard />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/admin/keywords"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-50 py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <AutoPromotionDashboard />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
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
        </EnvGuard>
      </Router>
    </AuthProvider>
  );
}

export default App;
