import {useState} from 'react';
import {doc,collection,addDoc,updateDoc,deleteDoc} from 'firebase/firestore';
import {db} from './firebase';
import {ping} from './notify';
import {buzz} from './ui';
import {manilaMid,manilaDay} from './lib';

// "NO 8 PM AUTO TIME-IN" DAYS
//  A member asks the host to turn the 8:00 PM auto time-in off for a range of days. Nothing changes until the host approves.
//  The host's own request is approved straight away. Approved days are turned into virtual "confirmed away" entries in src/lib.js
//  (offPunches), so the app, the server and the reminders all follow the same rule.
//  Document: spaces/{sid}/autoOff/{id} = {uid, a, b, reason, status: pending | approved | denied | revoked, createdAt, decidedAt, revokedAt}
//  a / b = Manila midnight of the first / last day.

const DAY=864e5,MAXD=31;
const show=t=>new Date(t).toLocaleDateString('en-PH',{month:'short',day:'numeric',timeZone:'Asia/Manila'});
const range=x=>x.b>x.a?`${show(x.a)} – ${show(x.b)}`:show(x.a);
const nDays=x=>Math.round((x.b-x.a)/DAY)+1;
const TAG={pending:'t-pending',approved:'t-approved',denied:'t-denied',revoked:'t-denied'};

export default function AutoOff({u,sp,owner,members,nm,AO,say}){
 const today=manilaDay(),[from,setFrom]=useState(today),[to,setTo]=useState(today),[why,setWhy]=useState(''),[busy,setBusy]=useState(false);
 const ref=id=>doc(db,'spaces',sp.id,'autoOff',id),F=id=>(nm(id)||'Former member').split(' ')[0];
 const now=Date.now(),a=from?manilaMid(from):NaN,b=to?manilaMid(to):NaN,
  // 7:30 PM Manila is when the "confirm you are away" window opens, so today is only possible before that
  late=a===manilaMid(today)&&now>=a+19.5*36e5;

 const mine=AO.filter(x=>x.uid===u.uid).sort((p,q)=>q.createdAt-p.createdAt),
  waiting=AO.filter(x=>x.status==='pending').sort((p,q)=>p.createdAt-q.createdAt),
  // approved and still running or coming up (the last day's 8 PM has not passed yet)
  active=AO.filter(x=>x.status==='approved'&&x.b+20*36e5>now).sort((p,q)=>p.a-q.a);

 const check=()=>{
  if(!(a>0&&b>0))return 'Pick the first and last day.';
  if(b<a)return 'The last day is before the first day.';
  if(a<manilaMid(today))return 'You can only choose today or later. Past days cannot be changed.';
  if(late)return 'It is already past 7:30 PM today. Start from tomorrow instead.';
  if(nDays({a,b})>MAXD)return `At most ${MAXD} days in one request.`;
  if(!why.trim())return 'Add a short reason so the host can decide.';
  if(mine.some(x=>(x.status==='pending'||x.status==='approved')&&x.a<=b&&a<=x.b))return 'You already have a request that covers some of these days.';
  return ''};
 const err=check();

 const send=async()=>{if(err)return say(err,4500);setBusy(true);
  try{const t=Date.now(),own=owner;
   const r=await addDoc(collection(db,'spaces',sp.id,'autoOff'),{uid:u.uid,a,b,reason:why.trim().slice(0,140),status:own?'approved':'pending',createdAt:t,...(own?{decidedAt:t,decidedBy:u.uid}:{})});
   if(!own)ping({sid:sp.id,kind:'offreq',id:r.id});
   setWhy('');buzz();say(own?'Done ✓ No auto time-in on those days':'Request sent to the host 🌙',4500)}
  catch(e){say('Failed: '+e.message+' (publish the latest firestore.rules)',7000)}finally{setBusy(false)}};
 const cancel=async x=>{if(!confirm('Cancel this request?'))return;try{await deleteDoc(ref(x.id));say('Request cancelled')}catch(e){say('Failed: '+e.message,5000)}};
 const decide=async(x,status)=>{try{await updateDoc(ref(x.id),{status,decidedAt:Date.now(),decidedBy:u.uid});buzz();ping({sid:sp.id,kind:'offdecision',id:x.id});say(status==='approved'?'Approved ✓ They were told':'Denied. They were told',4000)}catch(e){say('Failed: '+e.message,5000)}};
 const revoke=async x=>{if(!confirm(`Turn the auto time-in back on for ${F(x.uid)}? Days that already passed stay as they were.`))return;
  try{await updateDoc(ref(x.id),{status:'revoked',revokedAt:Date.now(),decidedBy:u.uid});buzz();ping({sid:sp.id,kind:'offdecision',id:x.id});say('Auto time-in is back on for them')}catch(e){say('Failed: '+e.message,5000)}};

 const row=(x,who)=><div key={x.id} className="blk"><div className="row sp"><div style={{minWidth:0}}><b>{who?F(x.uid)+' · ':''}{range(x)}</b><div className="mut">{nDays(x)} day{nDays(x)>1?'s':''}{x.reason?` · “${x.reason}”`:''}</div></div><span className={`tag ${TAG[x.status]||'t-pending'}`}>{x.status}</span></div>
  {x.uid===u.uid&&x.status==='pending'&&<button className="sm w" style={{marginTop:8}} onClick={()=>cancel(x)}>Cancel request</button>}
  {x.uid===u.uid&&x.status==='approved'&&!owner&&<p className="mut" style={{marginTop:6}}>Changed your plans? Ask {F(sp.ownerId)} to turn it back on.</p>}</div>;

 return <>
  <p className="mut" style={{marginBottom:10}}>At <b>8:00 PM</b> you are timed in automatically unless you confirm you are still away between 7:30 and 8:00 PM. Going away for a few days? Ask {owner?'yourself (the host)':F(sp.ownerId)} to switch it off for those days, so you are <b>not</b> timed in at 8:00 PM on them.</p>

  {owner&&waiting.length>0&&<><h4>Waiting for your decision</h4>{waiting.map(x=><div key={x.id} className="blk"><div className="row sp"><div style={{minWidth:0}}><b>{F(x.uid)} · {range(x)}</b><div className="mut">{nDays(x)} day{nDays(x)>1?'s':''} · “{x.reason}”</div></div></div>
   <div className="row" style={{marginTop:10}}><button className="ok" style={{flex:1}} onClick={()=>decide(x,'approved')}>Approve</button><button className="no" style={{flex:1}} onClick={()=>decide(x,'denied')}>Deny</button></div></div>)}</>}

  <h4>{owner?'Turn it off for yourself':'Ask the host to turn it off'}</h4>
  <div className="row" style={{alignItems:'flex-start'}}><div style={{flex:1}}><label>First day</label><input type="date" min={today} value={from} onChange={e=>{setFrom(e.target.value);if(to<e.target.value)setTo(e.target.value)}}/></div>
   <div style={{flex:1}}><label>Last day</label><input type="date" min={from||today} value={to} onChange={e=>setTo(e.target.value)}/></div></div>
  <label>Reason</label><input value={why} maxLength={140} placeholder="e.g. Going home for the long weekend" onChange={e=>setWhy(e.target.value)}/>
  <p className="mut" style={{marginBottom:10}}>{a>0&&b>=a?`${nDays({a,b})} day${nDays({a,b})>1?'s':''}: you will not be auto timed in at 8:00 PM on ${range({a,b})}.`:''} {err?`⚠️ ${err}`:''}</p>
  <button className="pri w" disabled={busy||!!err} onClick={send}>{busy?'Sending…':owner?'Turn it off for these days':'Send request to the host'}</button>
  <p className="mut" style={{marginTop:8}}>Only days that are still ahead can be changed. Once approved, days that already passed are never rewritten.</p>

  {mine.length>0&&<><h4>My requests</h4>{mine.map(x=>row(x,false))}</>}
  {active.length>0&&<><h4>{owner?'Approved and upcoming (everyone)':'Who has it off'}</h4>
   {active.map(x=><div key={x.id} className="blk"><div className="row sp"><div style={{minWidth:0}}><b>{F(x.uid)} · {range(x)}</b><div className="mut">{nDays(x)} day{nDays(x)>1?'s':''}{x.reason?` · “${x.reason}”`:''}</div></div>
    {owner&&<button className="sm no" onClick={()=>revoke(x)}>Turn back on</button>}</div></div>)}</>}
 </>}
