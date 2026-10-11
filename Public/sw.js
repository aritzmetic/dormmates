self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

// Shows every push, including reminders, even when the app is closed.
self.addEventListener('push',e=>{
  let j={};
  try{j=e.data.json()}catch{try{j={data:{body:e.data.text()}}}catch{}}
  const d={...(j.notification||{}),...(j.data||{})},tag=d.tag||'dormmate';
  e.waitUntil(self.registration.showNotification(d.title||'DormMate',{
    body:d.body||'',icon:'/icon-192.png',badge:'/badge-96.png',tag,renotify:true,
    vibrate:[120,60,120],data:{url:d.url||'/'}
  }));
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=e.notification.data?.url||'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async c=>{
    if(c[0]){try{if(url!=='/')await c[0].navigate(url)}catch{}return c[0].focus()}
    return clients.openWindow(url)}));
});
