/**
 * Centralized Application URL Helper
 * Ensures all QR codes, share links, and café connection URLs
 * use the application's actual public/deployed origin.
 *
 * Priority order for the origin:
 *   1. VITE_PUBLIC_APP_URL env var (set at build time — always wins in production)
 *   2. window.location.origin when already on a non-localhost hostname
 *   3. LAN IP resolved from /api/config (localhost dev mode only)
 */

// Build-time env var injected by Vite — set to the permanent production URL.
// e.g. VITE_PUBLIC_APP_URL=https://daily-drip-evci.vercel.app
const STATIC_PUBLIC_URL = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://daily-drip-evci.vercel.app').replace(/\/+$/, '');

let cachedNetworkOrigin = '';
let configPromise = null;

export async function fetchNetworkOrigin() {
  if (cachedNetworkOrigin) return cachedNetworkOrigin;
  if (typeof window === 'undefined' || !window.location) return STATIC_PUBLIC_URL;

  // If already on a non-localhost hostname/domain, that's already publicly reachable
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    cachedNetworkOrigin = window.location.origin;
    return cachedNetworkOrigin;
  }

  // Running on localhost in development - fetch LAN IP or configured publicAppUrl from backend
  if (!configPromise) {
    configPromise = fetch('/api/config')
      .then(res => res.json())
      .then(cfg => {
        if (cfg && cfg.publicAppUrl) {
          cachedNetworkOrigin = cfg.publicAppUrl.replace(/\/+$/, '');
        } else if (cfg && cfg.networkUrl) {
          cachedNetworkOrigin = cfg.networkUrl;
        } else if (STATIC_PUBLIC_URL) {
          cachedNetworkOrigin = STATIC_PUBLIC_URL;
        } else {
          cachedNetworkOrigin = window.location.origin;
        }
        return cachedNetworkOrigin;
      })
      .catch(() => {
        cachedNetworkOrigin = STATIC_PUBLIC_URL || window.location.origin;
        return cachedNetworkOrigin;
      });
  }

  return configPromise;
}

// Start preloading immediately on load
if (typeof window !== 'undefined' && window.location) {
  fetchNetworkOrigin();
}

export function getPublicOrigin() {
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.origin;
    }
  }
  if (cachedNetworkOrigin) return cachedNetworkOrigin;
  return STATIC_PUBLIC_URL || (typeof window !== 'undefined' && window.location ? window.location.origin : '');
}

export async function getPublicOriginAsync() {
  return await fetchNetworkOrigin();
}

export function getPublicUrl(path = '') {
  const origin = getPublicOrigin();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

export async function getPublicUrlAsync(path = '') {
  const origin = await getPublicOriginAsync();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

export async function getCafeJoinUrlAsync(code = '') {
  const origin = await getPublicOriginAsync();
  return code ? `${origin}/cafe/join/${encodeURIComponent(code)}` : `${origin}/cafe/join`;
}

export function getCafeJoinUrl(code = '') {
  const origin = getPublicOrigin();
  return code ? `${origin}/cafe/join/${encodeURIComponent(code)}` : `${origin}/cafe/join`;
}

export async function getCoffeeDnaUrlAsync(dnaId = '') {
  const origin = await getPublicOriginAsync();
  return `${origin}/coffee-dna/${encodeURIComponent(dnaId)}`;
}

export function getCoffeeDnaUrl(dnaId = '') {
  const origin = getPublicOrigin();
  return `${origin}/coffee-dna/${encodeURIComponent(dnaId)}`;
}

export async function getDeliveryTrackingUrlAsync(orderId = '') {
  const origin = await getPublicOriginAsync();
  return `${origin}/delivery/orders/${encodeURIComponent(orderId)}`;
}

export function getDeliveryTrackingUrl(orderId = '') {
  const origin = getPublicOrigin();
  return `${origin}/delivery/orders/${encodeURIComponent(orderId)}`;
}

export function getOrderTrackingUrl(orderId = '') {
  return getDeliveryTrackingUrl(orderId);
}
