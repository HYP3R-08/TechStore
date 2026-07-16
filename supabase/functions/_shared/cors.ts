/**
 * CORS handling shared by every Edge Function.
 *
 * Origins are allow-listed rather than reflected: `Access-Control-Allow-Origin: *`
 * would let any website on the internet call these functions from one of our
 * visitors' browsers. The list comes from the ALLOWED_ORIGINS secret:
 *
 *   supabase secrets set ALLOWED_ORIGINS="https://techstore-murex-beta.vercel.app,http://localhost:5173"
 */

const DEFAULT_ORIGINS = ['http://localhost:5173'];

function allowedOrigins(): string[] {
  const configured = Deno.env.get('ALLOWED_ORIGINS');
  if (!configured) return DEFAULT_ORIGINS;
  return configured
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = allowedOrigins();
  const match = allowed.includes(origin) ? origin : allowed[0];

  return {
    'Access-Control-Allow-Origin': match ?? '',
    // Responses differ per origin, so caches must not share them across origins.
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export function preflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response('ok', { headers: corsHeaders(req) });
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

/**
 * Never return a raw exception to the browser: messages from Postgres or Stripe
 * leak table names, constraints and internal state. The detail goes to the
 * function logs, the caller gets a stable message.
 */
export function fail(req: Request, publicMessage: string, status: number, detail?: unknown): Response {
  if (detail) console.error(`[${publicMessage}]`, detail);
  return json(req, { error: publicMessage }, status);
}
