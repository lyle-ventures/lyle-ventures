/**
 * Cloudflare Worker: FRED API Proxy
 *
 * Deploy to Cloudflare Workers to proxy FRED API requests and avoid CORS issues.
 *
 * Setup:
 * 1. Go to Cloudflare Dashboard > Workers & Pages
 * 2. Create new Worker
 * 3. Paste this code
 * 4. Add environment variable: FRED_API_KEY = your_api_key
 * 5. Deploy and note the worker URL (e.g., fred-proxy.your-subdomain.workers.dev)
 * 6. Update macro.njk to use: https://fred-proxy.your-subdomain.workers.dev
 */

const FRED_API_BASE = 'https://api.stlouisfed.org/fred';

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    const url = new URL(request.url);

    // Get series ID from query params
    const seriesId = url.searchParams.get('series_id');
    if (!seriesId) {
      return jsonResponse({ error: 'Missing series_id parameter' }, 400);
    }

    // Build FRED API URL
    const fredUrl = new URL(`${FRED_API_BASE}/series/observations`);
    fredUrl.searchParams.set('series_id', seriesId);
    fredUrl.searchParams.set('api_key', env.FRED_API_KEY);
    fredUrl.searchParams.set('file_type', 'json');
    fredUrl.searchParams.set('sort_order', 'desc');
    fredUrl.searchParams.set('limit', url.searchParams.get('limit') || '10');

    // Optional date filters
    if (url.searchParams.get('observation_start')) {
      fredUrl.searchParams.set('observation_start', url.searchParams.get('observation_start'));
    }
    if (url.searchParams.get('observation_end')) {
      fredUrl.searchParams.set('observation_end', url.searchParams.get('observation_end'));
    }

    try {
      const response = await fetch(fredUrl.toString());
      const data = await response.json();

      return jsonResponse({
        series_id: seriesId,
        observations: data.observations || []
      }, 200);
    } catch (error) {
      return jsonResponse({ error: 'Failed to fetch from FRED API' }, 500);
    }
  }
};

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
