```js
// netlify/functions/ping-supabase.js
export const handler = async () => {
  const url = process.env.VITE_SUPABASE_URL;
  if (!url) {
    return { statusCode: 500, body: 'VITE_SUPABASE_URL missing in env' };
  }
  try {
    const resp = await fetch(\`${url}/auth/v1/health`, { method: 'GET' });
    const text = await resp.text();
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: resp.ok, status: resp.status, body: text.slice(0,200) }),
    };
  } catch (e) {
    return { statusCode: 502, body: String(e) };
  }
};
```