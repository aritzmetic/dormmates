process.env.TZ='Asia/Manila';
import {db,push} from './_lib.js';
import {away} from '../src/lib.js';

// Called by an outside timer (cron-job.org) at 7:30 PM and 7:55 PM Manila time.
// Pushes "confirm you are away" to anyone who is timed out and inside the confirm window.
export default async function handler(req,res){
  const key=req.query.key||(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!process.env.CRON_SECRET||key!==process.env.CRON_SECRET)return res.status(401).json({error:'unauthorized'});
  try{
    const now=Date.now()+60e3;           // timer may fire a few seconds early/late
    const due=new Map();                 // uid -> minutes left
    const spaces=await db.collection('spaces').get();
    await Promise.all(spaces.docs.map(async s=>{
      const q=await s.ref.collection('punches').orderBy('ts','desc').limit(300).get();
      const P=q.docs.map(d=>d.data());
      for(const uid of s.data().members||[]){
        const a=away(uid,P,now);
        if(a?.open)due.set(uid,Math.min(due.get(uid)??99,Math.max(1,Math.round((a.D-now)/6e4))));
      }
    }));
    for(const[uid,m]of due)
      await push([uid],{title:'⏰ Confirm you are away',body:`Confirm you're still away. ${m} min left before you're timed in at 8:00 PM.`});
    res.json({ok:true,reminded:due.size});
  }catch(e){console.error('remind error',e);res.status(500).json({error:e.message})}
}
