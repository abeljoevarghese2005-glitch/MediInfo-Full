// public/sw.js - Service Worker for push notifications

self.addEventListener('push', function(event) {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'mediinfo-reminder',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'taken', title: '✅ Mark as Taken' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: {
      reminderId: data.reminder_id,
      url: '/reminders'
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  if (event.action === 'taken') {
    // Post message to app to mark as taken
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        for (const client of clientList) {
          client.postMessage({
            type: 'MARK_TAKEN',
            reminderId: event.notification.data.reminderId
          })
          return
        }
        // If app not open, open it
        clients.openWindow('/reminders')
      })
    )
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        for (const client of clientList) {
          if (client.url.includes('/reminders')) {
            client.focus()
            return
          }
        }
        clients.openWindow('/reminders')
      })
    )
  }
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())