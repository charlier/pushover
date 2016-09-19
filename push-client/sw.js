'use strict';

self.addEventListener('push', function(event) {
  var message = event.data.json();
  event.waitUntil(
    self.registration.showNotification(message.title, {
      'body': message.body,
      'icon': message.icon,
      'data': message.data
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  var message = event.notification.data;
  event.waitUntil(clients.openWindow(message.url));
});
