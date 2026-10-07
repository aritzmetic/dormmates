process.env.TZ='Asia/Manila';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {onDocumentCreated,onDocumentUpdated,onDocumentWritten} from 'firebase-functions/v2/firestore';
import admin from 'firebase-admin';
import {away} from './lib.js';

// !!! Must match your Firestore database location (Firebase Console -> Firestore -> Data, shown as "Location").
// Examples: Singapore 'asia-southeast1' | Jakarta 'asia-southeast2' | Tokyo 'asia-northeast1' | nam5 (US multi-region) 'us-central1' | eur3 'europe-west1'
const DB_REGION='asia-southeast1';

admin.initializeApp();
const db=admin.firestore();
const tf=ts=>new Date(ts).toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'});
const money=n=>'₱'+(+n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const cut=(t,n=140)=>String(t||'').slice(0,n);

// ---------- helpers ----------
async function push(uids,{title,body,tag}){
  uids=[...new Set(uids)].filter(Boolean);if(!uids.length)return;
  const docs=[];
  for(let i=0;i<uids.length;i+=30){const q=await db.collection('tokens').where('uid','in',uids.slice(i,i+30)).get();docs.push(...q.docs)}
  console.log(`push "${title}" -> ${uids.length} user(s), ${docs.length} device token(s)`);
  if(!docs.length)console.warn('No tokens: those users must open the app and tap Profile > Enable reminders on their phone.');
  for(let i=0;i<docs.length;i+=500){
    const part=docs.slice(i,i+500);
    const r=await admin.messaging().sendEachForMulticast({
      tokens:part.map(d=>d.id),
      data:{title,body,tag:tag||title,url:'/'},
      webpush:{headers:{Urgency:'high',TTL:'3600'}},
      android:{priority:'high'}
    });
    console.log(`sent ok:${r.successCount} failed:${r.failureCount}`);
    r.responses.forEach((x,k)=>{const c=x.error?.code;if(c)console.warn('push error',c);
      if(c==='messaging/registration-token-not-registered'||c==='messaging/invalid-registration-token')part[k].ref.delete()});
  }
}
const getSpace=async sid=>{const s=await db.doc(`spaces/${sid}`).get();return s.exists?s.data():null};
const who=(sp,uid)=>(sp.names?.[uid]?.n||'Someone').split(' ')[0];
const others=(sp,uid)=>(sp.members||[]).filter(m=>m!==uid);
const on=(document,fn)=>({document,region:DB_REGION});

// ---------- someone timed in / out -> everyone else in the space ----------
export const onPunch=onDocumentCreated(on('spaces/{sid}/punches/{pid}'),async e=>{
  const p=e.data.data();if(p.type!=='in'&&p.type!=='out')return;
  const sp=await getSpace(e.params.sid);if(!sp)return;
  await push(others(sp,p.uid),{
    title:`${p.type==='in'?'🟢':'🔴'} ${sp.name}`,
    body:`${who(sp,p.uid)} timed ${p.type} at ${tf(p.ts)}`,
    tag:'punch-'+e.params.pid});
});

// ---------- notice board post ----------
export const onNote=onDocumentCreated(on('spaces/{sid}/notes/{nid}'),async e=>{
  const n=e.data.data(),sp=await getSpace(e.params.sid);if(!sp)return;
  await push(others(sp,n.uid),{title:`📌 ${who(sp,n.uid)} posted on the notice board`,body:cut(n.text),tag:'note-'+e.params.nid});
});

// ---------- host's custom message ----------
export const onAnnouncement=onDocumentCreated(on('spaces/{sid}/announcements/{aid}'),async e=>{
  const a=e.data.data(),sp=await getSpace(e.params.sid);if(!sp)return;
  await push(others(sp,a.uid),{title:`📣 ${sp.name}`,body:cut(a.text),tag:'ann-'+e.params.aid});
});

// ---------- bills set / finalized / marked paid ----------
export const onBill=onDocumentWritten(on('spaces/{sid}/bills/{bid}'),async e=>{
  const b=e.data?.before?.data(),a=e.data?.after?.data();if(!a)return;
  const sp=await getSpace(e.params.sid);if(!sp)return;
  const all=others(sp,sp.ownerId),id=e.params.bid;
  const changed=!b||b.elec!==a.elec||b.water!==a.water||b.ps!==a.ps||b.pe!==a.pe;
  if(changed&&(a.elec||a.water))
    await push(all,{title:'💡 Bills updated',body:`Electric ${money(a.elec)} · Water ${money(a.water)}. Open the app to see your share.`,tag:'bills-'+id});
  if(a.final&&!b?.final)
    await push(all,{title:'🔒 Bills finalized',body:'Hours are locked. Check your share in the Bills tab.',tag:'final-'+id});
  for(const uid of Object.keys(a.paid||{}))
    if(a.paid[uid]&&!b?.paid?.[uid])await push([uid],{title:'✅ Payment received',body:'The host marked your bill as paid.',tag:'paid-'+id});
});

// ---------- fix requests ----------
const KIND={add:'Add time',in:'Add time in',out:'Add time out',edit:'Edit session',remove:'Remove session'};
export const onFixNew=onDocumentCreated(on('spaces/{sid}/exceptions/{xid}'),async e=>{
  const x=e.data.data(),sp=await getSpace(e.params.sid);if(!sp)return;
  if(x.batch&&e.params.xid!==x.batch)return; // a multi-day request is saved as one doc per day: notify once (for the first)
  if(x.status!=='pending')return;
  await push(others(sp,x.uid).filter(m=>m===sp.ownerId),{title:`📝 ${who(sp,x.uid)} sent a fix request`,body:cut(`${KIND[x.kind||'add']}${x.batchN>1?` · ${x.batchN} days`:''} · “${x.reason||'no reason'}”`),tag:'fixnew-'+e.params.xid});
});
export const onFixDecision=onDocumentUpdated(on('spaces/{sid}/exceptions/{xid}'),async e=>{
  const b=e.data.before.data(),a=e.data.after.data();
  if(b.status===a.status||a.status==='pending')return;
  if(a.batch&&e.params.xid!==a.batch)return; // one notification per batch
  await push([a.uid],{title:a.status==='approved'?'✅ Fix approved':'❌ Fix denied',body:cut(`${KIND[a.kind||'add']} · “${a.reason}”`),tag:'fix-'+e.params.xid});
});

// ---------- 7:30 PM / 7:55 PM "confirm you are away" reminder ----------
async function remind(){
  const now=Date.now()+60e3;
  const due=new Map();
  const spaces=await db.collection('spaces').get();
  await Promise.all(spaces.docs.map(async s=>{
    const q=await s.ref.collection('punches').orderBy('ts','desc').limit(300).get();
    const P=q.docs.map(d=>d.data());
    for(const uid of s.data().members||[]){
      const a=away(uid,P,now);
      if(a?.open)due.set(uid,Math.min(due.get(uid)??99,Math.max(1,Math.round((a.D-now)/6e4))));
    }
  }));
  for(const [uid,m] of due)
    await push([uid],{title:'⏰ Confirm you are away',body:`Confirm you're still away. ${m} min left before you're timed in at 8:00 PM.`});
}
export const awayReminder=onSchedule({schedule:'30,55 19 * * *',timeZone:'Asia/Manila',region:'asia-southeast1'},remind);
