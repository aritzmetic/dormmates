import {auth,db,push,who,others} from './_lib.js';

const tf=ts=>new Date(ts).toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'});
const dd=ts=>new Date(ts).toLocaleDateString('en-PH',{month:'short',day:'numeric',timeZone:'Asia/Manila'});
const money=n=>'₱'+(+n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const cut=(t,n=140)=>String(t||'').slice(0,n);
const KIND={add:'Add time',in:'Add time in',out:'Add time out',edit:'Edit session',remove:'Remove session'};

// The app calls this right after an action. The server re-reads the saved document, so the message
// always comes from real data and only the right person can trigger it.
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'POST only'});
  try{
    const tok=(req.headers.authorization||'').replace(/^Bearer /,'');
    const {uid}=await auth.verifyIdToken(tok);
    const {sid,kind,id,target}=req.body||{};
    if(!sid||!kind||!id)return res.status(400).json({error:'bad request'});

    const sref=db.doc(`spaces/${sid}`),ss=await sref.get();
    if(!ss.exists)return res.status(404).json({error:'no such space'});
    const sp=ss.data();
    if(!(sp.members||[]).includes(uid))return res.status(403).json({error:'not a member'});
    const owner=sp.ownerId===uid,fresh=t=>Math.abs(Date.now()-t)<15*60e3;
    const get=async c=>{const r=sref.collection(c).doc(String(id)),d=await r.get();return{r,d:d.exists?d.data():null}};
    const skip=()=>res.json({ok:true,skipped:true});
    let to=[],msg=null;

    if(kind==='punch'){
      const{r,d}=await get('punches');
      if(!d||d.uid!==uid||!['in','out'].includes(d.type)||!fresh(d.ts)||d.pushed)return skip();
      await r.update({pushed:true});to=others(sp,uid);
      msg={title:`${d.type==='in'?'🟢':'🔴'} ${sp.name}`,body:`${who(sp,uid)} timed ${d.type} at ${tf(d.ts)}`,tag:'punch-'+id};
    }
    else if(kind==='note'){
      const{r,d}=await get('notes');
      if(!d||d.uid!==uid||!fresh(d.createdAt)||d.pushed)return skip();
      await r.update({pushed:true});to=others(sp,uid);
      msg={title:`📌 ${who(sp,uid)} posted on the notice board`,body:cut(d.text),tag:'note-'+id};
    }
    else if(kind==='announcement'){
      const{r,d}=await get('announcements');
      if(!owner||!d||d.uid!==uid||!fresh(d.createdAt)||d.pushed)return skip();
      await r.update({pushed:true});to=others(sp,uid);
      msg={title:`📣 ${sp.name}`,body:cut(d.text),tag:'ann-'+id};
    }
    else if(kind==='test'){
      to=[uid];msg={title:'✅ Server push works',body:'DormMates can notify this phone, even when the app is closed.',tag:'test'};
    }
    else if(kind==='bills'){
      // only fires when the host taps "Send to dormmates" (sentAt is stamped then), never for a private draft
      const{r,d}=await get('bills');
      if(!owner||!d||!(d.elec||d.water)||!d.sentAt||!fresh(d.sentAt)||d.billPushed===d.sentAt)return skip();
      await r.update({billPushed:d.sentAt});to=others(sp,uid);
      msg={title:'💡 Bills updated',body:`Electric ${money(d.elec)} · Water ${money(d.water)}.${d.due?` Pay by ${dd(d.due)}.`:''} Open the app to see your share.`,tag:'bills-'+id};
    }
    else if(kind==='final'){
      const{d}=await get('bills');
      if(!owner||!d?.final)return skip();
      to=others(sp,uid);
      msg={title:'🔒 Bills finalized',body:'Hours are locked. Check your share in the Bills tab.',tag:'final-'+id};
    }
    else if(kind==='paid'){
      const{d}=await get('bills');
      if(!owner||!d?.paid?.[target]||!(sp.members||[]).includes(target))return skip();
      to=[target];
      msg={title:'✅ Payment received',body:'The host marked your bill as paid.',tag:'paid-'+id};
    }
    else if(kind==='fixdue'){
      const{d}=await get('bills');
      if(!owner||!d?.fixDue)return skip();
      to=others(sp,uid);
      msg={title:'⏳ Fix request deadline set',body:`Requests for this cycle close ${dd(d.fixDue)}, ${tf(d.fixDue)}. Send yours before then.`,tag:'fixdue-'+id};
    }
    else if(kind==='receipts'){
      const{r,d}=await get('bills');
      if(!owner||!d?.receiptsAt||!fresh(d.receiptsAt)||d.rcPushed===d.receiptsAt)return skip();
      await r.update({rcPushed:d.receiptsAt});to=others(sp,uid);
      msg={title:'🧾 Your receipt is ready',body:`${sp.name}: open the Bills tab to download your PDF receipt.`,tag:'receipt-'+id};
    }
    else if(kind==='remindunpaid'){
      const{r,d}=await get('bills');
      if(!owner||!d||!(d.elec||d.water)||(d.nudgeAt&&Date.now()-d.nudgeAt<36e5))return skip();
      await r.update({nudgeAt:Date.now()});
      to=(sp.members||[]).filter(m=>m!==uid&&!d.paid?.[m]);
      msg={title:'💡 Friendly bill reminder',body:`${sp.name}: you still have an unpaid bill${d.due?` (pay by ${dd(d.due)})`:''}. Open the app to see your share.`,tag:'nudge-'+id};
    }
    else if(kind==='remset'){
      // confirmation that the person's reminders were saved; goes through the same push path as every other notification
      const t=String(req.body?.text||'').slice(0,160);
      to=[uid];msg={title:'⏰ Reminders set ✓',body:t||'Your reminders are saved.',tag:'remset'};
    }
    else if(kind==='suggest'){
      const{r,d}=await get('exceptions');
      if(!owner||!d||d.suggestedBy!==uid||d.status!=='suggested'||!fresh(d.createdAt)||d.pushed)return skip();
      await r.update({pushed:true});to=[d.uid];
      msg={title:`💡 ${who(sp,uid)} suggested a correction`,body:cut(`${KIND[d.kind||'add']}${d.batchN>1?` · ${d.batchN} days`:''} · “${d.reason||'no reason'}”. Open Fixes to accept or decline.`),tag:'suggest-'+id};
    }
    else if(kind==='sugdecision'){
      const{r,d}=await get('exceptions');
      if(!d||d.uid!==uid||!d.suggestedBy||!['approved','denied'].includes(d.status)||!fresh(d.decidedAt)||d.pushedDecision===d.status)return skip();
      await r.update({pushedDecision:d.status});to=[d.suggestedBy];
      msg={title:d.status==='approved'?'✅ Suggestion accepted':'❌ Suggestion declined',body:cut(`${who(sp,uid)} ${d.status==='approved'?'accepted':'declined'} your suggested correction.`),tag:'sug-'+id};
    }
    else if(kind==='fixnew'){
      const{r,d}=await get('exceptions');
      if(!d||d.uid!==uid||d.status!=='pending'||!fresh(d.createdAt)||d.pushed||owner)return skip();
      await r.update({pushed:true});to=[sp.ownerId];
      msg={title:`📝 ${who(sp,uid)} sent a fix request`,body:cut(`${KIND[d.kind||'add']}${d.batchN>1?` · ${d.batchN} days`:''} · “${d.reason||'no reason'}”`),tag:'fixnew-'+id};
    }
    else if(kind==='fixdecision'){
      const{r,d}=await get('exceptions');
      if(!owner||!d||!['approved','denied'].includes(d.status)||!fresh(d.decidedAt)||d.pushedDecision===d.status)return skip();
      await r.update({pushedDecision:d.status});to=[d.uid];
      // a batch (one request per day) is decided in one go: say how many days were decided together
      let n=1;if(d.batch){const q=await sref.collection('exceptions').where('batch','==',d.batch).get();n=q.docs.filter(z=>z.data().status===d.status&&Math.abs((z.data().decidedAt||0)-d.decidedAt)<6e4).length||1}
      msg={title:d.status==='approved'?'✅ Fix approved':'❌ Fix denied',body:cut(`${KIND[d.kind||'add']}${n>1?` · ${n} days`:''} · “${d.reason||'no reason'}”`),tag:'fix-'+id};
    }
    else return res.status(400).json({error:'unknown kind'});

    const devices=msg?await push(to,msg):0;
    res.json({ok:true,sent:to.length,devices});
  }catch(e){
    console.error('notify error',e);
    res.status(e.code?.startsWith?.('auth/')?401:500).json({error:e.message});
  }
}
