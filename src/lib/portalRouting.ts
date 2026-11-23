import { PortalTarget } from '../types/index.ts';

/**
 * Detects whether the app should render the Customer Storefront,
 * the Admin Portal (/admin path, #/admin hash, or ?portal=admin),
 * or the Super Admin Portal (superadmin.* subdomain or /superadmin path).
 */
export function detectPortalTarget(): PortalTarget {
  if (typeof window === 'undefined') return 'customer';

  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const queryPortal = (params.get('portal') || '').toLowerCase();

  // 1. Subdomain detection (Super Admin only: handles superadmin.domain.com, superadmin.localhost, superadmin-...)
  if (hostname.startsWith('superadmin.') || hostname.startsWith('superadmin-')) {
    return 'superadmin';
  }

  // 2. Query parameter detection (?portal=superadmin / ?portal=admin)
  if (queryPortal === 'superadmin') return 'superadmin';
  if (queryPortal === 'admin') return 'admin';

  // 3. Hash detection (#/superadmin / #/admin)
  if (hash === '#/superadmin' || hash.startsWith('#/superadmin/')) {
    return 'superadmin';
  }
  if (hash === '#/admin' || hash.startsWith('#/admin/')) {
    return 'admin';
  }

  // 4. Pathname detection (/superadmin or /admin)
  if (pathname === '/superadmin' || pathname.startsWith('/superadmin/')) {
    return 'superadmin';
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return 'admin';
  }

  return 'customer';
}

/**
 * Navigates between portals (or back to the customer storefront)
 * using root-host path redirect if currently on a superadmin subdomain,
 * or client-side History navigation on single-host URLs.
 */
export function navigateToPortal(target: PortalTarget): PortalTarget {
  if (typeof window === 'undefined') return target;

  const { protocol, host, hostname } = window.location;
  const lowerHost = hostname.toLowerCase();
  const isOnSuperAdminSubdomain =
    lowerHost.startsWith('superadmin.') || lowerHost.startsWith('superadmin-');

  if (isOnSuperAdminSubdomain) {
    const baseHost = host.replace(/^superadmin[.-]/i, '');
    if (target === 'customer') {
      window.location.assign(`${protocol}//${baseHost}/`);
    } else if (target === 'admin') {
      window.location.assign(`${protocol}//${baseHost}/admin`);
    } else {
      window.location.assign(`${protocol}//superadmin.${baseHost}/`);
    }
    return target;
  }

  const nextPath =
    target === 'superadmin' ? '/superadmin' : target === 'admin' ? '/admin' : '/';
  window.history.pushState({}, '', nextPath);
  return target;
}
