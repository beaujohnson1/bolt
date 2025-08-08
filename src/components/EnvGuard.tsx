import React from 'react';

export default function EnvGuard({ children }: { children: React.ReactNode }) {
  const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
  const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (hasUrl && hasKey) return children;

  return (
    <div style={{padding:12, background:'#fff3cd', color:'#664d03', border:'1px solid #ffecb5'}}>
      <strong>Configuration needed:</strong> Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.
    </div>
  );
}