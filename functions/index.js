process.env.TZ='Asia/Manila';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import admin from 'firebase-admin';
import {away} from './lib.js';

admin.initializeApp();
const db=admin.firestore();

async function run(){
  const now=Date.now()+60e3;               // scheduler can fire a few seconds early/late
  const due=new Map();                     // uid -> minutes left before auto time-in
  const spaces=await db.collection('spaces').get();
  await Promise.all(spaces.docs.map(async s=>{
    const q=await s.ref.collection('punches').orderBy('ts','desc').limit(300).get();
    const P=q.docs.map(d=>d.data());
    for(const uid of s.data().members||[]){
      const a=away(uid,P,now);
      if(a?.open)due.set(uid,Math.min(due.get(uid)??99,Math.max(1,Math.round((a.D-now)/6e4))));
    }
  }));
  for(const [uid,m] of due){
    const t=await db.collection('tokens').where('uid','==',uid).get();
    if(t.empty)continue;
    const title='⏰ Confirm you are away';
    const body=`Confirm you're still away. ${m} min left before you're timed in at 8:00 PM.`;
    const r=await admin.messaging().sendEachForMulticast({
      tokens:t.docs.map(d=>d.id),
      data:{title,body,tag:title,url:'/'},
      webpush:{headers:{Urgency:'high',TTL:'1500'}},
      android:{priority:'high'}
    });
    r.responses.forEach((x,i)=>{const c=x.error?.code;
      if(c==='messaging/registration-token-not-registered'||c==='messaging/invalid-registration-token')t.docs[i].ref.delete()});
  }
}

export const awayReminder=onSchedule({schedule:'30,55 19 * * *',timeZone:'Asia/Manila',region:'asia-southeast1'},run);
