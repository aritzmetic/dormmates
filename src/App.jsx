import {useEffect,useRef,useState} from 'react';
import {motion,AnimatePresence,animate} from 'framer-motion';
import {onAuthStateChanged,signInWithPopup,signOut} from 'firebase/auth';
import {doc,setDoc,addDoc,updateDoc,collection,query,where,orderBy,limit,onSnapshot,getDocs,arrayUnion} from 'firebase/firestore';
import {auth,db,gp} from './firebase';
import {fmt,dur,clock,peso,cyc,cycLabel,hrs,shrink} from './lib';

const buzz=()=>navigator.vibrate?.(25);
function Num({v,d=1}){const r=useRef();useEffect(()=>{const c=animate(0,v,{duration:1,ease:'easeOut',onUpdate:x=>r.current&&(r.current.textContent=x.toFixed(d))});return()=>c.stop()},[v]);return <span ref={r}>0</span>}
const Av=({m})=>m.p?<img className="av" src={m.p} referrerPolicy="no-referrer"/>:<div className="av">{m.n[0]}</div>;
const Cycle=({off,set})=><div className="row sp" style={{marginBottom:12}}><button className="sm" onClick={()=>set(off-1)}>‹</button><b>{cycLabel(cyc(off))}</b><button className="sm" onClick={()=>set(off+1)}>›</button></div>;
const List=({children})=><motion.div initial="h" animate="s" variants={{s:{transition:{staggerChildren:.05}}}}>{children}</motion.div>;
const Item=({children,className='card'})=><motion.div className={className} variants={{h:{opacity:0,y:16},s:{opacity:1,y:0}}}>{children}</motion.div>;

export default function App(){
 const [u,setU]=useState(undefined),[sp,setSp]=useState(null),[ready,setReady]=useState(false);
 const [P,setP]=useState([]),[X,setX]=useState([]),[B,setB]=useState([]);
 const [tab,setTab]=useState('home'),[off,setOff]=useState(0),[sheet,setSheet]=useState(false),[toast,setToast]=useState(''),[burst,setBurst]=useState(0),[,tick]=useState(0);
 const iso=t=>new Date(t-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16),[f,setF]=useState({i:iso(Date.now()-9*36e5),o:iso(Date.now()),r:''});
 const unsubs=useRef([]);
 const say=m=>{setToast(m);setTimeout(()=>setToast(''),2200)};
 useEffect(()=>{const t=setInterval(()=>tick(n=>n+1),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>onAuthStateChanged(auth,async user=>{unsubs.current.forEach(f=>f());unsubs.current=[];setSp(null);setU(user);
  if(user){const q=await getDocs(query(collection(db,'spaces'),where('members','array-contains',user.uid),limit(1)));if(!q.empty)open(q.docs[0].id)}setReady(true)}),[]);
 function open(id){const s=doc(db,'spaces',id),m=d=>d.docs.map(x=>({id:x.id,...x.data()}));
  unsubs.current=[onSnapshot(s,d=>setSp({id,...d.data()})),
   onSnapshot(query(collection(s,'punches'),orderBy('ts','desc'),limit(1000)),d=>setP(m(d))),
   onSnapshot(query(collection(s,'exceptions'),orderBy('createdAt','desc')),d=>setX(m(d))),
   onSnapshot(collection(s,'bills'),d=>setB(m(d)))]}

 if(!ready)return <div className="login"><motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1.4,ease:'linear'}} className="logo" style={{margin:'auto'}}><i/></motion.div></div>;
 const orbs=<><div className="orb o1"/><div className="orb o2"/></>;
 if(!u)return <main>{orbs}<div className="login">
  <motion.div className="logo" initial={{scale:.4,rotate:-30,opacity:0}} animate={{scale:1,rotate:0,opacity:1}} transition={{type:'spring',stiffness:200}}><i/>DormMates</motion.div>
  <motion.h1 initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.2}}>Who's home?<br/>Who owes?</motion.h1>
  <p className="mut">Punch in and out, fix missed days, and split the bills by who was actually there.</p>
  <motion.button whileTap={{scale:.95}} className="pri w" onClick={()=>signInWithPopup(auth,gp).catch(e=>say(e.message))}>Continue with Google</motion.button></div>{toast&&<div className="toast">{toast}</div>}</main>;
 if(!sp)return <Onboard u={u} open={open} say={say} orbs={orbs}/>;

 const me={n:u.displayName||'Me',p:u.photoURL||''},owner=sp.ownerId===u.uid,r=cyc(off);
 const members=sp.members.map(id=>({id,...(sp.names?.[id]||{n:'Member'})}));
 const last=id=>P.find(p=>p.uid===id),mine=last(u.uid),on=mine?.type==='in',pend=owner?X.filter(x=>x.status==='pending').length:0;
 const H=id=>hrs(id,P,X,cyc(off)),col=n=>collection(db,'spaces',sp.id,n);

 async function save(proof){const type=on?'out':'in';await addDoc(col('punches'),{uid:u.uid,type,ts:Date.now(),...proof});setSheet(false);setBurst(b=>b+1);buzz();say(type==='in'?'Timed in ✓':'Timed out ✓')}
 const photo=async f=>f&&save({photo:await shrink(f)});
 const loc=()=>navigator.geolocation.getCurrentPosition(p=>save({loc:{lat:p.coords.latitude,lng:p.coords.longitude}}),()=>say('Location blocked. Use a picture instead.'),{enableHighAccuracy:true,timeout:15000});

 const Home=()=>{const ms=members.map(m=>({...m,h:H(m.id)})).sort((a,b)=>b.h-a.h),mx=Math.max(1,...ms.map(m=>m.h)),h=H(u.uid);
  return <List>
  <Item className="card hero"><Cycle off={off} set={setOff}/>
   <div className="big"><Num v={Math.floor(h)} d={0}/><small>h {Math.round(h%1*60)}m</small></div><p className="mut">your total this cycle</p>
   {off===0&&<div className="stage"><div className={`ring ${on?'in':''}`}/>
    <motion.button whileTap={{scale:.92}} className={`punch ${on?'in':''}`} onClick={()=>{buzz();setSheet(true)}}>{on?'Time out':'Time in'}<small>{on?clock(Date.now()-mine.ts):'tap to start'}</small></motion.button>
    {burst>0&&<div className="burst" key={burst}>{[...Array(14)].map((_,i)=><span key={i} style={{'--x':Math.cos(i*.45)*130+'px','--y':Math.sin(i*.45)*130+'px','--c':['#ffc24b','#8c91ff','#5be3a8','#ff6b8b'][i%4]}}/>)}</div>}</div>}</Item>
  <Item><h3>Cycle leaderboard</h3>{ms.map((m,i)=><div key={m.id} style={{marginTop:12}}><div className="row sp"><span>{i?'':'👑 '}{m.n}</span><b>{dur(m.h)}</b></div><div className="bar"><motion.b initial={{width:0}} animate={{width:m.h/mx*100+'%'}} transition={{duration:.9,delay:.1*i}}/></div></div>)}</Item></List>};

 const Dorm=()=><List><h2 style={{margin:'6px 0 12px'}}>Who's home</h2>{members.map(m=>{const l=last(m.id),i=l?.type==='in';
  return <Item key={m.id} className="card row"><Av m={m}/><div style={{flex:1}}><b>{m.n}</b>{m.id===sp.ownerId&&<span className="mut"> · host</span>}
   <div className="mut"><span className={`dot ${i?'on':''}`}/>{l?`${i?'In for '+dur((Date.now()-l.ts)/36e5):'Out'} · ${fmt(l.ts)}`:'No punches yet'}</div></div>
   {l?.photo?<img className="thumb" src={l.photo}/>:l?.loc&&<a className="btn sm" target="_blank" href={`https://maps.google.com/?q=${l.loc.lat},${l.loc.lng}`}>📍</a>}</Item>})}</List>;

 const History=()=>{const L=P.filter(p=>p.uid===u.uid&&p.ts>=r[0]&&p.ts<r[1]);
  return <List><Cycle off={off} set={setOff}/>{L.map(p=><Item key={p.id} className="card row"><div style={{flex:1}}><b style={{color:p.type==='in'?'var(--ok)':'var(--peri)'}}>Time {p.type}</b><div className="mut">{fmt(p.ts)}</div></div>
   {p.photo?<img className="thumb" src={p.photo}/>:<a className="btn sm" target="_blank" href={`https://maps.google.com/?q=${p.loc?.lat},${p.loc?.lng}`}>📍 Map</a>}</Item>)}
   {!L.length&&<Item><span className="mut">No punches this cycle. Tap Time in on Home to start.</span></Item>}</List>};

 const Fixes=()=>{const L=owner?X:X.filter(x=>x.uid===u.uid),nm=id=>members.find(m=>m.id===id)?.n;
  const send=async()=>{const i=+new Date(f.i),o=+new Date(f.o);if(o<=i||!f.r.trim())return say('Time out must be after time in, and add a reason.');
   await addDoc(col('exceptions'),{uid:u.uid,inTs:i,outTs:o,reason:f.r.trim(),status:'pending',createdAt:Date.now()});setF({...f,r:''});say('Request sent')};
  return <List><Item><h3>Forgot to punch?</h3><p className="mut">Request a correction. {nm(sp.ownerId)} approves or denies it.</p>
   <label>Time in</label><input type="datetime-local" value={f.i} onChange={e=>setF({...f,i:e.target.value})}/><label>Time out</label><input type="datetime-local" value={f.o} onChange={e=>setF({...f,o:e.target.value})}/>
   <label>Reason</label><input value={f.r} placeholder="Phone died, left charger…" onChange={e=>setF({...f,r:e.target.value})}/><button className="pri w" onClick={send}>Send request</button></Item>
   <h3 style={{margin:'16px 0 10px'}}>{owner?'All requests':'My requests'}</h3>
   {L.map(x=><Item key={x.id}><div className="row sp"><b>{nm(x.uid)}</b><span className={`tag t-${x.status}`}>{x.status}</span></div><p>{fmt(x.inTs)} → {fmt(x.outTs)} <span className="mut">({dur((x.outTs-x.inTs)/36e5)})</span></p><p className="mut">“{x.reason}”</p>
    {owner&&x.status==='pending'&&<div className="row" style={{marginTop:10}}>{['approved','denied'].map(s=><button key={s} className={`${s==='approved'?'ok':'no'}`} style={{flex:1}} onClick={()=>{updateDoc(doc(db,'spaces',sp.id,'exceptions',x.id),{status:s});buzz()}}>{s==='approved'?'Approve':'Deny'}</button>)}</div>}</Item>)}
   {!L.length&&<Item><span className="mut">No requests yet.</span></Item>}</List>};

 const Bills=()=>{const b=B.find(x=>x.id==r[0])||{},ms=members.map(m=>({...m,h:H(m.id)})),T=ms.reduce((t,m)=>t+m.h,0),e=new Date(r[1]-1),due=new Date(e.getFullYear(),e.getMonth()+1,5),left=Math.ceil((due-Date.now())/864e5),tot=(b.elec||0)+(b.water||0);
  const submit=async ev=>{ev.preventDefault();const f=new FormData(ev.target);await setDoc(doc(db,'spaces',sp.id,'bills',String(r[0])),{elec:+f.get('e')||0,water:+f.get('w')||0,days:+f.get('d')||0},{merge:true});say('Bills saved');buzz()};
  return <List><Cycle off={off} set={setOff}/>
   <Item className="card hero"><span className="mut">Pay by {due.toLocaleDateString([],{month:'long',day:'numeric'})}</span><div className="big">{left<0?'Overdue':<><Num v={left} d={0}/><small> days left</small></>}</div>
    <p className="mut">Split by hours actually spent in the dorm ({T.toFixed(1)} h combined).{b.days?` Period: ${b.days} days.`:''}</p></Item>
   {owner&&<Item><h3>Set this period's bills</h3><form key={r[0]+tot+b.days} onSubmit={submit}><label>Electric bill (₱)</label><input name="e" type="number" step="any" inputMode="decimal" defaultValue={b.elec||''}/><label>Water bill (₱)</label><input name="w" type="number" step="any" inputMode="decimal" defaultValue={b.water||''}/><label>Billing period (days)</label><input name="d" type="number" inputMode="numeric" defaultValue={b.days||''}/><button className="pri w">Save & calculate</button></form></Item>}
   {tot?ms.map(m=>{const s=T?m.h/T:1/ms.length,pd=b.paid?.[m.id],pe=(b.elec||0)*s,pw=(b.water||0)*s;
    return <Item key={m.id}><div className="row"><Av m={m}/><div style={{flex:1}}><b>{m.n}</b><div className="mut">{dur(m.h)} · {(s*100).toFixed(1)}% share</div></div><div className="big" style={{fontSize:24}}>{peso(pe+pw)}</div></div>
    <div className="row sp mut" style={{marginTop:10}}><span>⚡ {peso(pe)}</span><span>💧 {peso(pw)}</span>{owner?<button className={`sm ${pd?'ok':''}`} onClick={()=>updateDoc(doc(db,'spaces',sp.id,'bills',String(r[0])),{['paid.'+m.id]:!pd})}>{pd?'Paid ✓':'Mark paid'}</button>:pd&&<span className="tag t-approved">Paid</span>}</div></Item>}):<Item><span className="mut">The host hasn't entered this period's bills yet.</span></Item>}</List>};

 const V={home:Home,dorm:Dorm,history:History,fixes:Fixes,bills:Bills},T=[['home','🏠','Home'],['dorm','👥','Dorm'],['history','🕘','History'],['fixes','📝','Fixes'],['bills','💡','Bills']];
 
 return <main>{orbs}
  <header><div><div className="logo"><i/>{sp.name}</div><span className="mut" style={{cursor:'pointer'}} onClick={()=>navigator.clipboard?.writeText(sp.code).then(()=>say('Code copied: '+sp.code))}>Invite code: <b>{sp.code}</b> · tap to copy</span></div><button className="sm" onClick={()=>signOut(auth)}>Sign out</button></header>
  <AnimatePresence mode="wait"><motion.div key={tab} initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}} transition={{duration:.18}}>{V[tab]()}</motion.div></AnimatePresence>
  <nav>{T.map(([k,i,n])=><button key={k} className={tab===k?'on':''} onClick={()=>{setTab(k);setOff(0);buzz()}}>{tab===k&&<motion.div layoutId="pill" className="pill" transition={{type:'spring',stiffness:420,damping:34}}/>}<span>{i}</span>{n}{k==='fixes'&&pend>0&&<em>{pend}</em>}</button>)}</nav>
  <AnimatePresence>{sheet&&<motion.div className="scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setSheet(false)}>
   <motion.div className="sheet" initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:30,stiffness:320}} drag="y" dragConstraints={{top:0,bottom:0}} dragElastic={{top:0,bottom:.6}} onDragEnd={(_,i)=>i.offset.y>90&&setSheet(false)} onClick={e=>e.stopPropagation()}>
    <div className="grab"/><h2>Time {on?'out':'in'}</h2><p className="mut" style={{margin:'6px 0 16px'}}>Add proof so your dormmates know it's real.</p>
    <input id="cam" type="file" accept="image/*" capture="user" hidden onChange={e=>photo(e.target.files[0])}/>
    <button className="pri w" style={{marginBottom:8}} onClick={()=>document.getElementById('cam').click()}>📸 Take a picture</button><button className="w" onClick={loc}>📍 Send my location</button></motion.div></motion.div>}</AnimatePresence>
  <AnimatePresence>{toast&&<motion.div className="toast" initial={{y:-40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:-40,opacity:0}}>{toast}</motion.div>}</AnimatePresence></main>}

function Onboard({u,open,say,orbs}){const [n,setN]=useState(''),[c,setC]=useState(''),me={n:u.displayName||'Me',p:u.photoURL||''};
 const create=async()=>{if(!n.trim())return;const r=await addDoc(collection(db,'spaces'),{name:n.trim(),code:Math.random().toString(36).slice(2,8).toUpperCase(),ownerId:u.uid,members:[u.uid],names:{[u.uid]:me}});open(r.id)};
 const join=async()=>{const q=await getDocs(query(collection(db,'spaces'),where('code','==',c.trim().toUpperCase()),limit(1)));if(q.empty)return say('No space with that code.');
  await updateDoc(q.docs[0].ref,{members:arrayUnion(u.uid),['names.'+u.uid]:me});open(q.docs[0].id)};
 return <main>{orbs}<header><div className="logo"><i/>DormMates</div><button className="sm" onClick={()=>signOut(auth)}>Sign out</button></header>
  <List><Item><h3>Start a dorm space</h3><input placeholder="e.g. Room 304" value={n} onChange={e=>setN(e.target.value)}/><button className="pri w" onClick={create}>Create space</button></Item>
  <Item><h3>Join with a code</h3><input placeholder="6-letter code" value={c} onChange={e=>setC(e.target.value)}/><button className="w" onClick={join}>Join space</button></Item></List></main>}
