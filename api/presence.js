import {createHash,timingSafeEqual} from 'node:crypto';
import {db,push} from './_lib.js';
import {norm} from '../src/lib.js';

// Called by a phone automation (iPhone Shortcuts / Android MacroDroid / Tasker) when the phone joins or leaves the dorm Wi-Fi,
// or arrives at / leaves the dorm. It works while the DormMate app is closed. The server decides whether to send a push:
//   arrive-type event while timed out  ->  "Time in?"        leave-type event while timed in  ->  "Time out?"
// GET /api/presence?uid=...&sid=...&key=...&event=wifi_in|wifi_out|arrived|left|test[&ssid=NAME]
const h=s=>createHash('sha256').update(String(s)).digest();
export default async function handler(req,res){
  const q={...req.query,...(req.body&&typeof req.body==='object'?req.body:{})};
  const{uid,sid,key,event,ssid}=q;
  if(!uid||!sid||!key||!event)return res.status(400).json({error:'missing uid, sid, key or event'});
  if(!['wifi_in','wifi_out','arrived','left','test'].includes(event))return res.status(400).json({error:'unknown event'});
  try{
    const pr=db.doc(`prefs/${uid}`),p=(await pr.get()).data();
    if(!p?.autoKey||!timingSafeEqual(h(p.autoKey),h(key)))return res.status(401).json({error:'unauthorized'});
    const sd=await db.doc(`spaces/${sid}`).get(),sp=sd.data();
    if(!sp||!(sp.members||[]).includes(uid))return res.status(404).json({error:'not a member of this space'});
    const place=sp.cfg?.geo?.name||'the dorm',wifi=(sp.cfg?.wifi||[]);
    if(event==='test'){const n=await push([uid],{title:'✅ Auto-detect works',body:`${sp.name}: your phone can reach DormMate. You'll be alerted when you arrive or leave.`,tag:'presence-test'});return res.json({ok:true,devices:n})}
    // if the automation sends the network name, only the dorm's Wi-Fi counts
    if(ssid&&wifi.length&&!wifi.some(w=>w.toLowerCase()===String(ssid).toLowerCase()))return res.json({ok:true,ignored:'other-network'});
    const arriving=event==='wifi_in'||event==='arrived',byWifi=event.startsWith('wifi');
    const lp=p.lastPresence||{};if(lp.event===event&&Date.now()-lp.at<5*60e3)return res.json({ok:true,ignored:'duplicate'});   // Wi-Fi can flap
    const rows=(await sd.ref.collection('punches').orderBy('ts','desc').limit(300).get()).docs.map(d=>d.data());
    const inside=norm(uid,rows,Date.now()).at(-1)?.type==='in';
    await pr.set({lastPresence:{event,at:Date.now()}},{merge:true});
    if(arriving&&inside)return res.json({ok:true,ignored:'already-timed-in'});
    if(!arriving&&!inside)return res.json({ok:true,ignored:'already-timed-out'});
    const net=ssid||wifi[0]||'the dorm Wi-Fi';
    const msg=arriving
      ?{title:byWifi?`📶 Connected to ${net}`:`📍 You're at ${place}`,body:`${sp.name}: you're not timed in yet. Tap to time in.`,url:'/?punch=in',tag:'presence-in'}
      :{title:byWifi?`📴 Left ${net}`:`🚶 You left ${place}`,body:`${sp.name}: you're still timed in. Tap to time out (ignore this if you're still home).`,url:'/?punch=out',tag:'presence-out'};
    const n=await push([uid],msg);
    res.json({ok:true,sent:n>0,devices:n})
  }catch(e){console.error(e);res.status(500).json({error:'server error'})}
}
