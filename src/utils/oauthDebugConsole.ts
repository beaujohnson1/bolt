// OAuth Debug Console - Always-visible debugging for OAuth flow
// This console helps users and developers see exactly what's happening during OAuth

export interface DebugLog {
  timestamp: number;
  message: string;
  level: 'info' | 'error' | 'success' | 'warning';
  category: string;
}

export class OAuthDebugConsole {
  private debugPanel: HTMLElement | null = null;
  private logs: DebugLog[] = [];
  private isVisible: boolean = false;
  private statusElement: HTMLElement | null = null;

  constructor() {
    this.loadPersistedLogs();
    this.createDebugPanel();
    this.setupKeyboardShortcut();
  }

  private loadPersistedLogs(): void {
    try {
      const persistedLogs = localStorage.getItem('oauth_debug_logs');
      if (persistedLogs) {
        this.logs = JSON.parse(persistedLogs).slice(-50); // Keep last 50 logs
      }
    } catch (error) {
      console.warn('Failed to load persisted OAuth debug logs:', error);
    }
  }

  private persistLogs(): void {
    try {
      localStorage.setItem('oauth_debug_logs', JSON.stringify(this.logs.slice(-50)));
    } catch (error) {
      console.warn('Failed to persist OAuth debug logs:', error);
    }
  }

  private createDebugPanel(): void {
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'oauth-debug-console';
    this.debugPanel.innerHTML = `
      <style>
        #oauth-debug-console {
          position: fixed;
          top: 10px;
          right: 10px;
          width: 400px;
          max-height: 500px;
          background: rgba(0, 0, 0, 0.9);
          color: #00ff00;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          border: 2px solid #333;
          border-radius: 8px;
          z-index: 10000;
          display: none;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        #oauth-debug-console.visible {
          display: flex;
        }
        
        .debug-header {
          background: #333;
          color: #fff;
          padding: 8px 12px;
          font-weight: bold;
          border-bottom: 1px solid #555;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .debug-status {
          padding: 8px 12px;
          background: #1a1a1a;
          border-bottom: 1px solid #555;
          color: #ffff00;
          font-weight: bold;
        }
        
        .debug-logs {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          max-height: 300px;
        }
        
        .debug-log {
          margin: 2px 0;
          padding: 2px 4px;
          border-radius: 2px;
        }
        
        .debug-log.info { color: #00ff00; }
        .debug-log.error { color: #ff4444; background: rgba(255, 68, 68, 0.1); }
        .debug-log.success { color: #44ff44; background: rgba(68, 255, 68, 0.1); }
        .debug-log.warning { color: #ffaa00; background: rgba(255, 170, 0, 0.1); }
        
        .debug-controls {
          padding: 8px;
          border-top: 1px solid #555;
          display: flex;
          gap: 8px;
        }
        
        .debug-btn {
          background: #444;
          color: #fff;
          border: 1px solid #666;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
        }
        
        .debug-btn:hover {
          background: #555;
        }
        
        .debug-toggle {
          position: fixed;
          top: 10px;
          right: 10px;
          background: #ff6600;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          font-weight: bold;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .debug-toggle:hover {
          background: #ff7722;
        }
      </style>
      
      <div class="debug-header">
        <span>🔍 OAuth Debug Console</span>
        <button onclick="window.oauthDebugConsole?.hide()" style="background: none; border: none; color: #fff; cursor: pointer;">✕</button>
      </div>
      
      <div class="debug-status" id="oauth-debug-status">
        Status: Initializing...
      </div>
      
      <div class="debug-logs" id="oauth-debug-logs">
        <div class="debug-log info">🚀 OAuth Debug Console initialized</div>
        <div class="debug-log info">💡 Press Ctrl+Shift+D to toggle console</div>
      </div>
      
      <div class="debug-controls">
        <button class="debug-btn" onclick="window.oauthDebugConsole?.clearLogs()">Clear</button>
        <button class="debug-btn" onclick="window.oauthDebugConsole?.runDiagnostics()">Diagnostics</button>
        <button class="debug-btn" onclick="window.oauthDebugConsole?.exportLogs()">Export</button>
        <button class="debug-btn" onclick="window.oauthDebugConsole?.clearCache()">Clear Cache</button>
      </div>
    `;

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'debug-toggle';
    toggleButton.textContent = '🔍 OAuth Debug';
    toggleButton.onclick = () => this.toggle();

    document.body.appendChild(toggleButton);
    document.body.appendChild(this.debugPanel);

    this.statusElement = document.getElementById('oauth-debug-status');

    // Make console globally accessible
    (window as any).oauthDebugConsole = this;

    // Load existing logs
    this.refreshLogsDisplay();
  }

  private setupKeyboardShortcut(): void {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  public show(): void {
    if (this.debugPanel) {
      this.debugPanel.classList.add('visible');
      this.isVisible = true;
    }
  }

  public hide(): void {
    if (this.debugPanel) {
      this.debugPanel.classList.remove('visible');
      this.isVisible = false;
    }
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public log(message: string, level: 'info' | 'error' | 'success' | 'warning' = 'info', category: string = 'general'): void {
    const timestamp = Date.now();
    const timeStr = new Date(timestamp).toLocaleTimeString();
    
    const logEntry: DebugLog = {
      timestamp,
      message,
      level,
      category
    };

    this.logs.push(logEntry);
    this.persistLogs();

    // Also log to browser console with enhanced formatting
    const consoleMessage = `🔍 [${category.toUpperCase()}] ${message}`;
    switch (level) {
      case 'error':
        console.error(consoleMessage);
        break;
      case 'warning':
        console.warn(consoleMessage);
        break;
      case 'success':
        console.log(`%c${consoleMessage}`, 'color: #44ff44; font-weight: bold;');
        break;
      default:
        console.log(consoleMessage);
    }

    this.refreshLogsDisplay();
  }

  public updateStatus(status: string): void {
    if (this.statusElement) {
      this.statusElement.textContent = `Status: ${status}`;
    }
    this.log(`Status: ${status}`, 'info', 'status');
  }

  private refreshLogsDisplay(): void {
    const logsContainer = document.getElementById('oauth-debug-logs');
    if (!logsContainer) return;

    const logsHTML = this.logs.slice(-20).map(log => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString();
      return `<div class="debug-log ${log.level}">[${timeStr}] [${log.category.toUpperCase()}] ${log.message}</div>`;
    }).join('');

    logsContainer.innerHTML = logsHTML + 
      '<div class="debug-log info">💡 Press Ctrl+Shift+D to toggle console</div>';
    
    // Auto-scroll to bottom
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  public clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('oauth_debug_logs');
    this.refreshLogsDisplay();
    this.log('Debug logs cleared', 'info', 'system');
  }

  public exportLogs(): void {
    const logsText = this.logs.map(log => {
      const timeStr = new Date(log.timestamp).toISOString();
      return `[${timeStr}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}`;
    }).join('\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oauth-debug-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.log('Debug logs exported', 'success', 'system');
  }

  public async runDiagnostics(): Promise<void> {
    this.log('🔍 Running OAuth diagnostics...', 'info', 'diagnostics');
    this.updateStatus('Running diagnostics...');

    const diagnostics = [
      this.checkLocalStorage(),
      this.checkNetworkConnectivity(),
      this.checkBrowserCompatibility(),
      this.checkPopupCapability(),
      this.checkDeploymentVersion()
    ];

    const results = await Promise.allSettled(diagnostics);
    
    results.forEach((result, index) => {
      const testNames = ['localStorage', 'network', 'browser', 'popup', 'deployment'];
      const testName = testNames[index];
      
      if (result.status === 'fulfilled') {
        this.log(`✅ ${testName}: ${result.value}`, 'success', 'diagnostics');
      } else {
        this.log(`❌ ${testName}: ${result.reason}`, 'error', 'diagnostics');
      }
    });

    this.updateStatus('Diagnostics complete');
  }

  private async checkLocalStorage(): Promise<string> {
    try {
      const testKey = 'oauth_debug_test';
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved !== 'test') {
        throw new Error('localStorage read/write failed');
      }

      const oauthTokens = localStorage.getItem('ebay_oauth_tokens');
      const manualToken = localStorage.getItem('ebay_manual_token');
      
      return `Working. OAuth tokens: ${!!oauthTokens}, Manual token: ${!!manualToken}`;
    } catch (error) {
      throw new Error(`localStorage failed: ${error.message}`);
    }
  }

  private async checkNetworkConnectivity(): Promise<string> {
    try {
      const response = await fetch('/.netlify/functions/ebay-oauth?action=health-check', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        return `Connected to Netlify functions (${response.status})`;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Network connectivity failed: ${error.message}`);
    }
  }

  private async checkBrowserCompatibility(): Promise<string> {
    const features = {
      localStorage: typeof localStorage !== 'undefined',
      postMessage: typeof window.postMessage === 'function',
      broadcastChannel: typeof BroadcastChannel !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      popup: typeof window.open === 'function'
    };

    const supported = Object.entries(features).filter(([_, supported]) => supported).length;
    const total = Object.keys(features).length;

    return `${supported}/${total} features supported. Missing: ${Object.entries(features).filter(([_, supported]) => !supported).map(([name]) => name).join(', ') || 'none'}`;
  }

  private async checkPopupCapability(): Promise<string> {
    try {
      const testPopup = window.open('', 'oauth_test_popup', 'width=1,height=1');
      if (!testPopup) {
        throw new Error('Popup blocked by browser');
      }
      testPopup.close();
      return 'Popup creation allowed';
    } catch (error) {
      throw new Error(`Popup capability failed: ${error.message}`);
    }
  }

  private async checkDeploymentVersion(): Promise<string> {
    try {
      // Check if our enhanced OAuth methods are present
      const hasEnhancedOAuth = typeof (window as any).ebayOAuthService?.initiateOAuthFlow === 'function';
      const buildTimestamp = document.querySelector('meta[name="build-timestamp"]')?.getAttribute('content');
      
      return `Enhanced OAuth: ${hasEnhancedOAuth}, Build: ${buildTimestamp || 'unknown'}`;
    } catch (error) {
      throw new Error(`Deployment check failed: ${error.message}`);
    }
  }

  public async clearCache(): Promise<void> {
    this.log('🧹 Clearing all caches...', 'info', 'cache');
    this.updateStatus('Clearing caches...');

    try {
      // Clear Service Worker cache
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
        this.log('✅ Service Worker cache cleared', 'success', 'cache');
      }

      // Clear localStorage OAuth data
      const oauthKeys = Object.keys(localStorage).filter(key => key.includes('ebay') || key.includes('oauth'));
      oauthKeys.forEach(key => localStorage.removeItem(key));
      this.log(`✅ OAuth localStorage cleared (${oauthKeys.length} keys)`, 'success', 'cache');

      // Force page reload with cache busting
      setTimeout(() => {
        window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + '_cache_bust=' + Date.now();
      }, 1000);

      this.log('🔄 Page will reload with fresh cache...', 'info', 'cache');
      this.updateStatus('Cache cleared, reloading...');

    } catch (error) {
      this.log(`❌ Cache clearing failed: ${error.message}`, 'error', 'cache');
      this.updateStatus('Cache clearing failed');
    }
  }
}

// Auto-initialize the debug console
let debugConsole: OAuthDebugConsole;

export function initializeOAuthDebugConsole(): OAuthDebugConsole {
  if (!debugConsole) {
    debugConsole = new OAuthDebugConsole();
  }
  return debugConsole;
}

// Initialize on DOM ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeOAuthDebugConsole();
    });
  } else {
    initializeOAuthDebugConsole();
  }
}