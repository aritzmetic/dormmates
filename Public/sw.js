self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

// Shows every push, including reminders, even when the app is closed. Reminders stay in the tray until the user dismisses them.
self.addEventListener('push',e=>{
  let j={};
  try{j=e.data.json()}catch{try{j={data:{body:e.data.text()}}}catch{}}
  const d={...(j.notification||{}),...(j.data||{})},tag=d.tag||'dormmate';
  e.waitUntil(self.registration.showNotification(d.title||'DormMate',{
    body:d.body||'',icon:'/icon-192.png',badge:'/badge-96.png',tag,renotify:true,
    requireInteraction:/^(rem-|remset)/.test(tag),
    vibrate:[120,60,120],data:{url:d.url||'/'}
  }));
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=e.notification.data?.url||'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(c=>c[0]?c[0].focus():clients.openWindow(url)));
});
