import {useState} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence} from 'framer-motion';
import {doc,setDoc,updateDoc,deleteField,writeBatch} from 'firebase/firestore';
import {db} from './firebase';
import {List,Item,Sheet,Cycle,buzz} from './ui';
import {fmt,tm,dur,dayAt,cycOf,eod,iv,daily,pairs,splitDays,fixCheck,xr,norm,FIX} from './lib';

const iso=t=>new Date(t-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16);
const hm=t=>iso(t).slice(11,16);
// "HH:MM" on the day d0 -> timestamp. 23:59 means the very end of that day (11:59 PM)
const at=(d0,v)=>{if(!v)return NaN;if(v==='23:59')return eod(d0);const[h,m]=v.split(':').map(Number),d=new Date(d0);return +new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,m)};
const dayName=t=>new Date(t).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
const STATUS={all:'Any status',pending:'Pending',suggested:'Suggested',approved:'Approved',denied:'Denied'};

// Fixes tab. Every fix is saved ONE DAY AT A TIME (v:2), so changing, denying or cancelling one day never touches another day.
//  - Time in + out : a range; if it spans several days it is split (first day -> 11:59 PM, middle days 12:00 AM -> 11:59 PM, last day 12:00 AM -> end)
//  - Time in only  : "I forgot to time in" - counts until your next time out
//  - Time out only : "I forgot to time out" - ends your open session at that time
//  - Edit / Remove : change or delete one day's part of a session
// `P` here already contains approved in/out-only fixes (App passes withFix(P,X)).
export default function Fixes({u,sp,owner,members,nm,P,X,B,r,off,setOff,cd,say,col,ping,zoom}){
 const cfg=sp.cfg||{},now=Date.now(),sid=sp.id,maxD=cfg.fixMaxDays||31,oldest=!owner&&cfg.fixBackDays>0?+dayAt(now,-cfg.fixBackDays):0,auto=owner&&cfg.hostAuto!==false;
 const [fw,setFw]=useState(owner?'all':u.uid),[fs,setFs]=useState('all'),[ex,setEx]=useState({}),[dy,setDy]=useState(null),[ef,setEf]=useState(null),[busy,setBusy]=useState(false),[vu,setVu]=useState(u.uid),[more,setMore]=useState(false);
 // host can look at any member's punches (counter-check). Changes made while looking at someone else are SUGGESTIONS that member must accept.
 const tu=owner&&members.some(m=>m.id===vu)?vu:u.uid,sg=tu!==u.uid,open_=x=>x.status==='pending'||x.status==='suggested';
 const xref=id=>doc(db,'spaces',sid,'exceptions',id),bref=doc(db,'spaces',sid,'bills',String(r[0]));

 // ---------- calendar ----------
 const days=[];for(let i=0;+dayAt(r[0],i)<r[1];i++)days.push(+dayAt(r[0],i));
 const dd=daily(iv(tu,P,X,r),r),mx=Math.max(1,...dd),lead=new Date(days[0]).getDay(),tdy=+dayAt(now,0);
 const touches=(x,d0)=>x.day!=null?x.day===d0:(([a,b])=>a<+dayAt(d0,1)&&b>d0)(xr(x));
 const pd=d=>X.some(x=>x.uid===tu&&open_(x)&&touches(x,d));

 // ---------- locks ----------
 const lockOf=cs=>{const z=B.find(x=>x.id===String(cs))||{};return !!z.final||(!!z.fixDue&&Date.now()>z.fixDue)};
 const lockedX=x=>!!B.find(z=>z.id===x.cyc)?.final;
 const bb=B.find(x=>x.id===String(r[0]))||{},lock=lockOf(r[0]);
 const saveFx=async ev=>{ev.preventDefault();const v=new FormData(ev.target).get('fx');if(!v)return say('Pick a date and time.');
  try{await setDoc(bref,{fixDue:+new Date(v)},{merge:true});ping({sid,kind:'fixdue',id:String(r[0])});buzz();say('Deadline saved ✓')}catch(e){say(e.message,5000)}};
 const clearFx=()=>setDoc(bref,{fixDue:deleteField()},{merge:true}).then(()=>say('Deadline removed'));

 // ---------- decide / cancel ----------
 const decide=async(list,status)=>{const L=list.filter(x=>x.status==='pending'&&!lockedX(x));
  if(!L.length)return say('Nothing to decide here (locked or already decided).');
  if(L.length>1&&!confirm(`${status==='approved'?'Approve':'Deny'} ${L.length} requests?`))return;
  try{const bt=writeBatch(db),t=Date.now();L.forEach((x,i)=>bt.update(xref(x.id),{status,decidedAt:t+i,decidedBy:u.uid}));await bt.commit();
   ping({sid,kind:'fixdecision',id:L[0].id});buzz();say(L.length>1?`${L.length} requests ${status} ✓`:status==='approved'?'Approved ✓':'Denied')}catch(e){say(e.message,5000)}};
 const respond=async(list,status)=>{const L=list.filter(x=>x.status==='suggested'&&x.uid===u.uid&&!lockedX(x));if(!L.length)return say('Nothing to answer here.');
  try{const bt=writeBatch(db),t=Date.now();L.forEach((x,i)=>bt.update(xref(x.id),{status,decidedAt:t+i,decidedBy:u.uid}));await bt.commit();ping({sid:sp.id,kind:'sugdecision',id:L[0].id});buzz();say(status==='approved'?'Accepted ✓ Your hours were updated':'Declined')}catch(e){say(e.message,5000)}};
 const withdraw=async list=>{try{const bt=writeBatch(db);list.forEach(x=>bt.delete(xref(x.id)));await bt.commit();say('Suggestion withdrawn')}catch(e){say(e.message,5000)}};
 const reopen=x=>updateDoc(xref(x.id),{status:'pending',decidedAt:deleteField(),decidedBy:deleteField(),pushedDecision:deleteField()}).then(()=>say('Moved back to pending')).catch(e=>say(e.message,5000));
 const cancel=async list=>{const L=list.filter(x=>x.uid===u.uid&&x.status==='pending');if(!L.length)return;
  if(L.length>1&&!confirm(`Cancel ${L.length} pending requests?`))return;
  try{const bt=writeBatch(db);L.forEach(x=>bt.delete(xref(x.id)));await bt.commit();buzz();say(L.length>1?`${L.length} requests cancelled`:'Request cancelled')}catch(e){say(e.message,5000)}};

 // ---------- send ----------
 const send=async()=>{if(busy)return;const d0=dy,t0=Date.now(),reason=ef.r.trim();
  if(cfg.needReason!==false&&!reason)return say('Add a short reason.');
  const mk=o=>({uid:tu,v:2,reason,status:sg?'suggested':'pending',createdAt:t0,cyc:String(cycOf(o.day,cd)),...(sg?{suggestedBy:u.uid}:{}),...o});let docs=[];
  if(ef.mode==='inout'){const a=+new Date(ef.i),b=+new Date(ef.o);
   if(!(a>0&&b>a))return say('Time out must be after time in.');if(b>t0+6e4)return say("Time out can't be in the future.");
   const sg=splitDays(a,b);if(sg.length>maxD)return say(`That is ${sg.length} days. The limit per request is ${maxD} days.`,5000);
   docs=sg.map(s=>mk({kind:'add',mode:'inout',day:s.day,inTs:s.a,outTs:s.b,cutA:s.a,cutB:s.b}))}
  else if(ef.mode==='in'||ef.mode==='out'){const T=at(d0,ef.t);if(!(T>0))return say('Pick a time.');const c=fixCheck(tu,P,ef.mode,T,t0);if(!c.ok)return say(c.msg,6000);
   docs=[mk({kind:ef.mode,mode:ef.mode,day:d0,ts:T})]}
  else if(ef.mode==='edit'){const A=at(d0,ef.ti),B2=at(d0,ef.to);if(!(A>0&&B2>A))return say('Time out must be after time in.');if(B2>t0+6e4)return say("Time out can't be in the future.");
   docs=[mk({kind:'edit',mode:'edit',day:d0,inTs:A,outTs:B2,cutA:ef.s.ca,cutB:ef.s.cb,origA:ef.s.ca,origB:ef.s.cb})]}
  else docs=[mk({kind:'remove',mode:'remove',day:d0,inTs:ef.s.ca,outTs:ef.s.cb,cutA:ef.s.ca,cutB:ef.s.cb,origA:ef.s.ca,origB:ef.s.cb})];
  const bad=[...new Set(docs.map(x=>cycOf(x.day,cd)))].find(lockOf);
  if(bad!=null)return say(`Fix requests are closed for the cycle starting ${new Date(bad).toLocaleDateString([],{month:'short',day:'numeric'})}.`,5000);
  if(oldest&&docs.some(x=>x.day<oldest))return say(`Requests can only go back ${cfg.fixBackDays} days.`,5000);
  const refs=docs.map(()=>doc(col('exceptions'))),head=refs[0].id;
  docs.forEach((x,i)=>{if(auto&&!sg){x.status='approved';x.decidedAt=t0+i;x.decidedBy=u.uid}if(docs.length>1){x.batch=head;x.batchN=docs.length}});
  setBusy(true);
  try{const bt=writeBatch(db);docs.forEach((x,i)=>bt.set(refs[i],x));await bt.commit();if(sg)ping({sid,kind:'suggest',id:head});else if(!auto)ping({sid,kind:'fixnew',id:head});
   setDy(null);setEf(null);buzz();say(sg?`Suggestion sent to ${nm(tu)} ✓ They must accept it`:auto?'Fix applied ✓':docs.length>1?`${docs.length} daily requests sent ✓`:'Request sent ✓')}
  catch(e){say('Failed: '+e.message,5000)}finally{setBusy(false)}};

 // ---------- day sheet ----------
 const sheetBody=()=>{const d0=dy,d1=+dayAt(d0,1),title=new Date(d0).toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'}),
   LK=lockOf(cycOf(d0,cd))||d0<oldest,
   SS=pairs(tu,P,X).filter(s=>s.a<d1&&s.b>d0).sort((a,b)=>a.a-b.a).map(s=>({...s,ca:Math.max(s.a,d0),cb:Math.min(s.b,d1)})),
   edits=SS.filter(s=>!s.live),PN=X.filter(x=>x.uid===tu&&open_(x)&&touches(x,d0)).length,RAW=[...norm(tu,P),...P.filter(p=>p.uid===tu&&p.type==='away')].filter(p=>p.ts>=d0&&p.ts<d1).sort((a,b)=>a.ts-b.ts),
   span=s=>`${s.a<d0?'12:00 AM':tm(s.a)} → ${s.live?'now':s.b>=d1?'end of day ↪':tm(s.b)}`,
   startEdit=s=>setEf({mode:'edit',s,ti:hm(s.ca),to:s.cb>=d1?'23:59':hm(s.cb),r:''}),
   startRemove=s=>setEf({mode:'remove',s,r:''});

  if(ef){const M={inout:'Add time in + out',in:'Add time in only',out:'Add time out only',edit:'Edit this session',remove:'Remove this session',pick:'Which session?'}[ef.mode];
   if(ef.mode==='pick')return <><h2>{M}</h2><p className="mut" style={{margin:'6px 0 14px'}}>{title}</p>
    {edits.map((s,i)=><button key={i} className="sp-row" onClick={()=>startEdit(s)}><div style={{flex:1}}><b>{span(s)}</b><div className="mut">{dur((s.cb-s.ca)/36e5)}{s.fix?' · approved fix':''}</div></div>✏️</button>)}
    <button className="w" onClick={()=>setEf(null)}>Back</button></>;

   let pv=null,ok=true,hint=null,form=null;
   if(ef.mode==='inout'){const a=+new Date(ef.i),b=+new Date(ef.o),sg=a>0&&b>a?splitDays(a,b):[],tot=sg.reduce((t,s)=>t+s.b-s.a,0)/36e5;
    ok=sg.length>0&&sg.length<=maxD;
    form=<><label>Time in</label><input type="datetime-local" value={ef.i} onChange={e=>setEf({...ef,i:e.target.value})}/><label>Time out</label><input type="datetime-local" value={ef.o} onChange={e=>setEf({...ef,o:e.target.value})}/></>;
    hint='Starts at 12:00 AM and ends at 11:59 PM by default, change it if needed. Once approved, this replaces any punches inside that window. For several days, set the time in on the first day and the time out on the last day.';
    pv=!sg.length?<div className="pv bad">Time out must be after time in.</div>:sg.length>maxD?<div className="pv bad">That is {sg.length} days. The limit per request is {maxD} days.</div>
     :<div className="pv"><div className="row sp"><b>{sg.length>1?`${sg.length} days`:'1 day'}</b><b>{dur(tot)}</b></div>
       {sg.length>1&&<p className="mut" style={{margin:'4px 0 8px'}}>Each day is its own request, so you can change or cancel one day without touching the rest.</p>}
       {(sg.length>5?[sg[0],sg[1],null,sg.at(-1)]:sg).map((s,k)=>s?<div key={k} className="row sp mut"><span>{dayName(s.day)}</span><span>{tm(s.a)} → {tm(s.b)}</span></div>:<div key={k} className="mut" style={{textAlign:'center'}}>⋮ {sg.length-3} more days ⋮</div>)}</div>}
   else if(ef.mode==='in'||ef.mode==='out'){const T=at(d0,ef.t),c=T>0?fixCheck(tu,P,ef.mode,T,now):{ok:false,msg:'Pick a time.'};ok=c.ok;
    form=<><label>{ef.mode==='in'?'What time did you time in?':'What time did you time out?'}</label><input type="time" value={ef.t} onChange={e=>setEf({...ef,t:e.target.value})}/></>;
    hint=ef.mode==='in'?'Use this when you forgot to time in. It counts until your next time out.':'Use this when you forgot to time out. It ends your open session at this time.';
    pv=<div className={`pv ${c.ok?'':'bad'}`}>{c.msg}</div>}
   else if(ef.mode==='edit'){const A=at(d0,ef.ti),B2=at(d0,ef.to);ok=A>0&&B2>A;
    form=<><div className="sess"><span className="mut">Current</span><div><b>{span(ef.s)}</b></div></div><label>Time in</label><input type="time" value={ef.ti} onChange={e=>setEf({...ef,ti:e.target.value})}/><label>Time out</label><input type="time" value={ef.to} onChange={e=>setEf({...ef,to:e.target.value})}/></>;
    hint="Only this day's part of the session changes. Other days are not affected.";
    pv=ok?<div className="pv"><div className="row sp"><b>New time</b><b>{dur((B2-A)/36e5)}</b></div></div>:<div className="pv bad">Time out must be after time in.</div>}
   else form=<div className="sess"><b>{span(ef.s)}</b><div className="mut">This day's part of the session stops counting once approved. Other days are not affected.</div></div>;

   return <><h2>{M}</h2><p className="mut" style={{margin:'6px 0 14px'}}>{title}</p>{form}{hint&&<p className="mut" style={{margin:'0 0 10px'}}>{hint}</p>}{pv}
    <label>Reason{cfg.needReason===false?' (optional)':''}</label><input value={ef.r} placeholder={ef.mode==='remove'?'Pressed time in by mistake…':ef.mode==='in'?'Forgot to time in when I got home…':ef.mode==='out'?'Forgot to time out when I left…':'What happened?'} onChange={e=>setEf({...ef,r:e.target.value})}/>
    <button className="pri w" style={{marginBottom:8}} disabled={!ok||busy} onClick={send}>{busy?'Sending…':sg?`Suggest to ${nm(tu).split(' ')[0]}`:auto?'Apply fix (auto-approved)':'Send request'}</button><button className="w" onClick={()=>setEf(null)}>Back</button></>}

  const tile=(mode,ic,t,s,go,dim)=><button key={mode} className="tile" style={dim?{opacity:.5}:null} onClick={go}><span style={{fontSize:22}}>{ic}</span><b>{t}</b><small>{s}</small></button>;
  const proofOf=p=>p.photo?<img className="thumb" src={p.photo} onClick={()=>zoom?.(p.photo)}/>:p.loc?<a className="btn sm" target="_blank" href={`https://maps.google.com/?q=${p.loc.lat},${p.loc.lng}`}>📍</a>:null;
  return <><h2>{title}</h2>{sg&&<div className="warn" style={{marginTop:8}}>🔍 Viewing <b>{nm(tu)}</b>'s punches. Anything you change is sent as a <b>suggestion</b> they must accept.</div>}<p className="mut" style={{margin:'4px 0 14px'}}>{dur(iv(tu,P,X,[d0,d1]).reduce((t,[a,b])=>t+b-a,0)/36e5)} logged this day</p>
   {PN>0&&<div className="warn">⏳ {PN} request{PN>1?'s':''} pending for this day.</div>}
   {owner&&<div className="sess"><b>Punches on this day</b>{RAW.length?RAW.map((p,i)=><div key={i} className="pu"><span className="ic">{p.type==='in'?'🟢':p.type==='out'?'🔴':'📍'}</span><div style={{flex:1}}><b>{p.type==='away'?'Confirmed away':p.type==='in'?'Time in':'Time out'}</b> · {tm(p.ts)}<div className="mut">{p.fix?'approved fix':p.auto?'auto time-in (8:00 PM)':p.photo?'photo proof':p.loc?'location proof':p.type==='away'?'proof sent':'no proof'}</div></div>{proofOf(p)}</div>):<p className="mut" style={{marginTop:6}}>No punches recorded.</p>}</div>}
   {SS.map((s,i)=><div key={i} className="sess"><b>{span(s)}</b><div className="mut">{dur((s.cb-s.ca)/36e5)}{s.live?' · still timed in':''}{s.fix?' · approved fix':''}{s.ip?.auto?' · auto time-in':''}{s.a<d0?' · started yesterday':''}</div>
    {!LK&&!s.live&&<div className="row" style={{marginTop:10}}><button className="sm" style={{flex:1}} onClick={()=>startEdit(s)}>✏️ Edit</button><button className="sm no" style={{flex:1}} onClick={()=>startRemove(s)}>🗑 Remove</button></div>}
    {s.live&&<div className="mut" style={{marginTop:6}}>Tip: forgot to time out? Use “Time out only” below.</div>}</div>)}
   {!SS.length&&<p className="mut" style={{marginBottom:12}}>No time logged on this day.</p>}
   {LK?<div className="warn">🔒 Fix requests are closed for this day{d0<oldest?` (members can go back ${cfg.fixBackDays} days)`:''}.</div>
   :<><h3 style={{margin:'14px 0 10px',fontSize:16}}>What do you need to fix?</h3><div className="tiles">
     {tile('edit','✏️','Edit','Change a session’s times',()=>edits.length===1?startEdit(edits[0]):edits.length?setEf({mode:'pick'}):say('No session to edit on this day. Use one of the add options.',3500),!edits.length)}
     {tile('inout','⏱','Time in + out','Add a full session or several days',()=>setEf({mode:'inout',i:iso(d0),o:iso(Math.min(eod(d0),now)),r:''}))}
     {tile('in','🟢','Time in only','I forgot to time in',()=>setEf({mode:'in',t:'00:00',r:''}))}
     {tile('out','🔴','Time out only','I forgot to time out',()=>setEf({mode:'out',t:eod(d0)>now?hm(now):'23:59',r:''}))}</div></>}</>};

 // ---------- request list ----------
 const vis=X.filter(x=>x.cyc===String(r[0])&&(fw==='all'||x.uid===fw)&&(fs==='all'||x.status===fs)),G=[],seen={};
 vis.forEach(x=>{if(x.batch){if(!seen[x.batch]){seen[x.batch]={batch:x.batch,list:[]};G.push(seen[x.batch])}seen[x.batch].list.push(x)}else G.push({list:[x]})});
 G.forEach(g=>g.list.sort((a,b)=>(a.day??a.inTs??a.ts)-(b.day??b.inTs??b.ts)));
 const line=x=>{const k=x.kind||'add';
  if(k==='in'||k==='out')return <p>{k==='in'?'🟢 Time in':'🔴 Time out'} <b>{fmt(x.ts)}</b></p>;
  return <>{k==='edit'&&<p className="mut">Was {fmt(x.origA)} → {fmt(x.origB)}</p>}<p>{k==='remove'?'Remove ':k==='edit'?'Now ':''}{fmt(x.inTs)} → {fmt(x.outTs)} <span className="mut">({dur((x.outTs-x.inTs)/36e5)})</span></p></>};
 const acts=x=>{const lk=lockedX(x);return <>
  {x.status==='pending'&&lk&&<p className="mut" style={{marginTop:8}}>🔒 Cycle finalized, so this can't be decided anymore.</p>}
  {owner&&x.status==='pending'&&!lk&&<div className="row" style={{marginTop:10}}>{['approved','denied'].map(s=><button key={s} className={s==='approved'?'ok':'no'} style={{flex:1}} onClick={()=>decide([x],s)}>{s==='approved'?'Approve':'Deny'}</button>)}</div>}
  {owner&&x.status!=='pending'&&!lk&&<button className="sm w" style={{marginTop:10}} onClick={()=>reopen(x)}>↩ Undo decision</button>}
  {x.uid===u.uid&&x.status==='pending'&&<button className="sm w" style={{marginTop:10}} onClick={()=>cancel([x])}>Cancel request</button>}
  {x.status==='suggested'&&lk&&<p className="mut" style={{marginTop:8}}>🔒 Cycle finalized.</p>}
  {x.status==='suggested'&&!lk&&x.uid===u.uid&&<div className="row" style={{marginTop:10}}><button className="ok" style={{flex:1}} onClick={()=>respond([x],'approved')}>Accept</button><button className="no" style={{flex:1}} onClick={()=>respond([x],'denied')}>Decline</button></div>}
  {x.status==='suggested'&&owner&&<button className="sm w" style={{marginTop:10}} onClick={()=>withdraw([x])}>Withdraw suggestion</button>}</>};
 const single=x=><Item key={x.id}><div className="row sp"><b>{nm(x.uid)}</b><span className={`tag t-${x.status}`}>{x.status}</span></div><p><b>{FIX[x.mode||x.kind||'add']||FIX.add}</b></p>{x.suggestedBy&&<p className="mut">💡 Suggested by {nm(x.suggestedBy)}</p>}{line(x)}<p className="mut">“{x.reason||'no reason'}”</p>{acts(x)}</Item>;
 const group=g=>{const L=g.list,f=L[0],n=s=>L.filter(x=>x.status===s).length,pn=L.filter(x=>x.status==='pending'&&!lockedX(x)),mine=f.uid===u.uid&&L.some(x=>x.status==='pending'),open=!!ex[g.batch];
  return <Item key={g.batch}><div className="row sp"><b>{nm(f.uid)}</b><span className="row" style={{gap:6}}>{['pending','suggested','approved','denied'].filter(s=>n(s)).map(s=><span key={s} className={`tag t-${s}`}>{n(s)} {s}</span>)}</span></div>
   <p><b>{FIX.add}</b> · {L.length} day{L.length>1?'s':''}</p>{f.suggestedBy&&<p className="mut">💡 Suggested by {nm(f.suggestedBy)}</p>}<p>{fmt(L[0].inTs)} → {fmt(L.at(-1).outTs)}</p><p className="mut">“{f.reason||'no reason'}”</p>
   {owner&&pn.length>0&&<div className="row" style={{marginTop:10}}><button className="ok" style={{flex:1}} onClick={()=>decide(pn,'approved')}>Approve all ({pn.length})</button><button className="no" style={{flex:1}} onClick={()=>decide(pn,'denied')}>Deny all ({pn.length})</button></div>}
   {mine&&<button className="sm w" style={{marginTop:10}} onClick={()=>cancel(L)}>Cancel all pending</button>}
   {f.uid===u.uid&&L.some(x=>x.status==='suggested'&&!lockedX(x))&&<div className="row" style={{marginTop:10}}><button className="ok" style={{flex:1}} onClick={()=>respond(L,'approved')}>Accept all</button><button className="no" style={{flex:1}} onClick={()=>respond(L,'denied')}>Decline all</button></div>}
   {owner&&f.suggestedBy&&L.some(x=>x.status==='suggested')&&<button className="sm w" style={{marginTop:10}} onClick={()=>withdraw(L.filter(x=>x.status==='suggested'))}>Withdraw suggestion</button>}
   <button className="sm w" style={{marginTop:10}} onClick={()=>setEx({...ex,[g.batch]:!open})}>{open?'Hide days ▴':'Review day by day ▾'}</button>
   {open&&L.map(x=><div key={x.id} className="sess" style={{marginTop:10,marginBottom:0}}><div className="row sp"><b>{dayName(x.day??x.inTs)}</b><span className={`tag t-${x.status}`}>{x.status}</span></div><p className="mut">{tm(x.inTs)} → {tm(x.outTs)} ({dur((x.outTs-x.inTs)/36e5)})</p>{acts(x)}</div>)}</Item>};

 return <><List><Cycle off={off} set={setOff} d={cd}/>
  {bb.final?<div className="warn">🔒 This cycle is finalized. Hours are locked, so no new fix requests.</div>
   :bb.fixDue?<div className="warn">{lock?`🔒 Fix requests closed on ${fmt(bb.fixDue)}. This cycle is locked.`:`⏳ Fix requests close ${fmt(bb.fixDue)}. Send yours before then.`}</div>:null}
  {owner&&!bb.final&&<Item data-tour="fixdl"><h3>⏳ Fix deadline</h3><p className="mut" style={{marginBottom:8}}>After this time, nobody can send new fix requests for this cycle.</p>
   <form key={r[0]+'-'+(bb.fixDue||'')} onSubmit={saveFx}><input name="fx" type="datetime-local" defaultValue={bb.fixDue?iso(bb.fixDue):''}/><div className="row"><button className="pri" style={{flex:1}}>Save deadline</button>{bb.fixDue&&<button type="button" style={{flex:1}} onClick={clearFx}>Remove</button>}</div></form></Item>}
  {!owner&&X.some(x=>x.uid===u.uid&&x.status==='suggested'&&!lockedX(x))&&<div className="warn">💡 {nm(sp.ownerId)} suggested a correction to your hours. Scroll to Requests to accept or decline it.</div>}
  {owner&&<Item data-tour="counter"><h3>🔍 Counter-check</h3><p className="mut" style={{marginBottom:10}}>See anyone's punches and suggest a time in / out. Your suggestion only counts after that member accepts it.</p>
   <div className="fchips" style={{paddingBottom:0}}>{members.map(m=><button key={m.id} className={`fchip ${tu===m.id?'on':''}`} onClick={()=>{setVu(m.id);setDy(null);setEf(null)}}>{m.id===u.uid?'Me':m.n.split(' ')[0]}</button>)}</div>
   {(()=>{const ev=[...norm(tu,P),...P.filter(p=>p.uid===tu&&p.type==='away')].filter(p=>p.ts>=r[0]&&p.ts<r[1]).sort((a,b)=>b.ts-a.ts);
    return <><p className="mut" style={{margin:'12px 0 4px'}}>{nm(tu)} · {ev.length} punch{ev.length===1?'':'es'} this cycle</p>
    {ev.slice(0,more?200:6).map((p,i)=><div key={i} className="pu"><span className="ic">{p.type==='in'?'🟢':p.type==='out'?'🔴':'📍'}</span><div style={{flex:1}}><b>{p.type==='away'?'Confirmed away':p.type==='in'?'Time in':'Time out'}</b> <span className="mut">{p.auto?'· auto':p.fix?'· fix':''}</span><div className="mut">{fmt(p.ts)}</div></div>{p.photo?<img className="thumb" src={p.photo} onClick={()=>zoom?.(p.photo)}/>:p.loc?<a className="btn sm" target="_blank" href={`https://maps.google.com/?q=${p.loc.lat},${p.loc.lng}`}>📍</a>:null}<button className="sm" onClick={()=>{setDy(+dayAt(p.ts,0));setEf(null)}}>Review</button></div>)}
    {ev.length>6&&<button className="sm w" style={{marginTop:8}} onClick={()=>setMore(!more)}>{more?'Show less ▴':`Show all ${ev.length} ▾`}</button>}</>})()}</Item>}
  <Item data-tour="fixcal"><h3>{sg?`${nm(tu)}'s hours`:'Fix your hours'}</h3><p className="mut">{sg?'Tap a day to review the punches and suggest a correction.':`Tap a day, then choose: edit a session, add time in + out, time in only, or time out only. ${nm(sp.ownerId)} ${auto?'approves requests from others':'approves or denies it'}.`}</p>
   <div className="cal">{['S','M','T','W','T','F','S'].map((w,i)=><div key={i} className="wd">{w}</div>)}{[...Array(lead)].map((_,i)=><div key={'e'+i}/>)}
    {days.map((d,i)=><button key={d} disabled={d>now} className={`dc ${d===tdy?'today':''} ${pd(d)?'pend':''}`} onClick={()=>{buzz();setDy(d);setEf(null)}}><div className="lvl" style={{height:dd[i]/mx*100+'%'}}/><b>{new Date(d).getDate()}</b><i>{dd[i]>0?(dd[i]<10?dd[i].toFixed(1):Math.round(dd[i]))+'h':''}</i></button>)}</div>
   <div className="row sp mut" style={{marginTop:10}}><span>Fill = hours that day</span><span>🟡 = pending request</span></div></Item>

  <h3 data-tour="fixreq" style={{margin:'16px 0 10px'}}>Requests</h3>
  <div className="fchips">{[{id:'all',n:'Everyone'},...members.map(m=>({id:m.id,n:m.id===u.uid?'Me':m.n.split(' ')[0]}))].map(m=><button key={m.id} className={`fchip ${fw===m.id?'on':''}`} onClick={()=>setFw(m.id)}>{m.n}</button>)}</div>
  <div className="fchips" style={{paddingTop:0}}>{Object.entries(STATUS).map(([k,v])=><button key={k} className={`fchip ${fs===k?'on':''}`} onClick={()=>setFs(k)}>{v}</button>)}</div>
  {G.map(g=>g.batch?group(g):single(g.list[0]))}
  {!G.length&&<Item><span className="mut">No requests match this filter in this cycle.</span></Item>}
</List>
  {createPortal(<AnimatePresence>{dy!=null&&<Sheet key="day" close={()=>{setDy(null);setEf(null)}}>{sheetBody()}</Sheet>}</AnimatePresence>,document.body)}</>}
