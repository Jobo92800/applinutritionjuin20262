/* Réception des notifications push (importé par le service worker de la PWA). */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'MAbeautyplus Nutrition';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    lang: 'fr',
    data: { url: payload.url || '/' },
    // Regroupe les notifications d'un même thème plutôt que de les empiler.
    tag: payload.tag || 'mabeautyplus',
    renotify: true,
  };

  // Une notification du parcours (étape validée, rappel) n'a pas lieu d'être
  // si la cliente a l'application sous les yeux : la célébration s'en charge.
  if (options.tag === 'parcours') {
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          const visible = clientList.some((c) => c.visibilityState === 'visible');
          if (!visible) return self.registration.showNotification(title, options);
        })
        .catch(() => self.registration.showNotification(title, options))
    );
    return;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Réutilise un onglet déjà ouvert sur l'application si possible.
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client) {
              return client.navigate(targetUrl).then((c) => (c ? c.focus() : client.focus()));
            }
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
      .catch(() => self.clients.openWindow(targetUrl))
  );
});
