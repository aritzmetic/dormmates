self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

self.addEventListener('push',e=>{
  let j={};
  try{j=e.data.json()}catch{try{j={data:{body:e.data.text()}}}catch{}}
  const d={...(j.notification||{}),...(j.data||{})};
  e.waitUntil(self.registration.showNotification(d.title||'DormMates',{
    body:d.body||'',icon:'/icon-192.png',tag:d.tag||'dormmates',renotify:true,
    vibrate:[120,60,120],data:{url:d.url||'/'}
  }));
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=e.notification.data?.url||'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(c=>c[0]?c[0].focus():clients.openWindow(url)));
});
