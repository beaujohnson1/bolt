// src/pages/AuthConnectivityTest.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // Import supabase client

export default function AuthConnectivityTest() {
  const [result, setResult] = useState<any>({});

  useEffect(() => {
    (async () => {
      const r: any = {
        url: import.meta.env.VITE_SUPABASE_URL,
        online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
      };

      // 1) ping rest (GET)
      try {
        // Ensure supabase client is initialized and key is available
        if (!supabase || !supabase.supabaseKey) {
          r.health = { error: "Supabase client not initialized or key missing." };
        } else {
          const resp = await fetch(`${r.url}/auth/v1/health`, {
            method: 'GET',
            headers: {
              'apikey': supabase.supabaseKey // Explicitly add the API key
            }
          });
          r.health = { ok: resp.ok, status: resp.status };
        }
      } catch (e: any) {
        r.health = { error: String(e) };
      }

      // 2) create anon session to force token call
      try {
        const { data, error } = await supabase.auth.getSession();
        r.getSession = { hasSession: !!data?.session, error: error?.message };
      } catch (e: any) {
        r.getSession = { error: String(e) };
      }

      setResult(r);
    })();
  }, []);

  return <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>;
}
