import {useEffect,useRef,useState} from 'react';
import {motion,AnimatePresence,animate,useDragControls} from 'framer-motion';
import {onAuthStateChanged,signInWithPopup,signOut,deleteUser,reauthenticateWithPopup} from 'firebase/auth';
import {doc,setDoc,addDoc,updateDoc,deleteDoc,deleteField,collection,query,where,orderBy,limit,onSnapshot,getDocs,arrayUnion,arrayRemove} from 'firebase/firestore';
import {auth,db,gp} from './firebase';
import {fmt,tm,dur,clock,peso,d2s,s2d,dayAt,cyc,cycLabel,iv,hrs,daily,sessions,norm,away,fd,dayWord,notify,shrink} from './lib';

const buzz=()=>navigator.vibrate?.(25);
function Num({v,d=1}){const r=useRef();useEffect(()=>{const c=animate(0,v,{duration:1,ease:'easeOut',onUpdate:x=>r.current&&(r.current.textContent=x.toFixed(d))});return()=>c.stop()},[v]);return <span ref={r}>0</span>}
const Av=({m})=>m.p?<img className="av" src={m.p} referrerPolicy="no-referrer"/>:<div className="av">{m.n[0]}</div>;
const Cycle=({off,set})=><div className="row sp" style={{marginBottom:12}}><button className="sm" onClick={()=>set(off-1)}>‹</button><b>{cycLabel(cyc(off))}</b><button className="sm" onClick={()=>set(off+1)}>›</button></div>;
const List=({children})=><motion.div initial="h" animate="s" variants={{s:{transition:{staggerChildren:.05}}}}>{children}</motion.div>;
const Item=({children,className='card'})=><motion.div className={className} variants={{h:{opacity:0,y:16},s:{opacity:1,y:0}}}>{children}</motion.div>;
function Sheet({close,children}){const dc=useDragControls();
 return <motion.div className="scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={close}>
  <motion.div className="sheet" initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:30,stiffness:320}} drag="y" dragControls={dc} dragListener={false} dragConstraints={{top:0,bottom:0}} dragElastic={{top:0,bottom:.6}} onDragEnd={(_,i)=>i.offset.y>90&&close()} onClick={e=>e.stopPropagation()}>
   <div className="grab" onPointerDown={e=>dc.start(e)}/>{children}</motion.div></motion.div>}

function SpaceForm({u,open,say}){const [n,setN]=useState(''),[c,setC]=useState(''),me={n:u.displayName||'Me',p:u.photoURL||''};
 const create=async()=>{if(!n.trim())return;const r=await addDoc(collection(db,'spaces'),{name:n.trim(),code:Math.random().toString(36).slice(2,8).toUpperCase(),ownerId:u.uid,members:[u.uid],names:{[u.uid]:me}});setN('');open(r.id)};
 const join=async()=>{const q=await getDocs(query(collection(db,'spaces'),where('code','==',c.trim().toUpperCase()),limit(1)));if(q.empty)return say('No space with that code.');
  await updateDoc(q.docs[0].ref,{members:arrayUnion(u.uid),['names.'+u.uid]:me});setC('');open(q.docs[0].id)};
 return <><div className="card"><h3>Start a new space</h3><input placeholder="e.g. Room 304" value={n} onChange={e=>setN(e.target.value)}/><button className="pri w" onClick={create}>Create space</button></div>
  <div className="card"><h3>Join with a code</h3><input placeholder="6-letter code" value={c} onChange={e=>setC(e.target.value)}/><button className="w" onClick={join}>Join space</button></div></>}

export default function App(){
 const [u,setU]=useState(null),[ready,setReady]=useState(false),[loaded,setLoaded]=useState(false),[spaces,setSpaces]=useState([]),[sid,setSid]=useState(localStorage.getItem('sid'));
 const [P,setP]=useState([]),[X,setX]=useState([]),[B,setB]=useState([]);
 const [tab,setTab]=useState('home'),[off,setOff]=useState(0),[menu,setMenu]=useState(null),[zoom,setZoom]=useState(null),[sel,setSel]=useState(null),[toast,setToast]=useState(''),[burst,setBurst]=useState(0),[,tick]=useState(0),[hf,setHf]=useState('all'),[nt,setNt]=useState(''),[N,setN]=useState([]);
 const iso=t=>new Date(t-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16),[f,setF]=useState({i:iso(Date.now()-9*36e5),o:iso(Date.now()),r:''});
 const say=(m,ms=2200)=>{setToast(m);setTimeout(()=>setToast(''),ms)};
 useEffect(()=>{const t=setInterval(()=>tick(n=>n+1),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>onAuthStateChanged(auth,user=>{setU(user);setReady(true)}),[]);
 useEffect(()=>{setLoaded(false);if(!u){setSpaces([]);return}
  return onSnapshot(query(collection(db,'spaces'),where('members','array-contains',u.uid)),d=>{setSpaces(d.docs.map(x=>({id:x.id,...x.data()})));setLoaded(true)})},[u?.uid]);
 const sp=spaces.find(s=>s.id===sid)||spaces[0];
 useEffect(()=>{setP([]);setX([]);setB([]);setN([]);if(!sp?.id)return;localStorage.setItem('sid',sp.id);const s=doc(db,'spaces',sp.id),m=d=>d.docs.map(x=>({id:x.id,...x.data()}));
  const un=[onSnapshot(query(collection(s,'punches'),orderBy('ts','desc'),limit(1500)),d=>setP(m(d))),onSnapshot(query(collection(s,'exceptions'),orderBy('createdAt','desc')),d=>setX(m(d))),onSnapshot(collection(s,'bills'),d=>setB(m(d))),onSnapshot(query(collection(s,'notes'),orderBy('createdAt','desc'),limit(30)),d=>setN(m(d)))];
  return()=>un.forEach(x=>x())},[sp?.id]);
 const open=id=>{setSid(id);setTab('home');setOff(0);setMenu(null)};

 useEffect(()=>{if(!u)return;const a=away(u.uid,P);if(a?.open&&!localStorage.getItem('nf'+a.D)){localStorage.setItem('nf'+a.D,1);const t='Confirm you are still away before 8:00 PM or you will be timed in.';say('⏰ '+t,6000);notify('⏰ Confirm you are away',t)}});
 const orbs=<><div className="orb o1"/><div className="orb o2"/></>;
 if(!ready||(u&&!loaded))return <div className="login"><motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1.4,ease:'linear'}} className="logo" style={{margin:'auto'}}><i/></motion.div></div>;
 if(!u)return <main>{orbs}<div className="login">
  <motion.div className="logo" initial={{scale:.4,rotate:-30,opacity:0}} animate={{scale:1,rotate:0,opacity:1}} transition={{type:'spring',stiffness:200}}><i/>DormMates</motion.div>
  <motion.h1 initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.2}}>Who's home?<br/>Who owes?</motion.h1>
  <p className="mut">Punch in and out, fix missed days, and split the bills by who was actually there.</p>
  <motion.button whileTap={{scale:.95}} className="pri w" onClick={()=>signInWithPopup(auth,gp).catch(e=>say(e.message))}>Continue with Google</motion.button></div>{toast&&<div className="toast">{toast}</div>}</main>;
 if(!sp)return <main>{orbs}<header><div className="logo"><i/>DormMates</div><button className="sm" onClick={()=>signOut(auth)}>Sign out</button></header><SpaceForm u={u} open={open} say={say}/>{toast&&<div className="toast">{toast}</div>}</main>;

 const me={n:u.displayName||'Me',p:u.photoURL||''},owner=sp.ownerId===u.uid,r=cyc(off);
 const members=sp.members.map(id=>({id,...(sp.names?.[id]||{n:'Member'})})),nm=id=>members.find(m=>m.id===id)?.n;
 const last=id=>norm(id,P).at(-1),mine=last(u.uid),on=mine?.type==='in',pend=owner?X.filter(x=>x.status==='pending').length:0;
 const H=id=>hrs(id,P,X,r),col=n=>collection(db,'spaces',sp.id,n),th=s=><img className="thumb" src={s} onClick={()=>setZoom(s)}/>;
 const proof=p=>p?.auto?<span className="tag t-pending">auto</span>:p?.photo?th(p.photo):p?.loc?<a className="btn sm" target="_blank" href={`https://maps.google.com/?q=${p.loc.lat},${p.loc.lng}`}>📍</a>:null;

 async function save(pr,type){type=type||(on?'out':'in');await addDoc(col('punches'),{uid:u.uid,type,ts:Date.now(),...pr});setMenu(null);buzz();
  if(type==='away')return say('Confirmed ✓ Next check is tomorrow 7:30–8:00 PM');setBurst(b=>b+1);
  if(type==='in')return say('Timed in ✓');const m=`Auto time-in ${dayWord(fd(Date.now()))} at 8:00 PM. Confirm from 7:30 PM to stay out.`;say('Timed out ✓\n'+m,6000);notify('Timed out ✓',m)}
 const photo=async(fl,t)=>fl&&save({photo:await shrink(fl)},t);
 const loc=t=>navigator.geolocation.getCurrentPosition(p=>save({loc:{lat:p.coords.latitude,lng:p.coords.longitude}},t),()=>say('Location blocked. Use a picture instead.'),{enableHighAccuracy:true,timeout:15000});
 async function leave(s){const rest=s.members.filter(m=>m!==u.uid),ref=doc(db,'spaces',s.id);if(!rest.length)return wipe(s.id);
  const up={members:arrayRemove(u.uid),['names.'+u.uid]:deleteField()};if(s.ownerId===u.uid)up.ownerId=rest[0];return updateDoc(ref,up)}
 const switchAcc=async()=>{await signOut(auth);signInWithPopup(auth,gp).catch(e=>say(e.message))};
 async function delAcc(){if(!confirm('Delete your account? You will leave all spaces. Your past hours stay in the group records.'))return;
  try{await Promise.all(spaces.map(leave));try{await deleteUser(auth.currentUser)}catch{await reauthenticateWithPopup(auth.currentUser,gp);await deleteUser(auth.currentUser)}}catch(e){say(e.message)}}

 async function delSpace(){if(!confirm(`Delete "${sp.name}" for everyone? All punches, fixes, bills and notes will be removed.`))return;
  if(prompt(`Final check. Type the space name exactly to delete it forever:\n${sp.name}`)!==sp.name)return say('Name did not match. Nothing was deleted.');
  try{await wipe(sp.id);setMenu(null);setSid(null);say('Space and all its data deleted')}catch(e){say('Delete failed: '+e.message+' Publish the latest firestore.rules.',6000)}}
 const askNotif=async()=>{if(!window.Notification)return say('Not supported here. On iPhone, add the app to your Home Screen first.',5000);
  if(await Notification.requestPermission()!=='granted')return say('Reminders blocked. Allow notifications in your browser settings.',5000);
  const ok=await notify('DormMates reminders are on 🔔','You will be reminded at 7:30 PM before your 8:00 PM auto time-in.');say(ok?'Reminders on. Check your notifications.':'Allowed, but the notification could not be shown.',4000)};
 async function wipe(id){for(const c of ['punches','exceptions','bills','notes']){const q=await getDocs(collection(db,'spaces',id,c));for(let i=0;i<q.docs.length;i+=40)await Promise.all(q.docs.slice(i,i+40).map(d=>deleteDoc(d.ref)))}await deleteDoc(doc(db,'spaces',id))}
 const post=async()=>{if(!nt.trim())return;await addDoc(col('notes'),{uid:u.uid,text:nt.trim(),createdAt:Date.now()});setNt('')};
 const aw=!on&&away(u.uid,P),awayCard=aw&&<Item><h3>Auto time-in {dayWord(aw.D)} at 8:00 PM</h3><p className="mut" style={{marginBottom:12}}>Still not in the dorm? Confirm between 7:30 and 8:00 PM with a picture or your location. If you don't, you're timed in automatically.</p>
  <button className={`w ${aw.open?'pri':''}`} disabled={!aw.open} onClick={()=>setMenu('away')}>{aw.open?"📍 I'm still away":'Opens at 7:30 PM'}</button></Item>;
 const Home=()=>{const ms=members.map(m=>({...m,h:H(m.id)})).sort((a,b)=>b.h-a.h),mx=Math.max(1,...ms.map(m=>m.h)),h=H(u.uid),home=members.filter(m=>last(m.id)?.type==='in').length;
  return <List>
  <Item className="card hero"><Cycle off={off} set={setOff}/><div className="chip"><span className="dot on" style={{margin:0}}/>{home} of {members.length} home</div>
   <div className="big"><Num v={Math.floor(h)} d={0}/><small>h {Math.round(h%1*60)}m</small></div><p className="mut">your total this cycle</p>
   {off===0&&<div className="stage"><div className={`ring ${on?'in':''}`}/>
    <motion.button whileTap={{scale:.92}} className={`punch ${on?'in':''}`} onClick={()=>{buzz();setMenu('punch')}}>{on?'Time out':'Time in'}<small>{on?clock(Date.now()-mine.ts):'tap to start'}</small></motion.button>
    {burst>0&&<div className="burst" key={burst}>{[...Array(14)].map((_,i)=><span key={i} style={{'--x':Math.cos(i*.45)*130+'px','--y':Math.sin(i*.45)*130+'px','--c':['#ffc24b','#8c91ff','#5be3a8','#ff6b8b'][i%4]}}/>)}</div>}</div>}</Item>
  {off===0&&awayCard}
  <Item><h3>Cycle leaderboard</h3>{ms.map((m,i)=><div key={m.id} style={{marginTop:12}}><div className="row sp"><span>{i?'':'👑 '}{m.n}</span><b>{dur(m.h)}</b></div><div className="bar"><motion.b initial={{width:0}} animate={{width:m.h/mx*100+'%'}} transition={{duration:.9,delay:.1*i}}/></div></div>)}</Item></List>};

 const Dorm=()=><List><h2 style={{margin:'6px 0 12px'}}>Who's home</h2>{members.map(m=>{const l=last(m.id),i=l?.type==='in';
  return <Item key={m.id} className="card row"><Av m={m}/><div style={{flex:1}}><b>{m.n}</b>{m.id===sp.ownerId&&<span className="mut"> · host</span>}
   <div className="mut"><span className={`dot ${i?'on':''}`}/>{l?`${i?'In for '+dur((Date.now()-l.ts)/36e5):'Out'} · ${fmt(l.ts)}`:'No punches yet'}</div></div>{proof(l)}
   {owner&&m.id!==u.uid&&<button className="sm" onClick={()=>confirm(`Remove ${m.n} from this space?`)&&updateDoc(doc(db,'spaces',sp.id),{members:arrayRemove(m.id),['names.'+m.id]:deleteField()})}>✕</button>}</Item>})}
  <Item><h3>Notice board</h3><div className="row"><input style={{margin:0}} placeholder="Post a note for everyone…" value={nt} onChange={e=>setNt(e.target.value)}/><button className="pri sm" onClick={post}>Post</button></div>
   {N.map(n=><div key={n.id} className="note"><b>{nm(n.uid)}</b> <span className="mut">{fmt(n.createdAt)}</span><p>{n.text}</p>{(owner||n.uid===u.uid)&&<button className="sm" onClick={()=>deleteDoc(doc(db,'spaces',sp.id,'notes',n.id))}>✕</button>}</div>)}{!N.length&&<p className="mut" style={{marginTop:10}}>No notes yet.</p>}</Item></List>;

 const History=()=>{const w0=hf==='all'?members:members.filter(m=>m.id===hf),who=w0.length?w0:members,dds=who.map(m=>daily(iv(m.id,P,X,r),r)),dd=dds[0].map((_,i)=>dds.reduce((t,d)=>t+d[i],0)),mx=Math.max(1,...dd),S=who.flatMap(m=>sessions(m.id,P,X,r)).sort((x,y)=>y.a-x.a);
  return <List><Cycle off={off} set={setOff}/>
  <div className="fchips">{[{id:'all',n:'Everyone'},...members].map(m=><button key={m.id} className={`fchip ${hf===m.id?'on':''}`} onClick={()=>setHf(m.id)}>{m.n.split(' ')[0]}</button>)}</div>
  <Item><div className="row sp"><h3 style={{margin:0}}>Hours per day</h3><span className="mut">{sel!=null&&dd[sel]!=null?`${dayAt(r[0],sel).toLocaleDateString([],{month:'short',day:'numeric'})}: ${dur(dd[sel])}`:'tap a bar'}</span></div>
   <div className="chart">{dd.map((v,i)=><div key={i} className="col" onClick={()=>setSel(i)}><motion.div className={`b ${sel===i?'sel':''}`} initial={{height:0}} animate={{height:Math.max(3,v/mx*100)+'%'}} transition={{delay:i*.015}}/><span>{i%5===0?dayAt(r[0],i).getDate():''}</span></div>)}</div>
   <p className="mut" style={{marginTop:8}}>{hf==='all'?'Combined total':nm(hf)+"'s total"}: <b style={{color:'var(--ink)'}}>{dur(dd.reduce((a,c)=>a+c,0))}</b></p></Item>
  <h3 style={{margin:'16px 0 10px'}}>Time logged</h3>
  {S.map((s,i)=><Item key={i}><div className="row sp"><div><b>{nm(s.uid)}</b><div className="mut">{new Date(s.a).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})} · {tm(s.a)} → {s.live?'now':tm(s.b)}{s.fix?' · approved fix':''}</div>
   {(s.before||s.after)&&<div className="mut">{s.before?'↩ started last cycle':'continues next cycle ↪'}</div>}</div><b style={{color:'var(--lamp)'}}>{dur((s.cb-s.ca)/36e5)}</b></div>{(s.ip||s.op)&&<div className="row" style={{marginTop:10}}>{proof(s.ip)}{proof(s.op)}</div>}</Item>)}
  {!S.length&&<Item><span className="mut">No time logged this cycle.</span></Item>}</List>};

 const Fixes=()=>{const L=owner?X:X.filter(x=>x.uid===u.uid);
  const send=async()=>{const i=+new Date(f.i),o=+new Date(f.o);if(o<=i||!f.r.trim())return say('Time out must be after time in, and add a reason.');
   await addDoc(col('exceptions'),{uid:u.uid,inTs:i,outTs:o,reason:f.r.trim(),status:'pending',createdAt:Date.now()});setF({...f,r:''});say('Request sent')};
  return <List><Item><h3>Forgot to punch?</h3><p className="mut">Request a correction. {nm(sp.ownerId)} approves or denies it. Once approved, it replaces any punches inside that window.</p>
   <label>Time in</label><input type="datetime-local" value={f.i} onChange={e=>setF({...f,i:e.target.value})}/><label>Time out</label><input type="datetime-local" value={f.o} onChange={e=>setF({...f,o:e.target.value})}/>
   <label>Reason</label><input value={f.r} placeholder="Phone died, left charger…" onChange={e=>setF({...f,r:e.target.value})}/><button className="pri w" onClick={send}>Send request</button></Item>
   <h3 style={{margin:'16px 0 10px'}}>{owner?'All requests':'My requests'}</h3>
   {L.map(x=><Item key={x.id}><div className="row sp"><b>{nm(x.uid)}</b><span className={`tag t-${x.status}`}>{x.status}</span></div><p>{fmt(x.inTs)} → {fmt(x.outTs)} <span className="mut">({dur((x.outTs-x.inTs)/36e5)})</span></p><p className="mut">“{x.reason}”</p>
    {owner&&x.status==='pending'&&<div className="row" style={{marginTop:10}}>{['approved','denied'].map(s=><button key={s} className={s==='approved'?'ok':'no'} style={{flex:1}} onClick={()=>{updateDoc(doc(db,'spaces',sp.id,'exceptions',x.id),{status:s});buzz()}}>{s==='approved'?'Approve':'Deny'}</button>)}</div>}</Item>)}
   {!L.length&&<Item><span className="mut">No requests yet.</span></Item>}</List>};

 const Bills=()=>{const key=String(r[0]),b=B.find(x=>x.id===key)||{},ps=b.ps??r[0],pe=b.pe??r[1]-864e5,rg=[ps,pe+864e5],days=Math.max(1,Math.round((rg[1]-rg[0])/864e5));
  const hm=members.map(m=>({...m,h:b.final?.[m.id]??hrs(m.id,P,X,rg)})),T=hm.reduce((t,m)=>t+m.h,0),due=new Date(new Date(pe).getFullYear(),new Date(pe).getMonth()+1,5),left=Math.ceil((due-Date.now())/864e5);
  const split=amt=>{const raw=hm.map(m=>(T?m.h/T:1/hm.length)*amt*100),fl=raw.map(Math.floor);let rem=Math.round(amt*100)-fl.reduce((a,c)=>a+c,0);
   raw.map((x,i)=>[x-fl[i],i]).sort((a,c)=>c[0]-a[0]).forEach(([,i])=>{if(rem>0){fl[i]++;rem--}});return fl.map(c=>c/100)};
  const se=split(b.elec||0),sw=split(b.water||0),tot=(b.elec||0)+(b.water||0),bref=doc(db,'spaces',sp.id,'bills',key);
  const npend=X.filter(x=>x.status==='pending'&&x.inTs<rg[1]&&x.outTs>rg[0]).length,live=!b.final&&members.some(m=>last(m.id)?.type==='in');
  const submit=async ev=>{ev.preventDefault();const g=new FormData(ev.target);await setDoc(bref,{elec:+g.get('e')||0,water:+g.get('w')||0,ps:s2d(g.get('s')),pe:s2d(g.get('x'))},{merge:true});say('Bills saved');buzz()};
  const csv=()=>{const rows=[['Name','Hours','Share %','Electric','Water','Total','Paid'],...hm.map((m,i)=>[m.n,m.h.toFixed(2),(T?m.h/T*100:100/hm.length).toFixed(1),se[i].toFixed(2),sw[i].toFixed(2),(se[i]+sw[i]).toFixed(2),b.paid?.[m.id]?'yes':'no'])],a=document.createElement('a');
   a.href=URL.createObjectURL(new Blob([rows.map(x=>x.map(c=>`"${c}"`).join(',')).join('\n')],{type:'text/csv'}));a.download=`dormmates-bills-${d2s(ps)}.csv`;a.click()};
  return <List><Cycle off={off} set={setOff}/>
   <Item className="card hero"><span className="mut">Pay by {due.toLocaleDateString([],{month:'long',day:'numeric'})}</span><div className="big">{left<0?'Overdue':<><Num v={left} d={0}/><small> days left</small></>}</div>
    <p className="mut">{days} days · {d2s(ps)} to {d2s(pe)}{tot?` · ${peso(tot/days)} per day`:''}{b.final?' · 🔒 finalized':''}</p></Item>
   {npend>0&&!b.final&&<div className="warn">{npend} fix request{npend>1?'s':''} still pending in this period. Totals will change once approved.</div>}
   {live&&tot>0&&<div className="warn">Someone is still timed in, so their hours keep counting until they time out. Finalize after everyone is out.</div>}
   {owner&&<Item><h3>Set this period's bills</h3><form key={key+tot+ps+pe} onSubmit={submit}><label>Electric bill (₱)</label><input name="e" type="number" step="any" inputMode="decimal" defaultValue={b.elec||''}/><label>Water bill (₱)</label><input name="w" type="number" step="any" inputMode="decimal" defaultValue={b.water||''}/>
    <label>Period starts</label><input name="s" type="date" defaultValue={d2s(ps)} required/><label>Period ends</label><input name="x" type="date" defaultValue={d2s(pe)} required/><button className="pri w">Save & calculate</button></form></Item>}
   {tot?<>{hm.map((m,i)=>{const s=T?m.h/T:1/hm.length,pd=b.paid?.[m.id];
    return <Item key={m.id}><div className="row"><Av m={m}/><div style={{flex:1}}><b>{m.n}</b><div className="mut">{dur(m.h)} of {dur(T)} · {(s*100).toFixed(1)}%</div></div><div className="big" style={{fontSize:24}}>{peso(se[i]+sw[i])}</div></div>
    <div className="row sp mut" style={{marginTop:10}}><span>⚡ {peso(se[i])}</span><span>💧 {peso(sw[i])}</span>{owner?<button className={`sm ${pd?'ok':''}`} onClick={()=>updateDoc(bref,{['paid.'+m.id]:!pd})}>{pd?'Paid ✓':'Mark paid'}</button>:pd&&<span className="tag t-approved">Paid</span>}</div></Item>})}
    <Item><div className="row sp"><span className="mut">Total billed</span><b>{peso(tot)}</b></div><p className="mut" style={{marginTop:6}}>Each share = member hours ÷ total hours × bill. Cents are allocated so the shares add up exactly.</p>
     <div className="row" style={{marginTop:12}}><button className="sm" style={{flex:1}} onClick={csv}>⬇ Export CSV</button>{owner&&<button className={`sm ${b.final?'':'pri'}`} style={{flex:1}} onClick={()=>setDoc(bref,{final:b.final?deleteField():Object.fromEntries(hm.map(m=>[m.id,m.h]))},{merge:true})}>{b.final?'Reopen':'🔒 Finalize'}</button>}</div></Item></>
   :<Item><span className="mut">The host hasn't entered this period's bills yet.</span></Item>}</List>};

 const V={home:Home,dorm:Dorm,history:History,fixes:Fixes,bills:Bills},T=[['home','🏠','Home'],['dorm','👥','Dorm'],['history','🕘','History'],['fixes','📝','Fixes'],['bills','💡','Bills']];
 return <><main>{orbs}
  <header><button className="hbtn" onClick={()=>setMenu('spaces')}><div className="logo"><i/>{sp.name} ▾</div><span className="mut">{spaces.length>1?`${spaces.length} spaces · `:''}tap to switch</span></button><button className="hbtn" onClick={()=>setMenu('profile')}><Av m={me}/></button></header>
  <AnimatePresence mode="wait"><motion.div key={tab} initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}} transition={{duration:.18}}>{V[tab]()}</motion.div></AnimatePresence>

  <AnimatePresence>{menu&&<Sheet key={menu} close={()=>setMenu(null)}>
   {(menu==='punch'||menu==='away')&&<><h2>{menu==='away'?"Confirm you're still away":`Time ${on?'out':'in'}`}</h2><p className="mut" style={{margin:'6px 0 16px'}}>Add proof so your dormmates know it's real.</p>
    <input id="cam" type="file" accept="image/*" capture="user" hidden onChange={e=>photo(e.target.files[0],menu==='away'?'away':undefined)}/>
    <button className="pri w" style={{marginBottom:8}} onClick={()=>document.getElementById('cam').click()}>📸 Take a picture</button><button className="w" onClick={()=>loc(menu==='away'?'away':undefined)}>📍 Send my location</button></>}
   {menu==='spaces'&&<><h2 style={{marginBottom:12}}>Your spaces</h2>{spaces.map(s=><button key={s.id} className={`sp-row ${s.id===sp.id?'cur':''}`} onClick={()=>open(s.id)}><div style={{flex:1}}><b>{s.name}</b><div className="mut">{s.members.length} members{s.ownerId===u.uid?' · you are host':''}</div></div>{s.id===sp.id&&'✓'}</button>)}
    <div className="card row sp" style={{marginTop:12}}><div><div className="mut">Invite code</div><b style={{fontSize:22,letterSpacing:2}}>{sp.code}</b></div><button className="sm" onClick={()=>navigator.clipboard?.writeText(sp.code).then(()=>say('Code copied'))}>Copy</button></div>
    <SpaceForm u={u} open={open} say={say}/></>}
   {menu==='profile'&&<><div className="row" style={{marginBottom:16}}><Av m={me}/><div><b>{me.n}</b><div className="mut">{u.email}</div></div></div>
    <button className="w" style={{marginBottom:8}} onClick={switchAcc}>🔄 Switch account</button><button className="w" style={{marginBottom:8}} onClick={()=>signOut(auth)}>Sign out</button>
    <button className="w" style={{marginBottom:8}} onClick={async()=>{if(confirm(`Leave ${sp.name}?`)){await leave(sp);setMenu(null)}}}>Leave "{sp.name}"</button>{owner&&<button className="w" style={{marginBottom:8,color:'var(--bad)'}} onClick={delSpace}>🗑 Delete this space (host only)</button>}<button className="w" style={{marginBottom:8}} onClick={askNotif}>🔔 Enable reminders</button><button className="no w" onClick={delAcc}>Delete my account</button></>}
  </Sheet>}</AnimatePresence>
  <AnimatePresence>{zoom&&<motion.div className="lb" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setZoom(null)}><motion.img src={zoom} initial={{scale:.7}} animate={{scale:1}} exit={{scale:.7}}/></motion.div>}</AnimatePresence>
  <AnimatePresence>{toast&&<motion.div className="toast" initial={{y:-40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:-40,opacity:0}}>{toast}</motion.div>}</AnimatePresence></main>
  <nav>{T.map(([k,i,n])=><button key={k} className={tab===k?'on':''} onClick={()=>{setTab(k);setOff(0);buzz()}}>{tab===k&&<motion.div layoutId="pill" className="pill" transition={{type:'spring',stiffness:420,damping:34}}/>}<span>{i}</span>{n}{k==='fixes'&&pend>0&&<em>{pend}</em>}</button>)}</nav></>}
