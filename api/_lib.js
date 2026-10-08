import admin from 'firebase-admin';

if(!admin.apps.length){
  let sa;
  try{sa=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)}
  catch{throw new Error('FIREBASE_SERVICE_ACCOUNT env var is missing or is not valid JSON')}
  admin.initializeApp({credential:admin.credential.cert(sa)});
}
export const db=admin.firestore(),auth=admin.auth(),messaging=admin.messaging();

export const who=(sp,uid)=>(sp.names?.[uid]?.n||'Someone').split(' ')[0];
export const others=(sp,uid)=>(sp.members||[]).filter(m=>m!==uid);

// send a push to every phone registered by these users
export async function push(uids,{title,body,tag}){
  uids=[...new Set(uids)].filter(Boolean);if(!uids.length)return 0;let okN=0;
  const docs=[];
  for(let i=0;i<uids.length;i+=30){const q=await db.collection('tokens').where('uid','in',uids.slice(i,i+30)).get();docs.push(...q.docs)}
  console.log(`push "${title}" -> ${uids.length} user(s), ${docs.length} device token(s)`);
  if(!docs.length)console.warn('No tokens: those users must open the app and tap Profile > Enable reminders on their phone.');
  for(let i=0;i<docs.length;i+=500){
    const part=docs.slice(i,i+500);
    const r=await messaging.sendEachForMulticast({
      tokens:part.map(d=>d.id),
      data:{title,body,tag:tag||title,url:'/'},
      webpush:{headers:{Urgency:'high',TTL:'3600'}},
      android:{priority:'high'}
    });
    console.log(`sent ok:${r.successCount} failed:${r.failureCount}`);okN+=r.successCount;
    r.responses.forEach((x,k)=>{const c=x.error?.code;if(c)console.warn('push error',c);
      if(c==='messaging/registration-token-not-registered'||c==='messaging/invalid-registration-token')part[k].ref.delete()});
  }
  return okN;
}
