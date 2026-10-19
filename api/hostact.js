import {auth,db,push,who,others} from './_lib.js';
import {norm} from '../src/lib.js';

// Host actions on a member who disconnected from the dorm Wi-Fi but is still timed in.
// POST {sid, action:'timeout'|'remind'|'dismiss', target, when?:'wifi'|'now', text?}  with  Authorization: Bearer <Firebase ID token>
const tf=ts=>new Date(ts).toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'});
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  try{
    const tok=(req.headers.authorization||'').replace(/^Bearer /,'');
    const {uid}=await auth.verifyIdToken(tok);
    const {sid,action,target,when,text}=req.body||{};
    if(!sid||!action||!target)return res.status(400).json({error:'bad request'});
    const sd=await db.doc(`spaces/${sid}`).get();if(!sd.exists)return res.status(404).json({error:'no such space'});
    const sp=sd.data();
    if(sp.ownerId!==uid)return res.status(403).json({error:'only the host can do this'});
    if(!(sp.members||[]).includes(target))return res.status(404).json({error:'not a member'});
    const pres=sd.ref.collection('presence').doc(target),pd=(await pres.get()).data()||{},host=who(sp,uid),name=who(sp,target);

    if(action==='dismiss'){await pres.set({pending:false,resolved:'host-ok',resolvedAt:Date.now()},{merge:true});return res.json({ok:true})}

    if(action==='remind'){
      const msg=String(text||'').trim().slice(0,140)||'Are you still in the dorm? Please time out if you left.';
      const n=await push([target],{title:`🔔 ${host} sent you a reminder`,body:msg,url:'/?punch=out',tag:'host-remind'});
      await pres.set({lastRemindAt:Date.now()},{merge:true});
      return res.json({ok:true,devices:n});
    }

    if(action==='timeout'){
      const rows=(await sd.ref.collection('punches').orderBy('ts','desc').limit(300).get()).docs.map(d=>d.data());
      const last=norm(target,rows,Date.now()).at(-1);
      if(last?.type!=='in'){await pres.set({pending:false,resolved:'already-out',resolvedAt:Date.now()},{merge:true});return res.json({ok:true,already:true})}
      // time them out at the recorded Wi-Fi disconnect time (never before their time in), or right now
      const ts=when==='wifi'&&pd.outAt&&pd.outAt>last.ts?pd.outAt:Date.now();
      const pu=await sd.ref.collection('punches').add({uid:target,type:'out',ts,wifi:true,by:uid,pushed:true});
      await pres.set({pending:false,state:'out',resolved:'timed-out',resolvedAt:Date.now()},{merge:true});
      await push([target],{title:'🚪 You were timed out',body:`${host} timed you out at ${tf(ts)} because you left the dorm Wi-Fi. Wrong? Open DormMate and send a fix request.`,tag:'host-out-'+pu.id});
      await push(others(sp,target).filter(m=>m!==uid),{title:`🚪 ${name} is out`,body:`Timed out at ${tf(ts)} (left the dorm Wi-Fi).`,tag:'punch-'+pu.id});
      return res.json({ok:true,ts});
    }
    res.status(400).json({error:'unknown action'})
  }catch(e){console.error(e);res.status(500).json({error:'server error'})}
}
