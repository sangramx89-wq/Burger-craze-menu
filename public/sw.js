const SHELL_CACHE = 'cafe-menu-shell-v1';
const RUNTIME_CACHE = 'cafe-menu-runtime-v1';

const EXCLUDED_PATH_PREFIXES = ['/admin', '/superadmin', '/api/', '/@vite', '/src/', '/node_modules/'];

function isExcludedPath(pathname) {
  return EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        await cache.add('/');
      } catch {
        // Navigation shell fallback may populate on first fetch
      }

      try {
        const res = await fetch('/sw-manifest.json', { cache: 'no-store' });
        if (res.ok) {
          const assets = await res.json();
          if (Array.isArray(assets) && assets.length > 0) {
            await Promise.allSettled(
              assets.map((url) =>
                fetch(url, { cache: 'default' }).then((assetRes) => {
                  if (assetRes && assetRes.ok) {
                    return cache.put(url, assetRes);
                  }
                  return undefined;
                })
              )
            );
          }
        }
      } catch {
        // Safe no-op in dev mode where sw-manifest.json is not emitted
      }

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept cross-origin APIs (Supabase REST/Realtime, etc.) except Google Fonts
  const isGoogleFonts =
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com';

  if (url.origin !== self.location.origin && !isGoogleFonts) {
    return;
  }

  if (url.origin === self.location.origin && isExcludedPath(url.pathname)) {
    return;
  }

  // Network-First for HTML navigations so fresh deploys update cleanly while offline/flaky loads fall back
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok && !isExcludedPath(url.pathname)) {
            cache.put('/', fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          const cached = await cache.match('/');
          if (cached) return cached;
          return new Response('Offline — please reconnect to load the menu.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })()
    );
    return;
  }

  // Cache-First for Google Fonts & hashed static assets / dish photography
  if (
    isGoogleFonts ||
    (url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/assets/aistudio/'))
  ) {
    event.respondWith(
      (async () => {
        const shellCache = await caches.open(SHELL_CACHE);
        const cachedShell = await shellCache.match(request);
        if (cachedShell) return cachedShell;

        const runtimeCache = await caches.open(RUNTIME_CACHE);
        const cachedRuntime = await runtimeCache.match(request);
        if (cachedRuntime) {
          // Background refresh only for font CSS
          if (url.origin === 'https://fonts.googleapis.com') {
            fetch(request)
              .then((res) => {
                if (res && res.ok) runtimeCache.put(request, res.clone());
              })
              .catch(() => {});
          }
          return cachedRuntime;
        }

        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          runtimeCache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      })()
    );
  }
});
