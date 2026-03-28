// Notification setup for PWA
async function setupPushNotifications() {
  if (!("Notification" in window)) {
    alert("Ce navigateur ne supporte pas les notifications");
    return;
  }
  
  if (!("serviceWorker" in navigator)) {
    alert("Service Worker non supporté");
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    console.log("SW registered:", reg.scope);
    
    const permission = await Notification.requestPermission();
    console.log("Permission:", permission);
    
    if (permission === "granted") {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array("BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkGs-GDxQ6ECOWn0LLKP7_K4nGqET0dwWJ12fSpFew")
      });
      
      // Send subscription to backend
      await fetch("/api/notifications/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({token: JSON.stringify(sub), platform: "web"})
      });
      
      alert("Notifications activées!");
    } else {
      alert("Permission refusée pour les notifications");
    }
  } catch (e) {
    console.error("Push setup error:", e);
    alert("Erreur: " + e.message);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
