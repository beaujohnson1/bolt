import React from 'react';

export default function EnvGuard({ children }: { children: React.ReactNode }) {
  const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
  const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  const [connectionTest, setConnectionTest] = React.useState<{
    status: 'testing' | 'success' | 'error';
    message: string;
  }>({ status: 'testing', message: 'Testing connection...' });

  // Test connection on mount
  React.useEffect(() => {
    if (hasUrl && hasKey) {
      testConnection();
    }
  }, [hasUrl, hasKey]);

  const testConnection = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setConnectionTest({ status: 'success', message: 'Connected successfully' });
      } else {
        setConnectionTest({ 
          status: 'error', 
          message: `Connection failed: ${response.status} ${response.statusText}` 
        });
      }
    } catch (error: any) {
      setConnectionTest({ 
        status: 'error', 
        message: `Connection failed: ${error.message}` 
      });
    }
  };

  if (!hasUrl || !hasKey) {
    return (
      <div style={{padding:12, background:'#fff3cd', color:'#664d03', border:'1px solid #ffecb5'}}>
        <strong>Configuration needed:</strong> Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.
      </div>
    );
  }

  if (connectionTest.status === 'error') {
    return (
      <div style={{padding:12, background:'#f8d7da', color:'#721c24', border:'1px solid #f5c6cb'}}>
        <strong>Connection Error:</strong> {connectionTest.message}
        <br />
        <button 
          onClick={testConnection}
          style={{marginTop:8, padding:'4px 8px', background:'#721c24', color:'white', border:'none', borderRadius:'4px', cursor:'pointer'}}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (connectionTest.status === 'testing') {
    return (
      <div style={{padding:12, background:'#d1ecf1', color:'#0c5460', border:'1px solid #bee5eb'}}>
        <strong>Testing connection...</strong> {connectionTest.message}
      </div>
    );
  }

  return <>{children}</>;
}