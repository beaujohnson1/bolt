(window as any).clearAICache = () => { console.log('Clearing AI cache...'); import('./src/services/CacheIntegrationService').then(m => m.cacheIntegration.clearAllCache()); };
