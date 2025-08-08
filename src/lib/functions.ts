// src/lib/functions.ts
// Use a single base that we can remap in dev/prod
const BASE = import.meta.env.VITE_FUNCTIONS_BASE?.trim() || '/.netlify/functions';

export function fn(path: string) {
  // ensures /api/foo or /.netlify/functions/foo
  return `${BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

// Resilient function call with graceful degradation
export async function callFunction(path: string, options: RequestInit = {}) {
  try {
    const url = fn(path);
    console.log(`[FUNCTIONS] Calling: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Function ${path} failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[FUNCTIONS] ${path} unavailable in sandbox:`, error.message);
    return { 
      ok: false, 
      reason: 'unavailable',
      error: error.message,
      mock: true 
    };
  }
}

// Mock function for development when Netlify functions aren't available
export async function mockFunction(name: string, body?: any) {
  console.warn(`[MOCK] ${name}`, body);
  
  // Return appropriate mock responses based on function name
  switch (name) {
    case 'openai-vision-analysis':
      return {
        ok: true,
        data: {
          title: 'Mock Item Analysis',
          brand: 'Unknown',
          size: 'Unknown',
          condition: 'good',
          category: 'clothing',
          color: 'Various',
          suggested_price: 25,
          confidence: 0.5,
          key_features: ['mock analysis'],
          keywords: ['mock', 'item'],
          description: 'Mock analysis - functions not available in sandbox'
        },
        mock: true
      };
    
    case 'test-google-vision':
      return {
        success: true,
        message: 'Mock Google Vision test - functions not available in sandbox',
        mock: true
      };
    
    case 'test-openai':
      return {
        success: true,
        message: 'Mock OpenAI test - functions not available in sandbox',
        mock: true
      };
    
    default:
      return { 
        ok: true, 
        message: `Mock response for ${name}`,
        mock: true 
      };
  }
}