import {useEffect,useMemo,useState} from 'react';
import {doc,collection,setDoc,addDoc,updateDoc,deleteDoc,writeBatch,onSnapshot} from 'firebase/firestore';
import {db} from './firebase';
import {ping,pingWait} from './notify';
import {Av,buzz} from './ui';
import {peso,d2s,s2d,dur,shrink} from './lib';
import {METHODS,METHOD_NAME,splitBuy,fairness,nextBuyer,nextPayer,itemStats} from './buyLogic';

// SHARED BUYS (beta) - its own full-screen window, opened from Settings.
//  The host asks someone to buy rice, water or anything else, sets the amount and chooses how the cost is split.
//  Step 1: the host prepares it as a DRAFT (collection `buyDrafts`, host only, nobody else can read it).
//  Step 2: the host taps "Send to everyone": it is copied to `buys`, and every member is notified with the result and THEIR share.
//  Members only ever see requests that were sent.
//  More: members can report "running low" (buyAlerts) · the buyer marks it bought with the real price and a receipt photo · an Items tab tracks how often and how much
//  each thing is bought · the host can settle everything a person owes in one tap.

const PRESETS=[['rice','🍚','Rice'],['water','💧','Water'],['other','🛒','']];
const ICONS=['🛒','🧻','🧴','🔥','🥫','🍞','🥚','🧂'];
const dshort=t=>new Date(t).toLocaleDateString([],{month:'short',day:'numeric'});
const basisText=(b,id)=>b.method==='stay'?dur(+b.basis?.[id]||0):b.method==='days'?`${+b.basis?.[id]||0} day${(+b.basis?.[id]||0)===1?'':'s'}`:b.method==='turn'?'their turn':b.method==='custom'?'custom':'equal';

export default function Buys({u,sp,owner,members,nm,say,stay,r,onClose}){
 const [B,setB]=useState([]),[D,setD]=useState([]),[ready,setReady]=useState(false),[err,setErr]=useState(''),
  [tab,setTab]=useState('open'),[form,setForm]=useState(null),[open,setOpen]=useState(null),[busy,setBusy]=useState(false),[AL,setAL]=useState([]),[low,setLow]=useState(null),[bf,setBf]=useState(null),[zm,setZm]=useState(null);
 const ids=members.map(m=>m.id),byId=Object.fromEntries(members.map(m=>[m.id,m])),N=id=>nm(id)||'Former member',F=id=>N(id).split(' ')[0];
 const dref=(c,id)=>doc(db,'spaces',sp.id,c,id);

 // members read `buys`; only the host also reads the private drafts
 useEffect(()=>{
  const un=[onSnapshot(collection(db,'spaces',sp.id,'buys'),d=>{setB(d.docs.map(x=>({id:x.id,...x.data()})));setReady(true)},e=>{setErr(e.message);setReady(true)})];
  un.push(onSnapshot(collection(db,'spaces',sp.id,'buyAlerts'),d=>setAL(d.docs.map(x=>({id:x.id,...x.data()}))),()=>{}));
  if(owner)un.push(onSnapshot(collection(db,'spaces',sp.id,'buyDrafts'),d=>setD(d.docs.map(x=>({id:x.id,...x.data()}))),()=>{}));
  return()=>un.forEach(x=>x())},[sp.id,owner]);

 const sorted=[...B].sort((a,b)=>(b.sentAt||0)-(a.sentAt||0)),
  unpaidOf=b=>Object.keys(b.shares||{}).filter(id=>id!==b.buyer&&+b.shares[id]>0&&!b.paid?.[id]&&ids.includes(id)),
  OPEN=sorted.filter(b=>unpaidOf(b).length),DONE=sorted.filter(b=>!unpaidOf(b).length),
  st=fairness(B,ids),IT=itemStats(B),openAL=AL.filter(a=>a.status==='open').sort((a,b)=>b.createdAt-a.createdAt),
  cycB=B.filter(b=>b.sentAt>=r[0]&&b.sentAt<r[1]),cycTotal=cycB.reduce((t,b)=>t+(+(b.actual>0?b.actual:b.total)||0),0),
  lastOf=t=>{const x=IT.find(i=>i.key===String(t).trim().toLowerCase());return x?{qty:x.last.qty?String(x.last.qty):'',price:x.last.price?String(x.last.price):'',total:String(x.last.total),kind:x.last.kind||'other',emoji:x.last.emoji||'🛒'}:{}},
  myOwe=OPEN.reduce((t,b)=>t+(b.buyer!==u.uid&&!b.paid?.[u.uid]?+b.shares?.[u.uid]||0:0),0),
  myGet=OPEN.reduce((t,b)=>t+(b.buyer===u.uid?unpaidOf(b).reduce((a,id)=>a+(+b.shares[id]||0),0):0),0);

 // ---------- form ----------
 const blank=(o={})=>({alert:'',id:doc(collection(db,'spaces',sp.id,'buyDrafts')).id,sent:false,kind:'rice',emoji:'🍚',title:'Rice',qty:'1',price:'',total:'',
  buyer:nextBuyer(st,ids)||u.uid,ids:[...ids],method:'stay',ps:d2s(r[0]),pe:d2s(Math.min(Date.now(),r[1]-864e5)),turn:nextPayer(st,ids)||u.uid,custom:{},needBy:'',note:'',...o});
 const fromDoc=(b,sent)=>({id:b.id,sent,kind:b.kind||'other',emoji:b.emoji||'🛒',title:b.title||'',qty:b.qty?String(b.qty):'',price:b.price?String(b.price):'',total:String(b.total??''),
  buyer:byId[b.buyer]?b.buyer:u.uid,ids:(b.ids||Object.keys(b.shares||{})).filter(id=>byId[id]),method:b.method||'equal',ps:d2s(b.ps||r[0]),pe:d2s(b.pe||Date.now()),
  turn:byId[b.turn]?b.turn:(byId[b.buyer]?b.buyer:u.uid),custom:b.method==='custom'?{...(b.shares||{})}:{},needBy:b.needBy?d2s(b.needBy):'',note:b.note||'',alert:b.alert||''});
 const set=patch=>setForm(f=>({...f,...patch})),
  setQP=p=>setForm(f=>{const n={...f,...p},q=+n.qty,pr=+n.price;if(q>0&&pr>0)n.total=String(+(q*pr).toFixed(2));return n}),   // qty x price fills the total (you can still type the total yourself)
  pick=(k,e,t)=>set({kind:k,emoji:e,title:t});

 // hours / days at home in the chosen period, for each member
 const stayMap=useMemo(()=>{if(!form||!(form.method==='stay'||form.method==='days'))return{};const a=s2d(form.ps),b=s2d(form.pe)+864e5;if(!(b>a))return{};
  return Object.fromEntries(ids.map(id=>[id,stay(id,a,b)]))},[form?.ps,form?.pe,form?.method,ids.join()]);   // eslint-disable-line
 const pv=form?splitBuy({method:form.method,total:+form.total||0,ids:form.ids,stay:stayMap,turn:form.turn,custom:form.custom}):null;
 const effIds=form?(form.method==='turn'?[form.turn]:form.ids):[];

 const check=()=>{if(!form.title.trim())return 'Give it a name, like Rice or Water.';if(!(+form.total>0))return 'Enter the total amount.';if(!byId[form.buyer])return 'Pick who will buy it.';
  if((form.method==='stay'||form.method==='days')&&!(s2d(form.pe)>=s2d(form.ps)))return 'The period ends before it starts.';return pv.ok?'':pv.msg};
 const payload=now=>({title:form.title.trim().slice(0,40),emoji:form.emoji,kind:form.kind,qty:+form.qty||0,price:+form.price||0,total:+(+form.total).toFixed(2),buyer:form.buyer,ids:effIds,method:form.method,
  ps:s2d(form.ps),pe:s2d(form.pe),turn:form.method==='turn'?form.turn:null,shares:pv.amounts,basis:pv.basis,needBy:form.needBy?s2d(form.needBy):null,note:form.note.trim().slice(0,140),updatedAt:now,alert:form.alert||null});

 const saveDraft=async()=>{const e=check();if(e)return say(e,4500);setBusy(true);
  try{await setDoc(dref('buyDrafts',form.id),{...payload(Date.now()),savedAt:Date.now()});buzz();say('Draft saved. Only you can see it until you send it.',4500);setForm(null);setTab('open')}
  catch(e){say('Failed: '+e.message+' (publish the latest firestore.rules)',7000)}finally{setBusy(false)}};
 const send=async()=>{const e=check();if(e)return say(e,4500);
  if(!confirm(form.sent?'Send the updated request to everyone? They will be notified again.':'Send this to all dormmates? They will see it and be notified with the result right away.'))return;
  setBusy(true);const now=Date.now();
  try{const p=payload(now),old=form.sent?B.find(x=>x.id===form.id):null,paid={};
   if(+p.shares[p.buyer]>0)paid[p.buyer]=true;   // the buyer does not pay themselves back
   if(old)Object.keys(p.shares).forEach(id=>{if(old.paid?.[id]&&+old.shares?.[id]===+p.shares[id])paid[id]=true});   // keep "paid" for people whose share did not change
   await setDoc(dref('buys',form.id),{...p,paid,createdAt:old?.createdAt||now,sentAt:now,edited:!!old,...(old?{bought:!!old.bought,boughtAt:old.boughtAt||null,receipt:old.receipt||null}:{})});
   await deleteDoc(dref('buyDrafts',form.id)).catch(()=>{});
   if(form.alert)updateDoc(dref('buyAlerts',form.alert),{status:'done',doneAt:now}).catch(()=>{});   // the "running low" report is answered
   ping({sid:sp.id,kind:'buy',id:form.id});buzz();say('Sent to your dormmates 📨',4000);setForm(null);setTab('open')}
  catch(e){say('Failed: '+e.message+' (publish the latest firestore.rules)',7000)}finally{setBusy(false)}};

 // ---------- actions on sent requests ----------
 const togglePaid=async(b,id)=>{const was=!!b.paid?.[id];try{await updateDoc(dref('buys',b.id),{['paid.'+id]:!was});buzz();if(!was)ping({sid:sp.id,kind:'buypaid',id:b.id,target:id})}catch(e){say('Failed: '+e.message,5000)}};
 const remind=async b=>{setBusy(true);try{const j=await pingWait({sid:sp.id,kind:'buyremind',id:b.id});say(j.skipped?'Nothing sent: everyone has paid, or you already reminded them in the last hour.':`Reminder sent to ${j.sent} member${j.sent>1?'s':''} 🔔`,5000)}catch(e){say('Failed: '+e.message,5000)}finally{setBusy(false)}};
 const del=async(c,id,what)=>{if(!confirm(`Delete this ${what} permanently for everyone?`))return;try{await deleteDoc(dref(c,id));say('Deleted')}catch(e){say('Failed: '+e.message,5000)}};

 // ---------- running low / bought / settle up ----------
 const startLow=(o={})=>{setLow({kind:'other',emoji:'🛒',title:'',note:'',...o});setTab('open')};
 const sendLow=async()=>{const t=low.title.trim();if(!t)return say('Say what is running low.');
  if(openAL.some(a=>a.title.trim().toLowerCase()===t.toLowerCase()))return say(`${t} was already reported.`,3500);setBusy(true);
  try{const ref=await addDoc(collection(db,'spaces',sp.id,'buyAlerts'),{uid:u.uid,title:t.slice(0,40),emoji:low.emoji,kind:low.kind,note:low.note.trim().slice(0,140),status:'open',createdAt:Date.now()});
   ping({sid:sp.id,kind:'buylow',id:ref.id});setLow(null);buzz();say(owner?'Saved ✓':`${F(sp.ownerId)} was told 🔔`,4000)}
  catch(e){say('Failed: '+e.message+' (publish the latest firestore.rules)',7000)}finally{setBusy(false)}};
 const dismissAlert=async a=>{try{if(owner)await updateDoc(dref('buyAlerts',a.id),{status:'dismissed',doneAt:Date.now()});else await deleteDoc(dref('buyAlerts',a.id));say('Removed')}catch(e){say('Failed: '+e.message,5000)}};
 const markBought=async b=>{setBusy(true);
  try{const up={bought:true,boughtAt:Date.now()};if(+bf.actual>0)up.actual=+(+bf.actual).toFixed(2);if(bf.receipt)up.receipt=bf.receipt;
   await updateDoc(dref('buys',b.id),up);ping({sid:sp.id,kind:'bought',id:b.id});setBf(null);buzz();say('Marked as bought ✓ Everyone was told',4000)}
  catch(e){say('Failed: '+e.message+' (publish the latest firestore.rules)',7000)}finally{setBusy(false)}};
 const bulkPaid=async id=>{const L=B.filter(b=>b.buyer!==id&&+b.shares?.[id]>0&&!b.paid?.[id]);if(!L.length)return;
  if(!confirm(`Mark all ${L.length} unpaid share${L.length>1?'s':''} of ${F(id)} (${peso(L.reduce((t,b)=>t+b.shares[id],0))}) as paid?`))return;setBusy(true);
  try{const bt=writeBatch(db);L.forEach(b=>bt.update(dref('buys',b.id),{['paid.'+id]:true}));await bt.commit();L.forEach(b=>ping({sid:sp.id,kind:'buypaid',id:b.id,target:id}));buzz();say(`${F(id)} is settled ✓`,4000)}
  catch(e){say('Failed: '+e.message,5000)}finally{setBusy(false)}};

 // ---------- pieces of the screen ----------
 const Head=({left,title,right})=><div className="rvbar">{left}<b style={{fontSize:17,flex:1,textAlign:'center'}}>{title}</b>{right}</div>;

 const card=b=>{const pay=Object.keys(b.shares||{}).filter(id=>+b.shares[id]>0),un=unpaidOf(b),mineAmt=+b.shares?.[u.uid]||0,isBuyer=b.buyer===u.uid,x=open===b.id;
  return <div key={b.id} className="card">
   <button className="w" style={{background:'none',padding:0,textAlign:'left'}} onClick={()=>setOpen(x?null:b.id)}>
    <div className="row sp"><div style={{minWidth:0}}><b style={{fontSize:17}}>{b.emoji||'🛒'} {b.title}</b>{b.edited&&<span className="mut"> · updated</span>}
     <div className="mut">{F(b.buyer)} {isBuyer?'(you) ':''}buys{b.needBy?` · needed by ${dshort(b.needBy)}`:''} · {METHOD_NAME[b.method]||''}</div></div>
     <div style={{textAlign:'right'}}><b style={{fontSize:18}}>{peso(b.total)}</b><div><span className={`tag ${un.length?'t-pending':'t-approved'}`}>{un.length?`${un.length} to pay`:'All paid'}</span></div></div></div></button>
   {isBuyer?<div className="pnote">🛒 You buy this one. {un.length?`Still to get back: ${peso(un.reduce((t,id)=>t+(+b.shares[id]||0),0))}.`:'Everyone paid you back ✓'}</div>
    :mineAmt>0?<div className={`pnote`}>{b.paid?.[u.uid]?`✅ You paid your share of ${peso(mineAmt)}.`:`💸 Your share is ${peso(mineAmt)}. Pay ${F(b.buyer)}.`}</div>
    :<div className="pnote">You are not part of this one.</div>}
   <div className="pnote row sp" style={{gap:8}}><span>{b.bought?`✅ Bought ${dshort(b.boughtAt)}${b.actual>0?` for ${peso(b.actual)}`:''}`:'🛒 Not bought yet'}</span>{b.receipt&&<img className="thumb" src={b.receipt} alt="receipt" onClick={()=>setZm(b.receipt)}/>}</div>
   {x&&<div style={{marginTop:10}}>
    {owner&&b.actual>0&&Math.abs(b.actual-b.total)>=.01&&<div className="warn">The buyer says the real price was {peso(b.actual)} (the estimate was {peso(b.total)}). <button className="sm" style={{marginLeft:6}} onClick={()=>setForm({...fromDoc(b,true),total:String(b.actual)})}>Update amounts</button></div>}
    {!b.bought&&(isBuyer||owner)&&(bf?.id===b.id
     ?<div className="blk"><b>Mark as bought</b><p className="mut" style={{margin:'4px 0 8px'}}>Everyone is told it was bought. The real price and a receipt photo are optional.</p>
       <label>Real total paid (₱, optional)</label><input type="number" inputMode="decimal" min="0" step="any" value={bf.actual} placeholder={String(b.total)} onChange={e=>setBf({...bf,actual:e.target.value})}/>
       <input id="rcpt" type="file" accept="image/*" capture="environment" hidden onChange={async e=>{const f=e.target.files[0];if(f){const img=await shrink(f);setBf(v=>({...v,receipt:img}))}}}/>
       <button className="w" style={{marginBottom:8}} onClick={()=>document.getElementById('rcpt').click()}>{bf.receipt?'📷 Receipt added ✓ (tap to change)':'📷 Add a receipt photo'}</button>
       <div className="row"><button className="pri" style={{flex:1}} disabled={busy} onClick={()=>markBought(b)}>Confirm</button><button style={{flex:1}} onClick={()=>setBf(null)}>Cancel</button></div></div>
     :<button className="pri w" style={{marginBottom:10}} onClick={()=>setBf({id:b.id,actual:'',receipt:null})}>✅ I bought it</button>)}
    {b.note&&<p className="mut" style={{marginBottom:8}}>📝 {b.note}</p>}
    {(b.qty>0||b.price>0)&&<p className="mut" style={{marginBottom:8}}>{b.qty>0?`Quantity ${b.qty}`:''}{b.qty>0&&b.price>0?' × ':''}{b.price>0?`${peso(b.price)} each`:''}</p>}
    {(b.method==='stay'||b.method==='days')&&<p className="mut" style={{marginBottom:8}}>Counted from {new Date(b.ps).toLocaleDateString([],{month:'short',day:'numeric'})} to {new Date(b.pe).toLocaleDateString([],{month:'short',day:'numeric'})}.</p>}
    {pay.map(id=><div key={id} className="shr"><Av m={byId[id]||{n:'?'}}/><div style={{flex:1,minWidth:0}}><b>{F(id)}{id===u.uid&&<span className="mut"> · you</span>}</b><div className="mut">{basisText(b,id)}</div></div>
     <div style={{textAlign:'right'}}><b>{peso(b.shares[id])}</b><div>{id===b.buyer?<span className="tag t-approved">buyer</span>:b.paid?.[id]?<span className="tag t-approved">paid</span>:<span className="tag t-pending">unpaid</span>}</div></div>
     {owner&&id!==b.buyer&&<button className={`sm ${b.paid?.[id]?'ok':''}`} onClick={()=>togglePaid(b,id)}>{b.paid?.[id]?'Paid ✓':'Mark paid'}</button>}</div>)}
    {!owner&&<p className="mut" style={{marginTop:8}}>The host marks who has paid back the buyer.</p>}
    {owner&&<div style={{marginTop:12}}>
     {un.length>0&&<button className="w" style={{marginBottom:8}} disabled={busy} onClick={()=>remind(b)}>🔔 Remind {un.length} unpaid</button>}
     <div className="row"><button className="sm" style={{flex:1}} onClick={()=>{setForm(fromDoc(b,true))}}>✏️ Edit & resend</button><button className="sm no" style={{flex:1}} onClick={()=>del('buys',b.id,'request')}>🗑 Delete</button></div></div>}
   </div>}</div>};

 const draftCard=d=><div key={d.id} className="card draft">
  <div className="row sp"><div><b style={{fontSize:17}}>{d.emoji||'🛒'} {d.title}</b><div className="mut">Draft · only you can see this · {F(d.buyer)} buys</div></div><b style={{fontSize:18}}>{peso(d.total)}</b></div>
  <div className="mut" style={{margin:'8px 0'}}>{Object.entries(d.shares||{}).map(([id,a])=>`${F(id)} ${peso(a)}`).join(' · ')}</div>
  <button className="pri w" style={{marginBottom:8}} onClick={()=>setForm(fromDoc(d,false))}>Open, check & send</button>
  <button className="w" onClick={()=>del('buyDrafts',d.id,'draft')}>Discard draft</button></div>;

 const formView=()=>{const f=form,m=METHODS.find(x=>x.k===f.method),nb=nextBuyer(st,ids),np=nextPayer(st,ids),err2=check();
  return <div style={{maxWidth:560,margin:'auto'}}>
   <div className="warn">🔒 {f.sent?'You are editing a request that was already sent. Tap “Send update” to notify everyone again.':'This is private to you. Your dormmates see nothing until you tap “Send to everyone”.'}</div>
   <div className="card"><h3>What do you need?</h3>
    <div className="fchips" style={{paddingBottom:6}}>{PRESETS.map(([k,e,t])=><button key={k} className={`fchip ${f.kind===k?'on':''}`} onClick={()=>pick(k,e,t)}>{e} {t||'Something else'}</button>)}</div>
    {f.kind==='other'&&<div className="fchips" style={{paddingBottom:6}}>{ICONS.map(e=><button key={e} className={`fchip ${f.emoji===e?'on':''}`} onClick={()=>set({emoji:e})}>{e}</button>)}</div>}
    <label>Name</label><input value={f.title} maxLength={40} placeholder="e.g. Rice, Water refill, Dish soap" onChange={e=>set({title:e.target.value})}/>
    <div className="row" style={{alignItems:'flex-start'}}><div style={{flex:1}}><label>Quantity</label><input type="number" inputMode="decimal" min="0" step="any" value={f.qty} onChange={e=>setQP({qty:e.target.value})}/></div>
     <div style={{flex:1}}><label>Price each (₱)</label><input type="number" inputMode="decimal" min="0" step="any" value={f.price} onChange={e=>setQP({price:e.target.value})}/></div></div>
    <label>Total amount (₱)</label><input type="number" inputMode="decimal" min="0" step="any" value={f.total} placeholder="You set the amount" onChange={e=>set({total:e.target.value})}/>
    <p className="mut" style={{margin:'-6px 0 10px'}}>Quantity × price fills the total for you. You can also just type the total.</p>
    <label>Needed by (optional)</label><input type="date" value={f.needBy} onChange={e=>set({needBy:e.target.value})}/>
    <label>Note (optional)</label><input value={f.note} maxLength={140} placeholder="e.g. 25 kg sack from the market" onChange={e=>set({note:e.target.value})}/></div>

   <div className="card"><h3>Who buys it?</h3>
    <select value={f.buyer} onChange={e=>set({buyer:e.target.value})}>{members.map(x=><option key={x.id} value={x.id}>{x.n}{x.id===u.uid?' (you)':''}</option>)}</select>
    {nb&&<button className="sm" onClick={()=>set({buyer:nb})}>💡 Suggested: {F(nb)} (has bought the fewest times)</button>}
    <p className="mut" style={{marginTop:8}}>The buyer pays the shop first. Everyone else pays the buyer back their share.</p></div>

   <div className="card"><h3>How to split the cost</h3>
    <select value={f.method} onChange={e=>set({method:e.target.value})}>{METHODS.map(x=><option key={x.k} value={x.k}>{x.n}</option>)}</select>
    <p className="mut" style={{marginBottom:10}}>{m.d}</p>
    {(f.method==='stay'||f.method==='days')&&<div className="row" style={{alignItems:'flex-start'}}><div style={{flex:1}}><label>Count from</label><input type="date" value={f.ps} onChange={e=>set({ps:e.target.value})}/></div><div style={{flex:1}}><label>Until</label><input type="date" value={f.pe} onChange={e=>set({pe:e.target.value})}/></div></div>}
    {f.method==='turn'?<><label>Whose turn is it to pay?</label><select value={f.turn} onChange={e=>set({turn:e.target.value})}>{members.map(x=><option key={x.id} value={x.id}>{x.n}{x.id===u.uid?' (you)':''}</option>)}</select>
      {np&&<button className="sm" onClick={()=>set({turn:np})}>💡 Suggested: {F(np)} (has paid the least so far)</button>}</>
     :<><label>Who shares the cost?</label>{members.map(x=><label key={x.id} className="chk"><input type="checkbox" checked={f.ids.includes(x.id)} onChange={e=>set({ids:e.target.checked?[...f.ids,x.id]:f.ids.filter(i=>i!==x.id)})}/>{x.n}</label>)}
      <div className="row" style={{gap:8,marginTop:4}}><button className="sm" onClick={()=>set({ids:[...ids]})}>Select all</button><button className="sm" onClick={()=>set({ids:[]})}>Clear</button></div></>}</div>

   <div className="card"><h3>Result</h3>
    <div className="row sp" style={{marginBottom:8}}><span className="mut">Total</span><b>{peso(+f.total||0)}</b></div>
    {effIds.map(id=><div key={id} className="shr"><Av m={byId[id]||{n:'?'}}/><div style={{flex:1,minWidth:0}}><b>{F(id)}</b>{id===f.buyer&&<span className="mut"> · buys</span>}
      <div className="mut">{f.method==='stay'?dur(+pv.basis?.[id]||0):f.method==='days'?`${+pv.basis?.[id]||0} day${(+pv.basis?.[id]||0)===1?'':'s'}`:f.method==='turn'?'their turn':f.method==='custom'?'custom':'equal'}</div></div>
      {f.method==='custom'?<input type="number" inputMode="decimal" min="0" step="any" style={{width:110,margin:0,textAlign:'right'}} value={f.custom[id]??''} placeholder="₱" onChange={e=>set({custom:{...f.custom,[id]:e.target.value}})}/>:<b>{peso(pv.amounts[id])}</b>}</div>)}
    {!effIds.length&&<p className="mut">Pick who shares the cost.</p>}
    {pv.fallback&&<p className="mut" style={{marginTop:8}}>⚠️ Nobody has any {f.method==='days'?'days':'hours'} in that period, so this is an equal split. Change the dates, or pick another way to split.</p>}
    {f.method==='custom'&&<p className="mut" style={{marginTop:8}}>{pv.ok?'✓ The amounts add up to the total.':pv.msg}</p>}</div>

   {err2&&<p className="mut" style={{margin:'0 4px 10px'}}>⚠️ {err2}</p>}
   <button className="pri w" style={{marginBottom:8}} disabled={busy||!!err2} onClick={send}>{busy?'Working…':f.sent?'📨 Send update to everyone':'📨 Send to everyone'}</button>
   {!f.sent&&<button className="w" style={{marginBottom:8}} disabled={busy||!!err2} onClick={saveDraft}>💾 Save as draft (only me)</button>}
   <button className="w" onClick={()=>setForm(null)}>Cancel</button></div>};

 // running-low report form + the open reports
 const lowForm=()=>low&&<div className="card"><h3>⚠️ What is running low?</h3>
  <div className="fchips" style={{paddingBottom:6}}>{PRESETS.map(([k,e,t])=><button key={k} className={`fchip ${low.kind===k?'on':''}`} onClick={()=>setLow({...low,kind:k,emoji:e,title:t||(low.kind==='other'?low.title:'')})}>{e} {t||'Something else'}</button>)}</div>
  <label>Name</label><input value={low.title} maxLength={40} placeholder="e.g. Rice, Water, Dish soap" onChange={e=>setLow({...low,title:e.target.value})}/>
  <label>Note (optional)</label><input value={low.note} maxLength={140} placeholder="e.g. Only enough for 2 days" onChange={e=>setLow({...low,note:e.target.value})}/>
  <p className="mut" style={{marginBottom:10}}>{owner?'It is saved so you can turn it into a request.':`${F(sp.ownerId)} is notified and can turn it into a shopping request.`}</p>
  <button className="pri w" style={{marginBottom:8}} disabled={busy||!low.title.trim()} onClick={sendLow}>Send</button><button className="w" onClick={()=>setLow(null)}>Cancel</button></div>;
 const alertCard=a=><div key={a.id} className="card draft"><b>⚠️ {a.emoji||'🛒'} {a.title} is running low</b>
  <div className="mut">{F(a.uid)}{a.uid===u.uid?' (you)':''} · {dshort(a.createdAt)}{a.note?` · “${a.note}”`:''}</div>
  {owner&&<div className="row" style={{marginTop:10}}><button className="pri" style={{flex:1}} onClick={()=>setForm(blank({title:a.title,emoji:a.emoji||'🛒',kind:a.kind==='rice'||a.kind==='water'?a.kind:'other',alert:a.id,note:a.note||'',qty:'',...lastOf(a.title)}))}>Make a request</button><button className="sm" onClick={()=>dismissAlert(a)}>Dismiss</button></div>}
  {!owner&&a.uid===u.uid&&<button className="sm w" style={{marginTop:8}} onClick={()=>dismissAlert(a)}>Cancel my report</button>}</div>;
 const itemsView=()=><div>
  <div className="card"><h3>Item tracker</h3><p className="mut" style={{marginBottom:8}}>Built from every request that was sent. It learns how often each thing is bought and what it costs, and tells you when it will probably run out again.</p>
   <div className="row sp"><span className="mut">This cycle</span><b>{peso(cycTotal)} · {cycB.length} request{cycB.length===1?'':'s'}</b></div></div>
  {IT.map(x=><div key={x.key} className="card"><div className="row sp"><b style={{fontSize:17}}>{x.emoji||'🛒'} {x.title}</b>{x.status!=='new'&&<span className={`tag ${x.status==='overdue'?'t-denied':x.status==='soon'?'t-pending':'t-approved'}`}>{x.status==='overdue'?'probably out':x.status==='soon'?'running out soon':'stocked'}</span>}</div>
   <div className="mut" style={{margin:'6px 0'}}>Bought {x.times}× · average {peso(x.avg)} · total {peso(x.total)}</div>
   <div className="mut">Last bought {dshort(x.lastAt)}{x.avgGap?` · about every ${Math.round(x.avgGap)} days · next around ${dshort(x.nextAt)}`:' · bought once so far, so no prediction yet'}</div>
   <div className="row" style={{marginTop:10}}><button className="sm" style={{flex:1}} onClick={()=>startLow({kind:x.last.kind==='rice'||x.last.kind==='water'?x.last.kind:'other',emoji:x.emoji||'🛒',title:x.title})}>⚠️ Running low</button>{owner&&<button className="sm pri" style={{flex:1}} onClick={()=>setForm(blank({title:x.title,...lastOf(x.title)}))}>＋ New request</button>}</div></div>)}
  {ready&&!IT.length&&<div className="card"><span className="mut">Nothing to track yet. Once the first request is sent, every item shows up here with how often it is bought.</span></div>}</div>;
 const fairView=()=><div>
  <div className="card"><h3>Fairness board</h3><p className="mut" style={{marginBottom:10}}>Built from every request that was sent. It helps decide who should go and buy next, and whose turn it is to pay.</p>
   {ids.length>0&&<div className="pnote" style={{marginBottom:10}}>👉 Next to buy: <b>{F(nextBuyer(st,ids))}</b> · Next to pay (turn): <b>{F(nextPayer(st,ids))}</b></div>}
   {members.map(m=>{const s=st[m.id];return <div key={m.id} className="shr"><Av m={m}/><div style={{flex:1,minWidth:0}}><b>{m.n.split(' ')[0]}{m.id===u.uid&&<span className="mut"> · you</span>}</b>
     <div className="mut">🛒 bought {s.bought}× · 💸 paid {peso(s.spent)} in total</div></div>
     <div style={{textAlign:'right'}}>{s.owes>0&&<div><span className="tag t-pending">owes {peso(s.owes)}</span></div>}{owner&&s.owes>0&&<button className="sm" style={{marginTop:6}} disabled={busy} onClick={()=>bulkPaid(m.id)}>Mark all paid</button>}{s.toGet>0&&<div style={{marginTop:4}}><span className="tag t-approved">to get {peso(s.toGet)}</span></div>}{!s.owes&&!s.toGet&&<span className="mut">settled</span>}</div></div>})}</div></div>;

 // ---------- the window ----------
 return <div className="rv">
  {form
   ?<Head left={<button className="sm" onClick={()=>setForm(null)}>‹ Back</button>} title={form.sent?'Edit request':'New request'} right={<span style={{width:64}}/>}/>
   :<Head left={<span style={{width:64}}/>} title={<>🛒 Shared buys <span className="beta">BETA</span></>} right={<button className="sm" onClick={onClose}>✕ Close</button>}/>}
  <div className="rvbody">{form?formView():<div style={{maxWidth:560,margin:'auto'}}>
   <div className="warn">🧪 Beta: this feature is still being tested and may change. It does not touch your electric and water bills.</div>
   {err&&<div className="warn">Could not load: {err}. If this says “permission”, the host needs to publish the latest firestore.rules.</div>}
   {(myOwe>0||myGet>0)&&<div className="row" style={{gap:8,marginBottom:12,flexWrap:'wrap'}}>{myOwe>0&&<span className="chip">💸 You still owe {peso(myOwe)}</span>}{myGet>0&&<span className="chip">💰 You are still owed {peso(myGet)}</span>}</div>}
   {owner&&<button className="pri w" style={{marginBottom:12}} onClick={()=>setForm(blank())}>＋ New request (rice, water, anything)</button>}
   <button className="w" style={{marginBottom:12}} onClick={()=>startLow()}>⚠️ Something is running low</button>
   <div className="seg">{[['open',`Open · ${OPEN.length}${owner&&D.length?` +${D.length} draft${D.length>1?'s':''}`:''}`],['items','Items'],['done',`Done · ${DONE.length}`],['fair','Fairness']].map(([k,l])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{l}</button>)}</div>
   {tab==='open'&&<>{lowForm()}{openAL.map(alertCard)}{owner&&[...D].sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)).map(draftCard)}{OPEN.map(card)}
    {ready&&!OPEN.length&&!openAL.length&&!(owner&&D.length)&&<div className="card"><span className="mut">{owner?'Nothing open. Tap “New request” to ask someone to buy rice, water or anything else.':'Nothing to pay right now. When the host sends a request you will get a notification, and it shows up here.'}</span></div>}</>}
   {tab==='done'&&<>{DONE.map(card)}{ready&&!DONE.length&&<div className="card"><span className="mut">Requests where everyone has paid appear here.</span></div>}</>}
   {tab==='items'&&itemsView()}
   {tab==='fair'&&fairView()}
  </div>}</div>{zm&&<div className="lb" onClick={()=>setZm(null)}><img src={zm} alt=""/></div>}</div>}
