self.addEventListener("push", (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "New Message";
    const options = {
        body: data.body || "You have a new message.",
        icon: data.icon || "/favicon.png",
        badge: "/favicon.png",
        vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === "/" && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow("/");
            }
        })
    );
});
