import {useEffect,useRef,useState} from 'react';
import {motion,AnimatePresence,animate,useDragControls} from 'framer-motion';
import {onAuthStateChanged,signInWithPopup,signOut,deleteUser,reauthenticateWithPopup} from 'firebase/auth';
import {doc,setDoc,addDoc,updateDoc,deleteDoc,deleteField,collection,query,where,orderBy,limit,onSnapshot,getDocs,arrayUnion,arrayRemove,writeBatch} from 'firebase/firestore';
import {auth,db,gp} from './firebase';
import {enablePush} from './push';
import {ping} from './notify';
import {fmt,tm,dur,clock,peso,d2s,s2d,dayAt,cyc,cycLabel,iv,hrs,daily,sessions,pairs,shares,norm,away,fd,dayWord,notify,shrink} from './lib';

const buzz=()=>navigator.vibrate?.(25);
function Num({v,d=1}){const r=useRef();useEffect(()=>{const c=animate(0,v,{duration:1,ease:'easeOut',onUpdate:x=>r.current&&(r.current.textContent=x.toFixed(d))});return()=>c.stop()},[v]);return <span ref={r}>0</span>}
const Av=({m})=>m.p?<img className="av" src={m.p} referrerPolicy="no-referrer"/>:<div className="av">{m.n[0]}</div>;
const Cycle=({off,set,d})=><div className="row sp" style={{marginBottom:12}}><button className="sm" onClick={()=>set(off-1)}>‹</button><b>{cycLabel(cyc(off,d))}</b><button className="sm" onClick={()=>set(off+1)}>›</button></div>;
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
 const [tab,setTab]=useState('home'),[off,setOff]=useState(0),[menu,setMenu]=useState(null),[zoom,setZoom]=useState(null),[sel,setSel]=useState(null),[toast,setToast]=useState(''),[burst,setBurst]=useState(0),[,tick]=useState(0),[hf,setHf]=useState('all'),[nt,setNt]=useState(''),[N,setN]=useState([]),[dy,setDy]=useState(null),[ef,setEf]=useState(null),[an,setAn]=useState(''),[A,setA]=useState([]),[R,setR]=useState([]),[PF,setPF]=useState(null),[rp,setRp]=useState(null);
 const iso=t=>new Date(t-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16),[f,setF]=useState({i:iso(Date.now()-9*36e5),o:iso(Date.now()),r:''});
 const say=(m,ms=2200)=>{setToast(m);setTimeout(()=>setToast(''),ms)};
 useEffect(()=>{const t=setInterval(()=>tick(n=>n+1),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>onAuthStateChanged(auth,user=>{setU(user);setReady(true)}),[]);
 useEffect(()=>{if(u&&window.Notification?.permission==='granted')enablePush(u.uid).catch(()=>{})},[u?.uid]);
 useEffect(()=>{if(!u)return;return onSnapshot(doc(db,'prefs',u.uid),d=>setPF(d.exists()?d.data():null),()=>{})},[u?.uid]);
 useEffect(()=>{setLoaded(false);if(!u){setSpaces([]);return}
  return onSnapshot(query(collection(db,'spaces'),where('members','array-contains',u.uid)),d=>{setSpaces(d.docs.map(x=>({id:x.id,...x.data()})));setLoaded(true)})},[u?.uid]);
 const sp=spaces.find(s=>s.id===sid)||spaces[0];
 useEffect(()=>{setP([]);setX([]);setB([]);setN([]);setA([]);setR([]);if(!sp?.id)return;localStorage.setItem('sid',sp.id);const s=doc(db,'spaces',sp.id),m=d=>d.docs.map(x=>({id:x.id,...x.data()}));
  const un=[onSnapshot(query(collection(s,'punches'),orderBy('ts','desc'),limit(1500)),d=>setP(m(d))),onSnapshot(query(collection(s,'exceptions'),orderBy('createdAt','desc')),d=>setX(m(d))),onSnapshot(collection(s,'bills'),d=>setB(m(d))),onSnapshot(query(collection(s,'notes'),orderBy('createdAt','desc'),limit(30)),d=>setN(m(d))),onSnapshot(query(collection(s,'announcements'),orderBy('createdAt','desc'),limit(10)),d=>setA(m(d))),onSnapshot(sp.ownerId===u.uid?collection(s,'receipts'):query(collection(s,'receipts'),where('uid','==',u.uid)),d=>setR(m(d)),()=>{})];
  return()=>un.forEach(x=>x())},[sp?.id,sp?.ownerId]);
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

 const me={n:u.displayName||'Me',p:u.photoURL||''},owner=sp.ownerId===u.uid,cd=sp.cycleDay||14,r=cyc(off,cd);
 const members=sp.members.map(id=>({id,...(sp.names?.[id]||{n:'Member'})})),nm=id=>members.find(m=>m.id===id)?.n;
 const last=id=>norm(id,P).at(-1),mine=last(u.uid),on=mine?.type==='in',pend=owner?X.filter(x=>x.status==='pending').length:0;
 const H=id=>hrs(id,P,X,r),col=n=>collection(db,'spaces',sp.id,n),th=s=><img className="thumb" src={s} onClick={()=>setZoom(s)}/>;
 const proof=p=>p?.auto?<span className="tag t-pending">auto</span>:p?.photo?th(p.photo):p?.loc?<a className="btn sm" target="_blank" href={`https://maps.google.com/?q=${p.loc.lat},${p.loc.lng}`}>📍</a>:null;

 async function save(pr,type){type=type||(on?'out':'in');const pref=await addDoc(col('punches'),{uid:u.uid,type,ts:Date.now(),...pr});setMenu(null);buzz();if(type!=='away')ping({sid:sp.id,kind:'punch',id:pref.id});
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
 const askNotif=async()=>{
  if(!window.Notification||!('serviceWorker' in navigator))return say('Not supported here. On iPhone, add the app to your Home Screen first, then open it from the icon.',6000);
  if(await Notification.requestPermission()!=='granted')return say('Reminders blocked. Allow notifications in your phone settings.',5000);
  try{await enablePush(u.uid);await notify('DormMates reminders are on 🔔','You will get a reminder at 7:30 PM, even when the app is closed.');say('Reminders on ✓',4000)}
  catch(e){say('Could not turn on push: '+e.message,6000)}};
 async function wipe(id){for(const c of ['punches','exceptions','bills','notes','announcements','receipts']){const q=await getDocs(collection(db,'spaces',id,c));for(let i=0;i<q.docs.length;i+=40)await Promise.all(q.docs.slice(i,i+40).map(d=>deleteDoc(d.ref)))}await deleteDoc(doc(db,'spaces',id))}
 const post=async()=>{if(!nt.trim())return;const nr=await addDoc(col('notes'),{uid:u.uid,text:nt.trim(),createdAt:Date.now()});setNt('');ping({sid:sp.id,kind:'note',id:nr.id})};
 const delItem=async(c,id)=>{if(!confirm('Delete this permanently for everyone?'))return;try{await deleteDoc(doc(db,'spaces',sp.id,c,id));buzz();say('Deleted')}catch(e){say('Delete failed: '+e.message,5000)}};
 const savePf=async()=>{try{await setDoc(doc(db,'prefs',u.uid),{uid:u.uid,inOn:!!rp.inOn,inAt:rp.inAt,outOn:!!rp.outOn,outAt:rp.outAt,days:rp.days,updatedAt:Date.now()},{merge:true});setMenu(null);buzz();say(window.Notification?.permission==='granted'?'Reminders saved ✓':'Saved. Now tap "Enable reminders" so your phone can receive them.',5000)}catch(e){say('Failed: '+e.message,5000)}};
 const sendAn=async()=>{if(!an.trim())return;try{const ar=await addDoc(col('announcements'),{uid:u.uid,text:an.trim(),createdAt:Date.now()});setAn('');ping({sid:sp.id,kind:'announcement',id:ar.id});buzz();say('Sent to all members 📣')}catch(e){say('Failed: '+e.message,5000)}};
 const aw=!on&&away(u.uid,P),awayCard=aw&&<Item><h3>Auto time-in {dayWord(aw.D)} at 8:00 PM</h3><p className="mut" style={{marginBottom:12}}>Still not in the dorm? Confirm between 7:30 and 8:00 PM with a picture or your location. If you don't, you're timed in automatically.</p>
  <button className={`w ${aw.open?'pri':''}`} disabled={!aw.open} onClick={()=>setMenu('away')}>{aw.open?"📍 I'm still away":'Opens at 7:30 PM'}</button></Item>;
 const Home=()=>{const ms=members.map(m=>({...m,h:H(m.id)})).sort((a,b)=>b.h-a.h),mx=Math.max(1,...ms.map(m=>m.h)),h=H(u.uid),home=members.filter(m=>last(m.id)?.type==='in').length;
  return <List>
  <Item className="card hero"><Cycle off={off} set={setOff} d={cd}/><div className="chip"><span className="dot on" style={{margin:0}}/>{home} of {members.length} home</div>
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
  {owner&&<Item><h3>⚙️ Space settings</h3><label>Cycle starts on day</label><select value={cd} onChange={e=>updateDoc(doc(db,'spaces',sp.id),{cycleDay:+e.target.value}).then(()=>{setOff(0);say('Cycle updated ✓')}).catch(er=>say(er.message,5000))}>{[...Array(28)].map((_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select>
   <p className="mut">Current cycle: <b style={{color:'var(--ink)'}}>{cycLabel(cyc(0,cd))}</b>. Hours, fixes and bills follow this range. Bills already saved under older dates stay in their old cycle.</p></Item>}
  {owner&&<Item><h3>📣 Notify everyone</h3><p className="mut" style={{marginBottom:8}}>Your message is sent as a push notification to every member.</p><input placeholder="e.g. Water will be off at 3 PM" maxLength={140} value={an} onChange={e=>setAn(e.target.value)}/><button className="pri w" disabled={!an.trim()} onClick={sendAn}>Send notification</button></Item>}
  {A.length>0&&<Item><h3>Announcements</h3>{A.map(a=><div key={a.id} className="note"><span className="mut">{fmt(a.createdAt)}</span><p>📣 {a.text}</p>{owner&&<button className="sm" onClick={()=>delItem('announcements',a.id)}>✕</button>}</div>)}</Item>}
  <Item><h3>Notice board</h3><div className="row"><input style={{margin:0}} placeholder="Post a note for everyone…" value={nt} onChange={e=>setNt(e.target.value)}/><button className="pri sm" onClick={post}>Post</button></div>
   {N.map(n=><div key={n.id} className="note"><b>{nm(n.uid)}</b> <span className="mut">{fmt(n.createdAt)}</span><p>{n.text}</p>{(owner||n.uid===u.uid)&&<button className="sm" onClick={()=>delItem('notes',n.id)}>✕</button>}</div>)}{!N.length&&<p className="mut" style={{marginTop:10}}>No notes yet.</p>}</Item></List>;

 const History=()=>{const w0=hf==='all'?members:members.filter(m=>m.id===hf),who=w0.length?w0:members,dds=who.map(m=>daily(iv(m.id,P,X,r),r)),dd=dds[0].map((_,i)=>dds.reduce((t,d)=>t+d[i],0)),mx=Math.max(1,...dd),S=who.flatMap(m=>sessions(m.id,P,X,r)).sort((x,y)=>y.a-x.a);
  return <List><Cycle off={off} set={setOff} d={cd}/>
  <div className="fchips">{[{id:'all',n:'Everyone'},...members].map(m=><button key={m.id} className={`fchip ${hf===m.id?'on':''}`} onClick={()=>setHf(m.id)}>{m.n.split(' ')[0]}</button>)}</div>
  <Item><div className="row sp"><h3 style={{margin:0}}>Hours per day</h3><span className="mut">{sel!=null&&dd[sel]!=null?`${dayAt(r[0],sel).toLocaleDateString([],{month:'short',day:'numeric'})}: ${dur(dd[sel])}`:'tap a bar'}</span></div>
   <div className="chart">{dd.map((v,i)=><div key={i} className="col" onClick={()=>setSel(i)}><motion.div className={`b ${sel===i?'sel':''}`} initial={{height:0}} animate={{height:Math.max(3,v/mx*100)+'%'}} transition={{delay:i*.015}}/><span>{i%5===0?dayAt(r[0],i).getDate():''}</span></div>)}</div>
   <p className="mut" style={{marginTop:8}}>{hf==='all'?'Combined total':nm(hf)+"'s total"}: <b style={{color:'var(--ink)'}}>{dur(dd.reduce((a,c)=>a+c,0))}</b></p></Item>
  <h3 style={{margin:'16px 0 10px'}}>Time logged</h3>
  {S.map((s,i)=><Item key={i}><div className="row sp"><div><b>{nm(s.uid)}</b><div className="mut">{new Date(s.a).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})} · {tm(s.a)} → {s.live?'now':tm(s.b)}{s.fix?' · approved fix':''}</div>
   {(s.before||s.after)&&<div className="mut">{s.before?'↩ started last cycle':'continues next cycle ↪'}</div>}</div><b style={{color:'var(--lamp)'}}>{dur((s.cb-s.ca)/36e5)}</b></div>{(s.ip||s.op)&&<div className="row" style={{marginTop:10}}>{proof(s.ip)}{proof(s.op)}</div>}</Item>)}
  {!S.length&&<Item><span className="mut">No time logged this cycle.</span></Item>}</List>};

 const Fixes=()=>{const L=owner?X:X.filter(x=>x.uid===u.uid),days=[];for(let i=0;+dayAt(r[0],i)<r[1];i++)days.push(+dayAt(r[0],i));
  const dd=daily(iv(u.uid,P,X,r),r),mx=Math.max(1,...dd),lead=new Date(days[0]).getDay(),now=Date.now(),tdy=+dayAt(now,0),
   pd=d=>X.some(x=>x.uid===u.uid&&x.status==='pending'&&(x.cutA??x.inTs)<+dayAt(d,1)&&(x.cutB??x.outTs)>d),
   kindName={add:'Add time',edit:'Change time',remove:'Remove session'};
  const bk=String(r[0]),bb=B.find(x=>x.id===bk)||{},lock=!!bb.final||(!!bb.fixDue&&Date.now()>bb.fixDue),lockedX=x=>!!B.find(z=>z.id===x.cyc)?.final;
  const saveFx=async ev=>{ev.preventDefault();const v=new FormData(ev.target).get('fx');if(!v)return say('Pick a date and time.');try{await setDoc(doc(db,'spaces',sp.id,'bills',bk),{fixDue:+new Date(v)},{merge:true});ping({sid:sp.id,kind:'fixdue',id:bk});buzz();say('Deadline saved ✓')}catch(e){say(e.message,5000)}};
  const clearFx=()=>setDoc(doc(db,'spaces',sp.id,'bills',bk),{fixDue:deleteField()},{merge:true}).then(()=>say('Deadline removed'));
  return <List><Cycle off={off} set={setOff} d={cd}/>
   {bb.final?<div className="warn">🔒 This cycle is finalized. Hours are locked, so no new fix requests.</div>
    :bb.fixDue?<div className="warn">{lock?`🔒 Fix requests closed on ${fmt(bb.fixDue)}. This cycle is locked.`:`⏳ Fix requests close ${fmt(bb.fixDue)}. Send yours before then.`}</div>:null}
   {owner&&!bb.final&&<Item><h3>⏳ Fix deadline</h3><p className="mut" style={{marginBottom:8}}>After this time, nobody can send new fix requests for this cycle.</p>
    <form key={bk+(bb.fixDue||'')} onSubmit={saveFx}><input name="fx" type="datetime-local" defaultValue={bb.fixDue?iso(bb.fixDue):''}/><div className="row"><button className="pri" style={{flex:1}}>Save deadline</button>{bb.fixDue&&<button type="button" style={{flex:1}} onClick={clearFx}>Remove</button>}</div></form></Item>}
   <Item><h3>Fix your hours</h3><p className="mut">Tap a day to add missing time, change a time in/out, or remove a session. {nm(sp.ownerId)} approves or denies it.</p>
    <div className="cal">{['S','M','T','W','T','F','S'].map((w,i)=><div key={i} className="wd">{w}</div>)}{[...Array(lead)].map((_,i)=><div key={'e'+i}/>)}
     {days.map((d,i)=><button key={d} disabled={d>now} className={`dc ${d===tdy?'today':''} ${pd(d)?'pend':''}`} onClick={()=>{buzz();setDy(d);setEf(null);setMenu('day')}}><div className="lvl" style={{height:dd[i]/mx*100+'%'}}/><b>{new Date(d).getDate()}</b><i>{dd[i]>0?(dd[i]<10?dd[i].toFixed(1):Math.round(dd[i]))+'h':''}</i></button>)}</div>
    <div className="row sp mut" style={{marginTop:10}}><span>Fill = hours that day</span><span>🟡 = pending request</span></div></Item>
   <h3 style={{margin:'16px 0 10px'}}>{owner?'All requests':'My requests'}</h3>
   {L.map(x=>{const k=x.kind||'add';return <Item key={x.id}><div className="row sp"><b>{nm(x.uid)}</b><span className={`tag t-${x.status}`}>{x.status}</span></div>
    <p><b>{kindName[k]}</b></p>
    {k==='edit'&&<p className="mut">Was {fmt(x.origA)} → {fmt(x.origB)}</p>}
    <p>{k==='remove'?'Remove ':k==='edit'?'Now ':''}{fmt(x.inTs)} → {fmt(x.outTs)} <span className="mut">({dur((x.outTs-x.inTs)/36e5)})</span></p><p className="mut">“{x.reason}”</p>
    {owner&&x.status==='pending'&&lockedX(x)&&<p className="mut" style={{marginTop:8}}>🔒 Cycle finalized, so this can't be decided anymore.</p>}
    {owner&&x.status==='pending'&&!lockedX(x)&&<div className="row" style={{marginTop:10}}>{['approved','denied'].map(s=><button key={s} className={s==='approved'?'ok':'no'} style={{flex:1}} onClick={()=>{updateDoc(doc(db,'spaces',sp.id,'exceptions',x.id),{status:s,decidedAt:Date.now()}).then(()=>ping({sid:sp.id,kind:'fixdecision',id:x.id}));buzz()}}>{s==='approved'?'Approve':'Deny'}</button>)}</div>}
    {x.uid===u.uid&&x.status==='pending'&&<button className="sm w" style={{marginTop:10}} onClick={()=>deleteDoc(doc(db,'spaces',sp.id,'exceptions',x.id))}>Cancel request</button>}</Item>})}
   {!L.length&&<Item><span className="mut">No requests yet.</span></Item>}</List>};

 const DaySheet=()=>{const d0=dy,d1=+dayAt(dy,1),now=Date.now(),SS=pairs(u.uid,P,X).filter(s=>s.a<d1&&s.b>d0).sort((a,b)=>a.a-b.a),
   PN=X.filter(x=>x.uid===u.uid&&x.status==='pending'&&(x.cutA??x.inTs)<d1&&(x.cutB??x.outTs)>d0).length,
   title=new Date(d0).toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'}),ck=String(r[0]),b2=B.find(x=>x.id===ck)||{},LK=!!b2.final||(!!b2.fixDue&&now>b2.fixDue);
  const send=async()=>{if(LK)return say('Fix requests are closed for this cycle.');const{mode,s,i,o,r}=ef;if(!r.trim())return say('Add a short reason.');
   const q={uid:u.uid,kind:mode,cyc:ck,reason:r.trim(),status:'pending',createdAt:Date.now()};
   if(mode==='remove'){q.origA=q.cutA=q.inTs=s.a;q.origB=q.cutB=q.outTs=s.live?now:s.b}
   else{const a=+new Date(i),b=+new Date(o);if(!(a>0&&b>a))return say('Time out must be after time in.');if(b>now+6e4)return say("Time out can't be in the future.");
    q.inTs=a;q.outTs=b;if(mode==='add'){q.cutA=a;q.cutB=b}else{q.origA=q.cutA=s.a;q.origB=q.cutB=s.live?now:s.b}}
   try{const xr=await addDoc(col('exceptions'),q);ping({sid:sp.id,kind:'fixnew',id:xr.id});setEf(null);setMenu(null);buzz();say('Request sent ✓')}catch(e){say('Failed: '+e.message,5000)}};
  if(ef)return <><h2>{{add:'Add missing time',edit:'Change this session',remove:'Remove this session'}[ef.mode]}</h2><p className="mut" style={{margin:'6px 0 14px'}}>{title}</p>
   {ef.mode==='remove'?<div className="sess"><b>{fmt(ef.s.a)} → {ef.s.live?'now':fmt(ef.s.b)}</b><div className="mut">This session stops counting once approved.</div></div>
   :<><label>Time in</label><input type="datetime-local" value={ef.i} onChange={e=>setEf({...ef,i:e.target.value})}/><label>Time out</label><input type="datetime-local" value={ef.o} onChange={e=>setEf({...ef,o:e.target.value})}/>{ef.mode==='add'&&<p className="mut" style={{marginBottom:10}}>Once approved, this replaces any punches inside that window.</p>}</>}
   <label>Reason</label><input value={ef.r} placeholder={ef.mode==='remove'?'Pressed time in by mistake…':'Forgot to time out at 1 PM…'} onChange={e=>setEf({...ef,r:e.target.value})}/>
   <button className="pri w" style={{marginBottom:8}} onClick={send}>Send request</button><button className="w" onClick={()=>setEf(null)}>Back</button></>;
  return <><h2>{title}</h2><p className="mut" style={{margin:'4px 0 14px'}}>{dur(hrs(u.uid,P,X,[d0,d1]))} logged this day</p>
   {PN>0&&<div className="warn">⏳ {PN} request{PN>1?'s':''} pending for this day.</div>}
   {SS.map((s,i)=>{const b=s.live?now:s.b;return <div key={i} className="sess"><b>{fmt(s.a)} → {s.live?'now':fmt(s.b)}</b><div className="mut">{dur((b-s.a)/36e5)}{s.live?' · still timed in':''}{s.fix?' · approved fix':''}{s.ip?.auto?' · auto time-in':''}</div>
    {!LK&&<div className="row" style={{marginTop:10}}><button className="sm" style={{flex:1}} onClick={()=>setEf({mode:'edit',s,i:iso(s.a),o:iso(b),r:''})}>✏️ Change times</button><button className="sm no" style={{flex:1}} onClick={()=>setEf({mode:'remove',s,r:''})}>🗑 Remove</button></div>}</div>})}
   {!SS.length&&<p className="mut" style={{marginBottom:12}}>No time logged on this day.</p>}
   {LK?<div className="warn">🔒 Fix requests are closed for this cycle.</div>:<button className="pri w" onClick={()=>setEf({mode:'add',i:iso(d0+9*36e5),o:iso(Math.min(d0+17*36e5,now)),r:''})}>➕ Add missing time</button>}</>};

 const Bills=()=>{const key=String(r[0]),b=B.find(x=>x.id===key)||{},ps=b.ps??r[0],pe=b.pe??r[1]-864e5,rg=[ps,pe+864e5],days=Math.max(1,Math.round((rg[1]-rg[0])/864e5)),rangeH=days*24;
  const cfg=b.final?(b.finalCfg||{pct:b.pct??25,fixed:b.fixed||[]}):{pct:b.pct??25,fixed:b.fixed||[]},fx=cfg.fixed.filter(id=>members.some(m=>m.id===id)),nf=fx.length;
  const hm=members.map(m=>({...m,h:b.final?.[m.id]??hrs(m.id,P,X,rg)})),T=hm.reduce((t,m)=>t+m.h,0),ids=hm.map(m=>m.id),hh=hm.map(m=>m.h);
  const E=shares(b.elec||0,ids,hh,fx,cfg.pct),W=shares(b.water||0,ids,hh,fx,cfg.pct),tot=(b.elec||0)+(b.water||0),bref=doc(db,'spaces',sp.id,'bills',key);
  const dueTs=b.due??+new Date(new Date(pe).getFullYear(),new Date(pe).getMonth()+1,5),dueEnd=+dayAt(dueTs,1),overdue=Date.now()>=dueEnd,left=Math.max(0,Math.ceil((dueEnd-Date.now())/864e5));
  const pool=E.rest+W.rest,rate=T>0?pool/T:0,RC=R.filter(x=>x.cyc===key),myRc=RC.find(x=>x.uid===u.uid);
  const npend=X.filter(x=>x.status==='pending'&&x.inTs<rg[1]&&x.outTs>rg[0]).length,live=!b.final&&members.some(m=>last(m.id)?.type==='in');
  const submit=async ev=>{ev.preventDefault();const g=new FormData(ev.target),pv=g.get('p'),nd=g.get('d')?s2d(g.get('d')):null;
   const nb={elec:+g.get('e')||0,water:+g.get('w')||0,ps:s2d(g.get('s')),pe:s2d(g.get('x')),pct:pv===''||pv==null?25:Math.min(100,Math.max(0,+pv||0)),fixed:g.getAll('f'),due:nd??deleteField()};
   const ch=(nb.elec||nb.water)&&(nb.elec!==(b.elec||0)||nb.water!==(b.water||0)||nb.ps!==b.ps||nb.pe!==b.pe||nd!==(b.due??null));
   await setDoc(bref,nb,{merge:true});if(ch)ping({sid:sp.id,kind:'bills',id:key});say('Bills saved');buzz()};
  const csv=()=>{const rows=[['Name','Hours','Share of hours %','Fixed group','Base','Usage','Electric','Water','Total','Paid'],...hm.map((m,i)=>{const a=E.amounts[i],w=W.amounts[i];return[m.n,m.h.toFixed(2),(T?m.h/T*100:100/hm.length).toFixed(1),fx.includes(m.id)?'yes':'no',(a.base+w.base).toFixed(2),(a.use+w.use).toFixed(2),a.total.toFixed(2),w.total.toFixed(2),(a.total+w.total).toFixed(2),b.paid?.[m.id]?'yes':'no']})],a=document.createElement('a');
   a.href=URL.createObjectURL(new Blob([rows.map(x=>x.map(c=>`"${c}"`).join(',')).join('\n')],{type:'text/csv'}));a.download=`dormmates-bills-${d2s(ps)}.csv`;a.click()};
  const finalize=async()=>{if(b.final){if(!confirm('Reopen this cycle? Receipts already created for it will be deleted.'))return;await Promise.all(RC.map(x=>deleteDoc(doc(db,'spaces',sp.id,'receipts',x.id))));
    return setDoc(bref,{final:deleteField(),finalCfg:deleteField(),finalAt:deleteField(),receiptsAt:deleteField()},{merge:true})}
   await setDoc(bref,{final:Object.fromEntries(hm.map(m=>[m.id,m.h])),finalCfg:{pct:cfg.pct,fixed:fx},finalAt:Date.now()},{merge:true});ping({sid:sp.id,kind:'final',id:key});say('Finalized 🔒 Now you can send receipts')};
  const makeReceipts=async()=>{try{say('Creating receipts…');const bt=writeBatch(db),now=Date.now();
   hm.forEach((m,i)=>{const a=E.amounts[i],w=W.amounts[i];bt.set(doc(db,'spaces',sp.id,'receipts',`${key}_${m.id}`),{uid:m.id,name:m.n,cyc:key,space:sp.name,host:nm(sp.ownerId),ps,pe,days,hours:+m.h.toFixed(4),totalHours:+T.toFixed(4),elec:b.elec||0,water:b.water||0,pct:cfg.pct,nFixed:nf,inFixed:fx.includes(m.id),
     eBase:a.base,eUse:a.use,wBase:w.base,wUse:w.use,poolEBase:E.base,poolEUse:E.rest,poolWBase:W.base,poolWUse:W.rest,total:+(a.total+w.total).toFixed(2),daily:daily(iv(m.id,P,X,rg),rg).map(v=>+v.toFixed(2)),due:dueTs,issuedAt:now})});
   bt.update(bref,{receiptsAt:now});await bt.commit();ping({sid:sp.id,kind:'receipts',id:key});buzz();say('Receipts sent to every member 🧾',4000)}catch(e){say('Failed: '+e.message,6000)}};
  const dl=async list=>{try{const{downloadReceipts}=await import('./receipt');await downloadReceipts(list.map(x=>({...x,paid:!!b.paid?.[x.uid]})))}catch(e){say('Could not make the PDF: '+e.message,5000)}};
  const nudge=()=>{ping({sid:sp.id,kind:'remindunpaid',id:key});say('Reminder sent to unpaid members 🔔')};
  return <List><Cycle off={off} set={setOff} d={cd}/>
   <Item className="card hero"><span className="mut">Pay by {dayAt(dueTs,0).toLocaleDateString([],{month:'long',day:'numeric'})}{!b.due&&owner?' · default, set it below':''}</span><div className="big">{overdue?'Overdue':<><Num v={left} d={0}/><small> day{left===1?'':'s'} left</small></>}</div>
    <p className="mut">{days} days · {d2s(ps)} to {d2s(pe)}{tot?` · ${peso(tot/days)} per day`:''}{b.final?' · 🔒 finalized':''}</p></Item>
   {npend>0&&!b.final&&<div className="warn">{npend} fix request{npend>1?'s':''} still pending in this period. Totals will change once approved.</div>}
   {live&&tot>0&&<div className="warn">Someone is still timed in, so their hours keep counting until they time out. Finalize after everyone is out.</div>}
   {tot>0&&<Item><h3>How shares are computed</h3>
    <div className="row sp"><span className="mut">Period</span><b>{days} days · {rangeH}h</b></div>
    <div className="row sp" style={{marginTop:6}}><span className="mut">Hours in the dorm (everyone)</span><b>{dur(T)}</b></div>
    {nf?<><div className="row sp" style={{marginTop:10}}><span className="mut">① Base pool · {cfg.pct}%</span><b>{peso(E.base+W.base)}</b></div>
     <p className="mut" style={{margin:'2px 0 0'}}>Split equally among {nf} fixed member{nf>1?'s':''} → {peso((E.base+W.base)/nf)} each</p>
     <div className="row sp" style={{marginTop:10}}><span className="mut">② Usage pool · {100-cfg.pct}%</span><b>{peso(pool)}</b></div>
     <p className="mut" style={{margin:'2px 0 0'}}>Split by hours among everyone → {T?peso(rate)+' per hour':'equal split (no hours logged yet)'}</p></>
    :<><div className="row sp" style={{marginTop:6}}><span className="mut">Rate per dorm hour</span><b>{T?peso(rate):'–'}</b></div>
     <p className="mut" style={{marginTop:10}}>No fixed members selected, so 100% of the bill is split by actual hours. Each person pays the rate × their hours.</p></>}</Item>}
   {owner&&(b.final?<Item><span className="mut">🔒 This cycle is finalized. Reopen it to change amounts, dates or the fixed group.</span></Item>
    :<Item><h3>Set this period's bills</h3><form key={key+tot+ps+pe+(b.due||'')+(b.pct??'')+fx.join()} onSubmit={submit}><label>Electric bill (₱)</label><input name="e" type="number" step="any" inputMode="decimal" defaultValue={b.elec||''}/><label>Water bill (₱)</label><input name="w" type="number" step="any" inputMode="decimal" defaultValue={b.water||''}/>
    <label>Period starts</label><input name="s" type="date" defaultValue={d2s(ps)} required/><label>Period ends</label><input name="x" type="date" defaultValue={d2s(pe)} required/>
    <label>Payment deadline</label><input name="d" type="date" defaultValue={b.due?d2s(b.due):''}/>
    <label>Base contribution (% of each bill, split equally)</label><input name="p" type="number" min="0" max="100" step="any" inputMode="decimal" defaultValue={b.pct??25}/>
    <label>Who pays the base contribution?</label>{members.map(m=><label key={m.id} className="chk"><input type="checkbox" name="f" value={m.id} defaultChecked={fx.includes(m.id)}/>{m.n}</label>)}
    <p className="mut" style={{margin:'4px 0 12px'}}>Leave everyone unchecked to split the whole bill by actual hours.</p><button className="pri w">Save & calculate</button></form></Item>)}
   {tot?<>{hm.map((m,i)=>{const s=T?m.h/T:1/hm.length,pd=b.paid?.[m.id],a=E.amounts[i],w=W.amounts[i],baseS=a.base+w.base,useS=a.use+w.use;
    return <Item key={m.id}><div className="row"><Av m={m}/><div style={{flex:1}}><b>{m.n}</b>{fx.includes(m.id)&&<span className="tag t-pending" style={{marginLeft:6}}>fixed</span>}{!pd&&overdue&&<span className="tag t-denied" style={{marginLeft:6}}>overdue</span>}<div className="mut">{dur(m.h)} of {dur(T)} · {(s*100).toFixed(1)}%</div></div><div className="big" style={{fontSize:24}}>{peso(a.total+w.total)}</div></div>
    <div className="mut" style={{marginTop:8}}>{nf?`Base ${peso(baseS)} + Usage ${peso(useS)}`:`By hours: ${peso(useS)}`}</div>
    <div className="row sp mut" style={{marginTop:6}}><span>⚡ {peso(a.total)}</span><span>💧 {peso(w.total)}</span>{owner?<button className={`sm ${pd?'ok':''}`} onClick={()=>updateDoc(bref,{['paid.'+m.id]:!pd}).then(()=>{if(!pd)ping({sid:sp.id,kind:'paid',id:key,target:m.id})})}>{pd?'Paid ✓':'Mark paid'}</button>:pd&&<span className="tag t-approved">Paid</span>}</div></Item>})}
    <Item><div className="row sp"><span className="mut">Total billed</span><b>{peso(tot)}</b></div><p className="mut" style={{marginTop:6}}>Cents are allocated so the shares add up exactly to the bill.</p>
     <div className="row" style={{marginTop:12}}><button className="sm" style={{flex:1}} onClick={csv}>⬇ Export CSV</button>{owner&&<button className={`sm ${b.final?'':'pri'}`} style={{flex:1}} onClick={finalize}>{b.final?'Reopen':'🔒 Finalize'}</button>}</div>
     {owner&&members.some(m=>m.id!==u.uid&&!b.paid?.[m.id])&&<button className="sm w" style={{marginTop:8}} onClick={nudge}>🔔 Remind unpaid members</button>}</Item>
    {b.final&&<Item><h3>🧾 Receipts</h3>
     {owner?<><p className="mut" style={{marginBottom:10}}>{b.receiptsAt?`Sent ${fmt(b.receiptsAt)}. Regenerate if you reopened and changed anything.`:'Create a PDF receipt for each member showing exactly how their share was computed. Members see only their own.'}</p>
      <button className="pri w" onClick={makeReceipts}>{b.receiptsAt?'🔄 Regenerate & resend':'🧾 Generate & send receipts'}</button>
      {RC.length>0&&<>{hm.filter(m=>RC.some(x=>x.uid===m.id)).map(m=><div key={m.id} className="row sp" style={{marginTop:10}}><span>{m.n}</span><button className="sm" onClick={()=>dl([RC.find(x=>x.uid===m.id)])}>⬇ PDF</button></div>)}
       <button className="sm w" style={{marginTop:12}} onClick={()=>dl(hm.map(m=>RC.find(x=>x.uid===m.id)).filter(Boolean))}>⬇ All receipts (one PDF)</button></>}</>
     :myRc?<><p className="mut" style={{marginBottom:10}}>Your receipt shows every step of how your share was computed.</p><button className="pri w" onClick={()=>dl([myRc])}>⬇ Download my receipt (PDF)</button></>
      :<p className="mut">Your receipt will appear here once the host sends it.</p>}</Item>}</>
   :<Item><span className="mut">The host hasn't entered this period's bills yet.</span></Item>}</List>};

 const V={home:Home,dorm:Dorm,history:History,fixes:Fixes,bills:Bills},T=[['home','🏠','Home'],['dorm','👥','Dorm'],['history','🕘','History'],['fixes','📝','Fixes'],['bills','💡','Bills']];
 return <><main>{orbs}
  <header><button className="hbtn" onClick={()=>setMenu('spaces')}><div className="logo"><i/>{sp.name} ▾</div><span className="mut">{spaces.length>1?`${spaces.length} spaces · `:''}tap to switch</span></button><button className="hbtn" onClick={()=>setMenu('profile')}><Av m={me}/></button></header>
  <AnimatePresence mode="wait"><motion.div key={tab} initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}} transition={{duration:.18}}>{V[tab]()}</motion.div></AnimatePresence>

  <AnimatePresence>{menu&&<Sheet key={menu} close={()=>setMenu(null)}>
   {(menu==='punch'||menu==='away')&&<><h2>{menu==='away'?"Confirm you're still away":`Time ${on?'out':'in'}`}</h2><p className="mut" style={{margin:'6px 0 16px'}}>Add proof so your dormmates know it's real.</p>
    <input id="cam" type="file" accept="image/*" capture="user" hidden onChange={e=>photo(e.target.files[0],menu==='away'?'away':undefined)}/>
    <button className="pri w" style={{marginBottom:8}} onClick={()=>document.getElementById('cam').click()}>📸 Take a picture</button><button className="w" onClick={()=>loc(menu==='away'?'away':undefined)}>📍 Send my location</button></>}
   {menu==='day'&&dy!=null&&DaySheet()}
   {menu==='remind'&&rp&&<><h2>My reminder times</h2><p className="mut" style={{margin:'6px 0 14px'}}>Get a push at the times you choose. A time-in reminder is skipped if you're already in, and a time-out reminder is skipped if you're already out.</p>
    {window.Notification?.permission!=='granted'&&<div className="warn">Notifications are off on this phone. <button className="sm" style={{marginLeft:6}} onClick={askNotif}>Enable</button></div>}
    <label className="chk"><input type="checkbox" checked={!!rp.inOn} onChange={e=>setRp({...rp,inOn:e.target.checked})}/>Remind me to time in</label>{rp.inOn&&<input type="time" value={rp.inAt} onChange={e=>setRp({...rp,inAt:e.target.value})}/>}
    <label className="chk"><input type="checkbox" checked={!!rp.outOn} onChange={e=>setRp({...rp,outOn:e.target.checked})}/>Remind me to time out</label>{rp.outOn&&<input type="time" value={rp.outAt} onChange={e=>setRp({...rp,outAt:e.target.value})}/>}
    <label>Repeat on</label><div className="fchips">{['Su','Mo','Tu','We','Th','Fr','Sa'].map((d,i)=><button key={i} className={`fchip ${rp.days.includes(i)?'on':''}`} onClick={()=>setRp({...rp,days:rp.days.includes(i)?rp.days.filter(x=>x!==i):[...rp.days,i].sort()})}>{d}</button>)}</div>
    <button className="pri w" onClick={savePf}>Save reminders</button></>}
   {menu==='spaces'&&<><h2 style={{marginBottom:12}}>Your spaces</h2>{spaces.map(s=><button key={s.id} className={`sp-row ${s.id===sp.id?'cur':''}`} onClick={()=>open(s.id)}><div style={{flex:1}}><b>{s.name}</b><div className="mut">{s.members.length} members{s.ownerId===u.uid?' · you are host':''}</div></div>{s.id===sp.id&&'✓'}</button>)}
    <div className="card row sp" style={{marginTop:12}}><div><div className="mut">Invite code</div><b style={{fontSize:22,letterSpacing:2}}>{sp.code}</b></div><button className="sm" onClick={()=>navigator.clipboard?.writeText(sp.code).then(()=>say('Code copied'))}>Copy</button></div>
    <SpaceForm u={u} open={open} say={say}/></>}
   {menu==='profile'&&<><div className="row" style={{marginBottom:16}}><Av m={me}/><div><b>{me.n}</b><div className="mut">{u.email}</div></div></div>
    <button className="w" style={{marginBottom:8}} onClick={switchAcc}>🔄 Switch account</button><button className="w" style={{marginBottom:8}} onClick={()=>signOut(auth)}>Sign out</button>
    <button className="w" style={{marginBottom:8}} onClick={async()=>{if(confirm(`Leave ${sp.name}?`)){await leave(sp);setMenu(null)}}}>Leave "{sp.name}"</button>{owner&&<button className="w" style={{marginBottom:8,color:'var(--bad)'}} onClick={delSpace}>🗑 Delete this space (host only)</button>}<button className="w" style={{marginBottom:8}} onClick={askNotif}>🔔 Enable notifications</button><button className="w" style={{marginBottom:8}} onClick={()=>{setRp({inOn:false,inAt:'08:00',outOn:false,outAt:'17:00',days:[0,1,2,3,4,5,6],...(PF||{})});setMenu('remind')}}>⏰ My reminder times</button><button className="no w" onClick={delAcc}>Delete my account</button></>}
  </Sheet>}</AnimatePresence>
  <AnimatePresence>{zoom&&<motion.div className="lb" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setZoom(null)}><motion.img src={zoom} initial={{scale:.7}} animate={{scale:1}} exit={{scale:.7}}/></motion.div>}</AnimatePresence>
  <AnimatePresence>{toast&&<motion.div className="toast" initial={{y:-40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:-40,opacity:0}}>{toast}</motion.div>}</AnimatePresence></main>
  <nav>{T.map(([k,i,n])=><button key={k} className={tab===k?'on':''} onClick={()=>{setTab(k);setOff(0);buzz()}}>{tab===k&&<motion.div layoutId="pill" className="pill" transition={{type:'spring',stiffness:420,damping:34}}/>}<span>{i}</span>{n}{k==='fixes'&&pend>0&&<em>{pend}</em>}</button>)}</nav></>}
