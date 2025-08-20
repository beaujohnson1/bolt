/**
 * Emergency OAuth Bridge - Ultra-Fast Token Detection & Synchronization
 * Critical fix for OAuth popup communication failures
 */

interface TokenDetectionResult {
  method: string;
  found: boolean;
  token?: string;
  timestamp: number;
}

interface EmergencyState {
  isPolling: boolean;
  detectionMethods: number;
  confirmations: number;
  lastSync: number;
  errorCount: number;
}

export class EmergencyOAuthBridge {
  private static instance: EmergencyOAuthBridge;
  private pollingInterval: NodeJS.Timeout | null = null;
  private state: EmergencyState = {
    isPolling: false,
    detectionMethods: 0,
    confirmations: 0,
    lastSync: 0,
    errorCount: 0
  };
  
  // Ultra-fast 25ms polling for critical responsiveness
  private readonly POLLING_INTERVAL = 25;
  private readonly MAX_POLLING_CYCLES = 120; // 3 seconds max
  private readonly REQUIRED_CONFIRMATIONS = 2;
  private readonly EMERGENCY_SYNC_THRESHOLD = 100; // 100ms
  
  private eventListeners: Map<string, Function[]> = new Map();
  
  private constructor() {
    this.initializeEmergencyBridge();
  }
  
  public static getInstance(): EmergencyOAuthBridge {
    if (!EmergencyOAuthBridge.instance) {
      EmergencyOAuthBridge.instance = new EmergencyOAuthBridge();
    }
    return EmergencyOAuthBridge.instance;
  }
  
  private initializeEmergencyBridge(): void {
    // Initialize emergency event listeners
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    window.addEventListener('message', this.handlePostMessage.bind(this));
    
    // Emergency beacon detection
    this.setupBeaconDetection();
    
    console.log('[EmergencyOAuthBridge] Initialized with 25ms polling capability');
  }
  
  /**
   * Start ultra-fast token detection with multi-method verification
   */
  public startEmergencyDetection(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.state.isPolling) {
        console.log('[EmergencyOAuthBridge] Detection already active');
        return;
      }
      
      this.state.isPolling = true;
      this.state.detectionMethods = 0;
      this.state.confirmations = 0;
      this.state.errorCount = 0;
      
      let cycleCount = 0;
      const startTime = Date.now();
      
      console.log('[EmergencyOAuthBridge] Starting ultra-fast detection (25ms intervals)');
      
      this.pollingInterval = setInterval(() => {
        cycleCount++;
        
        try {
          const detectionResults = this.performMultiMethodDetection();
          const validResults = detectionResults.filter(r => r.found);
          
          if (validResults.length >= this.REQUIRED_CONFIRMATIONS) {
            const token = validResults[0].token!;
            console.log(`[EmergencyOAuthBridge] Token detected in ${cycleCount} cycles (${Date.now() - startTime}ms)`);
            
            this.stopDetection();
            this.triggerEmergencySync(token);
            resolve(token);
            return;
          }
          
          // Emergency timeout protection
          if (cycleCount >= this.MAX_POLLING_CYCLES) {
            console.log('[EmergencyOAuthBridge] Max cycles reached, switching to emergency mode');
            this.stopDetection();
            this.performEmergencyRecovery();
            reject(new Error('Emergency detection timeout'));
          }
          
        } catch (error) {
          this.state.errorCount++;
          console.error('[EmergencyOAuthBridge] Detection error:', error);
          
          if (this.state.errorCount > 5) {
            this.stopDetection();
            reject(error);
          }
        }
      }, this.POLLING_INTERVAL);
    });
  }
  
  /**
   * Multi-method token detection across all storage formats
   */
  private performMultiMethodDetection(): TokenDetectionResult[] {
    const results: TokenDetectionResult[] = [];
    const timestamp = Date.now();
    
    // Method 1: LocalStorage detection
    try {
      const localToken = localStorage.getItem('ebay_access_token') || 
                        localStorage.getItem('ebayAccessToken') ||
                        localStorage.getItem('oauth_token');
      
      results.push({
        method: 'localStorage',
        found: !!localToken,
        token: localToken || undefined,
        timestamp
      });
    } catch (e) {
      results.push({ method: 'localStorage', found: false, timestamp });
    }
    
    // Method 2: SessionStorage detection
    try {
      const sessionToken = sessionStorage.getItem('ebay_access_token') ||
                          sessionStorage.getItem('ebayAccessToken') ||
                          sessionStorage.getItem('oauth_token');
      
      results.push({
        method: 'sessionStorage',
        found: !!sessionToken,
        token: sessionToken || undefined,
        timestamp
      });
    } catch (e) {
      results.push({ method: 'sessionStorage', found: false, timestamp });
    }
    
    // Method 3: URL parameter detection
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('access_token') || 
                      urlParams.get('token') ||
                      urlParams.get('oauth_token');
      
      results.push({
        method: 'urlParams',
        found: !!urlToken,
        token: urlToken || undefined,
        timestamp
      });
    } catch (e) {
      results.push({ method: 'urlParams', found: false, timestamp });
    }
    
    // Method 4: Hash fragment detection
    try {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const hashToken = hashParams.get('access_token') ||
                       hashParams.get('token');
      
      results.push({
        method: 'hashFragment',
        found: !!hashToken,
        token: hashToken || undefined,
        timestamp
      });
    } catch (e) {
      results.push({ method: 'hashFragment', found: false, timestamp });
    }
    
    // Method 5: Global window detection
    try {
      const windowToken = (window as any).ebayAccessToken ||
                         (window as any).oauthToken ||
                         (window as any).accessToken;
      
      results.push({
        method: 'windowGlobal',
        found: !!windowToken,
        token: windowToken || undefined,
        timestamp
      });
    } catch (e) {
      results.push({ method: 'windowGlobal', found: false, timestamp });
    }
    
    // Method 6: Emergency beacon detection
    try {
      const beaconElement = document.querySelector('[data-oauth-token]') as HTMLElement;
      const beaconToken = beaconElement?.dataset?.oauthToken;
      
      results.push({
        method: 'emergencyBeacon',
        found: !!beaconToken,
        token: beaconToken || undefined,
        timestamp
      });
    } catch (e) {
      results.push({ method: 'emergencyBeacon', found: false, timestamp });
    }
    
    return results;
  }
  
  /**
   * Emergency synchronization when tokens detected but not connected
   */
  private triggerEmergencySync(token: string): void {
    console.log('[EmergencyOAuthBridge] Triggering emergency synchronization');
    
    try {
      // Sync across all storage methods
      localStorage.setItem('ebay_access_token', token);
      sessionStorage.setItem('ebay_access_token', token);
      (window as any).ebayAccessToken = token;
      
      // Create emergency beacon
      this.createEmergencyBeacon(token);
      
      // Force refresh mechanisms
      this.dispatchEmergencyEvents(token);
      
      // Update state
      this.state.lastSync = Date.now();
      this.state.confirmations++;
      
      console.log('[EmergencyOAuthBridge] Emergency sync completed');
      
    } catch (error) {
      console.error('[EmergencyOAuthBridge] Emergency sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Force refresh mechanisms for immediate state updates
   */
  private dispatchEmergencyEvents(token: string): void {
    const events = [
      'ebay-auth-success',
      'oauth-token-detected',
      'auth-state-change',
      'emergency-token-sync',
      'token-verification-complete'
    ];
    
    events.forEach(eventName => {
      try {
        const event = new CustomEvent(eventName, {
          detail: { 
            token, 
            timestamp: Date.now(),
            source: 'EmergencyOAuthBridge',
            method: 'emergency-sync'
          }
        });
        window.dispatchEvent(event);
        
        // Also trigger on document
        document.dispatchEvent(event);
        
      } catch (error) {
        console.error(`[EmergencyOAuthBridge] Failed to dispatch ${eventName}:`, error);
      }
    });
    
    // Trigger listeners
    this.notifyListeners('token-detected', { token });
    this.notifyListeners('emergency-sync', { token });
  }
  
  /**
   * Setup emergency beacon detection
   */
  private setupBeaconDetection(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.hasAttribute('data-oauth-token')) {
              console.log('[EmergencyOAuthBridge] Beacon detected via mutation observer');
              const token = element.getAttribute('data-oauth-token');
              if (token) {
                this.triggerEmergencySync(token);
              }
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-oauth-token']
    });
  }
  
  /**
   * Create emergency beacon for cross-window communication
   */
  private createEmergencyBeacon(token: string): void {
    const beacon = document.createElement('div');
    beacon.setAttribute('data-oauth-token', token);
    beacon.setAttribute('data-timestamp', Date.now().toString());
    beacon.style.display = 'none';
    beacon.id = 'emergency-oauth-beacon';
    
    // Remove existing beacon
    const existing = document.getElementById('emergency-oauth-beacon');
    if (existing) {
      existing.remove();
    }
    
    document.body.appendChild(beacon);
  }
  
  /**
   * Handle storage change events
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key?.includes('token') || event.key?.includes('oauth')) {
      console.log('[EmergencyOAuthBridge] Storage change detected:', event.key);
      
      if (event.newValue && this.state.isPolling) {
        this.triggerEmergencySync(event.newValue);
      }
    }
  }
  
  /**
   * Handle post message events
   */
  private handlePostMessage(event: MessageEvent): void {
    if (event.data?.type === 'OAUTH_SUCCESS' || event.data?.token) {
      console.log('[EmergencyOAuthBridge] PostMessage token detected');
      const token = event.data.token || event.data.access_token;
      
      if (token && this.state.isPolling) {
        this.triggerEmergencySync(token);
      }
    }
  }
  
  /**
   * Emergency recovery when standard detection fails
   */
  private performEmergencyRecovery(): void {
    console.log('[EmergencyOAuthBridge] Performing emergency recovery');
    
    // Try alternative detection methods
    setTimeout(() => {
      const results = this.performMultiMethodDetection();
      const validResult = results.find(r => r.found);
      
      if (validResult?.token) {
        console.log('[EmergencyOAuthBridge] Recovery successful');
        this.triggerEmergencySync(validResult.token);
        this.notifyListeners('recovery-success', { token: validResult.token });
      } else {
        console.log('[EmergencyOAuthBridge] Recovery failed - no token found');
        this.notifyListeners('recovery-failed', {});
      }
    }, 500);
  }
  
  /**
   * Stop detection polling
   */
  private stopDetection(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.state.isPolling = false;
  }
  
  /**
   * Add event listener
   */
  public addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
  
  /**
   * Remove event listener
   */
  public removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Notify event listeners
   */
  private notifyListeners(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EmergencyOAuthBridge] Listener error for ${event}:`, error);
      }
    });
  }
  
  /**
   * Get current state for monitoring
   */
  public getState(): EmergencyState {
    return { ...this.state };
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopDetection();
    this.eventListeners.clear();
    window.removeEventListener('storage', this.handleStorageChange);
    window.removeEventListener('message', this.handlePostMessage);
  }
}

// Export singleton instance
export const emergencyOAuthBridge = EmergencyOAuthBridge.getInstance();