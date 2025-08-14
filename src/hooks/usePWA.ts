import { useState, useEffect } from 'react';

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAHookReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  installApp: () => Promise<void>;
  dismissInstall: () => void;
  updateAvailable: boolean;
  updateApp: () => Promise<void>;
}

export const usePWA = (): PWAHookReturn => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('✅ [PWA] Service worker registered:', registration);
          setServiceWorkerRegistration(registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 [PWA] New service worker available');
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ [PWA] Service worker registration failed:', error);
        });
    }
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('📱 [PWA] Install prompt triggered');
      e.preventDefault();
      setDeferredPrompt(e as any);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('✅ [PWA] App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 [PWA] App is online');
      setIsOffline(false);
    };

    const handleOffline = () => {
      console.log('📱 [PWA] App is offline');
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check if app is already installed
  useEffect(() => {
    const checkInstallStatus = () => {
      // Check if running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');
      
      if (isStandalone) {
        console.log('📱 [PWA] App is running in standalone mode');
        setIsInstalled(true);
      }
    };

    checkInstallStatus();
  }, []);

  const installApp = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.warn('⚠️ [PWA] No install prompt available');
      return;
    }

    try {
      console.log('📱 [PWA] Showing install prompt...');
      await deferredPrompt.prompt();
      
      const choice = await deferredPrompt.userChoice;
      console.log('📱 [PWA] User choice:', choice.outcome);
      
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('❌ [PWA] Install prompt failed:', error);
    }
  };

  const dismissInstall = (): void => {
    console.log('📱 [PWA] Install prompt dismissed');
    setIsInstallable(false);
    setDeferredPrompt(null);
  };

  const updateApp = async (): Promise<void> => {
    if (!serviceWorkerRegistration) {
      console.warn('⚠️ [PWA] No service worker registration available');
      return;
    }

    try {
      console.log('🔄 [PWA] Updating app...');
      
      // Skip waiting and activate new service worker
      if (serviceWorkerRegistration.waiting) {
        serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Reload the page to use new service worker
      window.location.reload();
    } catch (error) {
      console.error('❌ [PWA] App update failed:', error);
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOffline,
    installApp,
    dismissInstall,
    updateAvailable,
    updateApp
  };
};

// Hook for managing offline storage
export const useOfflineStorage = () => {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('indexedDB' in window);
  }, []);

  const saveForLater = async (key: string, data: any): Promise<void> => {
    if (!isSupported) {
      console.warn('⚠️ [OFFLINE] IndexedDB not supported');
      return;
    }

    try {
      const request = indexedDB.open('eBayAI', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('offlineData')) {
          db.createObjectStore('offlineData', { keyPath: 'key' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineData'], 'readwrite');
        const store = transaction.objectStore('offlineData');
        
        store.put({
          key,
          data,
          timestamp: Date.now()
        });
        
        console.log('💾 [OFFLINE] Data saved for later:', key);
      };
    } catch (error) {
      console.error('❌ [OFFLINE] Failed to save data:', error);
    }
  };

  const loadSavedData = async (key: string): Promise<any> => {
    if (!isSupported) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('eBayAI', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineData'], 'readonly');
        const store = transaction.objectStore('offlineData');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? result.data : null);
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  };

  const clearSavedData = async (key: string): Promise<void> => {
    if (!isSupported) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('eBayAI', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineData'], 'readwrite');
        const store = transaction.objectStore('offlineData');
        const deleteRequest = store.delete(key);
        
        deleteRequest.onsuccess = () => {
          console.log('🗑️ [OFFLINE] Data cleared:', key);
          resolve();
        };
        
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  };

  return {
    isSupported,
    saveForLater,
    loadSavedData,
    clearSavedData
  };
};

// Hook for managing background sync
export const useBackgroundSync = () => {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype);
  }, []);

  const registerBackgroundSync = async (tag: string): Promise<void> => {
    if (!isSupported) {
      console.warn('⚠️ [SYNC] Background sync not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log('🔄 [SYNC] Background sync registered:', tag);
    } catch (error) {
      console.error('❌ [SYNC] Failed to register background sync:', error);
    }
  };

  return {
    isSupported,
    registerBackgroundSync
  };
};