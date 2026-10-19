import {createHash,timingSafeEqual} from 'node:crypto';
import {db,push,who,others} from './_lib.js';
import {norm} from '../src/lib.js';

// Called by a phone automation (iPhone Shortcuts / Android MacroDroid / Tasker) when the phone connects to or disconnects from the DORM Wi-Fi.
// It works while the DormMate app is closed.
//   wifi_in  -> the person is timed in AUTOMATICALLY (unless they turned that off) and is told. The dorm is told too.
//   wifi_out -> the person is reminded to time out. They are NOT timed out. The disconnect time is recorded, and if they are still timed in
//               after the grace period, api/tick.js asks the host to verify (the host can time them out at the recorded time).
// GET /api/presence?uid=...&sid=...&key=...&event=wifi_in|wifi_out|test[&ssid=NAME]
const h=s=>createHash('sha256').update(String(s)).digest();
const tf=ts=>new Date(ts).toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'});
export default async function handler(req,res){
  const q={...req.query,...(req.body&&typeof req.body==='object'?req.body:{})};
  const{uid,sid,key,event,ssid}=q;
  if(!uid||!sid||!key||!event)return res.status(400).json({error:'missing uid, sid, key or event'});
  if(!['wifi_in','wifi_out','test'].includes(event))return res.status(400).json({error:'unknown event'});
  try{
    const pr=db.doc(`prefs/${uid}`),p=(await pr.get()).data();
    if(!p?.autoKey||!timingSafeEqual(h(p.autoKey),h(key)))return res.status(401).json({error:'unauthorized'});
    const sd=await db.doc(`spaces/${sid}`).get(),sp=sd.data();
    if(!sp||!(sp.members||[]).includes(uid))return res.status(404).json({error:'not a member of this space'});
    const wifi=sp.cfg?.wifi||[];
    if(event==='test'){const n=await push([uid],{title:'✅ Auto-detect works',body:`${sp.name}: your phone can reach DormMate. Connecting to the dorm Wi-Fi will time you in automatically.`,tag:'presence-test'});return res.json({ok:true,devices:n})}
    // if the automation sends the network name, only the dorm's Wi-Fi counts
    if(ssid&&wifi.length&&!wifi.some(w=>w.toLowerCase()===String(ssid).toLowerCase()))return res.json({ok:true,ignored:'other-network'});
    const lp=p.lastPresence||{};if(lp.event===event&&Date.now()-lp.at<90e3)return res.json({ok:true,ignored:'duplicate'});   // Wi-Fi can flap
    await pr.set({lastPresence:{event,at:Date.now()}},{merge:true});

    const rows=(await sd.ref.collection('punches').orderBy('ts','desc').limit(300).get()).docs.map(d=>d.data());
    const inside=norm(uid,rows,Date.now()).at(-1)?.type==='in',t=Date.now(),net=ssid||wifi[0]||'the dorm Wi-Fi',pres=sd.ref.collection('presence').doc(uid);

    if(event==='wifi_in'){
      await pres.set({uid,state:'in',inAt:t,ssid:net,pending:false,escalatedAt:null,outAt:null},{merge:true});
      if(inside)return res.json({ok:true,ignored:'already-timed-in'});
      if(p.wifiAuto===false){const n=await push([uid],{title:`📶 Connected to ${net}`,body:`${sp.name}: you're not timed in yet. Tap to time in.`,url:'/?punch=in',tag:'presence-in'});return res.json({ok:true,asked:true,devices:n})}
      const pu=await sd.ref.collection('punches').add({uid,type:'in',ts:t,wifi:true,ssid:net,pushed:true});
      const n=await push([uid],{title:'📶 You were timed in automatically',body:`You connected to ${net}, so DormMate timed you in at ${tf(t)}. Not home? Open the app to fix it.`,tag:'wifi-in-'+pu.id});
      await push(others(sp,uid),{title:`🏠 ${who(sp,uid)} is home`,body:`Timed in automatically at ${tf(t)} on the dorm Wi-Fi.`,tag:'punch-'+pu.id});
      return res.json({ok:true,timedIn:true,devices:n});
    }
    // wifi_out
    if(!inside){await pres.set({uid,state:'out',outAt:t,ssid:net,pending:false,escalatedAt:null},{merge:true});return res.json({ok:true,ignored:'already-timed-out'})}
    const cur=(await pres.get()).data(),first=cur?.pending&&cur?.outAt?cur.outAt:t;   // keep the FIRST disconnect time
    await pres.set({uid,state:'out',outAt:first,ssid:net,pending:true,escalatedAt:cur?.pending?(cur.escalatedAt||null):null},{merge:true});
    const n=await push([uid],{title:`📴 You left ${net}`,body:`${sp.name}: don't forget to time out. DormMate did not time you out. Ignore this if you are still home.`,url:'/?punch=out',tag:'wifi-out'});
    res.json({ok:true,reminded:n>0,recordedAt:first,devices:n})
  }catch(e){console.error(e);res.status(500).json({error:'server error'})}
}
