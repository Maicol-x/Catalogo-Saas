/**
 * List of reserved subdomains that cannot be registered by tenants.
 * Protects system infrastructure, authentication, routing, and administrative endpoints.
 */
export const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'administrator',
  'api',
  'app',
  'auth',
  'billing',
  'catalogo',
  'dashboard',
  'www',
  'mail',
  'support',
  'status',
  'cdn',
  'static',
  'assets',
  'root',
  'superadmin',
  'webhook',
  'webhooks',
  'login',
  'signup',
  'register',
  'help',
  'docs',
  'portal',
  'account',
  'staging',
  'dev',
  'test',
  'demo',
  'checkout',
  'shop',
  'store',
  'cart',
  'order',
  'orders',
  'payment',
  'payments',
]);

/**
 * Validates whether a requested subdomain is a reserved system keyword.
 * Case-insensitive and trimmed.
 */
export function isReservedSubdomain(subdomain: string): boolean {
  if (!subdomain) return true;
  const clean = subdomain.toLowerCase().trim();
  return RESERVED_SUBDOMAINS.has(clean);
}
