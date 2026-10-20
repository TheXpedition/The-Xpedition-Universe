'use strict';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

// No fetch handler: messages, sessions and game saves always use the real server.
self.addEventListener('push', event => event.waitUntil((async () => {
  let payload;
  try { payload = event.data.json(); } catch { payload = {}; }
  const fallback = { title: 'The Xpedition', body: 'Abre la app para revisar tus mensajes.',
    icon: '/brand/xpedition-transparent-v2-192.png', url: '/#mensajes', tag: 'xp-message' };
  let notice = fallback;
  if (payload.kind === 'test') {
    notice = { ...fallback, body: '¡Ya está! Los nuevos mensajes aparecerán aquí.', url: '/#inicio', tag: 'xp-test' };
  } else if (payload.kind === 'message' && typeof payload.messageId === 'string' && typeof payload.recipient === 'string') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      // Recheck the current session and membership before showing any private preview.
      const response = await fetch('/api/push/messages/' + encodeURIComponent(payload.messageId) + '?recipient=' + encodeURIComponent(payload.recipient),
        { credentials: 'include', cache: 'no-store', signal: controller.signal });
      if (response.ok) notice = await response.json();
    } catch {} finally { clearTimeout(timer); }
  }
  await self.registration.showNotification(notice.title || fallback.title, {
    body: notice.body || fallback.body, icon: notice.icon || fallback.icon,
    badge: '/brand/xpedition-transparent-v2-64.png', tag: notice.tag || fallback.tag,
    silent: false, data: { url: notice.url || fallback.url }
  });
})()));

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    let url;
    try { url = new URL(event.notification.data?.url || '/#mensajes', self.location.origin); } catch {}
    if (!url || url.origin !== self.location.origin || !['/', '/index.html'].includes(url.pathname)) url = new URL('/#mensajes', self.location.origin);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const main = windows.find(client => {
      const current = new URL(client.url);
      return current.origin === url.origin && ['/', '/index.html'].includes(current.pathname);
    });
    if (main) {
      await main.navigate(url.href);
      await main.focus();
    } else await self.clients.openWindow(url.href);
  })());
});
