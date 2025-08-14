import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface PWAInstallBannerProps {
  showOn?: 'mobile' | 'desktop' | 'all';
  position?: 'top' | 'bottom';
  persistent?: boolean;
}

const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  showOn = 'all',
  position = 'bottom',
  persistent = false
}) => {
  const {
    isInstallable,
    isInstalled,
    isOffline,
    installApp,
    dismissInstall,
    updateAvailable,
    updateApp
  } = usePWA();

  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                            (window.innerWidth <= 768);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check localStorage for dismissal
  useEffect(() => {
    const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
    setDismissed(isDismissed && !persistent);
  }, [persistent]);

  const handleDismiss = () => {
    setDismissed(true);
    dismissInstall();
    if (!persistent) {
      localStorage.setItem('pwa-install-dismissed', 'true');
    }
  };

  const handleInstall = async () => {
    try {
      await installApp();
      setDismissed(true);
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateApp();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  // Determine if banner should show based on device type
  const shouldShowForDevice = () => {
    if (showOn === 'mobile') return isMobile;
    if (showOn === 'desktop') return !isMobile;
    return true; // 'all'
  };

  // Don't show if dismissed, wrong device type, or already installed (unless update available)
  if (dismissed || !shouldShowForDevice() || (isInstalled && !updateAvailable && !isOffline)) {
    return null;
  }

  // Show update banner if update is available
  if (updateAvailable) {
    return (
      <div className={`fixed left-4 right-4 z-50 ${
        position === 'top' ? 'top-4' : 'bottom-4'
      }`}>
        <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 flex items-center space-x-3 animate-pulse">
          <div className="flex-shrink-0">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              🚀 New version available!
            </p>
            <p className="text-xs opacity-90">
              Update now for the latest features and improvements
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleUpdate}
              className="bg-white text-blue-600 px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Update
            </button>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show offline banner
  if (isOffline) {
    return (
      <div className={`fixed left-4 right-4 z-50 ${
        position === 'top' ? 'top-4' : 'bottom-4'
      }`}>
        <div className="bg-orange-500 text-white rounded-lg shadow-lg p-4 flex items-center space-x-3">
          <div className="flex-shrink-0">
            <WifiOff className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              📱 You're offline
            </p>
            <p className="text-xs opacity-90">
              Don't worry! You can still capture photos and they'll sync when you're back online
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Show install banner
  if (isInstallable) {
    return (
      <div className={`fixed left-4 right-4 z-50 ${
        position === 'top' ? 'top-4' : 'bottom-4'
      }`}>
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {isMobile ? (
                <Smartphone className="w-6 h-6" />
              ) : (
                <Download className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold mb-1">
                📱 Install eBay AI App
              </h3>
              <p className="text-xs opacity-90 mb-3">
                {isMobile 
                  ? 'Add to your home screen for the best mobile experience with camera access and offline support!'
                  : 'Install as a desktop app for faster access and better performance!'
                }
              </p>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-2 gap-2 text-xs opacity-90 mb-3">
                <div className="flex items-center space-x-1">
                  <Smartphone className="w-3 h-3" />
                  <span>Camera access</span>
                </div>
                <div className="flex items-center space-x-1">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline mode</span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleInstall}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors flex items-center space-x-1 touch-target"
                >
                  <Download className="w-4 h-4" />
                  <span>{isMobile ? 'Add to Home Screen' : 'Install App'}</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-white/80 hover:text-white transition-colors px-2 py-2 rounded-lg touch-target"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Compact version for header/navigation
export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, installApp } = usePWA();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                            (window.innerWidth <= 768);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isInstallable) return null;

  return (
    <button
      onClick={installApp}
      className={`inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${className}`}
      title={isMobile ? 'Add to Home Screen' : 'Install App'}
    >
      {isMobile ? (
        <Smartphone className="w-4 h-4" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">
        {isMobile ? 'Install' : 'Install App'}
      </span>
    </button>
  );
};

// Status indicator for connection and app state
export const PWAStatusIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isOffline, isInstalled, updateAvailable } = usePWA();

  return (
    <div className={`flex items-center space-x-1 text-xs ${className}`}>
      {/* Connection status */}
      <div className="flex items-center space-x-1">
        {isOffline ? (
          <WifiOff className="w-3 h-3 text-orange-500" />
        ) : (
          <Wifi className="w-3 h-3 text-green-500" />
        )}
        <span className={isOffline ? 'text-orange-600' : 'text-green-600'}>
          {isOffline ? 'Offline' : 'Online'}
        </span>
      </div>

      {/* App status */}
      {isInstalled && (
        <div className="flex items-center space-x-1 ml-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-blue-600">PWA</span>
        </div>
      )}

      {/* Update available */}
      {updateAvailable && (
        <div className="flex items-center space-x-1 ml-2">
          <RefreshCw className="w-3 h-3 text-orange-500" />
          <span className="text-orange-600">Update</span>
        </div>
      )}
    </div>
  );
};

export default PWAInstallBanner;