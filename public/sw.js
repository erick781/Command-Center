self.addEventListener("push", function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Partenaire.io";
  const options = {
    body: data.body || "Nouvelle notification",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/new" },
    actions: [{ action: "open", title: "Ouvrir" }]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  const url = event.notification.data.url || "/new";
  event.waitUntil(clients.openWindow(url));
});

self.addEventListener("install", function(event) {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(clients.claim());
});
