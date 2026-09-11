/**
 * Dynamic Domain & Multi-tenant Routing Configuration
 * Eliminates hardcoded platform domains and enables configurable subdomains
 * and custom domains across client and server.
 */

export function getBaseDomain(): string {
  // Client-side detection
  if (typeof window !== 'undefined') {
    const viteEnvDomain = (import.meta as any).env?.VITE_APP_DOMAIN;
    if (viteEnvDomain) return viteEnvDomain;

    const host = window.location.host;
    // If running in development or cloud sandbox (e.g. *.run.app, localhost)
    if (host.includes('localhost') || host.includes('.run.app') || host.includes('web.app')) {
      return host;
    }
    // Extract base domain from multi-level host if applicable
    const parts = host.split('.');
    if (parts.length > 2) {
      return parts.slice(1).join('.');
    }
    return host;
  }

  // Server-side detection
  return process.env.APP_DOMAIN || 'catalogo.app';
}

/**
 * Returns the fully qualified public URL for a store's catalog.
 * Supports custom domains for Pro/Business tiers and falls back to subdomain/path.
 */
export function getStoreCatalogUrl(store: {
  subdomain: string;
  customDomain?: string | null;
}): string {
  if (store.customDomain && store.customDomain.trim()) {
    return `https://${store.customDomain.trim().toLowerCase()}`;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.host;
    const protocol = window.location.protocol;

    // If sandbox / port-based environment, use path-based routing (/s/:subdomain)
    if (host.includes('localhost') || host.includes('.run.app') || host.includes('web.app')) {
      return `${protocol}//${host}/s/${store.subdomain}`;
    }

    const baseDomain = getBaseDomain();
    return `${protocol}//${store.subdomain}.${baseDomain}`;
  }

  const baseDomain = process.env.APP_DOMAIN || 'catalogo.app';
  return `https://${store.subdomain}.${baseDomain}`;
}

/**
 * Returns the display label for a store's web address
 */
export function formatStoreAddress(store: {
  subdomain: string;
  customDomain?: string | null;
}): string {
  if (store.customDomain && store.customDomain.trim()) {
    return store.customDomain.trim().toLowerCase();
  }
  const baseDomain = getBaseDomain();
  return `${store.subdomain}.${baseDomain}`;
}
